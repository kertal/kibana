/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getStateContainer,
  GetStateReturn,
  createSearchSessionRestorationDataProvider,
} from './discover_state';
import { createBrowserHistory, History } from 'history';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';

let history: History;
let state: GetStateReturn;
const getCurrentUrl = () => history.createHref(history.location);

describe('Test discover state', () => {
  let stopSync = () => {};

  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getStateContainer({
      savedSearch: savedSearchMock,
      history,
      services: discoverServiceMock,
    });
    await state.replaceUrlAppState({});
    stopSync = state.startSync();
  });
  afterEach(() => {
    stopSync();
    stopSync = () => {};
  });
  test('setting app state and syncing to URL', async () => {
    state.setAppState({ index: 'modified' });
    state.flushToUrl();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(),index:modified,interval:auto,sort:!())"`
    );
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/#?_a=(index:modified)');
    expect(state.appStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "index": "modified",
      }
    `);
  });
  test('URL navigation to url without _a, state should not change', async () => {
    history.push('/#?_a=(index:modified)');
    history.push('/');
    expect(state.appStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "index": "modified",
      }
    `);
  });

  test('isAppStateDirty returns  whether the current state has changed', async () => {
    state.setAppState({ index: 'modified' });
    expect(state.isAppStateDirty()).toBeTruthy();
    state.resetInitialAppState();
    expect(state.isAppStateDirty()).toBeFalsy();
  });

  test('getPreviousAppState returns the state before the current', async () => {
    state.setAppState({ index: 'first' });
    const stateA = state.appStateContainer.getState();
    state.setAppState({ index: 'second' });
    expect(state.getPreviousAppState()).toEqual(stateA);
  });

  test('pauseAutoRefreshInterval sets refreshInterval.pause to true', async () => {
    history.push('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    await state.pauseAutoRefreshInterval();
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!t,value:5000))');
  });
});
describe('Test discover initial state sort handling', () => {
  test('Non-empty sort in URL should not fallback to state defaults', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!(!(order_date,desc)))');

    const savedSearch = { ...savedSearchMock, sort: [['fallback', 'desc']] as SortOrder[] };

    state = getStateContainer({
      savedSearch,
      history,
      services: discoverServiceMock,
    });
    await state.replaceUrlAppState({});
    const stopSync = state.startSync();
    expect(state.appStateContainer.getState().sort).toMatchInlineSnapshot(`
      Array [
        Array [
          "order_date",
          "desc",
        ],
      ]
    `);
    stopSync();
  });
  test('Empty sort in URL should allow fallback state defaults', async () => {
    history = createBrowserHistory();
    history.push('/#?_a=(sort:!())');
    const savedSearch = { ...savedSearchMock, sort: [['extension', 'desc']] as SortOrder[] };

    state = getStateContainer({
      savedSearch,
      history,
      services: discoverServiceMock,
    });
    await state.replaceUrlAppState({});
    const stopSync = state.startSync();
    expect(state.appStateContainer.getState().sort).toMatchInlineSnapshot(`
      Array [
        Array [
          "extension",
          "desc",
        ],
      ]
    `);
    stopSync();
  });
});

describe('Test discover state with legacy migration', () => {
  test('migration of legacy query ', async () => {
    history = createBrowserHistory();
    history.push(
      "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))"
    );
    state = getStateContainer({
      savedSearch: savedSearchMock,
      history,
      services: discoverServiceMock,
    });
    expect(state.appStateContainer.getState()).toMatchInlineSnapshot(`
      Object {
        "columns": Array [],
        "filters": undefined,
        "grid": undefined,
        "hideAggregatedPreview": undefined,
        "hideChart": undefined,
        "index": "the-data-view-id",
        "interval": "auto",
        "query": Object {
          "language": "lucene",
          "query": Object {
            "query_string": Object {
              "analyze_wildcard": true,
              "query": "type:nice name:\\"yeah\\"",
            },
          },
        },
        "rowHeight": undefined,
        "rowsPerPage": undefined,
        "savedQuery": undefined,
        "sort": Array [],
        "viewMode": undefined,
      }
    `);
  });
});

describe('createSearchSessionRestorationDataProvider', () => {
  let mockSavedSearch: SavedSearch = {} as unknown as SavedSearch;
  const mockDataPlugin = dataPluginMock.createStartContract();
  const searchSessionInfoProvider = createSearchSessionRestorationDataProvider({
    data: mockDataPlugin,
    appStateContainer: getStateContainer({
      savedSearch: savedSearchMock,
      history: createBrowserHistory(),
      services: discoverServiceMock,
    }).appStateContainer,
    getSavedSearch: () => mockSavedSearch,
  });

  describe('session name', () => {
    test('No saved search returns default name', async () => {
      expect(await searchSessionInfoProvider.getName()).toBe('Discover');
    });

    test('Saved Search with a title returns saved search title', async () => {
      mockSavedSearch = { id: 'id', title: 'Name' } as unknown as SavedSearch;
      expect(await searchSessionInfoProvider.getName()).toBe('Name');
    });

    test('Saved Search without a title returns default name', async () => {
      mockSavedSearch = { id: 'id', title: undefined } as unknown as SavedSearch;
      expect(await searchSessionInfoProvider.getName()).toBe('Discover');
    });
  });

  describe('session state', () => {
    test('restoreState has sessionId and initialState has not', async () => {
      const searchSessionId = 'id';
      (mockDataPlugin.search.session.getSessionId as jest.Mock).mockImplementation(
        () => searchSessionId
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.searchSessionId).toBeUndefined();
      expect(restoreState.searchSessionId).toBe(searchSessionId);
    });

    test('restoreState has absoluteTimeRange', async () => {
      const relativeTime = 'relativeTime';
      const absoluteTime = 'absoluteTime';
      (mockDataPlugin.query.timefilter.timefilter.getTime as jest.Mock).mockImplementation(
        () => relativeTime
      );
      (mockDataPlugin.query.timefilter.timefilter.getAbsoluteTime as jest.Mock).mockImplementation(
        () => absoluteTime
      );
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.timeRange).toBe(relativeTime);
      expect(restoreState.timeRange).toBe(absoluteTime);
    });

    test('restoreState has paused autoRefresh', async () => {
      const { initialState, restoreState } = await searchSessionInfoProvider.getLocatorData();
      expect(initialState.refreshInterval).toBe(undefined);
      expect(restoreState.refreshInterval).toMatchInlineSnapshot(`
        Object {
          "pause": true,
          "value": 0,
        }
      `);
    });
  });
});

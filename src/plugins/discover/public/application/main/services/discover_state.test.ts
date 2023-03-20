/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getDiscoverStateContainer,
  DiscoverStateContainer,
  createSearchSessionRestorationDataProvider,
} from './discover_state';
import { createBrowserHistory, History } from 'history';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import {
  savedSearchMock,
  savedSearchMockWithTimeField,
  savedSearchMockWithTimeFieldNew,
} from '../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../__mocks__/services';
import { dataViewMock } from '../../../__mocks__/data_view';
import { DiscoverAppStateContainer } from './discover_app_state_container';
import { waitFor } from '@testing-library/react';
import { FetchStatus } from '../../types';
import { dataViewComplexMock } from '../../../__mocks__/data_view_complex';

const startSync = (appState: DiscoverAppStateContainer) => {
  const { start, stop } = appState.syncState();
  start();
  return stop;
};

function getState(url: string, savedSearch?: SavedSearch) {
  const nextHistory = createBrowserHistory();
  nextHistory.push(url);
  const nextState = getDiscoverStateContainer({
    services: discoverServiceMock,
    history: nextHistory,
    savedSearch,
  });
  const getCurrentUrl = () => nextHistory.createHref(nextHistory.location);
  return {
    history: nextHistory,
    state: nextState,
    getCurrentUrl,
  };
}

describe('Test discover state', () => {
  let stopSync = () => {};
  let history: History;
  let state: DiscoverStateContainer;
  const getCurrentUrl = () => history.createHref(history.location);

  beforeEach(async () => {
    history = createBrowserHistory();
    history.push('/');
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMock.id,
      services: discoverServiceMock,
      history,
    });
    state.savedSearchState.set(savedSearchMock);
    await state.appState.update({}, true);
    stopSync = startSync(state.appState);
  });
  afterEach(() => {
    stopSync();
    stopSync = () => {};
  });
  test('setting app state and syncing to URL', async () => {
    state.appState.update({ index: 'modified' });
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(default_column),index:modified,interval:auto,sort:!())"`
    );
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/#?_a=(index:modified)');
    expect(state.appState.getState()).toMatchInlineSnapshot(`
      Object {
        "index": "modified",
      }
    `);
  });
  test('URL navigation to url without _a, state should not change', async () => {
    history.push('/#?_a=(index:modified)');
    history.push('/');
    expect(state.appState.getState()).toEqual({
      index: 'modified',
    });
  });

  test('isAppStateDirty returns  whether the current state has changed', async () => {
    state.appState.update({ index: 'modified' });
    expect(state.appState.hasChanged()).toBeTruthy();
    state.appState.resetInitialState();
    expect(state.appState.hasChanged()).toBeFalsy();
  });

  test('getPreviousAppState returns the state before the current', async () => {
    state.appState.update({ index: 'first' });
    const stateA = state.appState.getState();
    state.appState.update({ index: 'second' });
    expect(state.appState.getPrevious()).toEqual(stateA);
  });

  test('pauseAutoRefreshInterval sets refreshInterval.pause to true', async () => {
    history.push('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!f,value:5000))');
    await state.actions.setDataView(dataViewMock);
    expect(getCurrentUrl()).toBe('/#?_g=(refreshInterval:(pause:!t,value:5000))');
  });
});
describe('Test discover initial state sort handling', () => {
  test('Non-empty sort in URL should not be overwritten by saved search sort', async () => {
    const savedSearch = {
      ...savedSearchMockWithTimeField,
      ...{ sort: [['bytes', 'desc']] },
    } as SavedSearch;

    const { state } = getState('/#?_a=(sort:!(!(timestamp,desc)))', savedSearch);
    state.savedSearchState.load = jest.fn(() => Promise.resolve(savedSearch));
    await state.actions.loadSavedSearch(savedSearch.id!);
    const stopSync = state.appState.syncState().stop;
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
    stopSync();
  });
  test('Empty sort in URL should use saved search sort for state', async () => {
    const nextSavedSearch = { ...savedSearchMock, ...{ sort: [['bytes', 'desc']] as SortOrder[] } };
    const { state } = getState('/#?_a=(sort:!())', nextSavedSearch);
    await state.appState.update({}, true);
    const stopSync = startSync(state.appState);
    expect(state.appState.getState().sort).toEqual([['bytes', 'desc']]);
    stopSync();
  });
  test('Empty sort in URL and saved search should sort by timestamp', async () => {
    const { state } = getState('/#?_a=(sort:!())', savedSearchMockWithTimeField);

    state.savedSearchState.set(savedSearchMockWithTimeField);
    await state.appState.update({}, true);
    const stopSync = startSync(state.appState);
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
    stopSync();
  });
});

describe('Test discover state with legacy migration', () => {
  let history: History;
  let state: DiscoverStateContainer;
  test('migration of legacy query ', async () => {
    history = createBrowserHistory();
    history.push(
      "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))"
    );
    state = getDiscoverStateContainer({
      savedSearch: savedSearchMockWithTimeFieldNew,
      services: discoverServiceMock,
      history,
    });
    expect(state.appState.getState().query).toMatchInlineSnapshot(`
      Object {
        "language": "lucene",
        "query": Object {
          "query_string": Object {
            "analyze_wildcard": true,
            "query": "type:nice name:\\"yeah\\"",
          },
        },
      }
    `);
  });
});

describe('createSearchSessionRestorationDataProvider', () => {
  let mockSavedSearch: SavedSearch = {} as unknown as SavedSearch;
  const history = createBrowserHistory();
  const mockDataPlugin = dataPluginMock.createStartContract();
  const searchSessionInfoProvider = createSearchSessionRestorationDataProvider({
    data: mockDataPlugin,
    appStateContainer: getDiscoverStateContainer({
      savedSearch: savedSearchMock,
      services: discoverServiceMock,
      history,
    }).appState,
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
      expect(restoreState.refreshInterval).toEqual({
        pause: true,
        value: 0,
      });
    });
  });
});

describe('actions', () => {
  beforeEach(async () => {
    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: 'now-15d', to: 'now' };
    });
    discoverServiceMock.data.search.searchSource.create = jest
      .fn()
      .mockReturnValue(savedSearchMock.searchSource);
    discoverServiceMock.core.savedObjects.client.resolve = jest.fn().mockReturnValue({
      saved_object: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'The saved search that will save the world',
          sort: [],
          columns: ['test123'],
          description: 'description',
          hideChart: false,
        },
        id: 'the-saved-search-id',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'the-data-view-id',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      outcome: 'exactMatch',
    });
  });

  test('setDataView', async () => {
    const { state } = getState('');
    state.actions.setDataView(dataViewMock);
    expect(state.internalState.getState().dataView).toBe(dataViewMock);
  });

  test('appendAdHocDataViews', async () => {
    const { state } = getState('');
    state.actions.appendAdHocDataViews(dataViewMock);
    expect(state.internalState.getState().adHocDataViews).toEqual([dataViewMock]);
  });

  test('removeAdHocDataViewById', async () => {
    const { state } = getState('');
    state.actions.appendAdHocDataViews(dataViewMock);
    state.actions.removeAdHocDataViewById(dataViewMock.id!);
    expect(state.internalState.getState().adHocDataViews).toEqual([]);
  });
  test('fetchData', async () => {
    const { state } = getState('');
    const dataState = state.dataState;
    await state.actions.loadDataViewList();
    expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    await state.actions.loadSavedSearch();
    const unsubscribe = state.actions.initializeAndSync();
    state.actions.fetchData();
    await waitFor(() => {
      expect(dataState.data$.documents$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    unsubscribe();

    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);
  });
  test('loadDataViewList', async () => {
    const { state } = getState('');
    expect(state.internalState.getState().savedDataViews.length).toBe(0);
    await state.actions.loadDataViewList();
    expect(state.internalState.getState().savedDataViews.length).toBe(3);
  });
  test('loadSavedSearch with no id given an empty URL', async () => {
    const { state, getCurrentUrl } = getState('');
    await state.actions.loadDataViewList();
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    const { searchSource, ...savedSearch } = state.savedSearchState.get();
    expect(savedSearch).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          "default_column",
        ],
        "refreshInterval": undefined,
        "sort": Array [],
        "timeRange": undefined,
        "usesAdHocDataView": false,
      }
    `);
    expect(searchSource.getField('index')?.id).toEqual('the-data-view-id');
    unsubscribe();
  });

  test('loadNewSavedSearch given an empty URL using loadSavedSearch', async () => {
    const { state, getCurrentUrl } = getState('/');

    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });
  test('loadNewSavedSearch with URL changing interval state', async () => {
    const { state, getCurrentUrl } = getState('/#?_a=(interval:month,columns:!(bytes))&_g=()');
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });
  test('loadSavedSearch with no id, given URL changes state', async () => {
    const { state, getCurrentUrl } = getState('/#?_a=(interval:month,columns:!(bytes))&_g=()');
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });
  test('loadSavedSearch given an empty URL, no state changes', async () => {
    const { state, getCurrentUrl } = getState('/');
    const newSavedSearch = await state.actions.loadSavedSearch('the-saved-search-id');
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(newSavedSearch?.id).toBe('the-saved-search-id');
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(test123),hideChart:!f,index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });
  test('loadSavedSearch given a URL with different interval and columns modifying the state', async () => {
    const { state, getCurrentUrl } = getState('/#?_a=(interval:month,columns:!(message))&_g=()');
    await state.actions.loadDataViewList();
    await state.actions.loadSavedSearch('the-saved-search-id');
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(message),hideChart:!f,index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });

  test('loadSavedSearch data view handling', async () => {
    const { state } = getState('/');
    await state.actions.loadDataViewList();
    await state.actions.loadSavedSearch('the-saved-search-id');
    expect(state.savedSearchState.get().searchSource.getField('index')?.id).toBe(
      'the-data-view-id'
    );
    const dataViewsCreateMock = discoverServiceMock.dataViews.create as jest.Mock;
    dataViewsCreateMock.mockImplementation(() => savedSearchMockWithTimeField);
    discoverServiceMock.data.search.searchSource.create = jest
      .fn()
      .mockReturnValue(savedSearchMockWithTimeField.searchSource);
    discoverServiceMock.core.savedObjects.client.resolve = jest.fn().mockReturnValue({
      saved_object: {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"query":{"query":"","language":"kuery"},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          title: 'The saved search with a timefield',
          sort: [],
          columns: ['test-again'],
          description: 'description',
          hideChart: false,
        },
        id: 'the-saved-search-id-with-timefield',
        type: 'search',
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            id: 'index-pattern-with-timefield',
            type: 'index-pattern',
          },
        ],
        namespaces: ['default'],
      },
      outcome: 'exactMatch',
    });
    await state.actions.loadSavedSearch('the-saved-search-id-with-timefield');
    expect(state.savedSearchState.get().searchSource.getField('index')?.id).toBe(
      'index-pattern-with-timefield-id'
    );
  });

  it('loads a new saved search, updated by ad-hoc data view', async () => {
    const { state } = getState('/');
    await state.actions.loadDataViewList();
    const dataViewSpecMock = {
      id: 'mock-id',
      title: 'mock-title',
      timeFieldName: 'mock-time-field-name',
    };
    const dataViewsCreateMock = discoverServiceMock.dataViews.create as jest.Mock;
    dataViewsCreateMock.mockImplementation(() => ({
      ...dataViewMock,
      ...dataViewSpecMock,
      isPersisted: () => false,
    }));
    await state.actions.loadSavedSearch(undefined, undefined, dataViewSpecMock);
    expect(state.savedSearchState.getInitial$().getValue().id).toEqual(undefined);
    expect(state.savedSearchState.getCurrent$().getValue().id).toEqual(undefined);
    expect(
      state.savedSearchState.getInitial$().getValue().searchSource?.getField('index')?.id
    ).toEqual(dataViewSpecMock.id);
    expect(
      state.savedSearchState.getCurrent$().getValue().searchSource?.getField('index')?.id
    ).toEqual(dataViewSpecMock.id);
    expect(state.savedSearchState.getHasChanged$().getValue()).toEqual(false);
    expect(state.internalState.getState().adHocDataViews.length).toBe(1);
  });

  test('onChangeDataView', async () => {
    const { state, getCurrentUrl } = getState('/');
    await state.actions.loadDataViewList();
    await state.actions.loadSavedSearch('the-saved-search-id');
    expect(state.savedSearchState.get().searchSource.getField('index')!.id).toBe(dataViewMock.id);
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(test123),hideChart:!f,index:the-data-view-id,interval:auto,sort:!())"`
    );
    await state.actions.onChangeDataView(dataViewComplexMock.id!);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).toBe(dataViewComplexMock.id);
    });
    expect(state.appState.get().index).toBe(dataViewComplexMock.id);
    expect(state.savedSearchState.get().searchSource.getField('index')!.id).toBe(
      dataViewComplexMock.id
    );
    unsubscribe();
  });
  test('undoChanges', async () => {
    const { state, getCurrentUrl } = getState('/');
    await state.actions.loadDataViewList();
    await state.actions.loadSavedSearch('the-saved-search-id');
    const unsubscribe = state.actions.initializeAndSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(test123),hideChart:!f,index:the-data-view-id,interval:auto,sort:!())"`
    );
    await state.actions.onChangeDataView(dataViewComplexMock.id!);
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(test123),hideChart:!f,index:data-view-with-various-field-types-id,interval:auto,sort:!(!(data,desc)))"`
    );
    await state.actions.undoChanges();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(test123),hideChart:!f,index:the-data-view-id,interval:auto,sort:!())"`
    );
    unsubscribe();
  });
});

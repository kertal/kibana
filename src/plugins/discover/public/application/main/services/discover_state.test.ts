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
import { waitFor } from '@testing-library/react';
import { FetchStatus } from '../../types';
import { dataViewAdHoc, dataViewComplexMock } from '../../../__mocks__/data_view_complex';
import { copySavedSearch } from './discover_saved_search_container';

async function getState(url: string, savedSearch?: SavedSearch) {
  const nextHistory = createBrowserHistory();
  nextHistory.push(url);
  const discoverServiceMockModified = {
    ...discoverServiceMock,
    dataViews: {
      ...discoverServiceMock.dataViews,
      get: jest.fn(() => Promise.resolve(savedSearch?.searchSource.getField('index')!)),
    },
  };
  const nextState = getDiscoverStateContainer({
    services: discoverServiceMockModified,
    history: nextHistory,
  });
  await nextState.actions.loadDataViewList();
  if (savedSearch) {
    nextState.savedSearchState.load = jest.fn(() => {
      nextState.savedSearchState.set(copySavedSearch(savedSearch));
      return Promise.resolve(savedSearch);
    });
  } else {
    nextState.savedSearchState.load = jest.fn(() => {
      nextState.savedSearchState.set(copySavedSearch(savedSearchMockWithTimeFieldNew));
      return Promise.resolve(savedSearchMockWithTimeFieldNew);
    });
  }

  const getCurrentUrl = () => nextHistory.createHref(nextHistory.location);
  return {
    history: nextHistory,
    state: nextState,
    getCurrentUrl,
    services: discoverServiceMockModified,
  };
}

describe('Test discover state', () => {
  let history: History;
  let state: DiscoverStateContainer;
  const getCurrentUrl = () => history.createHref(history.location);

  beforeEach(async () => {
    const stateResult = await getState('/', savedSearchMock);
    history = stateResult.history;
    state = stateResult.state;
    await state.actions.startSync();
  });
  afterEach(() => {
    state.actions.stopSync();
  });
  test('setting app state and syncing to URL', async () => {
    state.appState.update({ index: 'modified' });
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toContain('index:modified');
  });

  test('changing URL to be propagated to appState', async () => {
    history.push('/#?_a=(index:modified)');
    expect(state.appState.getState().index).toEqual('modified');
  });
  test('URL navigation to url without _a, state should not change', async () => {
    history.push('/#?_a=(index:modified)');
    history.push('/');
    expect(state.appState.getState().index).toEqual('modified');
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

    const { state } = await getState('/#?_a=(sort:!(!(timestamp,desc)))', savedSearch);
    const unsubscribe = await state.actions.startSync();
    expect(state.appState.getState().sort).toEqual([['timestamp', 'desc']]);
    unsubscribe();
  });
  test('Empty URL should use saved search sort for state', async () => {
    const nextSavedSearch = { ...savedSearchMock, ...{ sort: [['bytes', 'desc']] as SortOrder[] } };
    const { state } = await getState('/', nextSavedSearch);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = await state.actions.startSync();
    expect(state.appState.getState().sort).toEqual([['bytes', 'desc']]);
    unsubscribe();
  });
});

describe('Test discover state with legacy migration', () => {
  test('migration of legacy query ', async () => {
    const { state } = await getState(
      "/#?_a=(query:(query_string:(analyze_wildcard:!t,query:'type:nice%20name:%22yeah%22')))",
      savedSearchMockWithTimeFieldNew
    );
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
    const { state } = await getState('');
    state.actions.setDataView(dataViewMock);
    expect(state.internalState.getState().dataView).toBe(dataViewMock);
  });

  test('fetchData', async () => {
    const { state } = await getState('/');
    const dataState = state.dataState;
    await state.actions.loadDataViewList();
    expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    await state.actions.loadSavedSearch();
    const unsubscribe = await state.actions.startSync();
    state.actions.fetchData();
    await waitFor(() => {
      expect(dataState.data$.documents$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    unsubscribe();

    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);
  });
  test('loadDataViewList', async () => {
    const { state } = await getState('');
    expect(state.internalState.getState().savedDataViews.length).toBe(3);
  });
  test('loadSavedSearch with no id given an empty URL', async () => {
    const { state, getCurrentUrl } = await getState('');
    await state.actions.loadDataViewList();
    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = await state.actions.startSync();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    const { searchSource, ...savedSearch } = state.savedSearchState.getState();
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
    const { state, getCurrentUrl } = await getState('/');

    const newSavedSearch = await state.actions.loadSavedSearch();
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = await state.actions.startSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });
  test('loadNewSavedSearch with URL changing interval state', async () => {
    const { state, getCurrentUrl } = await getState(
      '/#?_a=(interval:month,columns:!(bytes))&_g=()'
    );
    const newSavedSearch = await state.actions.loadSavedSearch({ useAppState: true });
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = await state.actions.startSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });
  test('loadSavedSearch with no id, given URL changes state', async () => {
    const { state, getCurrentUrl } = await getState(
      '/#?_a=(interval:month,columns:!(bytes))&_g=()'
    );
    const newSavedSearch = await state.actions.loadSavedSearch({ useAppState: true });
    expect(newSavedSearch?.id).toBeUndefined();
    const unsubscribe = await state.actions.startSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(bytes),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });
  test('loadSavedSearch given an empty URL, no state changes', async () => {
    const { state, getCurrentUrl } = await getState('/', savedSearchMock);
    const newSavedSearch = await state.actions.loadSavedSearch({
      savedSearchId: 'the-saved-search-id',
    });
    const unsubscribe = await state.actions.startSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(newSavedSearch?.id).toBe('the-saved-search-id');
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);
    unsubscribe();
  });
  test('loadSavedSearch given a URL with different interval and columns modifying the state', async () => {
    const url = '/#?_a=(interval:month,columns:!(message))&_g=()';
    const { state, getCurrentUrl } = await getState(url, savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id, useAppState: true });
    const unsubscribe = await state.actions.startSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_a=(columns:!(message),index:the-data-view-id,interval:month,sort:!())&_g=()"`
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
    unsubscribe();
  });

  test('loadSavedSearch ignoring hideChart in URL', async () => {
    const url = '/#?_a=(hideChart:true,columns:!(message))&_g=()';
    const { state } = await getState(url, savedSearchMock);
    await state.actions.loadSavedSearch();
    expect(state.savedSearchState.getState().hideChart).toBe(undefined);
    expect(state.appState.getState().hideChart).toBe(undefined);
  });

  test('loadSavedSearch data view handling', async () => {
    const { state } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'the-data-view-id'
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);

    state.savedSearchState.load = jest.fn().mockReturnValue(savedSearchMockWithTimeField);
    // unsetting the previous index else this is considered as update to the persisted saved search
    state.appState.set({ index: undefined });
    await state.actions.loadSavedSearch({ savedSearchId: 'the-saved-search-id-with-timefield' });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'index-pattern-with-timefield-id'
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(false);

    // switch back to the previous savedSearch, but not cleaning up appState index, so it's considered as update to the persisted saved search
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id, useAppState: true });
    expect(state.savedSearchState.getState().searchSource.getField('index')?.id).toBe(
      'index-pattern-with-timefield-id'
    );
    expect(state.savedSearchState.getHasChanged$().getValue()).toBe(true);
  });
  test('loadSavedSearch generating a new saved search, updated by ad-hoc data view', async () => {
    const { state } = await getState('/');
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
    await state.actions.loadSavedSearch({ dataViewSpec: dataViewSpecMock });
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
    const { state, getCurrentUrl, services } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewMock.id
    );
    const unsubscribe = await state.actions.startSync();
    expect(getCurrentUrl()).toContain(dataViewMock.id);

    services.dataViews.get.mockResolvedValue(Promise.resolve(dataViewComplexMock));
    const spy = jest.spyOn(state.dataState, 'fetch');
    await state.actions.onChangeDataView(dataViewComplexMock.id!);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).toBe(dataViewComplexMock.id);
    });
    expect(state.appState.get().index).toBe(dataViewComplexMock.id);
    expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewComplexMock.id
    );
    // a change of data view should trigger a search
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    unsubscribe();
  });
  test('onDataViewCreated - persisted data view', async () => {
    const { state, services, getCurrentUrl } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = await state.actions.startSync();
    expect(getCurrentUrl()).toContain(savedSearchMock.searchSource.getField('index')!.id);
    services.dataViews.get.mockResolvedValue(Promise.resolve(dataViewComplexMock));
    await state.actions.onDataViewCreated(dataViewComplexMock);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).toBe(dataViewComplexMock.id);
    });
    expect(state.appState.get().index).toBe(dataViewComplexMock.id);
    expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewComplexMock.id
    );
    expect(getCurrentUrl()).toContain(dataViewComplexMock.id);
    unsubscribe();
  });
  test('onDataViewCreated - ad-hoc data view', async () => {
    const { state } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = await state.actions.startSync();
    await state.actions.onDataViewCreated(dataViewAdHoc);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).toBe(dataViewAdHoc.id);
    });
    expect(state.appState.get().index).toBe(dataViewAdHoc.id);
    expect(state.savedSearchState.getState().searchSource.getField('index')!.id).toBe(
      dataViewAdHoc.id
    );
    unsubscribe();
  });
  test('onDataViewEdited - persisted data view', async () => {
    const { state } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const selectedDataView = state.internalState.getState().dataView;
    await waitFor(() => {
      expect(selectedDataView).toBe(dataViewMock);
    });
    const unsubscribe = await state.actions.startSync();
    await state.actions.onDataViewEdited(dataViewMock);

    await waitFor(() => {
      expect(state.internalState.getState().dataView).not.toBe(selectedDataView);
    });
    unsubscribe();
  });
  test('onDataViewEdited - ad-hoc data view', async () => {
    const { state } = await getState('/', savedSearchMock);
    const unsubscribe = await state.actions.startSync();
    await state.actions.onDataViewCreated(dataViewAdHoc);
    const previousId = dataViewAdHoc.id;
    await state.actions.onDataViewEdited(dataViewAdHoc);
    await waitFor(() => {
      expect(state.internalState.getState().dataView?.id).not.toBe(previousId);
    });
    unsubscribe();
  });

  test('onOpenSavedSearch - same target id', async () => {
    const { state } = await getState('/', savedSearchMock);
    const unsubscribe = await state.actions.startSync();
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    await state.savedSearchState.update({ nextState: { hideChart: true } });
    expect(state.savedSearchState.getState().hideChart).toBe(true);
    await state.actions.onOpenSavedSearch(savedSearchMock.id!);
    expect(state.savedSearchState.getState().hideChart).toBe(undefined);
    unsubscribe();
  });

  test('onOpenSavedSearch - cleanup of previous filter', async () => {
    const { state } = await getState(
      "/#?_a=(columns:!(customer_first_name),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,key:customer_first_name,negate:!f,params:(query:Mary),type:phrase),query:(match_phrase:(customer_first_name:Mary)))),hideChart:!f,index:ff959d40-b880-11e8-a6d9-e546fe2bba5f,interval:auto,query:(language:kuery,query:''),sort:!())",
      savedSearchMock
    );
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id, useAppState: true });
    expect(state.appState.get().filters).toHaveLength(1);
    await state.actions.loadSavedSearch({ useAppState: false });
    expect(state.appState.get().filters).toHaveLength(0);
  });

  test('onOpenSavedSearch - handling of sort', async () => {
    const { state, getCurrentUrl } = await getState(
      "/#?_a=(columns:!(customer_first_name),hideChart:!f,index:the-saved-search-id-with-timefield,interval:auto,query:(language:kuery,query:''),sort:!())",
      savedSearchMockWithTimeField
    );
    await state.actions.loadSavedSearch({
      savedSearchId: savedSearchMockWithTimeField.id,
      useAppState: true,
    });
    const unsubscribe = await state.actions.startSync();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    const currentUrl = getCurrentUrl();
    expect(currentUrl).toContain('sort:!(!(timestamp,desc))');
    unsubscribe();
  });

  test('onCreateDefaultAdHocDataView', async () => {
    discoverServiceMock.dataViews.create = jest.fn().mockReturnValue({
      ...dataViewMock,
      isPersisted: () => false,
      id: 'ad-hoc-id',
      title: 'test',
    });
    const { state } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = await state.actions.startSync();
    await state.actions.onCreateDefaultAdHocDataView('ad-hoc-test');
    expect(state.appState.getState().index).toBe('ad-hoc-id');
    expect(state.internalState.getState().adHocDataViews[0].id).toBe('ad-hoc-id');
    unsubscribe();
  });
  test('undoChanges', async () => {
    const { state, getCurrentUrl, services } = await getState('/', savedSearchMock);
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    const unsubscribe = await state.actions.startSync();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    services.dataViews.get.mockResolvedValue(Promise.resolve(dataViewComplexMock));
    await state.actions.onChangeDataView(dataViewComplexMock.id!);
    expect(state.appState.getState().index).toEqual(dataViewComplexMock.id);

    await state.actions.undoChanges();
    state.kbnUrlStateStorage.kbnUrlControls.flush();
    expect(getCurrentUrl()).toMatchInlineSnapshot(
      `"/#?_g=(refreshInterval:(pause:!t,value:1000),time:(from:now-15d,to:now))&_a=(columns:!(default_column),index:the-data-view-id,interval:auto,sort:!())"`
    );
    unsubscribe();
  });

  test('undoChanges with timeRestore', async () => {
    const { state } = await getState('/', {
      ...savedSearchMock,
      timeRestore: true,
      refreshInterval: { pause: false, value: 1000 },
      timeRange: { from: 'now-15d', to: 'now-10d' },
    });
    const setTime = jest.fn();
    const setRefreshInterval = jest.fn();
    discoverServiceMock.data.query.timefilter.timefilter.setTime = setTime;
    discoverServiceMock.data.query.timefilter.timefilter.setRefreshInterval = setRefreshInterval;
    await state.actions.loadSavedSearch({ savedSearchId: savedSearchMock.id });
    await state.actions.undoChanges();
    expect(setTime).toHaveBeenCalledTimes(1);
    expect(setTime).toHaveBeenCalledWith({ from: 'now-15d', to: 'now-10d' });
    expect(setRefreshInterval).toHaveBeenCalledWith({ pause: false, value: 1000 });
  });
});

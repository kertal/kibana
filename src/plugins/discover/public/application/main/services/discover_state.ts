/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { History } from 'history';
import {
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
  StateContainer,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';
import {
  DataPublicPluginStart,
  QueryState,
  SearchSessionInfoProvider,
} from '@kbn/data-plugin/public';
import { DataView, DataViewSpec, DataViewType } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { merge } from 'rxjs';
import { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import { cloneDeep, isEqual } from 'lodash';
import { getValidFilters } from '../../../utils/get_valid_filters';
import { cleanupUrlState } from '../utils/cleanup_url_state';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';
import { FetchStatus } from '../../types';
import { changeDataView } from '../hooks/utils/change_data_view';
import { loadSavedSearch as loadNextSavedSearch } from './load_saved_search';
import { buildStateSubscribe } from '../hooks/utils/build_state_subscribe';
import { addLog } from '../../../utils/add_log';
import { getUrlTracker } from '../../../kibana_services';
import { loadDataView, resolveDataView } from '../utils/resolve_data_view';
import { DiscoverDataStateContainer, getDataStateContainer } from './discover_data_state_container';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '../../../../common';
import {
  DiscoverAppState,
  DiscoverAppStateContainer,
  getDiscoverAppStateContainer,
  getInitialState,
  GLOBAL_STATE_URL_KEY,
} from './discover_app_state_container';
import {
  DiscoverInternalStateContainer,
  getInternalStateContainer,
} from './discover_internal_state_container';
import { DiscoverServices } from '../../../build_services';
import {
  getDefaultAppState,
  getSavedSearchContainer,
  DiscoverSavedSearchContainer,
} from './discover_saved_search_container';
import { updateFiltersReferences } from '../utils/update_filter_references';
interface DiscoverStateContainerParams {
  /**
   * Browser history
   */
  history: History;
  /**
   * The current savedSearch
   */
  savedSearch?: string | SavedSearch;
  /**
   * core ui settings service
   */
  services: DiscoverServices;
}

export interface LoadParams {
  /**
   * the id of the saved search to load, if undefined, a new saved search will be created
   */
  savedSearchId?: string;
  /**
   * the data view to use, if undefined, the saved search's data view will be used
   */
  dataView?: DataView;
  /**
   * the data view spec to use, if undefined, the saved search's data view will be used
   */
  dataViewSpec?: DataViewSpec;
  /**
   * determins if AppState should be used to update the saved search
   * URL is overwriting savedSearch params in this case
   */
  useAppState?: boolean;
}

export interface DiscoverStateContainer {
  /**
   * App state, the _a part of the URL
   */
  appState: DiscoverAppStateContainer;
  /**
   * Data fetching related state
   **/
  dataState: DiscoverDataStateContainer;
  /**
   * Internal shared state that's used at several places in the UI
   */
  internalState: DiscoverInternalStateContainer;
  /**
   * kbnUrlStateStorage - it keeps the state in sync with the URL
   */
  kbnUrlStateStorage: IKbnUrlStateStorage;
  /**
   * State of saved search, the saved object of Discover
   */
  savedSearchState: DiscoverSavedSearchContainer;
  /**
   * Service for handling search sessions
   */
  searchSessionManager: DiscoverSearchSessionManager;
  /**
   * Complex functions to update multiple containers from UI
   */
  actions: {
    /**
     * Triggers fetching of new data from Elasticsearch
     * If initial is true, when SEARCH_ON_PAGE_LOAD_SETTING is set to false and it's a new saved search no fetch is triggered
     * @param initial
     */
    fetchData: (initial?: boolean) => void;
    /**
     * Initializing state containers and start subscribing to changes triggering e.g. data fetching
     */
    initializeAndSync: () => () => void;
    /**
     * Load current list of data views, add them to internal state
     */
    loadDataViewList: () => Promise<void>;
    /**
     * Load a saved search by id or create a new one that's not persisted yet
     * @param LoadParams - optional parameters to load a saved search
     */
    loadSavedSearch: (param?: LoadParams) => Promise<SavedSearch | undefined>;
    /**
     * Create and select a temporary/adhoc data view by a given index pattern
     * Used by the Data View Picker
     * @param pattern
     */
    onCreateDefaultAdHocDataView: (pattern: string) => Promise<void>;
    /**
     * Triggered when a new data view is created
     * @param dataView
     */
    onDataViewCreated: (dataView: DataView) => Promise<void>;
    /**
     * Triggered when a new data view is edited
     * @param dataView
     */
    onDataViewEdited: (dataView: DataView) => Promise<void>;
    /**
     * Triggered when a saved search is opened in the savedObject finder
     * @param savedSearchId
     */
    onOpenSavedSearch: (savedSearchId: string) => void;
    /**
     * Triggered when the unified search bar query is updated
     * @param payload
     * @param isUpdate
     */
    onUpdateQuery: (
      payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
      isUpdate?: boolean
    ) => void;
    /**
     * Triggered when the user selects a different data view in the data view picker
     * @param id - id of the data view
     */
    onChangeDataView: (id: string) => Promise<void>;
    /**
     * Triggered when an ad-hoc data view is persisted to allow sharing links and CSV
     * @param dataView
     */
    persistAdHocDataView: (dataView: DataView) => Promise<DataView>;
    /**
     * Set the currently selected data view
     * @param dataView
     */
    setDataView: (dataView: DataView) => void;
    /**
     * Undo changes made to the saved search, e.g. when the user triggers the "Reset search" button
     */
    undoSavedSearchChanges: () => void;
    /**
     * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
     * This is to prevent duplicate ids messing with our system
     */
    updateAdHocDataViewId: () => void;
  };
}

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getDiscoverStateContainer({
  history,
  services,
}: DiscoverStateContainerParams): DiscoverStateContainer {
  const storeInSessionStorage = services.uiSettings.get('state:storeInSessionStorage');
  const toasts = services.core.notifications.toasts;
  /**
   * state storage for state in the URL
   */
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history,
    ...(toasts && withNotifyOnErrors(toasts)),
  });

  /**
   * Search session logic
   */
  const searchSessionManager = new DiscoverSearchSessionManager({
    history,
    session: services.data.search.session,
  });
  /**
   * Saved Search State Container, the persisted saved object of Discover
   */
  const savedSearchContainer = getSavedSearchContainer({
    services,
  });

  /**
   * App State Container, synced with the _a part URL
   */
  const appStateContainer = getDiscoverAppStateContainer({
    stateStorage,
    savedSearch: savedSearchContainer.getState(),
    services,
  });
  /**
   * Internal State Container, state that's not persisted and not part of the URL
   */
  const internalStateContainer = getInternalStateContainer();

  const dataStateContainer = getDataStateContainer({
    services,
    searchSessionManager,
    getAppState: appStateContainer.getState,
    getSavedSearch: savedSearchContainer.getState,
  });

  const pauseAutoRefreshInterval = async (dataView: DataView) => {
    if (dataView && (!dataView.isTimeBased() || dataView.type === DataViewType.ROLLUP)) {
      const state = stateStorage.get<QueryState>(GLOBAL_STATE_URL_KEY);
      if (state?.refreshInterval && !state.refreshInterval.pause) {
        await stateStorage.set(
          GLOBAL_STATE_URL_KEY,
          { ...state, refreshInterval: { ...state?.refreshInterval, pause: true } },
          { replace: true }
        );
      }
    }
  };

  const setDataView = (dataView: DataView) => {
    internalStateContainer.transitions.setDataView(dataView);
    pauseAutoRefreshInterval(dataView);
    savedSearchContainer.getState().searchSource.setField('index', dataView);
  };

  const loadDataViewList = async () => {
    const dataViewList = await services.dataViews.getIdsWithTitle(true);
    internalStateContainer.transitions.setSavedDataViews(dataViewList);
  };
  /**
   * Load the data view of the given id
   * A fallback data view is returned, given there's no match
   * This is usually the default data view
   */
  const loadAndResolveDataView = async (id?: string, dataViewSpec?: DataViewSpec) => {
    const { adHocDataViews, savedDataViews } = internalStateContainer.getState();
    const adHodDataView = adHocDataViews.find((dataView) => dataView.id === id);
    if (adHodDataView) return { fallback: false, dataView: adHodDataView };

    const nextDataViewData = await loadDataView({
      services,
      id,
      dataViewSpec,
      dataViewList: savedDataViews,
    });
    const nextDataView = resolveDataView(nextDataViewData, services.toastNotifications);
    return { fallback: !nextDataViewData.stateValFound, dataView: nextDataView };
  };
  /**
   * When saving a saved search with an ad hoc data view, a new id needs to be generated for the data view
   * This is to prevent duplicate ids messing with our system
   */
  const updateAdHocDataViewId = async () => {
    const prevDataView = internalStateContainer.getState().dataView;
    if (!prevDataView || prevDataView.isPersisted()) return;
    const newDataView = await services.dataViews.create({ ...prevDataView.toSpec(), id: uuidv4() });
    services.dataViews.clearInstanceCache(prevDataView.id);

    updateFiltersReferences(prevDataView, newDataView);

    internalStateContainer.transitions.replaceAdHocDataViewWithId(prevDataView.id!, newDataView);
    await appStateContainer.replaceUrlState({ index: newDataView.id });
    const trackingEnabled = Boolean(newDataView.isPersisted() || savedSearchContainer.getId());
    getUrlTracker().setTrackingEnabled(trackingEnabled);

    return newDataView;
  };

  const onOpenSavedSearch = async (newSavedSearchId: string) => {
    addLog('[discoverState] onOpenSavedSearch', newSavedSearchId);
    const currentSavedSearch = savedSearchContainer.getState();
    if (currentSavedSearch.id && currentSavedSearch.id === newSavedSearchId) {
      addLog('[discoverState] undo changes since saved search did not change');
      await undoSavedSearchChanges();
    } else {
      addLog('[discoverState] onOpenSavedSearch open view URL');
      history.push(`/view/${encodeURIComponent(newSavedSearchId)}`);
    }
  };

  const onDataViewCreated = async (nextDataView: DataView) => {
    if (!nextDataView.isPersisted()) {
      internalStateContainer.transitions.appendAdHocDataViews(nextDataView);
    } else {
      await loadDataViewList();
    }
    if (nextDataView.id) {
      await onChangeDataView(nextDataView);
    }
  };

  const onDataViewEdited = async (editedDataView: DataView) => {
    if (editedDataView.isPersisted()) {
      // Clear the current data view from the cache and create a new instance
      // of it, ensuring we have a new object reference to trigger a re-render
      services.dataViews.clearInstanceCache(editedDataView.id);
      setDataView(await services.dataViews.create(editedDataView.toSpec(), true));
    } else {
      await updateAdHocDataViewId();
    }
    loadDataViewList();
    fetchData();
  };

  const persistAdHocDataView = async (adHocDataView: DataView) => {
    const persistedDataView = await services.dataViews.createAndSave({
      ...adHocDataView.toSpec(),
      id: uuidv4(),
    });
    services.dataViews.clearInstanceCache(adHocDataView.id);
    updateFiltersReferences(adHocDataView, persistedDataView);
    internalStateContainer.transitions.removeAdHocDataViewById(adHocDataView.id!);
    await appStateContainer.update({ index: persistedDataView.id }, true);
    return persistedDataView;
  };

  const loadSavedSearch = async (params?: LoadParams): Promise<SavedSearch> => {
    const { savedSearchId, dataView, dataViewSpec, useAppState } = params ?? {};
    const appState = useAppState ? appStateContainer.getState() : undefined;
    // First let's clean up the previous state
    services.filterManager.setAppFilters([]);
    services.data.query.queryString.clearQuery();
    if (!useAppState) {
      appStateContainer.set({});
    }
    // Then, take care of data view and saved search loading, deriving the next state
    const actualDataView = dataView
      ? dataView
      : (await loadAndResolveDataView(appState?.index, dataViewSpec)).dataView;

    const nextSavedSearch = await loadNextSavedSearch({
      id: savedSearchId,
      dataView: actualDataView,
      appState,
      savedSearchContainer,
    });
    const nextAppState = getInitialState(undefined, nextSavedSearch, services);
    appStateContainer.set(
      appState ? { ...nextAppState, ...cleanupUrlState({ ...appState }) } : nextAppState
    );

    const savedSearchDataView = nextSavedSearch.searchSource.getField('index');
    if (savedSearchDataView) {
      setDataView(savedSearchDataView);
      if (!actualDataView.isPersisted()) {
        internalStateContainer.transitions.appendAdHocDataViews(savedSearchDataView);
      }
    }
    // Finally notify dataStateContainer, data.query and filterManager about new derived state
    dataStateContainer.reset(nextSavedSearch);

    // set data service filters
    const filters = nextSavedSearch.searchSource.getField('filter');

    if (Array.isArray(filters) && filters.length) {
      services.data.query.filterManager.setAppFilters(cloneDeep(filters));
    }
    // some filters may not be valid for this context, so update
    // the filter manager with a modified list of valid filters
    const currentFilters = services.filterManager.getFilters();
    const validFilters = getValidFilters(actualDataView, currentFilters);
    if (!isEqual(currentFilters, validFilters)) {
      services.filterManager.setFilters(validFilters);
    }
    // set data service query
    const query = nextSavedSearch.searchSource.getField('query');
    if (query) {
      services.data.query.queryString.setQuery(query);
    }

    return nextSavedSearch;
  };

  /**
   * state containers initializing and subscribing to changes triggering e.g. data fetching
   */
  const initializeAndSync = () => {
    // initialize app state container, syncing with _g and _a part of the URL
    const appStateInitAndSyncUnsubscribe = appStateContainer.initAndSync(
      savedSearchContainer.getState()
    );
    // subscribing to state changes of appStateContainer, triggering data fetching
    const appStateUnsubscribe = appStateContainer.subscribe(
      buildStateSubscribe({
        appState: appStateContainer,
        savedSearchState: savedSearchContainer,
        dataState: dataStateContainer,
        loadAndResolveDataView,
        setDataView,
      })
    );
    // start subscribing to dataStateContainer, triggering data fetching
    const unsubscribeData = dataStateContainer.subscribe();

    // updates saved search when query or filters change, triggers data fetching
    const filterUnsubscribe = merge(
      services.data.query.queryString.getUpdates$(),
      services.filterManager.getFetches$()
    ).subscribe(async () => {
      await savedSearchContainer.update({
        nextDataView: internalStateContainer.getState().dataView,
        nextState: appStateContainer.getState(),
        updateByFilterAndQuery: true,
      });
      fetchData();
    });

    return () => {
      unsubscribeData();
      appStateUnsubscribe();
      appStateInitAndSyncUnsubscribe();
      filterUnsubscribe.unsubscribe();
    };
  };

  const onCreateDefaultAdHocDataView = async (pattern: string) => {
    const newDataView = await services.dataViews.create({
      title: pattern,
    });
    if (newDataView.fields.getByName('@timestamp')?.type === 'date') {
      newDataView.timeFieldName = '@timestamp';
    }
    internalStateContainer.transitions.appendAdHocDataViews(newDataView);

    await onChangeDataView(newDataView);
  };
  /**
   * Triggered when a user submits a query in the search bar
   */
  const onUpdateQuery = (
    payload: { dateRange: TimeRange; query?: Query | AggregateQuery },
    isUpdate?: boolean
  ) => {
    if (isUpdate === false) {
      // remove the search session if the given query is not just updated
      searchSessionManager.removeSearchSessionIdFromURL({ replace: false });
      dataStateContainer.fetch();
    }
  };

  /**
   * Function e.g. triggered when user changes data view in the sidebar
   */
  const onChangeDataView = async (id: string | DataView) => {
    await changeDataView(id, {
      services,
      internalState: internalStateContainer,
      appState: appStateContainer,
    });
  };
  /**
   * Undo all changes to the current saved search
   */
  const undoSavedSearchChanges = async () => {
    addLog('undoSavedSearchChanges');
    const nextSavedSearch = savedSearchContainer.getInitial$().getValue();
    await savedSearchContainer.set(nextSavedSearch);
    restoreStateFromSavedSearch({
      savedSearch: nextSavedSearch,
      timefilter: services.timefilter,
    });
    const newAppState = getDefaultAppState(nextSavedSearch, services);
    await appStateContainer.replaceUrlState(newAppState);
    return nextSavedSearch;
  };
  const fetchData = (initial: boolean = false) => {
    addLog('fetchData', { initial });
    if (!initial || dataStateContainer.getInitialFetchStatus() === FetchStatus.LOADING) {
      dataStateContainer.fetch();
    }
  };

  return {
    kbnUrlStateStorage: stateStorage,
    appState: appStateContainer,
    internalState: internalStateContainer,
    dataState: dataStateContainer,
    savedSearchState: savedSearchContainer,
    searchSessionManager,
    actions: {
      initializeAndSync,
      fetchData,
      loadDataViewList,
      loadSavedSearch,
      onChangeDataView,
      onCreateDefaultAdHocDataView,
      onDataViewCreated,
      onDataViewEdited,
      onOpenSavedSearch,
      onUpdateQuery,
      persistAdHocDataView,
      setDataView,
      undoSavedSearchChanges,
      updateAdHocDataViewId,
    },
  };
}

export function createSearchSessionRestorationDataProvider(deps: {
  appStateContainer: StateContainer<DiscoverAppState>;
  data: DataPublicPluginStart;
  getSavedSearch: () => SavedSearch;
}): SearchSessionInfoProvider {
  const getSavedSearchId = () => deps.getSavedSearch().id;
  return {
    getName: async () => {
      const savedSearch = deps.getSavedSearch();
      return (
        (savedSearch.id && savedSearch.title) ||
        i18n.translate('discover.discoverDefaultSearchSessionName', {
          defaultMessage: 'Discover',
        })
      );
    },
    getLocatorData: async () => {
      return {
        id: DISCOVER_APP_LOCATOR,
        initialState: createUrlGeneratorState({
          ...deps,
          getSavedSearchId,
          shouldRestoreSearchSession: false,
        }),
        restoreState: createUrlGeneratorState({
          ...deps,
          getSavedSearchId,
          shouldRestoreSearchSession: true,
        }),
      };
    },
  };
}

function createUrlGeneratorState({
  appStateContainer,
  data,
  getSavedSearchId,
  shouldRestoreSearchSession,
}: {
  appStateContainer: StateContainer<DiscoverAppState>;
  data: DataPublicPluginStart;
  getSavedSearchId: () => string | undefined;
  shouldRestoreSearchSession: boolean;
}): DiscoverAppLocatorParams {
  const appState = appStateContainer.get();
  return {
    filters: data.query.filterManager.getFilters(),
    dataViewId: appState.index,
    query: appState.query,
    savedSearchId: getSavedSearchId(),
    timeRange: shouldRestoreSearchSession
      ? data.query.timefilter.timefilter.getAbsoluteTime()
      : data.query.timefilter.timefilter.getTime(),
    searchSessionId: shouldRestoreSearchSession ? data.search.session.getSessionId() : undefined,
    columns: appState.columns,
    sort: appState.sort,
    savedQuery: appState.savedQuery,
    interval: appState.interval,
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
    useHash: false,
    viewMode: appState.viewMode,
    hideAggregatedPreview: appState.hideAggregatedPreview,
    breakdownField: appState.breakdownField,
  };
}

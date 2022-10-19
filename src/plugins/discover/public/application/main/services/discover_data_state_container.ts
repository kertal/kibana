/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Query, AggregateQuery } from '@kbn/es-query';
import { BehaviorSubject, Subject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { AutoRefreshDoneFn } from '@kbn/data-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { addLog } from '../../../utils/addLog';
import { Chart } from '../components/chart/point_series';
import { DataTableRecord } from '../../../types';
import { AppState } from './discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { getRawRecordType } from '../utils/get_raw_record_type';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../common';
import { FetchStatus } from '../../types';
import { getFetch$ } from '../utils/get_fetch_observable';
import { validateTimeRange } from '../utils/validate_time_range';
import { fetchAll } from '../utils/fetch_all';
import { sendResetMsg } from '../hooks/use_saved_search_messages';

export interface SavedSearchData {
  main$: DataMain$;
  documents$: DataDocuments$;
  totalHits$: DataTotalHits$;
  charts$: DataCharts$;
  availableFields$: AvailableFields$;
}

export interface TimechartBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

export type DataMain$ = BehaviorSubject<DataMainMsg>;
export type DataDocuments$ = BehaviorSubject<DataDocumentsMsg>;
export type DataTotalHits$ = BehaviorSubject<DataTotalHitsMsg>;
export type DataCharts$ = BehaviorSubject<DataChartsMessage>;
export type AvailableFields$ = BehaviorSubject<DataAvailableFieldsMsg>;
export type DataRefetch$ = Subject<DataRefetchMsg>;

export interface UseSavedSearch {
  refetch$: DataRefetch$;
  data$: SavedSearchData;
  reset: () => void;
  inspectorAdapters: { requests: RequestAdapter };
}

export enum RecordRawType {
  /**
   * Documents returned Elasticsearch, nested structure
   */
  DOCUMENT = 'document',
  /**
   * Data returned e.g. SQL queries, flat structure
   * */
  PLAIN = 'plain',
}

export type DataRefetchMsg = 'reset' | undefined;

export interface DataMsg {
  fetchStatus: FetchStatus;
  error?: Error;
  recordRawType?: RecordRawType;
  query?: AggregateQuery | Query | undefined;
}

export interface DataMainMsg extends DataMsg {
  foundDocuments?: boolean;
}

export interface DataDocumentsMsg extends DataMsg {
  result?: DataTableRecord[];
}

export interface DataTotalHitsMsg extends DataMsg {
  fetchStatus: FetchStatus;
  error?: Error;
  result?: number;
}

export interface DataChartsMessage extends DataMsg {
  bucketInterval?: TimechartBucketInterval;
  chartData?: Chart;
}

export interface DataAvailableFieldsMsg extends DataMsg {
  fields?: string[];
}

export interface DataStateContainer {
  fetch: () => void;
  data$: SavedSearchData;
  refetch$: DataRefetch$;
  subscribe: () => () => void;
  reset: () => void;
  inspectorAdapters: { requests: RequestAdapter };
  initialFetchStatus: FetchStatus;
}

export function getDataStateContainer({
  services,
  searchSessionManager,
  getAppState,
  getSavedSearch,
}: {
  services: DiscoverServices;
  searchSessionManager: DiscoverSearchSessionManager;
  getAppState: () => AppState;
  getSavedSearch: () => SavedSearch;
}): DataStateContainer {
  const { data } = services;
  const inspectorAdapters = { requests: new RequestAdapter() };
  const appState = getAppState();
  const recordRawType = getRawRecordType(appState.query);
  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = new Subject<DataRefetchMsg>();
  const shouldSearchOnPageLoad =
    services.uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
    getSavedSearch().id !== undefined ||
    !services.timefilter.getRefreshInterval().pause ||
    searchSessionManager.hasSearchSessionIdInURL();
  const initialFetchStatus = shouldSearchOnPageLoad
    ? FetchStatus.LOADING
    : FetchStatus.UNINITIALIZED;

  /**
   * The observables the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const initialState = { fetchStatus: initialFetchStatus, recordRawType };
  const dataSubjects: SavedSearchData = {
    main$: new BehaviorSubject<DataMainMsg>(initialState),
    documents$: new BehaviorSubject<DataDocumentsMsg>(initialState),
    totalHits$: new BehaviorSubject<DataTotalHitsMsg>(initialState),
    charts$: new BehaviorSubject<DataChartsMessage>(initialState),
    availableFields$: new BehaviorSubject<DataAvailableFieldsMsg>(initialState),
  };

  let autoRefreshDone: AutoRefreshDoneFn | undefined;
  /**
   * handler emitted by `timefilter.getAutoRefreshFetch$()`
   * to notify when data completed loading and to start a new autorefresh loop
   */
  const setAutoRefreshDone = (fn: AutoRefreshDoneFn | undefined) => {
    autoRefreshDone = fn;
  };
  const fetch$ = getFetch$({
    setAutoRefreshDone,
    data,
    main$: dataSubjects.main$,
    refetch$,
    searchSessionManager,
  });
  let abortController: AbortController;

  function subscribe() {
    const subscription = fetch$.subscribe(async (val) => {
      addLog('👁️ fetch$.subscription fetching data');
      if (
        !validateTimeRange(data.query.timefilter.timefilter.getTime(), services.toastNotifications)
      ) {
        return;
      }
      inspectorAdapters.requests.reset();

      abortController?.abort();
      abortController = new AbortController();
      const prevAutoRefreshDone = autoRefreshDone;

      await fetchAll(dataSubjects, getSavedSearch(), val === 'reset', getAppState(), {
        abortController,
        data,
        initialFetchStatus,
        inspectorAdapters,
        searchSessionId: searchSessionManager.getNextSearchSessionId(),
        services,
      });

      // If the autoRefreshCallback is still the same as when we started i.e. there was no newer call
      // replacing this current one, call it to make sure we tell that the auto refresh is done
      // and a new one can be scheduled.
      if (autoRefreshDone === prevAutoRefreshDone) {
        // if this function was set and is executed, another refresh fetch can be triggered
        autoRefreshDone?.();
        autoRefreshDone = undefined;
      }
    });

    return () => {
      abortController?.abort();
      subscription.unsubscribe();
    };
  }

  const fetchQuery = (resetQuery?: boolean) => {
    if (resetQuery) {
      refetch$.next('reset');
    } else {
      refetch$.next(undefined);
    }
    return refetch$;
  };

  const reset = () => sendResetMsg(dataSubjects, initialFetchStatus);

  return {
    fetch: fetchQuery,
    data$: dataSubjects,
    refetch$,
    subscribe,
    reset,
    inspectorAdapters,
    initialFetchStatus,
  };
}

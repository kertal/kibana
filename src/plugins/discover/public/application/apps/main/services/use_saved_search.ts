/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { merge, Subject, BehaviorSubject } from 'rxjs';
import { debounceTime, tap, filter } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { DiscoverServices } from '../../../../build_services';
import { DiscoverSearchSessionManager } from './discover_search_session';
import {
  IndexPattern,
  isCompleteResponse,
  SearchSource,
  tabifyAggResponse,
} from '../../../../../../data/common';
import { SavedSearch } from '../../../../saved_searches';
import { AppState, GetStateReturn } from './discover_state';
import { ElasticSearchHit } from '../../../doc_views/doc_views_types';
import { RequestAdapter } from '../../../../../../inspector/public';
import { fetchStatuses } from '../../../components/constants';
import { AutoRefreshDoneFn, search } from '../../../../../../data/public';
import { calcFieldCounts } from '../utils/calc_field_counts';
import { SEARCH_ON_PAGE_LOAD_SETTING } from '../../../../../common';
import { validateTimeRange } from '../utils/validate_time_range';
import { updateSearchSource } from '../utils/update_search_source';
import { SortOrder } from '../../../../saved_searches/types';
import { getDimensions, getChartAggConfigs } from '../utils';
import { buildPointSeriesData, Chart } from '../components/chart/point_series';
import { TimechartBucketInterval } from '../components/timechart_header/timechart_header';

export type SavedSearchSubject = BehaviorSubject<SavedSearchSubjectMessage>;
export type SavedSearchRefetchSubject = Subject<'reset' | undefined>;

export interface UseSavedSearch {
  refetch$: SavedSearchRefetchSubject;
  data$: SavedSearchSubject;
  shouldSearchOnPageLoad: () => boolean;
}

export interface SavedSearchSubjectMessage {
  bucketInterval?: TimechartBucketInterval;
  chartData?: Chart;
  fetchCounter?: number;
  fetchError?: Error;
  fieldCounts?: Record<string, number>;
  hits?: number;
  inspectorAdapters?: { requests: RequestAdapter };
  rows?: ElasticSearchHit[];
  state: string;
}

export const useSavedSearch = ({
  indexPattern,
  savedSearch,
  searchSessionManager,
  searchSource,
  services,
  state,
  stateContainer,
  useNewFieldsApi,
}: {
  indexPattern: IndexPattern;
  savedSearch: SavedSearch;
  searchSessionManager: DiscoverSearchSessionManager;
  searchSource: SearchSource;
  services: DiscoverServices;
  state: AppState;
  stateContainer: GetStateReturn;
  useNewFieldsApi: boolean;
}): UseSavedSearch => {
  const { data, filterManager, uiSettings } = services;
  const timefilter = data.query.timefilter.timefilter;

  const shouldSearchOnPageLoad = useCallback(() => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      uiSettings.get<boolean>(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  }, [uiSettings, savedSearch.id, searchSessionManager, timefilter]);

  /**
   * The observable the UI (aka React component) subscribes to get notified about
   * the changes in the data fetching process (high level: fetching started, data was received)
   */
  const savedSearch$: SavedSearchSubject = useMemo(
    () =>
      new BehaviorSubject({
        state: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
      }),
    [shouldSearchOnPageLoad]
  );
  /**
   * The observable to trigger data fetching in UI
   * By refetch$.next('reset') rows and fieldcounts are reset to allow e.g. editing of runtime fields
   * to be processed correctly
   */
  const refetch$ = useMemo(() => new Subject<'reset' | undefined>(), []);

  /**
   * Values that shouldn't trigger re-rendering when changed
   */
  const refs = useRef<{
    abortController?: AbortController;
    /**
     * used to compare a new state against an old one, to evaluate if data needs to be fetched
     */
    appState: AppState;
    /**
     * handler emitted by `timefilter.getAutoRefreshFetch$()`
     * to notify when data completed loading and to start a new autorefresh loop
     */
    autoRefreshDoneCb?: AutoRefreshDoneFn;
    fetchCounter: number;
    /**
     * needed to right auto refresh behavior, a new auto refresh shouldnt be triggered when
     * loading is still ongoing
     */
    fetchStatus: string;
    /**
     * needed for merging new with old field counts, high likely legacy, but kept this behavior
     * because not 100% sure in this case
     */
    fieldCounts: Record<string, number>;
  }>({
    appState: state,
    fetchCounter: 0,
    fieldCounts: {},
    fetchStatus: shouldSearchOnPageLoad() ? fetchStatuses.LOADING : fetchStatuses.UNINITIALIZED,
  });

  const fetchAll = useCallback(
    (reset = false) => {
      if (!validateTimeRange(timefilter.getTime(), services.toastNotifications)) {
        return Promise.reject();
      }
      const inspectorAdapters = { requests: new RequestAdapter() };

      if (refs.current.abortController) refs.current.abortController.abort();
      refs.current.abortController = new AbortController();
      const sessionId = searchSessionManager.getNextSearchSessionId();

      // Let the UI know, data fetching started
      const loadingMessage: SavedSearchSubjectMessage = {
        state: fetchStatuses.LOADING,
        fetchCounter: ++refs.current.fetchCounter,
      };

      if (reset) {
        // when runtime field was added, changed, deleted, index pattern was switched
        loadingMessage.rows = [];
        loadingMessage.fieldCounts = {};
      }
      savedSearch$.next(loadingMessage);
      refs.current.fetchStatus = loadingMessage.state;

      const { sort } = stateContainer.appStateContainer.getState();
      updateSearchSource({
        volatileSearchSource: searchSource,
        indexPattern,
        services,
        sort: sort as SortOrder[],
        useNewFieldsApi,
      });
      const chartAggConfigs =
        indexPattern.timeFieldName && !state.hideChart && state.interval
          ? getChartAggConfigs(searchSource, state.interval, data)
          : undefined;

      if (!chartAggConfigs) {
        searchSource.removeField('aggs');
      } else {
        searchSource.setField('aggs', chartAggConfigs.toDsl());
      }

      const searchSourceFetch$ = searchSource.fetch$({
        abortSignal: refs.current.abortController.signal,
        sessionId,
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitle', {
            defaultMessage: 'data',
          }),
          description: i18n.translate('discover.inspectorRequestDescriptionDocument', {
            defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
          }),
        },
      });

      searchSourceFetch$.pipe(filter((res) => isCompleteResponse(res))).subscribe(
        (res) => {
          const documents = res.rawResponse.hits.hits;

          const message: SavedSearchSubjectMessage = {
            state: fetchStatuses.COMPLETE,
            rows: documents,
            inspectorAdapters,
            fieldCounts: calcFieldCounts(
              reset ? {} : refs.current.fieldCounts,
              documents,
              indexPattern
            ),
            hits: res.rawResponse.hits.total as number,
          };

          if (chartAggConfigs) {
            const bucketAggConfig = chartAggConfigs!.aggs[1];
            const tabifiedData = tabifyAggResponse(chartAggConfigs, res.rawResponse);
            const dimensions = getDimensions(chartAggConfigs, data);
            if (dimensions) {
              if (bucketAggConfig && search.aggs.isDateHistogramBucketAggConfig(bucketAggConfig)) {
                message.bucketInterval = bucketAggConfig.buckets?.getInterval();
              }
              message.chartData = buildPointSeriesData(tabifiedData, dimensions);
            }
          }
          refs.current.fieldCounts = message.fieldCounts!;
          refs.current.fetchStatus = message.state;
          savedSearch$.next(message);
        },
        (error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          data.search.showError(error);
          refs.current.fetchStatus = fetchStatuses.ERROR;
          savedSearch$.next({
            state: fetchStatuses.ERROR,
            inspectorAdapters,
            fetchError: error,
          });
        },
        () => {
          refs.current.autoRefreshDoneCb?.();
          refs.current.autoRefreshDoneCb = undefined;
        }
      );
    },
    [
      timefilter,
      services,
      stateContainer.appStateContainer,
      searchSource,
      indexPattern,
      useNewFieldsApi,
      state.hideChart,
      state.interval,
      data,
      searchSessionManager,
      savedSearch$,
    ]
  );

  /**
   * This part takes care of triggering the data fetching by creating and subscribing
   * to an observable of various possible changes in state
   */
  useEffect(() => {
    const fetch$ = merge(
      refetch$,
      filterManager.getFetches$(),
      timefilter.getFetch$(),
      timefilter.getAutoRefreshFetch$().pipe(
        tap((done) => {
          refs.current.autoRefreshDoneCb = done;
        }),
        filter(() => refs.current.fetchStatus !== fetchStatuses.LOADING)
      ),
      data.query.queryString.getUpdates$(),
      searchSessionManager.newSearchSessionIdFromURL$
    ).pipe(debounceTime(100));

    const subscription = fetch$.subscribe((val) => {
      fetchAll(val === 'reset');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    data.query.queryString,
    filterManager,
    refetch$,
    searchSessionManager.newSearchSessionIdFromURL$,
    timefilter,
    fetchAll,
  ]);

  /**
   * Track state changes that should trigger a fetch
   */
  useEffect(() => {
    const prevAppState = refs.current.appState;

    // chart was hidden, now it should be displayed, so data is needed
    const chartDisplayChanged = state.hideChart !== prevAppState.hideChart && !state.hideChart;
    const chartIntervalChanged = state.interval !== prevAppState.interval;
    const docTableSortChanged = !isEqual(state.sort, prevAppState.sort);
    const indexPatternChanged = !isEqual(state.index, prevAppState.index);

    refs.current.appState = state;
    if (chartDisplayChanged || chartIntervalChanged || docTableSortChanged || indexPatternChanged) {
      refetch$.next(indexPatternChanged ? 'reset' : undefined);
    }
  }, [refetch$, state.interval, state.sort, state]);

  return {
    refetch$,
    data$: savedSearch$,
    shouldSearchOnPageLoad,
  };
};

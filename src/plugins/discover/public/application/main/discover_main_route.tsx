/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  type IKbnUrlStateStorage,
  redirectWhenMissing,
  SavedObjectNotFound,
} from '@kbn/kibana-utils-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { getSavedSearchFullPathUrl } from '@kbn/saved-search-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { withSuspense } from '@kbn/shared-ux-utility';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { useInternalStateSelector } from './state_management/discover_internal_state_container';
import { useUrl } from './hooks/use_url';
import { useDiscoverStateContainer } from './hooks/use_discover_state_container';
import { MainHistoryLocationState } from '../../../common';
import { DiscoverMainApp } from './discover_main_app';
import { setBreadcrumbs } from '../../utils/breadcrumbs';
import { LoadingIndicator } from '../../components/common/loading_indicator';
import { DiscoverError } from '../../components/common/error_alert';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useAlertResultsToast } from './hooks/use_alert_results_toast';
import { DiscoverMainProvider } from './state_management/discover_state_provider';
import {
  CustomizationCallback,
  DiscoverCustomizationContext,
  DiscoverCustomizationProvider,
  useDiscoverCustomizationService,
} from '../../customizations';
import { DiscoverTopNavInline } from './components/top_nav/discover_topnav_inline';
import { DiscoverStateContainer, LoadParams } from './state_management/discover_state';
import { DataSourceType, isDataSourceType } from '../../../common/data_sources';
import { useRootProfile } from '../../context_awareness';

const DiscoverMainAppMemoized = memo(DiscoverMainApp);

interface DiscoverLandingParams {
  id: string;
}

export interface MainRouteProps {
  customizationCallbacks?: CustomizationCallback[];
  stateStorageContainer?: IKbnUrlStateStorage;
  customizationContext: DiscoverCustomizationContext;
}

export function DiscoverMainRoute({
  customizationCallbacks = [],
  customizationContext,
  stateStorageContainer,
}: MainRouteProps) {
  const history = useHistory();
  const services = useDiscoverServices();
  const {
    core,
    chrome,
    data,
    toastNotifications,
    http: { basePath },
    dataViewEditor,
    share,
    getScopedHistory,
  } = services;
  const { id: savedSearchId } = useParams<DiscoverLandingParams>();
  const [stateContainer, { reset: resetStateContainer }] = useDiscoverStateContainer({
    history,
    services,
    customizationContext,
    stateStorageContainer,
  });
  const { customizationService, isInitialized: isCustomizationServiceInitialized } =
    useDiscoverCustomizationService({
      customizationCallbacks,
      stateContainer,
    });
  const [error, setError] = useState<Error>();
  const [noDataState, setNoDataState] = useState({
    hasESData: false,
    hasUserDataView: false,
    showNoDataPage: false,
  });
  const hasCustomBranding = useObservable(core.customBranding.hasCustomBranding$, false);

  /**
   * Get location state of scoped history only on initial load
   */
  const historyLocationState = useMemo(
    () => getScopedHistory<MainHistoryLocationState>()?.location.state,
    [getScopedHistory]
  );

  useAlertResultsToast({
    isAlertResults: historyLocationState?.isAlertResults,
    toastNotifications,
  });

  useExecutionContext(core.executionContext, {
    type: 'application',
    page: 'app',
    id: savedSearchId || 'new',
  });
  /**
   * Helper function to determine when to skip the no data page
   */
  const skipNoDataPage = useCallback(
    async (nextDataView?: DataView) => {
      try {
        const { dataSource } = stateContainer.appState.getState();
        const isEsqlQuery = isDataSourceType(dataSource, DataSourceType.Esql);

        // ES|QL should work without data views
        // Given we have a saved search id, we can skip the data/data view check, too
        // A given nextDataView is provided by the user, and therefore we can skip the data/data view check

        if (savedSearchId || isEsqlQuery || nextDataView) {
          if (!isEsqlQuery) {
            await stateContainer.actions.loadDataViewList();
          }
          return true;
        }

        const [hasUserDataViewValue, hasESDataValue, defaultDataViewExists] = await Promise.all([
          data.dataViews.hasData.hasUserDataView().catch(() => false),
          data.dataViews.hasData.hasESData().catch(() => false),
          data.dataViews.defaultDataViewExists().catch(() => false),
          stateContainer.actions.loadDataViewList(),
        ]);

        if (!hasUserDataViewValue || !defaultDataViewExists) {
          setNoDataState({
            showNoDataPage: true,
            hasESData: hasESDataValue,
            hasUserDataView: hasUserDataViewValue,
          });
          return false;
        }
        return true;
      } catch (e) {
        setError(e);
        return false;
      }
    },
    [data.dataViews, savedSearchId, stateContainer]
  );

  const loadSavedSearch = useCallback(
    async ({
      nextDataView,
      initialAppState,
    }: { nextDataView?: DataView; initialAppState?: LoadParams['initialAppState'] } = {}) => {
      const loadSavedSearchStartTime = window.performance.now();
      stateContainer.actions.setIsLoading(true);

      const skipNoData = await skipNoDataPage(nextDataView);
      if (!skipNoData) {
        stateContainer.actions.setIsLoading(false);
        return;
      }
      try {
        const currentSavedSearch = await stateContainer.actions.loadSavedSearch({
          savedSearchId,
          dataView: nextDataView,
          dataViewSpec: historyLocationState?.dataViewSpec,
          initialAppState,
        });
        if (customizationContext.displayMode === 'standalone') {
          if (currentSavedSearch?.id) {
            chrome.recentlyAccessed.add(
              getSavedSearchFullPathUrl(currentSavedSearch.id),
              currentSavedSearch.title ?? '',
              currentSavedSearch.id
            );
          }

          setBreadcrumbs({ services, titleBreadcrumbText: currentSavedSearch?.title ?? undefined });
        }
        stateContainer.actions.setIsLoading(false);
        if (services.analytics) {
          const loadSavedSearchDuration = window.performance.now() - loadSavedSearchStartTime;
          reportPerformanceMetricEvent(services.analytics, {
            eventName: 'discoverLoadSavedSearch',
            duration: loadSavedSearchDuration,
          });
        }
      } catch (e) {
        if (e instanceof SavedObjectNotFound) {
          redirectWhenMissing({
            history,
            navigateToApp: core.application.navigateToApp,
            basePath,
            mapping: {
              search: '/',
              'index-pattern': {
                app: 'management',
                path: `kibana/objects/savedSearches/${savedSearchId}`,
              },
            },
            toastNotifications,
            onBeforeRedirect() {
              services.urlTracker.setTrackedUrl('/');
            },
            theme: core.theme,
          })(e);
        } else {
          setError(e);
        }
      }
    },
    [
      skipNoDataPage,
      stateContainer,
      savedSearchId,
      historyLocationState?.dataViewSpec,
      customizationContext.displayMode,
      services,
      chrome.recentlyAccessed,
      history,
      core.application.navigateToApp,
      core.theme,
      basePath,
      toastNotifications,
    ]
  );

  useEffect(() => {
    if (!isCustomizationServiceInitialized) return;
    stateContainer.actions.setIsLoading(true);
    setNoDataState({
      hasESData: false,
      hasUserDataView: false,
      showNoDataPage: false,
    });
    setError(undefined);
    if (savedSearchId) {
      loadSavedSearch();
    } else {
      // restore the previously selected data view for a new state (when a saved search was open)
      loadSavedSearch(getLoadParamsForNewSearch(stateContainer));
    }
  }, [isCustomizationServiceInitialized, loadSavedSearch, savedSearchId, stateContainer]);

  // secondary fetch: in case URL is set to `/`, used to reset to 'new' state, keeping the current data view
  useUrl({
    history,
    savedSearchId,
    onNewUrl: () => {
      // restore the previously selected data view for a new state
      loadSavedSearch(getLoadParamsForNewSearch(stateContainer));
    },
  });

  const onDataViewCreated = useCallback(
    async (nextDataView: unknown) => {
      if (nextDataView) {
        stateContainer.actions.setIsLoading(true);
        setNoDataState((state) => ({ ...state, showNoDataPage: false }));
        setError(undefined);
        await loadSavedSearch({ nextDataView: nextDataView as DataView });
      }
    },
    [loadSavedSearch, stateContainer]
  );

  const onESQLNavigationComplete = useCallback(async () => {
    resetStateContainer();
  }, [resetStateContainer]);

  const noDataDependencies = useMemo(
    () => ({
      coreStart: core,
      dataViews: {
        ...data.dataViews,
        hasData: {
          ...data.dataViews.hasData,

          // We've already called this, so we can optimize the analytics services to
          // use the already-retrieved data to avoid a double-call.
          hasESData: () => Promise.resolve(noDataState.hasESData),
          hasUserDataView: () => Promise.resolve(noDataState.hasUserDataView),
        },
      },
      share,
      dataViewEditor,
      noDataPage: services.noDataPage,
    }),
    [core, data.dataViews, dataViewEditor, noDataState, services.noDataPage, share]
  );

  const loadingIndicator = useMemo(
    () => <LoadingIndicator type={hasCustomBranding ? 'spinner' : 'elastic'} />,
    [hasCustomBranding]
  );

  const mainContent = useMemo(() => {
    if (noDataState.showNoDataPage) {
      const importPromise = import('@kbn/shared-ux-page-analytics-no-data');
      const AnalyticsNoDataPageKibanaProvider = withSuspense(
        React.lazy(() =>
          importPromise.then(({ AnalyticsNoDataPageKibanaProvider: NoDataProvider }) => {
            return { default: NoDataProvider };
          })
        )
      );
      const AnalyticsNoDataPage = withSuspense(
        React.lazy(() =>
          importPromise.then(({ AnalyticsNoDataPage: NoDataPage }) => {
            return { default: NoDataPage };
          })
        )
      );

      return (
        <AnalyticsNoDataPageKibanaProvider {...noDataDependencies}>
          <AnalyticsNoDataPage
            onDataViewCreated={onDataViewCreated}
            onESQLNavigationComplete={onESQLNavigationComplete}
          />
        </AnalyticsNoDataPageKibanaProvider>
      );
    }

    return <DiscoverMainAppMemoized stateContainer={stateContainer} />;
  }, [
    noDataDependencies,
    onDataViewCreated,
    onESQLNavigationComplete,
    noDataState.showNoDataPage,
    stateContainer,
  ]);

  const { solutionNavId } = customizationContext;
  const { rootProfileLoading } = useRootProfile({ solutionNavId });

  if (error) {
    return <DiscoverError error={error} />;
  }

  if (!customizationService || rootProfileLoading) {
    return loadingIndicator;
  }

  return (
    <DiscoverCustomizationProvider value={customizationService}>
      <DiscoverMainProvider value={stateContainer}>
        <DiscoverMainLoading
          mainContent={mainContent}
          showNoDataPage={noDataState.showNoDataPage}
          stateContainer={stateContainer}
        />
      </DiscoverMainProvider>
    </DiscoverCustomizationProvider>
  );
}
// eslint-disable-next-line import/no-default-export
export default DiscoverMainRoute;

export function DiscoverMainLoading({
  stateContainer,
  showNoDataPage,
  mainContent,
}: {
  stateContainer: DiscoverStateContainer;
  showNoDataPage: boolean;
  mainContent: JSX.Element;
}) {
  const loading = useInternalStateSelector((state) => state.isLoading);

  return (
    <>
      <DiscoverTopNavInline
        stateContainer={stateContainer}
        hideNavMenuItems={showNoDataPage || loading}
      />
      {loading && !showNoDataPage ? <LoadingIndicator /> : mainContent}
    </>
  );
}

function getLoadParamsForNewSearch(stateContainer: DiscoverStateContainer): {
  nextDataView: LoadParams['dataView'];
  initialAppState: LoadParams['initialAppState'];
} {
  const prevAppState = stateContainer.appState.getState();
  const prevDataView = stateContainer.internalState.getState().dataView;
  const initialAppState =
    isDataSourceType(prevAppState.dataSource, DataSourceType.Esql) &&
    prevDataView &&
    prevDataView.type === ESQL_TYPE
      ? {
          // reset to a default ES|QL query
          query: {
            esql: getInitialESQLQuery(prevDataView),
          },
        }
      : undefined;
  return {
    nextDataView: prevDataView,
    initialAppState,
  };
}

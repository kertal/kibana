/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/public';
import { AppStateContainer } from '../services/discover_app_state_container';
import { DiscoverInternalState } from '../services/discover_internal_state_container';
import { DiscoverServices } from '../../../build_services';
import { loadDataViewBySavedSearch } from '../load_data_view_by_saved_search';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';

export const loadSavedSearch = async (
  id: string,
  {
    services,
    appStateContainer,
    internalStateContainer,
    setError,
    dataViewSpec,
  }: {
    services: DiscoverServices;
    appStateContainer: AppStateContainer;
    internalStateContainer: DiscoverInternalState;
    setError: (e: Error) => void;
    dataViewSpec?: DataViewSpec;
  }
) => {
  const currentSavedSearch = await getSavedSearch(id, {
    search: services.data.search,
    savedObjectsClient: services.core.savedObjects.client,
    spaces: services.spaces,
    savedObjectsTagging: services.savedObjectsTagging,
  });

  const currentDataView = await loadDataViewBySavedSearch(
    currentSavedSearch,
    appStateContainer,
    internalStateContainer,

    services,
    setError,
    dataViewSpec
  );

  if (!currentDataView) {
    return;
  }
  if (!currentSavedSearch.searchSource.getField('index')) {
    currentSavedSearch.searchSource.setField('index', currentDataView);
  }
  internalStateContainer.transitions.setDataView(currentDataView);

  restoreStateFromSavedSearch({
    savedSearch: currentSavedSearch,
    timefilter: services.timefilter,
  });
  return currentSavedSearch;
};

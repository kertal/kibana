/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverAppStateContainer } from './discover_app_state_container';
import { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import { addLog } from '../../../utils/add_log';

export const loadSavedSearch = async (
  id: string | undefined,
  dataView: DataView | undefined,
  {
    appStateContainer,
    savedSearchContainer,
  }: {
    appStateContainer: DiscoverAppStateContainer;
    savedSearchContainer: DiscoverSavedSearchContainer;
  }
): Promise<SavedSearch> => {
  addLog('[discoverState] loadSavedSearch');
  const isEmptyURL = appStateContainer.isEmptyURL();
  const isPersistedSearch = typeof id === 'string';
  if (isEmptyURL && isPersistedSearch) {
    appStateContainer.set({});
  }
  const appState = !isEmptyURL ? appStateContainer.getState() : undefined;
  let nextSavedSearch = isPersistedSearch
    ? await savedSearchContainer.load(id, dataView)
    : await savedSearchContainer.new(dataView);

  if (appState) {
    nextSavedSearch = savedSearchContainer.update({
      nextDataView: nextSavedSearch.searchSource.getField('index'),
      nextState: appState,
    });
  }

  await appStateContainer.resetWithSavedSearch(nextSavedSearch);

  return nextSavedSearch;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SortOrder } from '@kbn/saved-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  MODIFY_COLUMNS_ON_SWITCH,
  SORT_DEFAULT_ORDER_SETTING,
  DEFAULT_COLUMNS_SETTING,
} from '@kbn/discover-utils';
import { DiscoverInternalStateContainer } from '../discover_internal_state_container';
import { DiscoverAppStateContainer } from '../discover_app_state_container';
import { addLog } from '../../../../utils/add_log';
import { DiscoverServices } from '../../../../build_services';
import { getDataViewAppState } from './get_switch_data_view_app_state';

/**
 * Function executed when switching data view in the UI
 */
export async function changeDataView(
  id: string | DataView,
  {
    services,
    internalState,
    appState,
  }: {
    services: DiscoverServices;
    internalState: DiscoverInternalStateContainer;
    appState: DiscoverAppStateContainer;
  }
) {
  addLog('[ui] changeDataView', { id });

  const { dataViews, uiSettings } = services;
  const dataView = internalState.getState().dataView;
  const state = appState.getState();
  let nextDataView: DataView | null = null;

  internalState.transitions.setIsDataViewLoading(true);

  try {
    nextDataView = typeof id === 'string' ? await dataViews.get(id, false) : id;
  } catch (e) {
    //
  }

  if (nextDataView && dataView) {
    const nextAppState = getDataViewAppState(
      dataView,
      nextDataView,
      uiSettings.get(DEFAULT_COLUMNS_SETTING, []),
      state.columns || [],
      (state.sort || []) as SortOrder[],
      uiSettings.get(MODIFY_COLUMNS_ON_SWITCH),
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
      state.query
    );

    appState.update(nextAppState);

    if (internalState.getState().expandedDoc) {
      internalState.transitions.setExpandedDoc(undefined);
    }
  }

  internalState.transitions.setIsDataViewLoading(false);
  internalState.transitions.setShouldUseDefaultProfileState(true);
}

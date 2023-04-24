/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { useAppStateSelector } from '../services/discover_app_state_container';
import { useInternalStateSelector } from '../services/discover_internal_state_container';
import { isPlainRecord } from '../utils/get_raw_record_type';
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../../../constants';
import { useConfirmPersistencePrompt } from '../../../hooks/use_confirm_persistence_prompt';
import { DiscoverStateContainer } from '../services/discover_state';

export const useAdHocDataViews = ({
  stateContainer,
  trackUiMetric,
}: {
  stateContainer: DiscoverStateContainer;
  trackUiMetric?: (metricType: string, eventName: string | string[], count?: number) => void;
}) => {
  const query = useAppStateSelector((state) => state.query);
  const dataView = useInternalStateSelector((state) => state.dataView);
  const isTextBasedMode = isPlainRecord(query);

  useEffect(() => {
    if (dataView && !dataView.isPersisted()) {
      trackUiMetric?.(METRIC_TYPE.COUNT, ADHOC_DATA_VIEW_RENDER_EVENT);
    }
  }, [dataView, isTextBasedMode, trackUiMetric]);

  const { openConfirmSavePrompt, updateSavedSearch } = useConfirmPersistencePrompt(stateContainer);
  const persistDataView = useCallback(async () => {
    const currentDataView = stateContainer.internalState.getState().dataView;
    const savedSearch = stateContainer.savedSearchState.getState();
    if (!currentDataView || currentDataView.isPersisted()) {
      return currentDataView;
    }

    const createdDataView = await openConfirmSavePrompt(currentDataView);
    if (!createdDataView) {
      return; // persistance cancelled
    }

    if (savedSearch.id) {
      // update saved search with saved data view
      const currentState = stateContainer.appState.getState();
      await updateSavedSearch({ savedSearch, dataView: createdDataView, state: currentState });
    }

    return createdDataView;
  }, [stateContainer, openConfirmSavePrompt, updateSavedSearch]);

  return { persistDataView };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useEffect } from 'react';
import { History } from 'history';
import { FetchStatus } from '../../types';
import { DiscoverStateContainer } from '../services/discover_state';
export function useUrl({
  history,
  stateContainer,
}: {
  history: History;
  stateContainer: DiscoverStateContainer;
}) {
  /**
   * Url / Routing logic
   */
  useEffect(() => {
    // this listener is waiting for such a path http://localhost:5601/app/discover#/
    // which could be set through pressing "New" button in top nav or go to "Discover" plugin from the sidebar
    // to reload the page in a right way
    const unlistenHistoryBasePath = history.listen(async ({ pathname, search, hash }) => {
      if (!search && !hash && pathname === '/' && !stateContainer.savedSearchState.get().id) {
        await stateContainer.actions.loadSavedSearch();
        if (stateContainer.dataState.getInitialFetchStatus() === FetchStatus.LOADING) {
          stateContainer.dataState.fetch();
        }
      }
    });
    return () => unlistenHistoryBasePath();
  }, [history, stateContainer]);
}

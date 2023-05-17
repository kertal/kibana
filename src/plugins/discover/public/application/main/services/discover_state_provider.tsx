/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SharedStateProvider } from './discover_shared_state_container';
import { DiscoverAppStateProvider } from './discover_app_state_container';
import { DiscoverStateContainer } from './discover_state';

function createStateHelpers() {
  const context = React.createContext<DiscoverStateContainer | null>(null);
  const useContainer = () => useContext(context);
  const useSavedSearch = () => {
    const container = useContainer();
    return useObservable<SavedSearch>(
      container!.savedSearchState.getCurrent$(),
      container!.savedSearchState.getCurrent$().getValue()
    );
  };
  const useSavedSearchInitial = () => {
    const container = useContainer();
    return useObservable<SavedSearch>(
      container!.savedSearchState.getInitial$(),
      container!.savedSearchState.getInitial$().getValue()
    );
  };
  return {
    Provider: context.Provider,
    useSavedSearch,
    useSavedSearchInitial,
  };
}

export const {
  Provider: DiscoverStateProvider,
  useSavedSearchInitial,
  useSavedSearch,
} = createStateHelpers();

export const DiscoverMainProvider = ({
  value,
  children,
}: {
  value: DiscoverStateContainer;
  children: React.ReactElement;
}) => {
  return (
    <DiscoverStateProvider value={value}>
      <DiscoverAppStateProvider value={value.appState}>
        <SharedStateProvider value={value.sharedState}>{children}</SharedStateProvider>
      </DiscoverAppStateProvider>
    </DiscoverStateProvider>
  );
};

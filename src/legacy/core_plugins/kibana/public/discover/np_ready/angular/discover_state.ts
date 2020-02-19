/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';
import { createHashHistory, History } from 'history';
import {
  createStateContainer,
  createKbnUrlStateStorage,
  syncStates,
  ReduxLikeStateContainer,
} from '../../../../../../../plugins/kibana_utils/public';
import { esFilters, Filter, Query } from '../../../../../../../plugins/data/public';

interface AppState {
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * id of the used index pattern
   */
  index?: string;
  /**
   * Used interval of the histogram
   */
  interval?: string;
  /**
   * Lucence or KQL query
   */
  query?: Query;
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
}

interface GlobalState {
  /**
   * Array of applied filters
   */
  filters?: Filter[];
  /**
   * Time filter
   */
  time?: { from: string; to: string };
}

interface GetStateParams {
  /**
   * Default state used for merging with with URL state to get the initial state
   */
  defaultAppState?: AppState;
  /**
   * Determins the use of long vs. short/hashed urls
   */
  storeInSessionStorage?: boolean;
  /**
   * Browser history used for testing
   */
  hashHistory?: History;
}

export interface GetStateReturn {
  /**
   * Global state, the _g part of the URL
   */
  globalStateContainer: ReduxLikeStateContainer<GlobalState>;
  /**
   * App state, the _a part of the URL
   */
  appStateContainer: ReduxLikeStateContainer<AppState>;
  /**
   * Start sync between state and URL
   */
  startSync: () => void;
  /**
   * Stop sync between state and URL
   */
  stopSync: () => void;
  /**
   * Set app state to with a partial new app state
   */
  setAppState: (newState: Partial<AppState>) => void;
  /**
   * Set global state to with a partial new app state
   */
  setGlobalState: (newState: Partial<GlobalState>) => void;
  /**
   * Get global filters
   */
  getGlobalFilters: () => Filter[];
  /**
   * Get global filters
   */
  getAppFilters: () => Filter[];
  /**
   * Sync state to URL, used for testing
   */
  flushToUrl: () => void;
  /**
   * Reset initial state to the current app state
   */
  resetInitialAppState: () => void;
  /**
   * Returns whether the current app state is different to the initial state
   */
  isAppStateDirty: () => void;
  /**
   * Replace the current URL with the current state without adding another browser history entry
   */
  replaceUrlState: (startSync: boolean) => Promise<void>;
}
const GLOBAL_STATE_URL_KEY = '_g';
const APP_STATE_URL_KEY = '_a';

/**
 * Builds and returns appState and globalState containers and helper functions
 * Used to sync URL with UI state
 */
export function getState({
  defaultAppState = {},
  storeInSessionStorage = false,
  hashHistory,
}: GetStateParams): GetStateReturn {
  const stateStorage = createKbnUrlStateStorage({
    useHash: storeInSessionStorage,
    history: hashHistory ? hashHistory : createHashHistory(),
  });

  const globalStateInitial = stateStorage.get(GLOBAL_STATE_URL_KEY) as GlobalState;
  const globalStateContainer = createStateContainer<GlobalState>(globalStateInitial || {});

  const appStateFromUrl = stateStorage.get(APP_STATE_URL_KEY) as AppState;
  let initialAppState = {
    ...defaultAppState,
    ...appStateFromUrl,
  };

  const appStateContainer = createStateContainer<AppState>(initialAppState);

  const { start, stop } = syncStates([
    {
      storageKey: GLOBAL_STATE_URL_KEY,
      stateContainer: {
        ...globalStateContainer,
        // handle null value when url switch doesn't contain state info
        ...{ set: value => value && globalStateContainer.set(value) },
      },
      stateStorage,
    },
    {
      storageKey: APP_STATE_URL_KEY,
      stateContainer: {
        ...appStateContainer,
        // handle null value when url switch doesn't contain state info
        ...{ set: value => value && appStateContainer.set(value) },
      },
      stateStorage,
    },
  ]);

  return {
    globalStateContainer,
    appStateContainer,
    startSync: start,
    stopSync: stop,
    setGlobalState: (newPartial: GlobalState) => setState(globalStateContainer, newPartial),
    setAppState: (newPartial: AppState) => setState(appStateContainer, newPartial),
    getGlobalFilters: () => getFilters(globalStateContainer.getState()),
    getAppFilters: () => getFilters(appStateContainer.getState()),
    resetInitialAppState: () => {
      initialAppState = appStateContainer.getState();
    },
    flushToUrl: () => stateStorage.flush(),
    isAppStateDirty: () => !isEqualState(initialAppState, appStateContainer.getState()),
    replaceUrlState: async (startSync = true) => {
      if (globalStateContainer.getState()) {
        await stateStorage.set(GLOBAL_STATE_URL_KEY, globalStateContainer.getState(), {
          replace: true,
        });
      }
      if (appStateContainer.getState()) {
        await stateStorage.set(APP_STATE_URL_KEY, appStateContainer.getState(), { replace: true });
      }
      if (startSync) {
        start();
      }
    },
  };
}

/**
 * Helper function to merge a given new state with the existing state and to set the given state
 * container
 */
export function setState(
  stateContainer: ReduxLikeStateContainer<AppState | GlobalState>,
  newState: AppState | GlobalState
) {
  const oldState = stateContainer.getState();
  const mergedState = { ...oldState, ...newState };
  if (!isEqualState(oldState, mergedState)) {
    stateContainer.set(mergedState);
  }
}

/**
 * Helper function to compare 2 different filter states
 */
export function isEqualFilters(filtersA: Filter[], filtersB: Filter[]) {
  if (!filtersA && !filtersB) {
    return true;
  } else if (!filtersA || !filtersB) {
    return false;
  }
  return esFilters.compareFilters(filtersA, filtersB, esFilters.COMPARE_ALL_OPTIONS);
}

/**
 * helper function to extract filters of the given state
 * returns a state object without filters and an array of filters
 */
export function splitState(state: AppState | GlobalState = {}) {
  const { filters = [], ...statePartial } = state;
  return { filters, state: statePartial };
}

/**
 * Helper function to compare 2 different state, is needed since comparing filters
 * works differently
 */
export function isEqualState(stateA: AppState | GlobalState, stateB: AppState | GlobalState) {
  if (!stateA && !stateB) {
    return true;
  } else if (!stateA || !stateB) {
    return false;
  }
  const { filters: stateAFilters = [], ...stateAPartial } = stateA;
  const { filters: stateBFilters = [], ...stateBPartial } = stateB;
  return _.isEqual(stateAPartial, stateBPartial) && isEqualFilters(stateAFilters, stateBFilters);
}

/**
 * Helper function to return array of filter object of a given state
 */
const getFilters = (state: AppState | GlobalState): Filter[] => {
  if (!state || !Array.isArray(state.filters)) {
    return [];
  }
  return state.filters;
};

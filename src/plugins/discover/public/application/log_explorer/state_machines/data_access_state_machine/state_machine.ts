/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assign, createMachine, InterpreterFrom } from 'xstate';
import { updateChunksFromLoadAround } from './load_around_service';
import { prependNewTopChunk, updateChunksFromLoadBefore } from './load_before_service';
import { LogExplorerContext, LogExplorerEvent, LogExplorerState } from './types';
import { areVisibleEntriesNearEnd, areVisibleEntriesNearStart } from './visible_entry_guards';

// for stubbing guards until all are implemented
const constantGuard =
  <Value extends unknown>(value: Value) =>
  () =>
    value;

export const dataAccessStateMachine = createMachine<
  LogExplorerContext,
  LogExplorerEvent,
  LogExplorerState
>(
  {
    id: 'logExplorerData',
    initial: 'loadingAround',
    states: {
      loadingAround: {
        entry: 'resetChunks',
        invoke: {
          src: 'loadAround',
          id: 'loadAround',
        },
        on: {
          loadAroundSucceeded: {
            actions: 'updateChunksFromLoadAround',
            target: 'loaded',
          },
          positionChanged: {
            target: 'loadingAround',
            internal: false,
          },
          loadAroundFailed: {
            target: 'failedNoData',
          },
          timeRangeChanged: {},
          columnsChanged: {},
        },
      },
      loaded: {
        type: 'parallel',
        states: {
          top: {
            initial: 'start',
            states: {
              start: {
                always: [
                  {
                    cond: 'succeededTop',
                    target: 'loaded',
                  },
                  {
                    cond: '!succeededTop',
                    target: 'failed',
                  },
                ],
              },
              failed: {
                on: {
                  retryTop: {
                    target: '#logExplorerData.extendingTop',
                  },
                },
              },
              loaded: {
                on: {
                  positionChanged: {
                    cond: 'isPositionNearStart',
                    target: '#logExplorerData.loadingTop',
                  },
                  visibleEntriesChanged: {
                    cond: 'areVisibleEntriesNearStart',
                    target: '#logExplorerData.loadingTop',
                  },
                },
              },
            },
          },
          bottom: {
            initial: 'start',
            states: {
              start: {
                always: [
                  {
                    cond: 'succeededBottom',
                    target: 'loaded',
                  },
                  {
                    cond: '!succeededBottom',
                    target: 'failed',
                  },
                ],
              },
              failed: {
                on: {
                  retryBottom: {
                    target: '#logExplorerData.extendingBottom',
                  },
                },
              },
              loaded: {
                on: {
                  positionChanged: {
                    cond: 'isPositionNearEnd',
                    target: '#logExplorerData.loadingBottom',
                  },
                  visibleEntriesChanged: {
                    cond: 'areVisibleEntriesNearEnd',
                    target: '#logExplorerData.loadingBottom',
                  },
                },
              },
            },
          },
        },
        on: {
          positionChanged: {
            cond: '!isWithinLoadedChunks',
            target: 'loadingAround',
          },
          timeRangeChanged: [
            {
              actions: 'extendTopChunk',
              cond: 'startTimestampExtendsLoadedTop',
              target: 'extendingTop',
            },
            {
              actions: 'reduceTopChunk',
              cond: 'startTimestampReducesLoadedTop',
            },
            {
              actions: 'extendBottomChunk',
              cond: 'endTimestampExtendsLoadedBottom',
              target: 'extendingBottom',
            },
            {
              actions: 'reduceBottomChunk',
              cond: 'endTimestampReducesLoadedBottom',
            },
            {
              actions: 'resetPosition',
              target: 'loadingAround',
            },
          ],
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      failedNoData: {
        on: {
          positionChanged: {
            target: 'loadingAround',
          },
          retry: {
            target: 'loadingAround',
          },
          filtersChanged: {
            target: 'loadingAround',
          },
          timeRangeChanged: {
            target: 'loadingAround',
          },
        },
      },
      loadingTop: {
        entry: 'prependNewTopChunk',
        invoke: {
          src: 'loadBefore',
          id: 'loadBefore',
        },
        on: {
          loadBeforeSucceeded: {
            actions: 'updateChunksFromLoadBefore',
            target: '#logExplorerData.loaded.top.loaded',
          },
          loadBeforeFailed: {
            actions: 'updateChunksFromLoadBefore',
            target: '#logExplorerData.loaded.top.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      loadingBottom: {
        entry: 'appendNewBottomChunk',
        invoke: {
          src: 'loadAfter',
          id: 'loadAfter',
        },
        on: {
          loadAfterSucceeded: {
            actions: 'updateChunksFromLoadAfter',
            target: '#logExplorerData.loaded.bottom.loaded',
          },
          loadAfterFailed: {
            actions: 'updateChunksFromLoadAfter',
            target: '#logExplorerData.loaded.bottom.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      extendingTop: {
        invoke: {
          src: 'extendTop',
          id: 'extendTop',
        },
        on: {
          extendTopSucceeded: {
            actions: 'updateChunksFromExtendTop',
            target: '#logExplorerData.loaded.top.loaded',
          },
          extendTopFailed: {
            actions: 'updateChunksFromExtendTop',
            target: '#logExplorerData.loaded.top.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      extendingBottom: {
        invoke: {
          src: 'extendBottom',
          id: 'extendBottom',
        },
        on: {
          extendBottomSucceeded: {
            actions: 'updateChunksFromExtendBottom',
            target: '#logExplorerData.loaded.bottom.loaded',
          },
          extendBottomFailed: {
            actions: 'updateChunksFromExtendBottom',
            target: '#logExplorerData.loaded.bottom.failed',
          },
          columnsChanged: {
            target: 'reloading',
          },
        },
      },
      reloading: {
        invoke: {
          src: 'reload',
          id: 'reload',
        },
        on: {
          reloadFailed: {
            target: 'failedNoData',
          },
          reloadSucceeded: {
            actions: 'updateChunksFromReload',
            target: 'loaded',
          },
        },
      },
      uninitialized: {
        on: {
          positionChanged: {
            target: 'loadingAround',
          },
          timeRangeChanged: {
            target: 'loadingAround',
          },
          columnsChanged: {
            target: 'loadingAround',
          },
        },
      },
    },
    on: {
      filtersChanged: {
        target: '.loadingAround',
      },
      dataViewChanged: {
        target: '.loadingAround',
      },
    },
  },
  {
    actions: {
      resetChunks: assign((context) => ({
        ...context,
        topChunk: {
          status: 'uninitialized' as const,
        },
        bottomChunk: {
          status: 'uninitialized' as const,
        },
      })),
      updateChunksFromLoadAround,
      updateChunksFromLoadBefore,
      prependNewTopChunk,
    },
    guards: {
      areVisibleEntriesNearStart,
      areVisibleEntriesNearEnd,
      succeededTop: constantGuard(true),
      succeededBottom: constantGuard(true),
      isPositionNearStart: constantGuard(false),
      isPositionNearEnd: constantGuard(false),
      isWithinLoadedChunks: constantGuard(false),
      startTimestampExtendsLoadedTop: constantGuard(false),
      startTimestampReducesLoadedTop: constantGuard(false),
      endTimestampExtendsLoadedBottom: constantGuard(false),
      endTimestampReducesLoadedBottom: constantGuard(false),
    },
  }
);

export type DataAccessStateMachine = typeof dataAccessStateMachine;
export type DataAccessService = InterpreterFrom<DataAccessStateMachine>;

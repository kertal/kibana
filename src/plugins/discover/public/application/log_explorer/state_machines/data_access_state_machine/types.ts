/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { LogExplorerChunk, LogExplorerPosition } from '../../types';
import { LoadAfterEvent } from './load_after_service';
import { LoadAroundEvent } from './load_around_service';
import { LoadBeforeEvent } from './load_before_service';
import { LoadTailEvent } from './load_tail_service';

export interface LogExplorerContext {
  configuration: {
    chunkSize: number;
    minimumChunkOverscan: number;
  };
  dataView: DataView;
  position: LogExplorerPosition;
  timeRange: TimeRange;
  filters: Filter[];
  query: LogExplorerQuery | undefined;

  topChunk: LogExplorerChunk;
  bottomChunk: LogExplorerChunk;
}

export type LogExplorerQuery = Query | AggregateQuery;

export type LogExplorerLoadedChunkState = 'empty' | 'loaded' | 'failed';

export interface LogExplorerState {
  value:
    | 'uninitialized' // not used yet, but there's a setting that disables automatic initial search
    | 'loadingAround'
    | 'failedNoData'
    | 'loaded'
    | { loaded: { top: LogExplorerLoadedChunkState; bottom: LogExplorerLoadedChunkState } }
    | 'loadingTop'
    | 'loadingBottom'
    | 'extendingTop'
    | 'extendingBottom'
    | 'tailing'
    | { tailing: 'loading' | 'loaded' };
  context: LogExplorerContext;
}

export type LogExplorerExternalEvent =
  | {
      type: 'columnsChanged';
      columns: string[];
    }
  | {
      type: 'timeRangeChanged';
      timeRange: TimeRange;
    }
  | {
      type: 'filtersChanged';
      filters: Filter[];
      query: LogExplorerQuery;
    }
  | {
      type: 'dataViewChanged';
      dataView: DataView;
    }
  | {
      type: 'positionChanged';
      position: LogExplorerPosition;
    }
  | {
      type: 'visibleEntriesChanged';
      visibleStartRowIndex: number;
      visibleEndRowIndex: number;
    }
  | {
      type: 'startedReload';
    };

export type LogExplorerInternalEvent =
  | {
      type: 'retry';
    }
  | {
      type: 'retryBottom';
    }
  | {
      type: 'retryTop';
    }
  | LoadAroundEvent
  | LoadBeforeEvent
  | LoadAfterEvent
  | LoadTailEvent
  | {
      // the following event types will be moved to their respective services
      // once these exist
      type: 'extendTopSucceeded';
    }
  | {
      type: 'extendTopFailed';
    }
  | {
      type: 'extendBottomSucceeded';
    }
  | {
      type: 'extendBottomFailed';
    }
  | {
      type: 'reloadSucceeded';
    }
  | {
      type: 'reloadFailed';
    }
  | {
      type: 'startTailing';
    }
  | {
      type: 'stopTailing';
    }
  | {
      type: 'reloadTail';
    };

export type LogExplorerEvent = LogExplorerExternalEvent | LogExplorerInternalEvent;

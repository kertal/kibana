/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IEsSearchResponse, ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { forkJoin, Observable } from 'rxjs';
import { LogExplorerPosition, SortCriteria } from '../types';
import { getCursorFromPosition, getPredecessorPosition } from '../utils/cursor';
import { invertSortCriteria, normalizeSortCriteriaForDataView } from '../utils/sort_criteria';
import { copyWithCommonParameters } from './common';

export interface FetchEntriesAroundParameters {
  chunkSize: number;
  position: LogExplorerPosition;
  sorting: SortCriteria;
  timeRange: TimeRange;
}

export const fetchEntriesAround =
  ({
    dataView,
    query,
    searchSource,
  }: {
    dataView: DataView;
    query: QueryStart;
    searchSource: ISearchSource;
  }) =>
  ({
    chunkSize,
    position,
    sorting,
    timeRange,
  }: FetchEntriesAroundParameters): Observable<{
    beforeResponse: IEsSearchResponse;
    afterResponse: IEsSearchResponse;
  }> => {
    const normalizeSortCriteria = normalizeSortCriteriaForDataView(dataView);
    const timeRangeFilter = query.timefilter.timefilter.createFilter(dataView, timeRange);

    const commonSearchSource = copyWithCommonParameters(searchSource, {
      chunkSize,
      timeRangeFilter,
    });

    // TODO: create and use point-in-time, not currently possible from client?
    const beforeResponse$ = commonSearchSource
      .createCopy()
      .setField('searchAfter', getCursorFromPosition(position))
      .setField('sort', normalizeSortCriteria(invertSortCriteria(sorting)))
      .fetch$();
    const afterResponse$ = commonSearchSource
      .createCopy()
      .setField('searchAfter', getCursorFromPosition(getPredecessorPosition(position)))
      .setField('sort', normalizeSortCriteria(sorting))
      .fetch$();

    return forkJoin({
      beforeResponse: beforeResponse$,
      afterResponse: afterResponse$,
    });
  };

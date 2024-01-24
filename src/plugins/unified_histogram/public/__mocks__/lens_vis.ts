/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { LensVisService, type QueryParams } from '../services/lens_vis_service';
import { unifiedHistogramServicesMock } from './services';
import { UnifiedHistogramSuggestionContext, UnifiedHistogramLensAttributesContext } from '../types';

export const getLensVisMock = async ({
  chartTitle,
  filters,
  query,
  suggestionContext,
  columns,
  isPlainRecord,
  timeInterval,
  breakdownField,
  dataView,
  allSuggestions,
}: {
  chartTitle?: string;
  filters: QueryParams['filters'];
  query: QueryParams['query'];
  dataView: QueryParams['dataView'];
  columns: DatatableColumn[];
  isPlainRecord: boolean;
  timeInterval: string;
  breakdownField: DataViewField | undefined;
  suggestionContext: UnifiedHistogramSuggestionContext | undefined;
  allSuggestions?: Suggestion[];
}): Promise<{
  lensService: LensVisService;
  lensAttributesContext: UnifiedHistogramLensAttributesContext | undefined;
  currentSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
}> => {
  const lensApi = await unifiedHistogramServicesMock.lens.stateHelperApi();
  const lensService = new LensVisService({
    services: unifiedHistogramServicesMock,
    lensSuggestionsApi: allSuggestions ? () => allSuggestions : lensApi.suggestions,
  });

  let lensAttributesContext: UnifiedHistogramLensAttributesContext | undefined;
  lensService.lensAttributesContext$.subscribe((nextAttributesContext) => {
    lensAttributesContext = nextAttributesContext;
  });

  let currentSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
  lensService.currentSuggestionContext$.subscribe((nextSuggestionContext) => {
    currentSuggestionContext = nextSuggestionContext;
  });

  lensService.update({
    chartTitle,
    queryParams: {
      query,
      filters,
      dataView,
      columns,
      isPlainRecord,
    },
    timeInterval,
    breakdownField,
    externalVisContext: undefined,
  });

  return {
    lensService,
    lensAttributesContext,
    currentSuggestionContext: suggestionContext || currentSuggestionContext,
  };
};

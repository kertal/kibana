/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '@kbn/react-public';
import { Query, TimeRange } from '@kbn/es-query';
import { NO_INDEX_PATTERNS } from './constants';
import { SEARCH_BAR_PLACEHOLDER } from './translations';
import { AlertsSearchBarProps, QueryLanguageType } from './types';
import { useAlertDataView } from '../../hooks/use_alert_data_view';
import { TriggersAndActionsUiServices } from '../../..';

// TODO Share buildEsQuery to be used between AlertsSearchBar and AlertsStateTable component https://github.com/elastic/kibana/issues/144615
export function AlertsSearchBar({
  appName,
  disableQueryLanguageSwitcher = false,
  featureIds,
  query,
  filters,
  onQueryChange,
  onQuerySubmit,
  onFiltersUpdated,
  rangeFrom,
  rangeTo,
  showFilterBar = false,
  showDatePicker = true,
  showSubmitButton = true,
  placeholder = SEARCH_BAR_PLACEHOLDER,
  submitOnBlur = false,
}: AlertsSearchBarProps) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<TriggersAndActionsUiServices>().services;

  const [queryLanguage, setQueryLanguage] = useState<QueryLanguageType>('kuery');
  const { value: dataView, loading, error } = useAlertDataView(featureIds);

  const onSearchQuerySubmit = useCallback(
    ({ dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query }) => {
      onQuerySubmit({
        dateRange,
        query: typeof nextQuery?.query === 'string' ? nextQuery.query : undefined,
      });
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQuerySubmit, setQueryLanguage]
  );

  const onSearchQueryChange = useCallback(
    ({ dateRange, query: nextQuery }: { dateRange: TimeRange; query?: Query }) => {
      onQueryChange?.({
        dateRange,
        query: typeof nextQuery?.query === 'string' ? nextQuery.query : undefined,
      });
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQueryChange, setQueryLanguage]
  );
  const onRefresh = ({ dateRange }: { dateRange: TimeRange }) => {
    onQuerySubmit({
      dateRange,
    });
  };

  return (
    <SearchBar
      appName={appName}
      disableQueryLanguageSwitcher={disableQueryLanguageSwitcher}
      indexPatterns={loading || error ? NO_INDEX_PATTERNS : [dataView!]}
      placeholder={placeholder}
      query={{ query: query ?? '', language: queryLanguage }}
      filters={filters}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      displayStyle="inPage"
      showFilterBar={showFilterBar}
      onQuerySubmit={onSearchQuerySubmit}
      onFiltersUpdated={onFiltersUpdated}
      onRefresh={onRefresh}
      showDatePicker={showDatePicker}
      showQueryInput={true}
      showSaveQuery={true}
      showSubmitButton={showSubmitButton}
      submitOnBlur={submitOnBlur}
      onQueryChange={onSearchQueryChange}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { AlertsSearchBar as default };

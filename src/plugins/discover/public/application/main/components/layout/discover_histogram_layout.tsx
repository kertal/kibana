/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { RefObject } from 'react';
import { UnifiedHistogramContainer } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { ResetSearchButton } from './reset_search_button';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  resizeRef: RefObject<HTMLDivElement>;
  inspectorAdapters: InspectorAdapters;
  searchSessionManager: DiscoverSearchSessionManager;
}

const histogramLayoutCss = css`
  height: 100%;
`;

export const DiscoverHistogramLayout = ({
  isPlainRecord,
  dataView,
  stateContainer,
  resizeRef,
  inspectorAdapters,
  searchSessionManager,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const { dataState, savedSearchState } = stateContainer;
  const commonProps = {
    dataView,
    stateContainer,
    savedSearchData$: dataState.data$,
  };

  const searchSessionId = useObservable(searchSessionManager.searchSessionId$);

  const { hideChart, setUnifiedHistogramApi } = useDiscoverHistogram({
    inspectorAdapters,
    savedSearchFetch$: dataState.fetch$,
    searchSessionId,
    ...commonProps,
  });
  if (!searchSessionId && !isPlainRecord) {
    return null;
  }

  return (
    <UnifiedHistogramContainer
      ref={setUnifiedHistogramApi}
      resizeRef={resizeRef}
      appendHitsCounter={
        savedSearchState.getId() ? (
          <ResetSearchButton resetSavedSearch={savedSearchState.undo} />
        ) : undefined
      }
      css={histogramLayoutCss}
    >
      <DiscoverMainContent
        {...commonProps}
        {...mainContentProps}
        isPlainRecord={isPlainRecord}
        // The documents grid doesn't rerender when the chart visibility changes
        // which causes it to render blank space, so we need to force a rerender
        key={`docKey${hideChart}`}
      />
    </UnifiedHistogramContainer>
  );
};

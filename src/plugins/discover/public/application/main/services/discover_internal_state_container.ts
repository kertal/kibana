/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createStateContainer,
  createStateContainerReactHelpers,
  ReduxLikeStateContainer,
} from '@kbn/kibana-utils-plugin/common';
import { DataView, DataViewListItem } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { ExternalVisContext } from '@kbn/unified-histogram-plugin/public';

export interface InternalState {
  dataView: DataView | undefined;
  savedDataViews: DataViewListItem[];
  adHocDataViews: DataView[];
  expandedDoc: DataTableRecord | undefined;
  customFilters: Filter[];
  visContext: ExternalVisContext | undefined;
}

interface InternalStateTransitions {
  setDataView: (state: InternalState) => (dataView: DataView) => InternalState;
  setSavedDataViews: (state: InternalState) => (dataView: DataViewListItem[]) => InternalState;
  setAdHocDataViews: (state: InternalState) => (dataViews: DataView[]) => InternalState;
  appendAdHocDataViews: (
    state: InternalState
  ) => (dataViews: DataView | DataView[]) => InternalState;
  removeAdHocDataViewById: (state: InternalState) => (id: string) => InternalState;
  replaceAdHocDataViewWithId: (
    state: InternalState
  ) => (id: string, dataView: DataView) => InternalState;
  setExpandedDoc: (
    state: InternalState
  ) => (dataView: DataTableRecord | undefined) => InternalState;
  setCustomFilters: (state: InternalState) => (customFilters: Filter[]) => InternalState;
  setVisContext: (
    state: InternalState
  ) => (visContext: ExternalVisContext | undefined) => InternalState;
}

export type DiscoverInternalStateContainer = ReduxLikeStateContainer<
  InternalState,
  InternalStateTransitions
>;

export const { Provider: InternalStateProvider, useSelector: useInternalStateSelector } =
  createStateContainerReactHelpers<ReduxLikeStateContainer<InternalState>>();

export function getInternalStateContainer() {
  return createStateContainer<InternalState, InternalStateTransitions, {}>(
    {
      dataView: undefined,
      adHocDataViews: [],
      savedDataViews: [],
      expandedDoc: undefined,
      customFilters: [],
      visContext: undefined,
    },
    {
      setDataView: (prevState: InternalState) => (nextDataView: DataView) => ({
        ...prevState,
        dataView: nextDataView,
      }),
      setSavedDataViews: (prevState: InternalState) => (nextDataViewList: DataViewListItem[]) => ({
        ...prevState,
        savedDataViews: nextDataViewList,
      }),
      setAdHocDataViews: (prevState: InternalState) => (newAdHocDataViewList: DataView[]) => ({
        ...prevState,
        adHocDataViews: newAdHocDataViewList,
      }),
      appendAdHocDataViews:
        (prevState: InternalState) => (dataViewsAdHoc: DataView | DataView[]) => {
          // check for already existing data views
          const concatList = (
            Array.isArray(dataViewsAdHoc) ? dataViewsAdHoc : [dataViewsAdHoc]
          ).filter((dataView) => {
            return !prevState.adHocDataViews.find((el: DataView) => el.id === dataView.id);
          });
          if (!concatList.length) {
            return prevState;
          }
          return {
            ...prevState,
            adHocDataViews: prevState.adHocDataViews.concat(dataViewsAdHoc),
          };
        },
      removeAdHocDataViewById: (prevState: InternalState) => (id: string) => ({
        ...prevState,
        adHocDataViews: prevState.adHocDataViews.filter((dataView) => dataView.id !== id),
      }),
      replaceAdHocDataViewWithId:
        (prevState: InternalState) => (prevId: string, newDataView: DataView) => ({
          ...prevState,
          adHocDataViews: prevState.adHocDataViews.map((dataView) =>
            dataView.id === prevId ? newDataView : dataView
          ),
        }),
      setExpandedDoc: (prevState: InternalState) => (expandedDoc: DataTableRecord | undefined) => ({
        ...prevState,
        expandedDoc,
      }),
      setCustomFilters: (prevState: InternalState) => (customFilters: Filter[]) => ({
        ...prevState,
        customFilters,
      }),
      setVisContext:
        (prevState: InternalState) => (visContext: ExternalVisContext | undefined) => ({
          ...prevState,
          visContext,
        }),
    },
    {},
    { freeze: (state) => state }
  );
}

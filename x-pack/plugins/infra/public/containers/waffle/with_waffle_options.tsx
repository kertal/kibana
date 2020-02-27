/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import { isBoolean, isNumber } from 'lodash';
import { InfraGroupByOptions } from '../../lib/lib';
import { State, waffleOptionsActions, waffleOptionsSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';
import {
  SnapshotMetricInput,
  SnapshotGroupBy,
  SnapshotCustomMetricInputRT,
} from '../../../common/http_api/snapshot_api';
import {
  SnapshotMetricTypeRT,
  InventoryItemType,
  ItemTypeRT,
} from '../../../common/inventory_models/types';

const selectOptionsUrlState = createSelector(
  waffleOptionsSelectors.selectMetric,
  waffleOptionsSelectors.selectView,
  waffleOptionsSelectors.selectGroupBy,
  waffleOptionsSelectors.selectNodeType,
  waffleOptionsSelectors.selectCustomOptions,
  waffleOptionsSelectors.selectBoundsOverride,
  waffleOptionsSelectors.selectAutoBounds,
  waffleOptionsSelectors.selectAccountId,
  waffleOptionsSelectors.selectRegion,
  waffleOptionsSelectors.selectCustomMetrics,
  (
    metric,
    view,
    groupBy,
    nodeType,
    customOptions,
    boundsOverride,
    autoBounds,
    accountId,
    region,
    customMetrics
  ) => ({
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    boundsOverride,
    autoBounds,
    accountId,
    region,
    customMetrics,
  })
);

export const withWaffleOptions = connect(
  (state: State) => ({
    metric: waffleOptionsSelectors.selectMetric(state),
    groupBy: waffleOptionsSelectors.selectGroupBy(state),
    nodeType: waffleOptionsSelectors.selectNodeType(state),
    view: waffleOptionsSelectors.selectView(state),
    customOptions: waffleOptionsSelectors.selectCustomOptions(state),
    boundsOverride: waffleOptionsSelectors.selectBoundsOverride(state),
    autoBounds: waffleOptionsSelectors.selectAutoBounds(state),
    accountId: waffleOptionsSelectors.selectAccountId(state),
    region: waffleOptionsSelectors.selectRegion(state),
    urlState: selectOptionsUrlState(state),
    customMetrics: waffleOptionsSelectors.selectCustomMetrics(state),
  }),
  bindPlainActionCreators({
    changeMetric: waffleOptionsActions.changeMetric,
    changeGroupBy: waffleOptionsActions.changeGroupBy,
    changeNodeType: waffleOptionsActions.changeNodeType,
    changeView: waffleOptionsActions.changeView,
    changeCustomOptions: waffleOptionsActions.changeCustomOptions,
    changeBoundsOverride: waffleOptionsActions.changeBoundsOverride,
    changeAutoBounds: waffleOptionsActions.changeAutoBounds,
    changeAccount: waffleOptionsActions.changeAccount,
    changeRegion: waffleOptionsActions.changeRegion,
    changeCustomMetrics: waffleOptionsActions.changeCustomMetrics,
  })
);

export const WithWaffleOptions = asChildFunctionRenderer(withWaffleOptions);

/**
 * Url State
 */

interface WaffleOptionsUrlState {
  metric?: ReturnType<typeof waffleOptionsSelectors.selectMetric>;
  groupBy?: ReturnType<typeof waffleOptionsSelectors.selectGroupBy>;
  nodeType?: ReturnType<typeof waffleOptionsSelectors.selectNodeType>;
  view?: ReturnType<typeof waffleOptionsSelectors.selectView>;
  customOptions?: ReturnType<typeof waffleOptionsSelectors.selectCustomOptions>;
  bounds?: ReturnType<typeof waffleOptionsSelectors.selectBoundsOverride>;
  auto?: ReturnType<typeof waffleOptionsSelectors.selectAutoBounds>;
  accountId?: ReturnType<typeof waffleOptionsSelectors.selectAccountId>;
  region?: ReturnType<typeof waffleOptionsSelectors.selectRegion>;
  customMetrics?: ReturnType<typeof waffleOptionsSelectors.selectCustomMetrics>;
}

export const WithWaffleOptionsUrlState = () => (
  <WithWaffleOptions>
    {({
      changeMetric,
      urlState,
      changeGroupBy,
      changeNodeType,
      changeView,
      changeCustomOptions,
      changeAutoBounds,
      changeBoundsOverride,
      changeAccount,
      changeRegion,
      changeCustomMetrics,
    }) => (
      <UrlStateContainer<WaffleOptionsUrlState>
        urlState={urlState}
        urlStateKey="waffleOptions"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.metric) {
            changeMetric(newUrlState.metric);
          }
          if (newUrlState && newUrlState.groupBy) {
            changeGroupBy(newUrlState.groupBy);
          }
          if (newUrlState && newUrlState.nodeType) {
            changeNodeType(newUrlState.nodeType);
          }
          if (newUrlState && newUrlState.view) {
            changeView(newUrlState.view);
          }
          if (newUrlState && newUrlState.customOptions) {
            changeCustomOptions(newUrlState.customOptions);
          }
          if (newUrlState && newUrlState.bounds) {
            changeBoundsOverride(newUrlState.bounds);
          }
          if (newUrlState && newUrlState.auto) {
            changeAutoBounds(newUrlState.auto);
          }
          if (newUrlState && newUrlState.accountId) {
            changeAccount(newUrlState.accountId);
          }
          if (newUrlState && newUrlState.region) {
            changeRegion(newUrlState.region);
          }
          if (newUrlState && newUrlState.customMetrics) {
            changeCustomMetrics(newUrlState.customMetrics);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.metric) {
            changeMetric(initialUrlState.metric);
          }
          if (initialUrlState && initialUrlState.groupBy) {
            changeGroupBy(initialUrlState.groupBy);
          }
          if (initialUrlState && initialUrlState.nodeType) {
            changeNodeType(initialUrlState.nodeType);
          }
          if (initialUrlState && initialUrlState.view) {
            changeView(initialUrlState.view);
          }
          if (initialUrlState && initialUrlState.customOptions) {
            changeCustomOptions(initialUrlState.customOptions);
          }
          if (initialUrlState && initialUrlState.bounds) {
            changeBoundsOverride(initialUrlState.bounds);
          }
          if (initialUrlState && initialUrlState.auto) {
            changeAutoBounds(initialUrlState.auto);
          }
          if (initialUrlState && initialUrlState.accountId) {
            changeAccount(initialUrlState.accountId);
          }
          if (initialUrlState && initialUrlState.region) {
            changeRegion(initialUrlState.region);
          }
          if (initialUrlState && initialUrlState.customMetrics) {
            changeCustomMetrics(initialUrlState.customMetrics);
          }
        }}
      />
    )}
  </WithWaffleOptions>
);

const mapToUrlState = (value: any): WaffleOptionsUrlState | undefined =>
  value
    ? {
        metric: mapToMetricUrlState(value.metric),
        groupBy: mapToGroupByUrlState(value.groupBy),
        nodeType: mapToNodeTypeUrlState(value.nodeType),
        view: mapToViewUrlState(value.view),
        customOptions: mapToCustomOptionsUrlState(value.customOptions),
        bounds: mapToBoundsOverideUrlState(value.boundsOverride),
        auto: mapToAutoBoundsUrlState(value.autoBounds),
        accountId: value.accountId,
        region: value.region,
        customMetrics: mapToCustomMetricsUrlState(value.customMetrics),
      }
    : undefined;

const isInfraNodeType = (value: any): value is InventoryItemType => value in ItemTypeRT;

const isInfraSnapshotMetricInput = (subject: any): subject is SnapshotMetricInput => {
  return subject != null && subject.type in SnapshotMetricTypeRT;
};

const isInfraSnapshotGroupbyInput = (subject: any): subject is SnapshotGroupBy => {
  return subject != null && subject.type != null;
};

const isInfraGroupByOption = (subject: any): subject is InfraGroupByOptions => {
  return subject != null && subject.text != null && subject.field != null;
};

const mapToMetricUrlState = (subject: any) => {
  return subject && isInfraSnapshotMetricInput(subject) ? subject : undefined;
};

const mapToGroupByUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(isInfraSnapshotGroupbyInput)
    ? subject
    : undefined;
};

const mapToNodeTypeUrlState = (subject: any) => {
  return isInfraNodeType(subject) ? subject : undefined;
};

const mapToViewUrlState = (subject: any) => {
  return subject && ['map', 'table'].includes(subject) ? subject : undefined;
};

const mapToCustomOptionsUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(isInfraGroupByOption)
    ? subject
    : undefined;
};

const mapToCustomMetricsUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(s => SnapshotCustomMetricInputRT.is(s))
    ? subject
    : [];
};

const mapToBoundsOverideUrlState = (subject: any) => {
  return subject != null && isNumber(subject.max) && isNumber(subject.min) ? subject : undefined;
};

const mapToAutoBoundsUrlState = (subject: any) => {
  return subject != null && isBoolean(subject) ? subject : undefined;
};

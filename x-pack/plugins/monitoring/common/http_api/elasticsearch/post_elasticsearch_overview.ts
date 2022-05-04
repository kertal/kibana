/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { clusterUuidRT, ccsRT, timeRangeRT } from '../shared';

export const postElasticsearchOverviewRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
});

export const postElasticsearchOverviewRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
  }),
]);

export type PostElasticsearchOverviewRequestPayload = rt.TypeOf<
  typeof postElasticsearchOverviewRequestPayloadRT
>;

export const postElasticsearchOverviewResponsePayloadRT = rt.type({
  // TODO: add payload entries
});

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

import { RangeFilter, FilterStateStore } from '..';

export const rangeFilter: RangeFilter = {
  meta: {
    index: 'logstash-*',
    negate: false,
    disabled: false,
    alias: null,
    type: 'range',
    key: 'bytes',
    value: '0 to 10',
    params: {
      gte: 0,
      lt: 10,
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  range: {},
};

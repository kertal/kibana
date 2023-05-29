/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DiscoverContextAppLocator,
  DiscoverContextAppLocatorParams,
} from '@kbn/unified-discover/src/context/locator';

export const replaceContextLocation = (
  contextLocator: DiscoverContextAppLocator,
  params: DiscoverContextAppLocatorParams
) => contextLocator.navigate(params, { replace: true });

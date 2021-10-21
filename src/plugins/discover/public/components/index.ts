/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Allows the getSharingData function to be lazy loadable
 */
export async function loadSharingDataHelpers() {
  return await import('../apps/main/utils/get_sharing_data');
}

export { DeferredSpinner } from './common/deferred_spinner';

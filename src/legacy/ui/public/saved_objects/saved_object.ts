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

/**
 * @name SavedObject
 *
 * NOTE: SavedObject seems to track a reference to an object in ES,
 * and surface methods for CRUD functionality (save and delete). This seems
 * similar to how Backbone Models work.
 *
 * This class seems to interface with ES primarily through the es Angular
 * service and the saved object api.
 */
import { ChromeStart, OverlayStart, SavedObjectsClientContract } from 'kibana/public';
import { npStart } from 'ui/new_platform';
import { SavedObjectConfig, SavedObjectSaveOpts } from './types';
import { buildSavedObject } from './helpers/build_saved_object';
import { IndexPatternsContract } from '../../../../plugins/data/public';
export { SavedObjectSaveOpts as SaveOptions } from './types';

export interface SavedObject {
  save: (saveOptions: SavedObjectSaveOpts) => Promise<string>;
  copyOnSave: boolean;
  id?: string;
}

export function createSavedObjectClass(
  savedObjectsClient: SavedObjectsClientContract,
  indexPatterns: IndexPatternsContract,
  chrome: ChromeStart,
  overlays: OverlayStart
) {
  /**
   * The SavedObject class is a base class for saved objects loaded from the server and
   * provides additional functionality besides loading/saving/deleting/etc.
   *
   * It is overloaded and configured to provide type-aware functionality.
   * To just retrieve the attributes of saved objects, it is recommended to use SavedObjectLoader
   * which returns instances of SimpleSavedObject which don't introduce additional type-specific complexity.
   * @param {*} config
   */
  class SavedObject {
    constructor(config: SavedObjectConfig = {}) {
      buildSavedObject(
        // @ts-ignore
        this,
        config,
        indexPatterns,
        savedObjectsClient,
        chrome,
        overlays
      );
    }
  }

  return SavedObject;
}
// the old angular way, should be removed once no longer used
export function SavedObjectProvider() {
  return createSavedObjectClass(
    npStart.core.savedObjects.client,
    npStart.plugins.data.indexPatterns,
    npStart.core.chrome,
    npStart.core.overlays
  );
}

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

import { SavedObjectLoader } from 'ui/saved_objects';

export class SavedObjectRegistry {
  private entries: SavedObjectLoader[] = [];

  public setup() {
    return {
      register: (entry: SavedObjectLoader) => {
        this.entries.push(entry);
      },
    };
  }

  public start() {
    return {
      list: (): readonly SavedObjectLoader[] => this.entries,
      get: (type: string): SavedObjectLoader | undefined =>
        this.entries.find(entry => entry.type === type),
      register: (entry: SavedObjectLoader) => {
        this.entries.push(entry);
      },
    };
  }
}

export type SavedObjectRegistrySetup = ReturnType<SavedObjectRegistry['setup']>;
export type SavedObjectRegistryStart = ReturnType<SavedObjectRegistry['start']>;

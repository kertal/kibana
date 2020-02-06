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

import { deepFreeze } from '../../utils';
import { SavedObjectsType } from './types';

/**
 * See {@link SavedObjectTypeRegistry} for documentation.
 *
 * @internal
 * */
export type ISavedObjectTypeRegistry = PublicMethodsOf<SavedObjectTypeRegistry>;

/**
 * Registry holding information about all the registered {@link SavedObjectsType | savedObject types}.
 *
 * @internal
 */
export class SavedObjectTypeRegistry {
  private readonly types = new Map<string, SavedObjectsType>();

  /**
   * Register a {@link SavedObjectsType | type} inside the registry.
   * A type can only be registered once. subsequent calls with the same type name will throw an error.
   */
  public registerType(type: SavedObjectsType) {
    if (this.types.has(type.name)) {
      throw new Error(`Type '${type.name}' is already registered`);
    }
    this.types.set(type.name, deepFreeze(type));
  }

  /**
   * Return the {@link SavedObjectsType | type} definition for given type name.
   */
  public getType(type: string) {
    return this.types.get(type);
  }

  /**
   * Return all {@link SavedObjectsType | types} currently registered.
   */
  public getAllTypes() {
    return [...this.types.values()];
  }

  /**
   * Returns the `namespaceAgnostic` property for given type, or `false` if
   * the type is not registered.
   */
  public isNamespaceAgnostic(type: string) {
    return this.types.get(type)?.namespaceAgnostic ?? false;
  }

  /**
   * Returns the `hidden` property for given type, or `false` if
   * the type is not registered.
   */
  public isHidden(type: string) {
    return this.types.get(type)?.hidden ?? false;
  }

  /**
   * Returns the `indexPattern` property for given type, or `undefined` if
   * the type is not registered.
   */
  public getIndex(type: string) {
    return this.types.get(type)?.indexPattern;
  }
}

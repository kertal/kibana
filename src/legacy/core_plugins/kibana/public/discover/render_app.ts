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

// inner angular imports
// these are necessary to bootstrap the local angular.
// They can stay even after NP cutover
import angular from 'angular';
import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
import 'ui/angular-bootstrap';
import 'ui/kbn_top_nav';
// @ts-ignore
import { GlobalStateProvider } from 'ui/state_management/global_state';
// @ts-ignore
import { StateManagementConfigProvider } from 'ui/state_management/config_provider';
// @ts-ignore
import { PrivateProvider } from 'ui/private/private';
// @ts-ignore
import { EventsProvider } from 'ui/events';
// @ts-ignore
import { PersistedState } from 'ui/persisted_state';
// @ts-ignore
import { createTopNavDirective, createTopNavHelper } from 'ui/kbn_top_nav/kbn_top_nav';
// @ts-ignore
import { PromiseServiceCreator } from 'ui/promises/promises';
// @ts-ignore
import { KbnUrlProvider } from 'ui/url';

// type imports
import { IPrivate } from 'ui/private';
import { DataStart } from 'src/legacy/core_plugins/data/public';
import { AppMountContext } from 'kibana/public';
import { AngularHttpError } from 'ui/notify/lib/format_angular_http_error';
// @ts-ignore
import { Plugin as DataPlugin } from '../../../../../../src/plugins/data/public';
import { getDiscoverModule } from './angular/get_discover_module';

/**
 * These are dependencies of the Graph app besides the base dependencies
 * provided by the application service. Some of those still rely on non-shimmed
 * plugins in LP-world, but if they are migrated only the import path in the plugin
 * itself changes
 */
export interface DiscoverDependencies {
  element: HTMLElement;
  appBasePath: string;
  data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
  fatalError: (error: AngularHttpError | Error | string, location?: string) => void;
  addBasePath: (url: string) => string;
  getBasePath: () => string;
  Storage: any;
}

/**
 * Dependencies of the Graph app which rely on the global angular instance.
 * These dependencies have to be migrated to their NP counterparts.
 */
export interface LegacyAngularInjectedDependencies {
  /**
   * Instance of SavedObjectRegistryProvider
   */
  savedObjectRegistry: any;
  kbnBaseUrl: any;
  /**
   * Private(SavedObjectsClientProvider)
   */
  savedObjectsClient: any;
}

export async function renderApp(
  { core }: AppMountContext,
  { element, appBasePath, data, npData, fatalError, getBasePath, Storage }: DiscoverDependencies,
  angularDeps: LegacyAngularInjectedDependencies
) {
  /**
   * const deps = {
    capabilities: core.application.capabilities.discover,
    coreStart: core,
    chrome: core.chrome,
    config: core.uiSettings,
    toastNotifications: core.notifications.toasts,
    indexPatterns: data.indexPatterns.indexPatterns,
    npData,
    fatalError,
    appBasePath,
    getBasePath,
    KbnUrlProvider,
    Storage,
    ...angularDeps,
  };
   */

  const app = getDiscoverModule();
  require('./angular');
  const $injector = mountDiscoverApp(appBasePath, element);
  return () => $injector.get('$rootScope').$destroy();
}

const mainTemplate = (basePath: string) => `<div style="height: 100%">
  <base href="${basePath}" />
  <div ng-view style="height: 100%; display:flex; justify-content: center;"></div>
</div>
`;

const moduleName = 'app/discover';

const thirdPartyAngularDependencies = ['ngSanitize', 'ngRoute', 'react', 'ui.bootstrap'];

function mountDiscoverApp(appBasePath: string, element: HTMLElement) {
  const mountpoint = document.createElement('div');
  mountpoint.setAttribute('style', 'height: 100%');
  // eslint-disable-next-line
  mountpoint.innerHTML = mainTemplate(appBasePath);
  // bootstrap angular into detached element and attach it later to
  // make angular-within-angular possible
  const $injector = angular.bootstrap(mountpoint, [moduleName]);
  // initialize global state handler
  $injector.get('globalState');
  element.appendChild(mountpoint);
  return $injector;
}

export function createLocalAngularModule(core: AppMountContext['core']) {
  createLocalI18nModule();
  createLocalPrivateModule();
  createLocalPromiseModule();
  createLocalConfigModule(core);
  createLocalKbnUrlModule();
  createLocalPersistedStateModule();
  createLocalTopNavModule();
  createLocalGlobalStateModule();

  return angular.module(moduleName, [
    ...thirdPartyAngularDependencies,
    'discoverI18n',
    'discoverPrivate',
    'discoverPersistedState',
    'discoverTopNav',
    'discoverGlobalState',
  ]);
}

export function createLocalGlobalStateModule() {
  angular
    .module('discoverGlobalState', [
      'discoverPrivate',
      'discoverConfig',
      'discoverKbnUrl',
      'discoverPromise',
    ])
    .service('globalState', function(Private: any) {
      return Private(GlobalStateProvider);
    });
}

function createLocalPersistedStateModule() {
  angular
    .module('discoverPersistedState', ['discoverPrivate', 'discoverPromise'])
    .factory('PersistedState', (Private: IPrivate) => {
      const Events = Private(EventsProvider);
      return class AngularPersistedState extends PersistedState {
        constructor(value: any, path: any) {
          super(value, path, Events);
        }
      };
    });
}

function createLocalKbnUrlModule() {
  angular
    .module('discoverKbnUrl', ['discoverPrivate'])
    .service('kbnUrl', (Private: IPrivate) => Private(KbnUrlProvider));
}

function createLocalConfigModule(core: AppMountContext['core']) {
  angular
    .module('discoverConfig', ['discoverPrivate'])
    .provider('stateManagementConfig', StateManagementConfigProvider)
    .provider('config', () => {
      return {
        $get: () => ({
          get: (value: string) => {
            return core.uiSettings ? core.uiSettings.get(value) : undefined;
          },
        }),
      };
    });
}

function createLocalPromiseModule() {
  angular.module('discoverPromise', []).service('Promise', PromiseServiceCreator);
}

function createLocalPrivateModule() {
  angular.module('discoverPrivate', []).provider('Private', PrivateProvider);
}

function createLocalTopNavModule() {
  angular
    .module('discoverTopNav', ['react'])
    .directive('kbnTopNav', createTopNavDirective)
    .directive('kbnTopNavHelper', createTopNavHelper);
}

function createLocalI18nModule() {
  angular
    .module('discoverI18n', [])
    .provider('i18n', I18nProvider)
    .filter('i18n', i18nFilter)
    .directive('i18nId', i18nDirective);
}

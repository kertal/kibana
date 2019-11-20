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

import {
  App,
  CoreSetup,
  CoreStart,
  LegacyCoreStart,
  Plugin,
  SavedObjectsClientContract,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RenderDeps } from './application';
import { LocalApplicationService } from '../local_application_service';
import { DataStart } from '../../../data/public';
import { DataPublicPluginStart as NpDataStart } from '../../../../../plugins/data/public';
import { EmbeddablePublicPlugin } from '../../../../../plugins/embeddable/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';
import { NavigationStart } from '../../../navigation/public';
import { DashboardConstants } from './dashboard_constants';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueSetup,
} from '../../../../../plugins/feature_catalogue/public';
import { SharePluginStart } from '../../../../../plugins/share/public';

export interface LegacyAngularInjectedDependencies {
  dashboardConfig: any;
  savedObjectRegistry: any;
  savedDashboards: any;
}

export interface DashboardPluginStartDependencies {
  data: DataStart;
  npData: NpDataStart;
  embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
  navigation: NavigationStart;
  share: SharePluginStart;
}

export interface DashboardPluginSetupDependencies {
  __LEGACY: {
    getAngularDependencies: () => Promise<LegacyAngularInjectedDependencies>;
    localApplicationService: LocalApplicationService;
  };
  feature_catalogue: FeatureCatalogueSetup;
}

export class DashboardPlugin implements Plugin {
  private startDependencies: {
    dataStart: DataStart;
    npDataStart: NpDataStart;
    savedObjectsClient: SavedObjectsClientContract;
    embeddables: ReturnType<EmbeddablePublicPlugin['start']>;
    navigation: NavigationStart;
    share: SharePluginStart;
  } | null = null;

  public setup(
    core: CoreSetup,
    {
      __LEGACY: { localApplicationService, getAngularDependencies, ...legacyServices },
      feature_catalogue,
    }: DashboardPluginSetupDependencies
  ) {
    const app: App = {
      id: '',
      title: 'Dashboards',
      mount: async ({ core: contextCore }, params) => {
        if (this.startDependencies === null) {
          throw new Error('not started yet');
        }
        const {
          dataStart,
          savedObjectsClient,
          embeddables,
          navigation,
          share,
          npDataStart,
        } = this.startDependencies;
        const angularDependencies = await getAngularDependencies();
        const deps: RenderDeps = {
          core: contextCore as LegacyCoreStart,
          ...legacyServices,
          ...angularDependencies,
          navigation,
          dataStart,
          share,
          npDataStart,
          indexPatterns: dataStart.indexPatterns.indexPatterns,
          savedObjectsClient,
          chrome: contextCore.chrome,
          addBasePath: contextCore.http.basePath.prepend,
          uiSettings: contextCore.uiSettings,
          savedQueryService: dataStart.search.services.savedQueryService,
          embeddables,
          dashboardCapabilities: contextCore.application.capabilities.dashboard,
          localStorage: new Storage(localStorage),
        };
        const { renderApp } = await import('./application');
        return renderApp(params.element, params.appBasePath, deps);
      },
    };
    localApplicationService.register({ ...app, id: 'dashboard' });
    localApplicationService.register({ ...app, id: 'dashboards' });

    feature_catalogue.register({
      id: 'dashboard',
      title: i18n.translate('kbn.dashboard.featureCatalogue.dashboardTitle', {
        defaultMessage: 'Dashboard',
      }),
      description: i18n.translate('kbn.dashboard.featureCatalogue.dashboardDescription', {
        defaultMessage: 'Display and share a collection of visualizations and saved searches.',
      }),
      icon: 'dashboardApp',
      path: `/app/kibana#${DashboardConstants.LANDING_PAGE_PATH}`,
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA,
    });
  }

  start(
    { savedObjects: { client: savedObjectsClient } }: CoreStart,
    { data: dataStart, embeddables, navigation, npData, share }: DashboardPluginStartDependencies
  ) {
    this.startDependencies = {
      dataStart,
      npDataStart: npData,
      savedObjectsClient,
      embeddables,
      navigation,
      share,
    };
  }
}

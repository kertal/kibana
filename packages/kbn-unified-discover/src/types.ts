/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ApplicationStart } from '@kbn/core-application-browser';
import { Capabilities } from '@kbn/core-capabilities-common';
import { ChromeStart } from '@kbn/core-chrome-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  DataPublicPluginStart,
  DataViewsContract,
  FilterManager,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { History } from 'history';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { UrlForwardingStart } from '@kbn/url-forwarding-plugin/public';
import { NotificationsStart, ToastsStart } from '@kbn/core-notifications-browser';
import { IUiSettingsClient, SettingsStart } from '@kbn/core-ui-settings-browser';
import { UiCounterMetricType } from '@kbn/analytics';
import { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { HttpStart } from '@kbn/core-http-browser';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { DiscoverAppLocator } from '@kbn/discover-plugin/common';
import { DiscoverContextAppLocator } from '@kbn/discover-plugin/public/application/context/services/locator';
import { DiscoverSingleDocLocator } from '@kbn/discover-plugin/public/application/doc/locator';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';

export interface EsHitRecord extends Omit<estypes.SearchHit, '_source'> {
  _source?: Record<string, unknown>;
}

/**
 * This is the record/row of data provided to our Data Table
 */
export interface DataTableRecord {
  /**
   * A unique id generated by index, id and routing of a record
   */
  id: string;
  /**
   * The document returned by Elasticsearch for search queries
   */
  raw: EsHitRecord;
  /**
   * A flattened version of the ES doc or data provided by SQL, aggregations ...
   */
  flattened: Record<string, unknown>;
  /**
   * Determines that the given doc is the anchor doc when rendering view surrounding docs
   */
  isAnchor?: boolean;
}

/**
 * Location state of internal Discover history instance
 */
export interface HistoryLocationState {
  referrer: string;
}

export interface DiscoverServices {
  application: ApplicationStart;
  addBasePath: (path: string) => string;
  capabilities: Capabilities;
  chrome: ChromeStart;
  core: CoreStart;
  data: DataPublicPluginStart;
  docLinks: DocLinksStart;
  embeddable: EmbeddableStart;
  history: () => History<HistoryLocationState>;
  theme: ChartsPluginStart['theme'];
  filterManager: FilterManager;
  fieldFormats: FieldFormatsStart;
  dataViews: DataViewsContract;
  inspector: InspectorPublicPluginStart;
  metadata: { branch: string };
  navigation: NavigationPublicPluginStart;
  share?: SharePluginStart;
  urlForwarding: UrlForwardingStart;
  timefilter: TimefilterContract;
  toastNotifications: ToastsStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
  http: HttpStart;
  storage: Storage;
  spaces?: SpacesApi;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  locator: DiscoverAppLocator;
  contextLocator: DiscoverContextAppLocator;
  singleDocLocator: DiscoverSingleDocLocator;
  expressions: ExpressionsStart;
  charts: ChartsPluginStart;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  lens: LensPublicStart;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsResolveResponse } from 'src/core/public';
import type { ISearchSource } from '../../data/common';
import { SavedObjectAttributes } from '../../../core/types';
import { VIEW_MODE } from './constants';

import type { ISearchSource } from '../../../../data/public';
import { DiscoverGridSettingsColumn } from '../../components/discover_grid/types';
import { VIEW_MODE } from '../../components/view_mode_toggle';

export interface DiscoverGridSettingsColumn {
  width?: number;
}

export interface DiscoverGridSavedSearch {
  columns?: {
    [key: string]: DiscoverGridSettingsColumn;
  };
}

export interface SavedSearchGridAttributes extends SavedObjectAttributes {
  columns: {
    [key: string]: {
      width?: number;
    };
  };
}


/** @internal **/
export interface SavedSearchAttributes extends SavedObjectAttributes {
  title: string;
  sort: string[];
  columns: string[];
  description: string;
  grid?: SavedSearchGridAttributes;
  hideChart: boolean;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
  viewMode?: VIEW_MODE;
  hideAggregatedPreview?: boolean;
  rowHeight?: number;
}

/** @internal **/
export type SortOrder = [string, string];

/** @public **/
export interface SavedSearch {
  searchSource: ISearchSource;
  id?: string;
  title?: string;
  sort?: SortOrder[];
  columns?: string[];
  description?: string;
  grid?: {
    columns?: Record<string, DiscoverGridSettingsColumn>;
  };
  hideChart?: boolean;
  sharingSavedObjectProps?: {
    outcome?: SavedObjectsResolveResponse['outcome'];
    aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
    aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
    errorJSON?: string;
  };
  viewMode?: VIEW_MODE;
  hideAggregatedPreview?: boolean;
  rowHeight?: number;
}

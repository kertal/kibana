/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { dataViewMock } from './data_view';
import { dataViewComplexMock } from './data_view_complex';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';

const dataViewList = [dataViewMock, dataViewComplexMock, dataViewWithTimefieldMock];

export function createDiscoverDataViewsMock() {
  return {
    getCache: async () => {
      return [dataViewMock];
    },
    get: async (id: string) => {
      if (id === 'the-data-view-id') {
        return Promise.resolve(dataViewMock);
      } else if (id === 'invalid-data-view-id') {
        return Promise.reject('Invalid');
      }
      const dataView = dataViewList.find((dv) => dv.id === id);
      if (dataView) {
        return Promise.resolve(dataView);
      } else {
        return Promise.reject(`DataView ${id} not found`);
      }
    },
    getDefaultDataView: jest.fn(() => dataViewMock),
    updateSavedObject: jest.fn(),
    getIdsWithTitle: jest.fn(() => {
      return Promise.resolve(dataViewList);
    }),
    createFilter: jest.fn(),
    create: jest.fn(),
    clearInstanceCache: jest.fn(),
    getFieldsForIndexPattern: jest.fn((dataView) => dataView.fields),
    refreshFields: jest.fn(),
  } as unknown as jest.Mocked<DataViewsContract>;
}

export const dataViewsMock = createDiscoverDataViewsMock();

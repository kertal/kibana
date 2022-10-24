/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { act, renderHook } from '@testing-library/react-hooks';
import {
  discoverServiceMock,
  discoverServiceMock as mockDiscoverServices,
} from '../../../__mocks__/services';
import { useAdHocDataViews } from './use_adhoc_data_views';
import * as persistencePromptModule from '../../../hooks/use_confirm_persistence_prompt';
import { urlTrackerMock } from '../../../__mocks__/url_tracker.mock';
import { setUrlTracker } from '../../../kibana_services';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';

jest.mock('../../../hooks/use_confirm_persistence_prompt', () => {
  const createdDataView = {
    id: 'updated-mock-id',
  };
  const mocks = {
    openConfirmSavePrompt: jest.fn(() => Promise.resolve(createdDataView)),
    updateSavedSearch: jest.fn(() => Promise.resolve({})),
  };

  return {
    useConfirmPersistencePrompt: () => mocks,
    mocks,
  };
});

jest.mock('../../../kibana_services', () => {
  const actual = jest.requireActual('../../../kibana_services');
  return {
    ...actual,
    getUiActions: jest.fn(() => ({
      getTrigger: jest.fn(() => {}),
      getAction: jest.fn(() => ({ execute: jest.fn() })),
    })),
  };
});

setUrlTracker(urlTrackerMock);

interface ConfirmPromptMocks {
  openConfirmSavePrompt: jest.Mock;
  updateSavedSearch: jest.Mock;
}

const persistencePromptMocks = (
  persistencePromptModule as unknown as {
    useConfirmPersistencePrompt: () => ConfirmPromptMocks;
    mocks: ConfirmPromptMocks;
  }
).mocks;

const mockDataView = {
  id: 'mock-id',
  title: 'mock-title',
  timeFieldName: 'mock-time-field-name',
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
} as DataView;

describe('useAdHocDataViews', () => {
  it('should save data view with new id and update saved search', async () => {
    const hook = renderHook((d: DataView) =>
      useAdHocDataViews({
        dataView: mockDataView,
        stateContainer: getDiscoverStateMock({ isTimeBased: true }),
        services: discoverServiceMock,
      })
    );

    const savedDataView = await hook.result.current.persistDataView();

    expect(persistencePromptMocks.openConfirmSavePrompt).toHaveBeenCalledWith(mockDataView);
    const updateSavedSearchCall = persistencePromptMocks.updateSavedSearch.mock.calls[0];
    expect(updateSavedSearchCall[0].dataView.id).toEqual('updated-mock-id');
    expect(savedDataView!.id).toEqual('updated-mock-id');
  });

  it('should update id of adhoc data view correctly', async () => {
    const dataViewsCreateMock = mockDiscoverServices.dataViews.create as jest.Mock;
    dataViewsCreateMock.mockImplementation(() => ({
      ...mockDataView,
      id: 'updated-mock-id',
    }));
    const hook = renderHook((d: DataView) =>
      useAdHocDataViews({
        dataView: mockDataView,
        stateContainer: getDiscoverStateMock({ isTimeBased: true }),
        services: discoverServiceMock,
      })
    );

    let updatedDataView: DataView;
    await act(async () => {
      updatedDataView = await hook.result.current.updateAdHocDataViewId(mockDataView);
    });

    expect(dataViewsCreateMock).toHaveBeenCalledWith({
      id: undefined,
    });
    expect(updatedDataView!.id).toEqual('updated-mock-id');
  });
});

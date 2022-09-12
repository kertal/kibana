/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { discoverServiceMock } from '../../../__mocks__/services';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { useInspector } from './use_inspector';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

describe('test useInspector', () => {
  test('inspector open function is executed, expanded doc is closed', async () => {
    const setExpandedDoc = jest.fn();

    const { result } = renderHook(() => {
      return useInspector({
        inspectorAdapters: { requests: new RequestAdapter() },
        savedSearch: savedSearchMock,
        inspector: discoverServiceMock.inspector,
        setExpandedDoc,
      });
    });
    result.current();
    expect(setExpandedDoc).toHaveBeenCalled();
    expect(discoverServiceMock.inspector.open).toHaveBeenCalled();
  });
});

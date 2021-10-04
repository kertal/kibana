/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { indexPatternMock } from '../../../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../../../__mocks__/saved_search';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenu, TopNavMenuData } from '../../../../../../../navigation/public';
import { ISearchSource, Query } from '../../../../../../../data/common';
import { GetStateReturn } from '../../services/discover_state';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';
import { discoverServiceMock } from '../../../../../__mocks__/services';

setHeaderActionMenuMounter(jest.fn());

function getProps(savePermissions = true, labsUiEnabled = true): DiscoverTopNavProps {
  discoverServiceMock.capabilities.discover!.save = savePermissions;
  discoverServiceMock.uiSettings.get.mockImplementation((key) => {
    switch (key) {
      case 'labs:discover:enable_ui':
        return labsUiEnabled;
    }
  });

  return {
    stateContainer: {} as GetStateReturn,
    indexPattern: indexPatternMock,
    savedSearch: savedSearchMock,
    navigateTo: jest.fn(),
    services: discoverServiceMock,
    query: {} as Query,
    savedQuery: '',
    updateQuery: jest.fn(),
    onOpenInspector: jest.fn(),
    searchSource: {} as ISearchSource,
    resetSavedSearch: () => {},
  };
}

describe('Discover topnav component', () => {
  test('generated config of TopNavMenu config is correct when discover save permissions are assigned', () => {
    const props = getProps(true);
    const component = shallowWithIntl(<DiscoverTopNav {...props} />);
    const topMenuWrapper = component.find(TopNavMenu);
    const topMenuConfig = topMenuWrapper.props().config!.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['labs', 'new', 'save', 'open', 'share', 'inspect', 'options']);
  });

  test('generated config of TopNavMenu config is correct when no discover save permissions are assigned', () => {
    const props = getProps(false);
    const component = shallowWithIntl(<DiscoverTopNav {...props} />);
    const topMenuWrapper = component.find(TopNavMenu);

    const topMenuConfig = topMenuWrapper.props().config!.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['labs', 'new', 'open', 'share', 'inspect', 'options']);
  });

  test('should not show labs button if ui disabled', () => {
    const props = getProps(false, false);
    const component = shallowWithIntl(<DiscoverTopNav {...props} />);
    const topMenuWrapper = component.find(TopNavMenu);

    const topMenuConfig = topMenuWrapper.props().config!.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['new', 'open', 'share', 'inspect', 'options']);
  });
});

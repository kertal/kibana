/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { storiesOf } from '@storybook/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { getDataViewMock } from '@kbn/unified-discover/src/__mocks__/__storybook_mocks__/get_data_view_mock';
import { withDiscoverServices } from '@kbn/unified-discover/src/__mocks__/__storybook_mocks__/with_discover_services';
import { DiscoverMainProvider } from '../../../services/discover_state_provider';
import { DiscoverAppState } from '../../../services/discover_app_state_container';
import { getDocumentsLayoutProps, getPlainRecordLayoutProps } from './get_layout_props';
import { DiscoverLayout, DiscoverLayoutProps } from '../discover_layout';
import { setHeaderActionMenuMounter } from '../../../../../kibana_services';

setHeaderActionMenuMounter(() => void 0);

const DiscoverLayoutStory = (layoutProps: DiscoverLayoutProps) => {
  const [state, setState] = useState({});

  const update = (newState: Partial<DiscoverAppState>) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  const getState = () => state;

  return (
    <DiscoverLayout
      {...layoutProps}
      stateContainer={{
        ...layoutProps.stateContainer,
        appState: { ...layoutProps.stateContainer.appState, getState, update },
      }}
    />
  );
};

storiesOf('components/layout/DiscoverLayout', module).add(
  'Data view with timestamp',
  withDiscoverServices(() => {
    const props = getDocumentsLayoutProps(getDataViewMock(true));
    return (
      <IntlProvider locale="en">
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverLayoutStory {...props} />
        </DiscoverMainProvider>
      </IntlProvider>
    );
  })
);

storiesOf('components/layout/DiscoverLayout', module).add(
  'Data view without timestamp',
  withDiscoverServices(() => {
    const props = getDocumentsLayoutProps(getDataViewMock(false));
    return (
      <IntlProvider locale="en">
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverLayoutStory {...props} />
        </DiscoverMainProvider>
      </IntlProvider>
    );
  })
);

storiesOf('components/layout/DiscoverLayout', module).add(
  'SQL view',
  withDiscoverServices(() => {
    const props = getPlainRecordLayoutProps(getDataViewMock(false));
    return (
      <IntlProvider locale="en">
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverLayoutStory {...props} />
        </DiscoverMainProvider>
      </IntlProvider>
    );
  })
);

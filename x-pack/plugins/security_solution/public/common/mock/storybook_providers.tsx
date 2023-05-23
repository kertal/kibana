/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantUiSettings } from '@kbn/elastic-assistant';
import { AssistantProvider } from '@kbn/elastic-assistant';
import { euiLightVars } from '@kbn/ui-theme';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { BehaviorSubject, Subject } from 'rxjs';
import { ThemeProvider } from 'styled-components';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { CellActionsProvider } from '@kbn/cell-actions';
import { createStore } from '../store';
import { mockGlobalState } from './global_state';
import { SUB_PLUGINS_REDUCER } from './utils';
import { createSecuritySolutionStorageMock } from './mock_local_storage';
import type { StartServices } from '../../types';

export const kibanaObservable = new BehaviorSubject({} as unknown as StartServices);

const { storage } = createSecuritySolutionStorageMock();

const uiSettings = {
  get: (setting: string) => {
    switch (setting) {
      case 'dateFormat':
        return 'MMM D, YYYY @ HH:mm:ss.SSS';
      case 'dateFormat:scaled':
        return [['', 'HH:mm:ss.SSS']];
    }
  },
  get$: () => new Subject(),
};

const coreMock = {
  application: {
    getUrlForApp: () => {},
  },
  uiSettings,
} as unknown as CoreStart;

const KibanaReactContext = createKibanaReactContext(coreMock);

const mockApiConfig: AssistantUiSettings = {
  virusTotal: {
    apiKey: 'mock',
    baseUrl: 'https://www.virustotal.com/api/v3',
  },
  openAI: {
    apiKey: 'mock',
    baseUrl:
      'https://example.com/openai/deployments/example/chat/completions?api-version=2023-03-15-preview',
  },
};

/**
 * A utility for wrapping components in Storybook that provides access to the most common React contexts used by security components.
 * It is a simplified version of TestProvidersComponent.
 * To reuse TestProvidersComponent here, we need to remove all references to jest from mocks.
 */
export const StorybookProviders: React.FC = ({ children }) => {
  const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });

  return (
    <I18nProvider>
      <KibanaReactContext.Provider>
        <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve([])}>
          <ReduxStoreProvider store={store}>
            <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
              <AssistantProvider
                apiConfig={mockApiConfig}
                augmentMessageCodeBlocks={jest.fn()}
                conversations={{}}
                getComments={jest.fn()}
                httpFetch={http.fetch}
                setConversations={jest.fn()}
              >
                {children}
              </AssistantProvider>
            </ThemeProvider>
          </ReduxStoreProvider>
        </CellActionsProvider>
      </KibanaReactContext.Provider>
    </I18nProvider>
  );
};

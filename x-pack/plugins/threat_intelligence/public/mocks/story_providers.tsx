/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, VFC } from 'react';
import { createKibanaReactContext } from '@kbn/react-public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { mockIndicatorsFiltersContext } from './mock_indicators_filters_context';
import { SecuritySolutionContext } from '../containers/security_solution_context';
import { getSecuritySolutionContextMock } from './mock_security_context';
import { IndicatorsFiltersContext } from '../modules/indicators/hooks/use_filters_context';
import { FieldTypesContext } from '../containers/field_types_provider';
import { generateFieldTypeMap } from './mock_field_type_map';
import { mockUiSettingsService } from './mock_kibana_ui_settings_service';
import { mockKibanaTimelinesService } from './mock_kibana_timelines_service';
import { mockTriggersActionsUiService } from './mock_kibana_triggers_actions_ui_service';
import { InspectorContext } from '../containers/inspector';
import { BlockListProvider } from '../modules/indicators/containers/block_list_provider';

export interface KibanaContextMock {
  /**
   * For the data plugin (see {@link DataPublicPluginStart})
   */
  data?: DataPublicPluginStart;
  /**
   * For the core ui-settings package (see {@link IUiSettingsClient})
   */
  uiSettings?: IUiSettingsClient;

  settings?: SettingsStart;
  /**
   * For the timelines plugin
   */
  timelines: TimelinesUIStart;
}

export interface StoryProvidersComponentProps {
  /**
   * Extend / override mock services specified in {@link defaultServices} to create KibanaReactContext (using {@link createKibanaReactContext}). This is optional.
   */
  kibana?: KibanaContextMock;
  /**
   * Component(s) to be displayed inside
   */
  children: ReactNode;
}

const securityLayout = {
  getPluginWrapper:
    (): FC =>
    ({ children }) =>
      <div>{children}</div>,
};

const defaultServices = {
  uiSettings: mockUiSettingsService(),
  settings: { client: mockUiSettingsService() },
  timelines: mockKibanaTimelinesService,
  triggersActionsUi: mockTriggersActionsUiService,
  storage: {
    set: () => {},
    get: () => {},
  },
  cases: {
    hooks: {
      useCasesAddToNewCaseFlyout: () => {},
      useCasesAddToExistingCaseModal: () => {},
    },
    helpers: {
      canUseCases: () => ({
        create: true,
        update: true,
      }),
    },
  },
} as unknown as CoreStart;

/**
 * Helper functional component used in Storybook stories.
 * Wraps the story with our {@link SecuritySolutionContext} and KibanaReactContext.
 */
export const StoryProvidersComponent: VFC<StoryProvidersComponentProps> = ({
  children,
  kibana = {},
}) => {
  const KibanaReactContext = createKibanaReactContext({
    ...defaultServices,
    ...kibana,
    securityLayout,
  });
  const securitySolutionContextMock = getSecuritySolutionContextMock();

  return (
    <EuiThemeProvider>
      <QueryClientProvider client={new QueryClient()}>
        <InspectorContext.Provider value={{ requests: new RequestAdapter() }}>
          <FieldTypesContext.Provider value={generateFieldTypeMap()}>
            <SecuritySolutionContext.Provider value={securitySolutionContextMock}>
              <IndicatorsFiltersContext.Provider value={mockIndicatorsFiltersContext}>
                <KibanaReactContext.Provider>
                  <BlockListProvider>{children}</BlockListProvider>
                </KibanaReactContext.Provider>
              </IndicatorsFiltersContext.Provider>
            </SecuritySolutionContext.Provider>
          </FieldTypesContext.Provider>
        </InspectorContext.Provider>
      </QueryClientProvider>
    </EuiThemeProvider>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';

import { Provider } from 'react-redux';
import { Store } from 'redux';
import { getContext, resetContext } from 'kea';

import { I18nProvider } from '@kbn/i18n/react';
import { AppMountParameters, CoreStart, ApplicationStart, ChromeBreadcrumb } from 'src/core/public';
import { ClientConfigType, ClientData, PluginsSetup } from '../plugin';
import { LicenseProvider } from './shared/licensing';
import { mountHttpLogic } from './shared/http';
import { mountFlashMessagesLogic } from './shared/flash_messages';
import { IExternalUrl } from './shared/enterprise_search_url';
import { IInitialAppData } from '../../common/types';

export interface IKibanaContext {
  config: { host?: string };
  externalUrl: IExternalUrl;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setDocTitle(title: string): void;
}

export const KibanaContext = React.createContext({});

/**
 * This file serves as a reusable wrapper to share Kibana-level context and other helpers
 * between various Enterprise Search plugins (e.g. AppSearch, WorkplaceSearch, ES landing page)
 * which should be imported and passed in as the first param in plugin.ts.
 */

export const renderApp = (
  App: React.FC<IInitialAppData>,
  params: AppMountParameters,
  core: CoreStart,
  plugins: PluginsSetup,
  config: ClientConfigType,
  { externalUrl, errorConnecting, ...initialData }: ClientData
) => {
  resetContext({ createStore: true });
  const store = getContext().store as Store;

  const unmountHttpLogic = mountHttpLogic({
    http: core.http,
    errorConnecting,
    readOnlyMode: initialData.readOnlyMode,
  });

  const unmountFlashMessagesLogic = mountFlashMessagesLogic({ history: params.history });

  ReactDOM.render(
    <I18nProvider>
      <KibanaContext.Provider
        value={{
          config,
          externalUrl,
          navigateToUrl: core.application.navigateToUrl,
          setBreadcrumbs: core.chrome.setBreadcrumbs,
          setDocTitle: core.chrome.docTitle.change,
        }}
      >
        <LicenseProvider license$={plugins.licensing.license$}>
          <Provider store={store}>
            <Router history={params.history}>
              <App {...initialData} />
            </Router>
          </Provider>
        </LicenseProvider>
      </KibanaContext.Provider>
    </I18nProvider>,
    params.element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
    unmountHttpLogic();
    unmountFlashMessagesLogic();
  };
};

/**
 * Render function for Kibana's header action menu chrome -
 * reusable by any Enterprise Search plugin simply by passing in
 * a custom HeaderActions component (e.g., WorkplaceSearchHeaderActions)
 * @see https://github.com/elastic/kibana/blob/master/docs/development/core/public/kibana-plugin-core-public.appmountparameters.setheaderactionmenu.md
 */
interface IHeaderActionsProps {
  externalUrl: IExternalUrl;
}

export const renderHeaderActions = (
  HeaderActions: React.FC<IHeaderActionsProps>,
  kibanaHeaderEl: HTMLElement,
  externalUrl: IExternalUrl
) => {
  ReactDOM.render(<HeaderActions externalUrl={externalUrl} />, kibanaHeaderEl);
  return () => ReactDOM.unmountComponentAtNode(kibanaHeaderEl);
};

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@kbn/i18n/react';
import { NewVisModal } from './new_vis_modal';
import { getHttp, getSavedObjects, getTypes, getUISettings, getUsageCollector } from '../services';

export interface ShowNewVisModalParams {
  editorParams?: string[];
  onClose?: () => void;
}

export function showNewVisModal({ editorParams = [], onClose }: ShowNewVisModalParams = {}) {
  const container = document.createElement('div');
  const handleClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    if (onClose) {
      onClose();
    }
  };

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <NewVisModal
        isOpen={true}
        onClose={handleClose}
        editorParams={editorParams}
        visTypesRegistry={getTypes()}
        addBasePath={getHttp().basePath.prepend}
        uiSettings={getUISettings()}
        savedObjects={getSavedObjects()}
        usageCollection={getUsageCollector()}
      />
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}

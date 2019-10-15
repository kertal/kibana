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

import { wrapInI18nContext } from 'ui/i18n';
// import '../../../../ui/public/render_complete/directive';
// @ts-ignore
import { DiscoverNoResults } from './directives/no_results';
// @ts-ignore
import { DiscoverUninitialized } from './directives/uninitialized';
// @ts-ignore
import { DiscoverUnsupportedIndexPattern } from './directives/unsupported_index_pattern';
// @ts-ignore
import { DiscoverHistogram } from './directives/histogram';
import { DocViewer } from '../doc_viewer';
import { ActionBar } from './context/components/action_bar/action_bar';
import { DiscoverFetchError } from '../components/fetch_error/fetch_error';

export function getDirectives(app: any) {
  app.directive('discoverNoResults', (reactDirective: any) =>
    reactDirective(wrapInI18nContext(DiscoverNoResults))
  );

  app.directive('discoverUninitialized', (reactDirective: any) =>
    reactDirective(wrapInI18nContext(DiscoverUninitialized))
  );

  app.directive('discoverUnsupportedIndexPattern', (reactDirective: any) =>
    reactDirective(wrapInI18nContext(DiscoverUnsupportedIndexPattern), ['unsupportedType'])
  );

  app.directive('discoverHistogram', (reactDirective: any) => reactDirective(DiscoverHistogram));

  app.directive('docViewer', (reactDirective: any) => {
    return reactDirective(
      DocViewer,
      [
        ['indexPattern', { watchDepth: 'reference' }],
        ['hit', { watchDepth: 'value' }],
        ['filter', { watchDepth: 'value' }],
        ['columns', { watchDepth: 'value' }],
        ['onAddColumn', { watchDepth: 'reference' }],
        ['onRemoveColumn', { watchDepth: 'reference' }],
      ],
      {
        restrict: 'E',
        scope: {
          hit: '=',
          indexPattern: '=',
          filter: '=?',
          columns: '=?',
          onAddColumn: '=?',
          onRemoveColumn: '=?',
        },
      }
    );
  });

  app.directive('contextActionBar', function(reactDirective: any) {
    return reactDirective(wrapInI18nContext(ActionBar));
  });

  app.directive('discoverFetchError', (reactDirective: any) =>
    reactDirective(wrapInI18nContext(DiscoverFetchError))
  );
}

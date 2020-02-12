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
import { i18n } from '@kbn/i18n';
import { extractIndexPatterns } from '../../../../../plugins/vis_type_timeseries/common/extract_index_patterns';
import { getCoreStart } from '../services';

export async function fetchFields(indexPatterns = ['*']) {
  const patterns = Array.isArray(indexPatterns) ? indexPatterns : [indexPatterns];
  try {
    const indexFields = await Promise.all(
      patterns.map(pattern => {
        return getCoreStart().http.get('/api/metrics/fields', {
          query: {
            index: pattern,
          },
        });
      })
    );
    const fields = patterns.reduce((cumulatedFields, currentPattern, index) => {
      return {
        ...cumulatedFields,
        [currentPattern]: indexFields[index],
      };
    }, {});
    return fields;
  } catch (error) {
    getCoreStart().notifications.toasts.addDanger({
      title: i18n.translate('visTypeTimeseries.fetchFields.loadIndexPatternFieldsErrorMessage', {
        defaultMessage: 'Unable to load index_pattern fields',
      }),
      text: error.message,
    });
  }
}

export async function fetchIndexPatternFields({ params, fields = {} }) {
  const indexPatterns = extractIndexPatterns(params, fields);

  return await fetchFields(indexPatterns);
}

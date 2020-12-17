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
import React, { Fragment } from 'react';
import {
  EuiDataGridCellValueElementProps,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

export const getRenderCellValueFn = (
  indexPattern: IndexPattern,
  rows: ElasticSearchHit[] | undefined
) => ({ rowIndex, columnId, isDetails }: EuiDataGridCellValueElementProps) => {
  const row = rows ? (rows[rowIndex] as Record<string, unknown>) : undefined;
  const field = indexPattern.fields.getByName(columnId);

  if (typeof row === 'undefined' || !field) {
    return <span>-</span>;
  }
  const formatSource = () => {
    const formatted = indexPattern.formatHit(row);

    return (
      <EuiDescriptionList type="inline" compressed>
        {Object.keys(formatted).map((key) => (
          <Fragment key={key}>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription dangerouslySetInnerHTML={{ __html: formatted[key] }} />
          </Fragment>
        ))}
      </EuiDescriptionList>
    );
  };

  const value =
    field && field.type === '_source' ? (
      formatSource()
    ) : (
      // eslint-disable-next-line react/no-danger
      <span dangerouslySetInnerHTML={{ __html: indexPattern.formatField(row, columnId) }} />
    );

  if (isDetails && field && field.type === '_source') {
    // nicely formatted JSON for the expanded view
    return <span>{JSON.stringify(row[columnId], null, 2)}</span>;
  }
  return value;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

interface SelectedVSAvailableCallout {
  selectedColumns: string[];
  esqlQueryColumns?: DatatableColumn[];
}

export const SelectedVSAvailableCallout = ({
  esqlQueryColumns,
  selectedColumns,
}: SelectedVSAvailableCallout) => {
  const isEsqlMode = useIsEsqlMode();

  return (
    <>
      {isEsqlMode &&
        esqlQueryColumns &&
        selectedColumns.length > 0 &&
        selectedColumns.length < esqlQueryColumns.length && (
          <EuiCallOut
            color="primary"
            data-test-subj="dscSelectedColumnsCallout"
            iconType="iInCircle"
            title={i18n.translate('discover.textBasedMode.selectedColumnsCallout', {
              defaultMessage:
                'Displaying {selectedColumnsNumber} of {textBasedQueryColumnsNumber} fields. Add more from the Available fields list.',
              values: {
                textBasedQueryColumnsNumber: esqlQueryColumns.length,
                selectedColumnsNumber: selectedColumns.length,
              },
            })}
            size="s"
          />
        )}
    </>
  );
};

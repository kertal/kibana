/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { copyToClipboard, EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { DiscoverGridContext, GridContext } from './discover_grid_context';
import { useDiscoverServices } from '../../utils/use_discover_services';
import { formatFieldValue } from '../../utils/format_value';

function onFilterCell(
  context: GridContext,
  rowIndex: EuiDataGridColumnCellActionProps['rowIndex'],
  columnId: EuiDataGridColumnCellActionProps['columnId'],
  mode: '+' | '-'
) {
  const row = context.rowsFlattened[rowIndex];
  const value = String(row[columnId]);
  const field = context.indexPattern.fields.getByName(columnId);

  if (value && field) {
    context.onFilter(field, value, mode);
  }
}

export const FilterInBtn = ({
  Component,
  rowIndex,
  columnId,
}: EuiDataGridColumnCellActionProps) => {
  const context = useContext(DiscoverGridContext);
  const buttonTitle = i18n.translate('discover.grid.filterForAria', {
    defaultMessage: 'Filter for this {value}',
    values: { value: columnId },
  });

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '+');
      }}
      iconType="plusInCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="filterForButton"
    >
      {i18n.translate('discover.grid.filterFor', {
        defaultMessage: 'Filter for',
      })}
    </Component>
  );
};

export const FilterOutBtn = ({
  Component,
  rowIndex,
  columnId,
}: EuiDataGridColumnCellActionProps) => {
  const context = useContext(DiscoverGridContext);
  const buttonTitle = i18n.translate('discover.grid.filterOutAria', {
    defaultMessage: 'Filter out this {value}',
    values: { value: columnId },
  });

  return (
    <Component
      onClick={() => {
        onFilterCell(context, rowIndex, columnId, '-');
      }}
      iconType="minusInCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="filterOutButton"
    >
      {i18n.translate('discover.grid.filterOut', {
        defaultMessage: 'Filter out',
      })}
    </Component>
  );
};

export const CopyBtn = ({ Component, rowIndex, columnId }: EuiDataGridColumnCellActionProps) => {
  const { indexPattern: dataView, rowsFlattened, rows } = useContext(DiscoverGridContext);
  const { fieldFormats } = useDiscoverServices();

  const buttonTitle = i18n.translate('discover.grid.filterOutAria', {
    defaultMessage: 'Copy value of column {column}',
    values: { column: columnId },
  });

  return (
    <Component
      onClick={() => {
        const rowFlattened = rowsFlattened[rowIndex];
        const field = dataView.fields.getByName(columnId);
        const value = rowFlattened[columnId];

        const valueFormatted =
          field?.type === '_source'
            ? JSON.stringify(rowFlattened, null, 2)
            : formatFieldValue(value, rows[rowIndex], fieldFormats, dataView, field, 'text');
        copyToClipboard(valueFormatted);
      }}
      iconType="copyClipboard"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="copyClipboardButton"
    >
      {i18n.translate('discover.grid.copyClipboardButton', {
        defaultMessage: 'Copy to clipboard',
      })}
    </Component>
  );
};

export function buildCellActions(field: DataViewField) {
  if (field?.type === '_source') {
    return [CopyBtn];
  } else if (!field.filterable) {
    return undefined;
  }

  return [FilterInBtn, FilterOutBtn];
}

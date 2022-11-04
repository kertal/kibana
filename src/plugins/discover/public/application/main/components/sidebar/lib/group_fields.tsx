/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniqBy } from 'lodash';
import {
  type DataViewField,
  type DataView,
  getFieldSubtypeMulti,
} from '@kbn/data-views-plugin/public';

export function shouldShowField(
  field: DataViewField,
  useNewFieldsApi: boolean,
  isPlainRecord: boolean
): boolean {
  if (field.type === '_source') {
    return false;
  }
  if (isPlainRecord) {
    // exclude only `_source` for plain records
    return true;
  }
  // exclude multifields unless searching from source
  return useNewFieldsApi ? !getFieldSubtypeMulti(field?.spec) : true;
}

export function getSelectedFields(
  dataView: DataView | undefined,
  columns: string[]
): DataViewField[] {
  let selectedFields: DataViewField[] = [];
  if (!Array.isArray(columns)) {
    return [];
  }

  // add selected columns, that are not part of the data view, to be removable
  for (const column of columns) {
    const selectedField =
      dataView?.getFieldByName?.(column) ||
      ({
        name: column,
        displayName: column,
        type: 'unknown_selected',
      } as DataViewField);
    selectedFields.push(selectedField);
  }

  selectedFields = uniqBy(selectedFields, 'name');

  if (selectedFields.length === 1 && selectedFields[0].name === '_source') {
    return [];
  }

  selectedFields.sort((a, b) => {
    return columns.indexOf(a.name) - columns.indexOf(b.name);
  });

  return selectedFields;
}

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
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiTitle } from '@elastic/eui';
import { sortBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverField } from './discover_field';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { DiscoverFieldSearch } from './discover_field_search';
import { IndexPatternAttributes } from '../../../../../../../../plugins/data/common';
import { SavedObject } from '../../../../../../../../core/types';
import { groupFields } from './lib/group_fields';
import {
  IndexPatternFieldList,
  IndexPatternField,
  IndexPattern,
} from '../../../../../../../../plugins/data/public';
import { AppState } from '../../angular/discover_state';
import { getDetails } from './lib/get_details';
import { getFieldFilter } from './lib/get_field_filter';
import { getServices } from '../../../kibana_services';
import { getIndexPatternFieldList } from './lib/get_fields';

export interface Props {
  columns: string[];
  fieldCounts: Record<string, number>;
  hits: Array<Record<string, unknown>>;
  indexPatternList: Array<SavedObject<IndexPatternAttributes>>;
  onAddField: (fieldName: string) => void;
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  onRemoveField: (fieldName: string) => void;
  selectedIndexPattern: IndexPattern;
  setIndexPattern: (id: string) => void;
  state: AppState;
}

export function DiscoverFieldChooser({
  columns,
  fieldCounts,
  hits,
  indexPatternList,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  setIndexPattern,
  state,
}: Props) {
  const filter = getFieldFilter();
  const [openFieldMap, setOpenFieldMap] = useState(new Map());
  const [showFields, setShowFields] = useState(false);
  const [fields, setFields] = useState<IndexPatternFieldList | null>(null);
  const [fieldFilterValues, setFieldFilterValues] = useState(filter.getValues());
  useEffect(() => {
    const newFields = getIndexPatternFieldList(selectedIndexPattern, fieldCounts);
    setFields(newFields);
  }, [selectedIndexPattern, fieldCounts, hits]);

  const popularLimit = getServices().uiSettings.get('fields:popularLimit');
  const onChangeFieldSearch = (field: string, value: string | boolean | undefined) => {
    filter.setValue(field, value);
    setFieldFilterValues({ ...filter.getValues() });
  };

  if (!selectedIndexPattern || !fields) {
    return null;
  }
  const groupedFields = groupFields(fields, columns, popularLimit, fieldCounts);

  const fieldTypes = ['any'];
  for (const field of fields) {
    if (fieldTypes.indexOf(field.type) === -1) {
      fieldTypes.push(field.type);
    }
  }

  const onShowDetails = (show: boolean, field: IndexPatternField) => {
    if (!show) {
      setOpenFieldMap(new Map(openFieldMap.set(field.name, false)));
    } else {
      setOpenFieldMap(new Map(openFieldMap.set(field.name, true)));
      selectedIndexPattern.popularizeField(field.name, 1);
    }
  };

  const isFieldDisplayed = (field: IndexPatternField) => {
    return columns.includes(field.name);
  };

  const isFieldFiltered = (field: IndexPatternField) => {
    const vals = fieldFilterValues;
    const matchFilter = vals.type === 'any' || field.type === vals.type;
    const isAggregatable = vals.aggregatable === null || field.aggregatable === vals.aggregatable;
    const isSearchable = vals.searchable === null || field.searchable === vals.searchable;
    const scriptedOrMissing =
      !vals.missing || field.type === '_source' || field.scripted || fieldCounts[field.name] > 0;
    const matchName = !vals.name || field.name.indexOf(vals.name) !== -1;

    return matchFilter && isAggregatable && isSearchable && scriptedOrMissing && matchName;
  };
  /**
   * filter for fields that match the filter and are displayed/selected
   */
  const isFieldFilteredAndDisplayed = (field: IndexPatternField) => {
    return isFieldDisplayed(field) && isFieldFiltered(field);
  };
  /**
   * filter for fields that are not displayed / selected for the data table
   */
  const isFieldFilteredAndNotDisplayed = (field: IndexPatternField) => {
    return !isFieldDisplayed(field) && isFieldFiltered(field) && field.type !== '_source';
  };

  const getDetailsByField = (ipField: IndexPatternField) =>
    getDetails(ipField, selectedIndexPattern, state, columns, hits);

  const popularFields = groupedFields?.popular?.filter(isFieldFilteredAndNotDisplayed) || [];
  return (
    <section
      className="sidebar-list"
      aria-label={i18n.translate(
        'kbn.discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel',
        {
          defaultMessage: 'Index and fields',
        }
      )}
    >
      <DiscoverIndexPattern
        selectedIndexPattern={selectedIndexPattern}
        setIndexPattern={setIndexPattern}
        indexPatternList={sortBy(indexPatternList, o => o.attributes.title)}
      />
      <div className="sidebar-item">
        <form>
          <DiscoverFieldSearch
            onChange={onChangeFieldSearch}
            value={fieldFilterValues.name}
            types={fieldTypes}
          />
        </form>
      </div>
      <div className="sidebar-list">
        {fields.length > 0 && (
          <>
            <div className="dscSidebar__listHeader sidebar-list-header">
              <EuiTitle size="xxxs" id="selected_fields">
                <h3>
                  <FormattedMessage
                    id="kbn.discover.fieldChooser.filter.selectedFieldsTitle"
                    defaultMessage="Selected fields"
                  />
                </h3>
              </EuiTitle>
            </div>
            <ul className="list-unstyled dscFieldList--selected" aria-labelledby="selected_fields">
              {fields
                .filter(isFieldFilteredAndDisplayed)
                .map((field: IndexPatternField, idx: number) => {
                  return (
                    <li key={`field${idx}`}>
                      <DiscoverField
                        field={field}
                        indexPattern={selectedIndexPattern}
                        onAddField={onAddField}
                        onRemoveField={onRemoveField}
                        onAddFilter={onAddFilter}
                        onShowDetails={onShowDetails}
                        getDetails={getDetailsByField}
                        showDetails={openFieldMap.get(field.name) || false}
                        selected={true}
                      />
                    </li>
                  );
                })}
            </ul>
            <div className="sidebar-list-header sidebar-item euiFlexGroup euiFlexGroup--gutterMedium">
              <EuiTitle size="xxxs" id="available_fields" className="euiFlexItem">
                <h3>
                  <FormattedMessage
                    id="kbn.discover.fieldChooser.filter.availableFieldsTitle"
                    defaultMessage="Available fields"
                  />
                </h3>
              </EuiTitle>
              <div className="euiFlexItem euiFlexItem--flexGrowZero">
                <EuiButtonIcon
                  className={'visible-xs visible-sm dscFieldChooser__toggle'}
                  iconType={showFields ? 'arrowDown' : 'arrowRight'}
                  onClick={() => setShowFields(!showFields)}
                  aria-label={
                    showFields
                      ? i18n.translate(
                          'kbn.discover.fieldChooser.filter.indexAndFieldsSectionHideAriaLabel',
                          {
                            defaultMessage: 'Hide fields',
                          }
                        )
                      : i18n.translate(
                          'kbn.discover.fieldChooser.filter.indexAndFieldsSectionShowAriaLabel',
                          {
                            defaultMessage: 'Show fields',
                          }
                        )
                  }
                />
              </div>
            </div>
          </>
        )}
        {popularFields.length > 0 && (
          <ul
            className={`list-unstyled sidebar-well dscFieldList--popular ${
              !showFields ? 'hidden-sm hidden-xs' : ''
            }`}
            aria-labelledby="available_fields"
          >
            <li className="sidebar-item sidebar-list-header">
              <h6>
                <FormattedMessage
                  id="kbn.discover.fieldChooser.filter.popularTitle"
                  defaultMessage="Popular"
                />
              </h6>
            </li>
            {popularFields.map((field: IndexPatternField, idx: number) => {
              return (
                <li key={`field${idx}`}>
                  <DiscoverField
                    field={field}
                    indexPattern={selectedIndexPattern}
                    onAddField={onAddField}
                    onRemoveField={onRemoveField}
                    onAddFilter={onAddFilter}
                    onShowDetails={onShowDetails}
                    getDetails={getDetailsByField}
                    showDetails={openFieldMap.get(field.name) || false}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <ul
          className={`list-unstyled dscFieldList--unpopular ${
            !showFields ? 'hidden-sm hidden-xs' : ''
          }`}
          aria-labelledby="available_fields"
        >
          {groupedFields &&
            groupedFields.unpopular
              .filter(isFieldFilteredAndNotDisplayed)
              .map((field: IndexPatternField, idx: number) => {
                return (
                  <li key={`field${idx}`}>
                    <DiscoverField
                      field={field}
                      indexPattern={selectedIndexPattern}
                      onAddField={onAddField}
                      onRemoveField={onRemoveField}
                      onAddFilter={onAddFilter}
                      onShowDetails={onShowDetails}
                      getDetails={getDetailsByField}
                      showDetails={openFieldMap.get(field.name) || false}
                    />
                  </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
}

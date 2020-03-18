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
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DiscoverField } from './discover_field';
import { DiscoverIndexPattern } from './discover_index_pattern';
import { DiscoverFieldSearch } from './discover_field_search';
import { IIndexPattern } from '../../../../../../../../plugins/data/common/index_patterns';
import { Field } from './types';

export interface Props {
  fields: Field[];
  fieldTypes: any;
  filter: any;
  indexPatternList: any;
  getDetails: any;
  groupedFields: {
    selected: any;
    popular: any;
    unpopular: any;
  };
  onAddField: any;
  onAddFilter: any;
  onRemoveField: any;
  onShowFields: any;
  openFields: any;
  selectedIndexPattern: IIndexPattern;
  setFilterValue: any;
  setIndexPattern: any;
  showDetails: boolean;
  showFields: any;
}

export function DiscoverFieldChooser({
  fields,
  fieldTypes,
  filter,
  getDetails,
  groupedFields,
  indexPatternList,
  onAddField,
  onAddFilter,
  onRemoveField,
  selectedIndexPattern,
  setFilterValue,
  setIndexPattern,
}: Props) {
  const [openFieldMap, setOpenFieldMap] = useState(new Map());
  const [showFields, setShowFields] = useState(false);

  if (!selectedIndexPattern || !filter) {
    return null;
  }

  const onShowDetails = (show: boolean, field: Field) => {
    if (!show) {
      setOpenFieldMap(new Map(openFieldMap.set(field.name, false)));
    } else {
      setOpenFieldMap(new Map(openFieldMap.set(field.name, true)));
      selectedIndexPattern.popularizeField(field.name, 1);
    }
  };

  const isFieldFiltered = (field: Field) => {
    const { vals } = filter;
    const matchFilter = vals.type === 'any' || field.type === vals.type;
    const isAggregatable = vals.aggregatable == null || field.aggregatable === vals.aggregatable;
    const isSearchable = vals.searchable == null || field.searchable === vals.searchable;
    const scriptedOrMissing =
      !vals.missing || field.type === '_source' || field.scripted || field.rowCount > 0;
    const matchName = !vals.name || field.name.indexOf(vals.name) !== -1;

    return matchFilter && isAggregatable && isSearchable && scriptedOrMissing && matchName;
  };

  const isFieldFilteredAndDisplayed = (field: Field) => {
    return field.display && isFieldFiltered(field);
  };
  /**
   * filter for fields that are not displayed / selected for the data table
   */
  const isFieldFilteredAndNotDisplayed = (field: Field) => {
    return !field.display && isFieldFiltered(field) && field.type !== '_source';
  };

  const indexAndFieldsAriaLabel = i18n.translate(
    'kbn.discover.fieldChooser.filter.indexAndFieldsSectionAriaLabel',
    {
      defaultMessage: 'Index and fields',
    }
  );
  const popularFields = groupedFields?.popular?.filter(isFieldFilteredAndNotDisplayed) || [];
  return (
    <section className="sidebar-list" aria-label={indexAndFieldsAriaLabel}>
      <DiscoverIndexPattern
        selectedIndexPattern={selectedIndexPattern}
        setIndexPattern={setIndexPattern}
        indexPatternList={indexPatternList}
      />

      <div className="sidebar-item">
        <form>
          <DiscoverFieldSearch
            onChange={setFilterValue}
            value={filter.vals.name}
            types={fieldTypes}
          />
        </form>
      </div>
      <div className="sidebar-list">
        {fields && fields.length && (
          <>
            <div className="dscSidebar__listHeader sidebar-list-header">
              <h3
                className="euiFlexItem euiTitle euiTitle--xxxsmall sidebar-list-header-heading"
                id="selected_fields"
                tabIndex={0}
              >
                <FormattedMessage
                  id="kbn.discover.fieldChooser.filter.selectedFieldsTitle"
                  defaultMessage="Selected fields"
                />
              </h3>
            </div>
            <ul className="list-unstyled dscFieldList--selected" aria-labelledby="selected_fields">
              {fields.filter(isFieldFilteredAndDisplayed).map((field: Field, idx: number) => {
                return (
                  <li key={`field${idx}`}>
                    <DiscoverField
                      field={field}
                      onAddField={onAddField}
                      onRemoveField={onRemoveField}
                      onAddFilter={onAddFilter}
                      onShowDetails={onShowDetails}
                      getDetails={getDetails}
                      showDetails={openFieldMap.get(field.name) || false}
                    />
                  </li>
                );
              })}
            </ul>
            <div className="sidebar-list-header sidebar-item euiFlexGroup euiFlexGroup--gutterMedium">
              <h3
                className="euiFlexItem euiTitle euiTitle--xxxsmall sidebar-list-header-heading"
                id="available_fields"
                tabIndex={0}
              >
                <FormattedMessage
                  id="kbn.discover.fieldChooser.filter.availableFieldsTitle"
                  defaultMessage="Available fields"
                />
              </h3>
              <div className="euiFlexItem euiFlexItem--flexGrowZero">
                <button
                  onClick={() => setShowFields(!showFields)}
                  aria-hidden="true"
                  className="kuiButton kuiButton--small visible-xs visible-sm pull-right dscFieldChooser__toggle"
                >
                  <span
                    aria-hidden="true"
                    className={`kuiIcon ${showFields ? 'fa-chevron-down' : 'fa-chevron-right'}`}
                  />
                </button>
              </div>
            </div>
          </>
        )}
        {popularFields.length > 0 && (
          <ul
            className={`list-unstyled sidebar-well dscFieldList--popular ${
              showFields ? 'hidden-sm' : 'hidden-xs'
            }`}
          >
            <li className="sidebar-item sidebar-list-header">
              <h6>
                <FormattedMessage
                  id="kbn.discover.fieldChooser.filter.popularTitle"
                  defaultMessage="Popular"
                />
              </h6>
            </li>
            {popularFields.map((field: Field, idx: number) => {
              return (
                <li key={`field${idx}`}>
                  <DiscoverField
                    field={field}
                    onAddField={onAddField}
                    onRemoveField={onRemoveField}
                    onAddFilter={onAddFilter}
                    onShowDetails={onShowDetails}
                    getDetails={getDetails}
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
        >
          {groupedFields &&
            groupedFields.unpopular
              .filter(isFieldFilteredAndNotDisplayed)
              .map((field: Field, idx: number) => {
                return (
                  <li key={`field${idx}`}>
                    <DiscoverField
                      field={field}
                      onAddField={onAddField}
                      onRemoveField={onRemoveField}
                      onAddFilter={onAddFilter}
                      onShowDetails={onShowDetails}
                      getDetails={getDetails}
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

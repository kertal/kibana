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
import { EuiButton, EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscoverFieldDetails } from './discover_field_details';
import { FieldIcon } from '../../../../../../../../plugins/kibana_react/public';
import { FieldDetails } from './types';
import { IndexPatternField, IndexPattern } from '../../../../../../../../plugins/data/public';

export interface Props {
  field: IndexPatternField;
  indexPattern: IndexPattern;
  onAddField: (fieldName: string) => void;
  onAddFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  onRemoveField: (fieldName: string) => void;
  onShowDetails: (show: boolean, field: IndexPatternField) => void;
  showDetails: boolean;
  getDetails: (field: IndexPatternField) => FieldDetails;
  selected?: boolean;
}

export function DiscoverField({
  field,
  indexPattern,
  onAddField,
  onRemoveField,
  onAddFilter,
  onShowDetails,
  showDetails,
  getDetails,
  selected,
}: Props) {
  const addLabel = i18n.translate('kbn.discover.fieldChooser.discoverField.addButtonLabel', {
    defaultMessage: 'Add',
  });
  const removeLabel = i18n.translate('kbn.discover.fieldChooser.discoverField.removeButtonLabel', {
    defaultMessage: 'Remove',
  });

  const toggleDisplay = (f: IndexPatternField) => {
    if (selected) {
      onRemoveField(f.name);
    } else {
      onAddField(f.name);
    }
  };
  const details = showDetails ? getDetails(field) : null;

  return (
    <div className={`${showDetails ? 'dscSidebarItemExpanded' : ''}`}>
      <div
        className={`dscSidebarField sidebar-item-title dscSidebarItem ${
          showDetails ? 'dscSidebarItem--active' : ''
        }`}
        tabIndex={0}
        onClick={() => onShowDetails(!showDetails, field)}
        onKeyPress={() => onShowDetails(!showDetails, field)}
      >
        <span className="dscSidebarField__fieldIcon">
          <FieldIcon type={field.type} label={field.name} />
        </span>
        <span className="dscSidebarField__name eui-textTruncate">
          <EuiToolTip
            position="top"
            content={field.name}
            delay="long"
            anchorClassName="eui-textTruncate"
          >
            <EuiText size="xs" data-test-subj={`field-${field.name}`} className="eui-textTruncate">
              {field.name}
            </EuiText>
          </EuiToolTip>
        </span>
        <span>
          {field.name !== '_source' && !selected && (
            <EuiButton
              fill
              size="s"
              className="dscSidebarItem__action"
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                ev.preventDefault();
                ev.stopPropagation();
                toggleDisplay(field);
              }}
              data-test-subj={`fieldToggle-${field.name}`}
            >
              {addLabel}
            </EuiButton>
          )}
          {field.name !== '_source' && selected && (
            <EuiButton
              color="danger"
              className="dscSidebarItem__action"
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                ev.preventDefault();
                ev.stopPropagation();
                toggleDisplay(field);
              }}
              data-test-subj={`fieldToggle-${field.name}`}
            >
              {removeLabel}
            </EuiButton>
          )}
        </span>
      </div>
      {showDetails && details && (
        <DiscoverFieldDetails
          indexPattern={indexPattern}
          field={field}
          details={details}
          onAddFilter={onAddFilter}
        />
      )}
    </div>
  );
}

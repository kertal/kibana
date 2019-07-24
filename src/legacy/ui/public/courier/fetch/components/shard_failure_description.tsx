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
// @ts-ignore
import { EuiCodeEditor, EuiCode, EuiCodeBlock, EuiDescriptionList, EuiTitle } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { ShardFailure } from './shard_failure_types';
import { getFlattenedObject } from '../../../../../../legacy/utils/get_flattened_object';

/**
 * Provides pretty formatting of a given key string
 * e.g. formats "this_key.is_nice" to "This key is nice"
 * @param key
 */
export function formatKey(key: string) {
  const nameCapitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return nameCapitalized.replace(/[\._]/g, ' ');
}
/**
 * Adds a EuiCodeBlock to values of  `script` and `script_stack` key
 * Values of other keys are handled a strings
 * @param value
 * @param key
 */
export function formatValueByKey(value: any, key: string) {
  if (key === 'script' || key === 'script_stack') {
    const valueScript = Array.isArray(value) ? value.join('\n') : String(value);
    return (
      <EuiCodeBlock language="java" paddingSize="s" isCopyable style={{ width: '500px' }}>
        {valueScript}
      </EuiCodeBlock>
    );
  } else {
    return String(value);
  }
}

export function ShardFailureDescription(props: ShardFailure) {
  const flattendReason = getFlattenedObject(props.reason);

  const listItems = Object.entries(flattendReason).map(([key, value]) => ({
    title: formatKey(key),
    description: formatValueByKey(value, key),
  }));

  const headerTxt = formatKey(props.reason.type);

  return (
    <div>
      <EuiTitle size="xs">
        <h1>
          {headerTxt} @{' '}
          <span className="shardFailureModal__keyValueTitle">
            shard <EuiCode>{props.shard}</EuiCode>
          </span>
          <span className="shardFailureModal__keyValueTitle">
            index <EuiCode>{props.index}</EuiCode>
          </span>
          <span className="shardFailureModal__keyValueTitle">
            node <EuiCode>{props.node}</EuiCode>
          </span>
        </h1>
      </EuiTitle>
      <EuiDescriptionList
        listItems={listItems}
        type="column"
        compressed
        titleProps={{ className: 'shardFailureModal__descTitle' }}
        descriptionProps={{ className: 'shardFailureModal__descValue' }}
      />
    </div>
  );
}

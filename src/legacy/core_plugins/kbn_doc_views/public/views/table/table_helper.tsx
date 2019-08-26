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
import { unescape } from 'lodash';

/**
 * convert <mark> markup of the given text to react
 * @param text
 */
export function replaceMarkWithReactDom(text: string): React.ReactNode {
  return (
    <>
      {text.split('<mark>').map((markedText, idx) => {
        const sub = markedText.split('</mark>');
        return (
          <span key={idx}>
            <mark>{sub[0]}</mark>
            {sub[1]}
          </span>
        );
      })}
    </>
  );
}
// current html of the formatter is angular flavored, this current workaround
// should be removed when all consumers of the formatHit function are react based
export function convertAngularHtml(html: string): string | React.ReactNode {
  if (typeof html === 'string') {
    const cleaned = html.replace('<span ng-non-bindable>', '').replace('</span>', '');
    const unescaped = unescape(cleaned);
    if (unescaped.indexOf('<mark>') !== -1) {
      return replaceMarkWithReactDom(unescaped);
    }
    return unescaped;
  }
  return html;
}

export function arrayContainsObjects(value: unknown[]) {
  return value.some(v => typeof v === 'object' && v !== null);
}

// the formatting of array of objects with formatHit is optimized for angular
// and since it's still in use in other places, we do some local formatting here
export function formatValue(
  value: string,
  valueFormatted: Record<string, unknown>
): string | React.ReactNode {
  if (Array.isArray(value) && arrayContainsObjects(value)) {
    return value.map(v => JSON.stringify(v, null, 2)).join('\n');
  } else if (Array.isArray(value)) {
    return value.join(', ');
  } else if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  } else {
    return typeof valueFormatted === 'string' ? convertAngularHtml(valueFormatted) : String(value);
  }
}

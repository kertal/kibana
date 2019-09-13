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
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { Doc, DocProps } from './doc';

// Suppress warnings about "act" until we use React 16.9
/* eslint-disable no-console */
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

export const waitForPromises = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * this works but logs ugly error messages until we're using React 16.9
 * should be adapted when we upgrade
 * @param search
 * @param update
 */
async function mountDoc(search: () => void, update = false) {
  const props = {
    id: '1',
    index: 'index1',
    esClient: { search },
    indexPattern: {
      getComputedFields: () => [],
    } as any,
  } as DocProps;
  let comp;
  act(() => {
    comp = mountWithIntl(<Doc {...props} />);
    if (update) comp.update();
  });
  if (update) {
    await waitForPromises();
    // @ts-ignore
    comp.update();
  }
  return comp;
}

describe('Test of <Doc /> of Discover', () => {
  it('renders loading msg', async () => {
    const comp = await mountDoc(jest.fn());
    expect(findTestSubject(comp, 'doc-msg-loading').length).toBe(1);
  });

  it('renders notFound msg', async () => {
    const search = jest.fn(() => Promise.reject({ status: 404 }));
    const comp = await mountDoc(search, true);
    expect(findTestSubject(comp, 'doc-msg-notFound').length).toBe(1);
  });

  it('renders error msg', async () => {
    const search = jest.fn(() => Promise.reject('whatever'));
    const comp = await mountDoc(search, true);
    expect(findTestSubject(comp, 'doc-msg-error').length).toBe(1);
  });

  it('renders elasticsearch hit ', async () => {
    const hit = { hits: { total: 1, hits: [{ _id: 1, _source: { test: 1 } }] } };
    const search = jest.fn(() => Promise.resolve(hit));
    const comp = await mountDoc(search, true);
    expect(findTestSubject(comp, 'doc-hit').length).toBe(1);
  });
});

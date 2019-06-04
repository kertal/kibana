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
// @ts-check


// @ts-ignore
import { SearchSourceProvider } from 'ui/courier';
import moment from 'moment';

import { reverseSortDirection } from './utils/sorting';

/**
 * @typedef {Object} SearchResult
 * @prop {{ total: number, hits: any[] }} hits
 * @prop {Object} aggregations
 */

/**
 * @typedef {Object} SearchSourceT
 * @prop {function(): Promise<SearchResult>} fetch
 * @prop {function(string, any): SearchSourceT} setField
 * @prop {function(any): SearchSourceT} setParent
 */

/**
 * @typedef {'asc' | 'desc'} SortDirection
 */

const DAY_MILLIS = 24 * 60 * 60 * 1000;

// look from 1 day up to 10000 days into the past and future
const LOOKUP_OFFSETS = [0, 1, 7, 30, 365, 10000].map((days) => days * DAY_MILLIS);

/**
 * extract nanoseconds if available in ISO timestamp
 * returns the nanos like this:
 * 9ns -> 000000009
 * 10000ns -> 0000010000
 * @param {string} timeFieldValue
 * @returns {string}
 */
function extractNanoSeconds(timeFieldValue = '') {
  const fractionSeconds = timeFieldValue
    .split('.')[1]
    .replace('Z', '');
  return (fractionSeconds.length !== 9)
    ? fractionSeconds.padEnd(9, '0')
    : fractionSeconds;
}

function convertIsoToNanosAsStr(isoValue) {
  const nanos = extractNanoSeconds(isoValue);
  const millis = convertIsoToMillis(isoValue);
  return `${millis}${nanos.substr(3, 6)}`;
}

/**
 * convert an iso formatted string to number of milliseconds since
 * 1970-01-01T00:00:00.000Z
 * @param {string} isoValue
 * @returns {number}
 */
function convertIsoToMillis(isoValue) {
  const date = new Date(isoValue);
  return date.getTime();
}
/**
 * the given time value in milliseconds is converted to a ISO formatted string
 * if nanosValue is provided, the given value replaces the fractional seconds part
 * of the formated string since moment.js doesn't support formatting timestamps
 * with a higher precision then microseconds
 * The browser rounds date nanos values:
 * 2019-09-18T06:50:12.999999999 -> browser rounds to 1568789413000000000
 * 2019-09-18T06:50:59.999999999 -> browser rounds to 1568789460000000000
 * 2017-12-31T23:59:59.999999999 -> browser rounds 1514761199999999999 to 1514761200000000000
 * @param {number} timeValueMillis
 * @param {string} nanosValue
 */
function convertTimeValueToIso(timeValueMillis, nanosValue) {
  if(!timeValueMillis) {
    return null;
  }
  const isoString = moment(timeValueMillis).toISOString();
  if(!isoString) {
    return null;
  } else if(nanosValue !== '') {
    return `${isoString.substring(0, isoString.length - 4)}${nanosValue}Z`;
  }
  return isoString;
}

function fetchContextProvider(indexPatterns, Private) {
  /**
   * @type {{new(): SearchSourceT}}
   */
  const SearchSource = Private(SearchSourceProvider);

  return {
    fetchPredecessors,
    fetchSuccessors,
  };

  async function fetchSuccessors(
    indexPatternId,
    timeFieldName,
    timeFieldSortDir,
    timeFieldIsoValue,
    timeFieldNumValue,
    tieBreakerField,
    tieBreakerValue,
    size,
    filters
  ) {
    const indexPattern = await indexPatterns.get(indexPatternId);
    const searchSource = await createSearchSource(indexPattern, filters);
    const offsetSign = timeFieldSortDir === 'asc' ? 1 : -1;

    const nanoSeconds = indexPattern.isTimeNanosBased() ? extractNanoSeconds(timeFieldIsoValue) : '';
    const timeValueMillis = nanoSeconds !== '' ? convertIsoToMillis(timeFieldIsoValue) : timeFieldNumValue;

    // ending with `null` opens the last interval
    const intervals = asPairs([...LOOKUP_OFFSETS.map(offset => timeValueMillis + offset * offsetSign), null]);

    let successors = [];
    for (const [iStartTimeValue, iEndTimeValue] of intervals) {
      const remainingSize = size - successors.length;

      if (remainingSize <= 0) {
        break;
      }

      const afterTimeValue = nanoSeconds
        ? convertIsoToNanosAsStr(successors.length ? successors[successors.length - 1]._source[timeFieldName] : timeFieldIsoValue)
        : timeFieldNumValue;

      const afterTieBreakerValue = successors.length > 0 ? successors[successors.length - 1].sort[1] : tieBreakerValue;

      const hits = await fetchHitsInInterval(
        searchSource,
        timeFieldName,
        timeFieldSortDir,
        iStartTimeValue,
        iEndTimeValue,
        afterTimeValue,
        tieBreakerField,
        afterTieBreakerValue,
        remainingSize,
        nanoSeconds
      );

      successors = [...successors, ...hits];
    }

    return successors;
  }

  async function fetchPredecessors(
    indexPatternId,
    timeFieldName,
    timeFieldSortDir,
    timeFieldIsoValue,
    timeFieldNumValue,
    tieBreakerField,
    tieBreakerValue,
    size,
    filters
  ) {
    const indexPattern = await indexPatterns.get(indexPatternId);
    const searchSource = await createSearchSource(indexPattern, filters);
    const offsetSign = timeFieldSortDir === 'desc' ? 1 : -1;
    const nanoSeconds = indexPattern.isTimeNanosBased() ? extractNanoSeconds(timeFieldIsoValue) : '';
    const timeValueMillis = nanoSeconds !== '' ? convertIsoToMillis(timeFieldIsoValue) : timeFieldNumValue;

    // ending with `null` opens the last interval
    const intervals = asPairs([...LOOKUP_OFFSETS.map(offset => timeValueMillis + offset * offsetSign), null]);

    let predecessors = [];
    for (const [iStartTimeValue, iEndTimeValue] of intervals) {
      const remainingSize = size - predecessors.length;

      if (remainingSize <= 0) {
        break;
      }
      const afterTimeValue = nanoSeconds
        ? convertIsoToNanosAsStr(predecessors.length ? predecessors[0]._source[timeFieldName] : timeFieldIsoValue)
        : timeFieldNumValue;
      const afterTieBreakerValue = predecessors.length > 0 ? predecessors[0].sort[1] : tieBreakerValue;

      const hits = await fetchHitsInInterval(
        searchSource,
        timeFieldName,
        reverseSortDirection(timeFieldSortDir),
        iStartTimeValue,
        iEndTimeValue,
        afterTimeValue,
        tieBreakerField,
        afterTieBreakerValue,
        remainingSize,
        nanoSeconds
      );

      predecessors = [...hits.slice().reverse(), ...predecessors];
    }

    return predecessors;
  }


  /**
   * @param {Object} indexPattern
   * @param {any[]} filters
   * @returns {Promise<Object>}
   */
  async function createSearchSource(indexPattern, filters) {
    return new SearchSource()
      .setParent(false)
      .setField('index', indexPattern)
      .setField('filter', filters);
  }

  /**
   * Fetch the hits between `(afterTimeValue, tieBreakerValue)` and
   * `endRangeMillis` from the `searchSource` using the given `timeField` and
   * `tieBreakerField` fields up to a maximum of `maxCount` documents. The
   * documents are sorted by `(timeField, tieBreakerField)` using the
   * `timeSortDirection` for both fields
   *
   * The `searchSource` is assumed to have the appropriate index pattern
   * and filters set.
   *
   * @param {SearchSourceT} searchSource
   * @param {string} timeFieldName
   * @param {SortDirection} timeFieldSortDir
   * @param {number} startRangeMillis
   * @param {number | null} endRangeMillis
   * @param {number| string} afterTimeValue
   * @param {string} tieBreakerField
   * @param {number} tieBreakerValue
   * @param {number} maxCount
   * @param {string} nanosValue
   * @returns {Promise<object[]>}
   */
  async function fetchHitsInInterval(
    searchSource,
    timeFieldName,
    timeFieldSortDir,
    startRangeMillis,
    endRangeMillis,
    afterTimeValue,
    tieBreakerField,
    tieBreakerValue,
    maxCount,
    nanosValue
  ) {

    const startRange = {
      [timeFieldSortDir === 'asc' ? 'gte' : 'lte']: convertTimeValueToIso(startRangeMillis, nanosValue),
    };
    const endRange = endRangeMillis === null ? {} : {
      [timeFieldSortDir === 'asc' ? 'lte' : 'gte']: convertTimeValueToIso(endRangeMillis, nanosValue),
    };

    const response = await searchSource
      .setField('size', maxCount)
      .setField('query', {
        query: {
          constant_score: {
            filter: {
              range: {
                [timeFieldName]: {
                  format: 'strict_date_optional_time',
                  ...startRange,
                  ...endRange,
                }
              },
            },
          },
        },
        language: 'lucene'
      })
      .setField('searchAfter', [
        afterTimeValue,
        tieBreakerValue
      ])
      .setField('sort', [
        { [timeFieldName]: timeFieldSortDir },
        { [tieBreakerField]: timeFieldSortDir },
      ])
      .setField('version', true)
      .fetch();

    return response.hits ? response.hits.hits : [];
  }
}

/**
 * Generate a sequence of pairs from the iterable that looks like
 * `[[x_0, x_1], [x_1, x_2], [x_2, x_3], ..., [x_(n-1), x_n]]`.
 *
 * @param {Iterable<any>} iterable
 * @returns {IterableIterator<(any[])>}
 */
function* asPairs(iterable) {
  let currentPair = [];
  for (const value of iterable) {
    currentPair = [...currentPair, value].slice(-2);
    if (currentPair.length === 2) {
      yield currentPair;
    }
  }
}

export {
  fetchContextProvider,
};

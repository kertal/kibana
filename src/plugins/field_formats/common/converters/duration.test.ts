/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DurationFormat } from './duration';

describe('Duration Format', () => {
  testCase({
    inputFormat: 'seconds',
    outputFormat: 'humanize',
    outputPrecision: undefined,
    showSuffix: undefined,
    fixtures: [
      {
        input: 0,
        output: '0 seconds',
      },
      {
        input: -60,
        output: 'minus a minute',
      },
      {
        input: 1,
        output: 'a few seconds',
      },
      {
        input: 60,
        output: 'a minute',
      },
      {
        input: 125,
        output: '2 minutes',
      },
    ],
  });

  testCase({
    inputFormat: 'minutes',
    outputFormat: 'humanize',
    outputPrecision: undefined,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: 'minus an hour',
      },
      {
        input: 60,
        output: 'an hour',
      },
      {
        input: 125,
        output: '2 hours',
      },
    ],
  });

  testCase({
    inputFormat: 'minutes',
    outputFormat: 'asHours',
    outputPrecision: undefined,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: '-1.00',
      },
      {
        input: 60,
        output: '1.00',
      },
      {
        input: 125,
        output: '2.08',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: '-60',
      },
      {
        input: 60,
        output: '60',
      },
      {
        input: 125,
        output: '125',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 2,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: '-60.00',
      },
      {
        input: -32.333,
        output: '-32.33',
      },
      {
        input: 60,
        output: '60.00',
      },
      {
        input: 125,
        output: '125.00',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    showSuffix: true,
    fixtures: [
      {
        input: -60,
        output: '-60 seconds',
      },
      {
        input: -32.333,
        output: '-32 seconds',
      },
    ],
  });

  testCase({
    inputFormat: 'nanoseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 1988,
        output: '0.00 milliseconds',
      },
      {
        input: 658,
        output: '0.00 milliseconds',
      },
      {
        input: 3857,
        output: '0.00 milliseconds',
      },
    ],
  });

  testCase({
    inputFormat: 'microseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 1988,
        output: '1.99 milliseconds',
      },
      {
        input: 658,
        output: '0.66 milliseconds',
      },
      {
        input: 3857,
        output: '3.86 milliseconds',
      },
    ],
  });

  testCase({
    inputFormat: 'microseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 1,
    showSuffix: true,
    fixtures: [
      {
        input: 1988,
        output: '2.0 milliseconds',
      },
      {
        input: 0,
        output: '0.0 milliseconds',
      },
      {
        input: 658,
        output: '0.7 milliseconds',
      },
      {
        input: 3857,
        output: '3.9 milliseconds',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    fixtures: [
      {
        input: 600,
        output: '10 minutes',
      },
      {
        input: 30,
        output: '30 seconds',
      },
      {
        input: 3000,
        output: '50 minutes',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 600,
        output: '10.00 minutes',
      },
      {
        input: 30,
        output: '30.00 seconds',
      },
      {
        input: 3000,
        output: '50.00 minutes',
      },
      {
        input: 604800,
        output: '1.00 weeks',
      },
      // 1 week and 3 and a half days
      {
        input: 907200,
        output: '1.50 weeks',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    fixtures: [
      {
        input: 600,
        output: '10.00 minutes',
      },
      {
        input: 30,
        output: '30.00 seconds',
      },
      {
        input: 3000,
        output: '50.00 minutes',
      },
      {
        input: 604800,
        output: '1.00 weeks',
      },
      // 1 week and 3 and a half days
      {
        input: 907200,
        output: '1.50 weeks',
      },
      {
        input: 691200,
        output: '1.14 weeks',
      },
    ],
  });

  testCase({
    inputFormat: 'hours',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    useShortSuffix: true,
    fixtures: [
      {
        input: 339,
        output: '2 w',
      },
    ],
  });

  testCase({
    inputFormat: 'minutes',
    outputFormat: 'humanizePrecise',
    outputPrecision: 2,
    showSuffix: true,
    useShortSuffix: true,
    fixtures: [
      {
        input: 10750,
        output: '1.07 w',
      },
    ],
  });

  testCase({
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
    outputPrecision: 0,
    showSuffix: true,
    useShortSuffix: true,
    includeSpaceWithSuffix: false,
    fixtures: [
      {
        input: -123,
        output: '-123ms',
      },
      {
        input: 1,
        output: '1ms',
      },
      {
        input: 600,
        output: '600ms',
      },
    ],
  });

  function testCase({
    inputFormat,
    outputFormat,
    outputPrecision,
    showSuffix,
    useShortSuffix,
    includeSpaceWithSuffix,
    fixtures,
  }: {
    inputFormat: string;
    outputFormat: string;
    outputPrecision: number | undefined;
    showSuffix: boolean | undefined;
    useShortSuffix?: boolean;
    includeSpaceWithSuffix?: boolean;
    fixtures: Array<{ input: number; output: string }>;
  }) {
    fixtures.forEach((fixture: { input: number; output: string }) => {
      const input = fixture.input;
      const output = fixture.output;

      test(`should format ${input} ${inputFormat} through ${outputFormat}${
        outputPrecision ? `, ${outputPrecision} decimals` : ''
      }`, () => {
        const duration = new DurationFormat(
          {
            inputFormat,
            outputFormat,
            outputPrecision,
            showSuffix,
            useShortSuffix,
            includeSpaceWithSuffix,
          },
          jest.fn()
        );
        expect(duration.convert(input)).toBe(output);
      });
    });
  }
});

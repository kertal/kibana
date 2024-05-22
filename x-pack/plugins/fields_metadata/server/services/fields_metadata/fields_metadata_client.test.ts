/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TEcsFields } from '../../../common';
import { loggerMock } from '@kbn/logging-mocks';
import { FieldsMetadataClient } from './fields_metadata_client';
import { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import { IntegrationFieldsRepository } from './repositories/integration_fields_repository';

const ecsFields = {
  '@timestamp': {
    dashed_name: 'timestamp',
    description:
      'Date/time when the event originated.\nThis is the date/time extracted from the event, typically representing when the event was generated by the source.\nIf the event source has no original timestamp, this value is typically populated by the first time the event was received by the pipeline.\nRequired field for all events.',
    example: '2016-05-23T08:05:34.853Z',
    flat_name: '@timestamp',
    level: 'core',
    name: '@timestamp',
    normalize: [],
    required: !0,
    short: 'Date/time when the event originated.',
    type: 'date',
  },
} as TEcsFields;

describe('FieldsMetadataClient class', () => {
  const logger = loggerMock.create();
  const ecsFieldsRepository = EcsFieldsRepository.create({ ecsFields });
  const integrationFieldsRepository = IntegrationFieldsRepository.create({
    integrationFieldsExtractor: () => Promise.resolve({}),
  });

  const fieldsMetadataClient = FieldsMetadataClient.create({
    ecsFieldsRepository,
    integrationFieldsRepository,
    logger,
  });

  it('#getByName resolves a single ecs field', () => {
    const timestampField = fieldsMetadataClient.getByName('@timestamp');

    expect(timestampField.hasOwnProperty('dashed_name')).toBeTruthy();
    expect(timestampField.hasOwnProperty('description')).toBeTruthy();
    expect(timestampField.hasOwnProperty('example')).toBeTruthy();
    expect(timestampField.hasOwnProperty('flat_name')).toBeTruthy();
    expect(timestampField.hasOwnProperty('level')).toBeTruthy();
    expect(timestampField.hasOwnProperty('name')).toBeTruthy();
    expect(timestampField.hasOwnProperty('normalize')).toBeTruthy();
    expect(timestampField.hasOwnProperty('required')).toBeTruthy();
    expect(timestampField.hasOwnProperty('short')).toBeTruthy();
    expect(timestampField.hasOwnProperty('type')).toBeTruthy();
  });

  it('#find resolves a dictionary of matching fields', async () => {
    const fields = fieldsMetadataClient.find({
      fieldNames: ['@timestamp', 'message', 'not-existing-field'],
    });

    expect(fields.hasOwnProperty('@timestamp')).toBeTruthy();
    expect(fields.hasOwnProperty('message')).toBeTruthy();
    expect(fields.hasOwnProperty('not-existing-field')).toBeFalsy();
  });
});

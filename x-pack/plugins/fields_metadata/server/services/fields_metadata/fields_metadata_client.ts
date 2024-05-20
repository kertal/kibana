/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import { Logger } from '@kbn/core/server';
import { FieldName, FieldMetadata, FieldsMetadataDictionary } from '../../../common';
import { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import { IntegrationsFieldsSourceClient } from './repositories/integration_fields_repository';
import { IFieldsMetadataClient } from './types';

interface FieldsMetadataClientDeps {
  logger: Logger;
  ecsFieldsRepository: EcsFieldsRepository;
  integrationFieldsSourceClient: IntegrationsFieldsSourceClient;
}

interface FindOptions {
  fieldNames?: FieldName[];
}

export class FieldsMetadataClient implements IFieldsMetadataClient {
  private constructor(
    private readonly logger: Logger,
    private readonly ecsFieldsRepository: EcsFieldsRepository,
    private readonly integrationFieldsSourceClient: IntegrationsFieldsSourceClient
  ) {}

  getByName<TFieldName extends FieldName>(fieldName: TFieldName): FieldMetadata | undefined {
    this.logger.debug(`Retrieving field metadata for: ${fieldName}`);

    const field = this.ecsFieldsRepository.getByName(fieldName);

    // TODO: enable resolution for integration field
    // if (!field) {
    //   field = this.integrationFieldsSourceClient.getByName(fieldName);
    // }

    return field;
  }

  find({ fieldNames }: FindOptions = {}): FieldsMetadataDictionary {
    if (!fieldNames) {
      return this.ecsFieldsRepository.find();
    }

    const fields = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<FieldName, FieldMetadata>);

    return FieldsMetadataDictionary.create(fields);
  }

  public static create({
    logger,
    ecsFieldsRepository,
    integrationFieldsSourceClient,
  }: FieldsMetadataClientDeps) {
    return new FieldsMetadataClient(logger, ecsFieldsRepository, integrationFieldsSourceClient);
  }
}

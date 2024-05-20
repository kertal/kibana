/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createValidationFunction } from '../../../common/runtime_types';
import { FIND_FIELDS_METADATA_URL } from '../../../common/fields_metadata';
import * as fieldsMetadataV1 from '../../../common/fields_metadata/v1';
import { FieldsMetadataBackendLibs } from '../../lib/shared_types';
import { FindFieldsMetadataResponsePayload } from '../../../common/fields_metadata/v1';

export const initFindFieldsMetadataRoute = ({
  router,
  getStartServices,
}: FieldsMetadataBackendLibs) => {
  router.versioned
    .get({
      access: 'internal',
      path: FIND_FIELDS_METADATA_URL,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: createValidationFunction(fieldsMetadataV1.findFieldsMetadataRequestQueryRT),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { attributes, fieldNames } = request.query;

        const { fieldsMetadata } = (await getStartServices())[2];
        const fieldsMetadataClient = fieldsMetadata.getClient();

        try {
          const fieldsDictionary = fieldsMetadataClient.find({ fieldNames });

          const responsePayload: FindFieldsMetadataResponsePayload = { fields: {} };

          if (attributes) {
            responsePayload.fields = fieldsDictionary.pick(attributes);
          } else {
            responsePayload.fields = fieldsDictionary.toPlain();
          }

          return response.ok({
            body: fieldsMetadataV1.findFieldsMetadataResponsePayloadRT.encode(responsePayload),
          });
        } catch (error) {
          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: {
              message: error.message ?? 'An unexpected error occurred',
            },
          });
        }
      }
    );
};

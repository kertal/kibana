/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 */

import { BaseActionSchema, Command, Timeout } from '../model/schema/common.gen';

export type ExecuteActionRequestBody = z.infer<typeof ExecuteActionRequestBody>;
export const ExecuteActionRequestBody = BaseActionSchema.merge(
  z.object({
    parameters: z.object({
      command: Command,
      timeout: Timeout.optional(),
    }),
  })
);

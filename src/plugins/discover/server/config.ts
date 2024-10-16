/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enableUiSettingsValidations: schema.boolean({ defaultValue: false }),
  experimental: schema.maybe(
    schema.object({
      ruleFormV2Enabled: schema.maybe(schema.boolean({ defaultValue: false })),
      enabledProfiles: schema.maybe(schema.arrayOf(schema.string(), { defaultValue: [] })),
    })
  ),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
export type ExperimentalFeatures = NonNullable<ConfigSchema['experimental']>;

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    experimental: true,
  },
};

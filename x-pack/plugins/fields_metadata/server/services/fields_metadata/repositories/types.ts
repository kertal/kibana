/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialFieldMetadataPlain } from '../../../../common';

export interface IntegrationFieldsSearchParams {
  integration: string;
  dataset?: string;
}

export type ExtractedIntegrationFields = Record<string, Record<string, PartialFieldMetadataPlain>>;

export type IntegrationFieldsExtractor = ({
  integration,
  dataset,
}: IntegrationFieldsSearchParams) => Promise<ExtractedIntegrationFields>;

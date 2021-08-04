/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatchRulesOptions } from './types';
import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { getAlertMock } from '../routes/__mocks__/request_responses';
import { getMlRuleParams, getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { RuleExecutionLogClient } from '../rule_execution_log/__mocks__/rule_execution_log_client';

export const getPatchRulesOptionsMock = (): PatchRulesOptions => ({
  author: ['Elastic'],
  buildingBlockType: undefined,
  rulesClient: rulesClientMock.create(),
  spaceId: 'default',
  ruleStatusClient: new RuleExecutionLogClient(),
  anomalyThreshold: undefined,
  description: 'some description',
  enabled: true,
  eventCategoryOverride: undefined,
  falsePositives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  license: 'Elastic License',
  savedId: 'savedId-123',
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  meta: {},
  machineLearningJobId: undefined,
  filters: [],
  index: ['index-123'],
  interval: '5m',
  maxSignals: 100,
  riskScore: 80,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  outputIndex: 'output-1',
  name: 'Query with a rule id',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threshold: undefined,
  threatFilters: undefined,
  threatIndex: undefined,
  threatQuery: undefined,
  threatMapping: undefined,
  threatLanguage: undefined,
  concurrentSearches: undefined,
  itemsPerSearch: undefined,
  timestampOverride: undefined,
  to: 'now',
  type: 'query',
  references: ['http://www.example.com'],
  note: '# sample markdown',
  version: 1,
  exceptionsList: [],
  actions: [],
  rule: getAlertMock(getQueryRuleParams()),
});

export const getPatchMlRulesOptionsMock = (): PatchRulesOptions => ({
  author: ['Elastic'],
  buildingBlockType: undefined,
  rulesClient: rulesClientMock.create(),
  spaceId: 'default',
  ruleStatusClient: new RuleExecutionLogClient(),
  anomalyThreshold: 55,
  description: 'some description',
  enabled: true,
  eventCategoryOverride: undefined,
  falsePositives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  query: undefined,
  language: undefined,
  license: 'Elastic License',
  savedId: 'savedId-123',
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  meta: {},
  machineLearningJobId: 'new_job_id',
  filters: [],
  index: ['index-123'],
  interval: '5m',
  maxSignals: 100,
  riskScore: 80,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  outputIndex: 'output-1',
  name: 'Machine Learning Job',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threshold: undefined,
  threatFilters: undefined,
  threatIndex: undefined,
  threatQuery: undefined,
  threatMapping: undefined,
  threatLanguage: undefined,
  concurrentSearches: undefined,
  itemsPerSearch: undefined,
  timestampOverride: undefined,
  to: 'now',
  type: 'machine_learning',
  references: ['http://www.example.com'],
  note: '# sample markdown',
  version: 1,
  exceptionsList: [],
  actions: [],
  rule: getAlertMock(getMlRuleParams()),
});

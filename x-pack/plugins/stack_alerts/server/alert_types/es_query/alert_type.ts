/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Logger } from 'src/core/server';
import { RuleType } from '../../types';
import { ActionContext } from './action_context';
import {
  EsQueryAlertParams,
  EsQueryAlertParamsSchema,
  EsQueryAlertState,
} from './alert_type_params';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { ExecutorOptions, OnlyEsQueryAlertParams, OnlySearchSourceAlertParams } from './types';
import { ActionGroupId, ES_QUERY_ID } from './constants';
import { esQueryExecutor, searchSourceExecutor } from './executor';

export function getAlertType(
  logger: Logger,
  core: CoreSetup
): RuleType<
  EsQueryAlertParams,
  never, // Only use if defining useSavedObjectReferences hook
  EsQueryAlertState,
  {},
  ActionContext,
  typeof ActionGroupId
> {
  const alertTypeName = i18n.translate('xpack.stackAlerts.esQuery.alertTypeTitle', {
    defaultMessage: 'Elasticsearch query',
  });

  const actionGroupName = i18n.translate('xpack.stackAlerts.esQuery.actionGroupThresholdMetTitle', {
    defaultMessage: 'Query matched',
  });

  const actionVariableContextDateLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextDateLabel',
    {
      defaultMessage: 'The date that the alert met the threshold condition.',
    }
  );

  const actionVariableContextValueLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextValueLabel',
    {
      defaultMessage: 'The value that met the threshold condition.',
    }
  );

  const actionVariableContextHitsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextHitsLabel',
    {
      defaultMessage: 'The documents that met the threshold condition.',
    }
  );

  const actionVariableContextMessageLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextMessageLabel',
    {
      defaultMessage: 'A message for the alert.',
    }
  );

  const actionVariableContextTitleLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextTitleLabel',
    {
      defaultMessage: 'A title for the alert.',
    }
  );

  const actionVariableContextIndexLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextIndexLabel',
    {
      defaultMessage: 'The index the query was run against.',
    }
  );

  const actionVariableContextQueryLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextQueryLabel',
    {
      defaultMessage: 'The string representation of the Elasticsearch query.',
    }
  );

  const actionVariableContextSizeLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextSizeLabel',
    {
      defaultMessage: 'The number of hits to retrieve for each query.',
    }
  );

  const actionVariableContextThresholdLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextThresholdLabel',
    {
      defaultMessage:
        "An array of values to use as the threshold; 'between' and 'notBetween' require two values, the others require one.",
    }
  );

  const actionVariableContextThresholdComparatorLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextThresholdComparatorLabel',
    {
      defaultMessage: 'A function to determine if the threshold has been met.',
    }
  );

  const actionVariableContextConditionsLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextConditionsLabel',
    {
      defaultMessage: 'A string that describes the threshold condition.',
    }
  );

  const actionVariableSearchTypeLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextSearchTypeLabel',
    {
      defaultMessage: 'The type of search is used.',
    }
  );

  const actionVariableSearchConfigurationLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextSearchConfigurationLabel',
    {
      defaultMessage:
        'Serialized search source fields used to fetch the documents from Elasticsearch.',
    }
  );

  const actionVariableContextLinkLabel = i18n.translate(
    'xpack.stackAlerts.esQuery.actionVariableContextLinkLabel',
    {
      defaultMessage: 'A link to see records that triggered this alert.',
    }
  );

  return {
    id: ES_QUERY_ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    validate: {
      params: EsQueryAlertParamsSchema,
    },
    actionVariables: {
      context: [
        { name: 'message', description: actionVariableContextMessageLabel },
        { name: 'title', description: actionVariableContextTitleLabel },
        { name: 'date', description: actionVariableContextDateLabel },
        { name: 'value', description: actionVariableContextValueLabel },
        { name: 'hits', description: actionVariableContextHitsLabel },
        { name: 'conditions', description: actionVariableContextConditionsLabel },
        { name: 'link', description: actionVariableContextLinkLabel },
      ],
      params: [
        { name: 'size', description: actionVariableContextSizeLabel },
        { name: 'threshold', description: actionVariableContextThresholdLabel },
        { name: 'thresholdComparator', description: actionVariableContextThresholdComparatorLabel },
        { name: 'searchType', description: actionVariableSearchTypeLabel },
        { name: 'searchConfiguration', description: actionVariableSearchConfigurationLabel },
        { name: 'esQuery', description: actionVariableContextQueryLabel },
        { name: 'index', description: actionVariableContextIndexLabel },
      ],
    },
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
  };

  async function executor(options: ExecutorOptions<EsQueryAlertParams>) {
    if (isEsQueryAlert(options)) {
      return await esQueryExecutor(logger, options as ExecutorOptions<OnlyEsQueryAlertParams>);
    } else {
      return await searchSourceExecutor(
        logger,
        core,
        options as ExecutorOptions<OnlySearchSourceAlertParams>
      );
    }
  }
}

function isEsQueryAlert(options: ExecutorOptions<EsQueryAlertParams>) {
  return options.params.searchType === 'esQuery';
}

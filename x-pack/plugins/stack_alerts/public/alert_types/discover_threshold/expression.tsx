/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiText,
  EuiTitle,
  EuiExpression,
} from '@elastic/eui';
import {
  COMPARATORS,
  builtInComparators,
  ThresholdExpression,
  ForLastExpression,
  builtInAggregationTypes,
  AlertTypeParamsExpressionProps,
} from '../../../../triggers_actions_ui/public';
import { ThresholdVisualization } from './visualization';
import { IndexThresholdAlertParams } from './types';
import './expression.scss';
import { ISearchSource, parseSearchSourceJSON } from '../../../../../../src/plugins/data/common';
import { injectSearchSourceReferences } from '../../../../../../src/plugins/data/public';

export const DEFAULT_VALUES = {
  AGGREGATION_TYPE: 'count',
  TERM_SIZE: 5,
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
  GROUP_BY: 'all',
};

const expressionFieldsWithValidation = [
  'index',
  'timeField',
  'aggField',
  'termSize',
  'termField',
  'threshold0',
  'threshold1',
  'timeWindowSize',
];

export const IndexThresholdAlertTypeExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<IndexThresholdAlertParams>
> = ({ alertParams, alertInterval, setAlertParams, setAlertProperty, errors, charts, data }) => {
  const {
    aggType,
    groupBy,
    termSize,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
    searchSourceJSON,
    searchSourceReferencesJSON,
  } = alertParams;
  const [usedSearchSource, setUsedSearchSource] = useState<ISearchSource | undefined>();

  useEffect(() => {
    async function getSearchSource() {
      const parsedSearchSourceJSON = parseSearchSourceJSON(searchSourceJSON);
      const searchSourceValues = injectSearchSourceReferences(
        parsedSearchSourceJSON as Parameters<typeof injectSearchSourceReferences>[0],
        JSON.parse(searchSourceReferencesJSON)
      );
      const loadedSearchSource = await data.search.searchSource.create(searchSourceValues);
      setUsedSearchSource(loadedSearchSource);
    }
    getSearchSource();
  }, [data.search.searchSource, searchSourceJSON, searchSourceReferencesJSON]);

  const hasExpressionErrors = !!Object.keys(errors).find(
    (errorKey) =>
      expressionFieldsWithValidation.includes(errorKey) &&
      errors[errorKey].length >= 1 &&
      alertParams[errorKey as keyof IndexThresholdAlertParams] !== undefined
  );

  const cannotShowVisualization = !!Object.keys(errors).find(
    (errorKey) => expressionFieldsWithValidation.includes(errorKey) && errors[errorKey].length >= 1
  );

  const expressionErrorMessage = i18n.translate(
    'xpack.stackAlerts.threshold.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const setDefaultExpressionValues = async () => {
    setAlertProperty('params', {
      ...alertParams,
      aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
      termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
      searchSourceJSON: searchSourceJSON ?? '{}',
      searchSourceReferencesJSON: searchSourceJSON ?? '[]',
    });
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!usedSearchSource) {
    return null;
  }
  return (
    <Fragment>
      {hasExpressionErrors ? (
        <Fragment>
          <EuiSpacer />
          <EuiCallOut color="danger" size="s" title={expressionErrorMessage} />
          <EuiSpacer />
        </Fragment>
      ) : null}
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.conditionPrompt"
            defaultMessage="When the number of documents matching"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiExpression
        description={'Data view'}
        value={usedSearchSource!.getField('index')!.title}
        isActive={true}
        display="columns"
      />
      <EuiSpacer size="s" />
      <EuiExpression
        description={'Query'}
        value={usedSearchSource!.getField('query')!.query}
        isActive={true}
        display="columns"
      />
      <EuiSpacer size="s" />

      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.stackAlerts.threshold.ui.conditionPrompt"
            defaultMessage="Define the condition"
          />
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ThresholdExpression
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        threshold={threshold}
        data-test-subj="thresholdExpression"
        errors={errors}
        display="fullWidth"
        popupPosition={'upLeft'}
        onChangeSelectedThreshold={(selectedThresholds) =>
          setAlertParams('threshold', selectedThresholds)
        }
        onChangeSelectedThresholdComparator={(selectedThresholdComparator) =>
          setAlertParams('thresholdComparator', selectedThresholdComparator)
        }
      />
      <EuiSpacer size="s" />
      <ForLastExpression
        data-test-subj="forLastExpression"
        popupPosition={'upLeft'}
        timeWindowSize={timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE}
        timeWindowUnit={timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={(selectedWindowSize: number | undefined) =>
          setAlertParams('timeWindowSize', selectedWindowSize)
        }
        onChangeWindowUnit={(selectedWindowUnit: string) =>
          setAlertParams('timeWindowUnit', selectedWindowUnit)
        }
      />
      <EuiSpacer />
      <div className="actAlertVisualization__chart">
        {cannotShowVisualization ? (
          <Fragment>
            <EuiEmptyPrompt
              data-test-subj="visualizationPlaceholder"
              iconType="visBarVertical"
              body={
                <EuiText color="subdued">
                  <FormattedMessage
                    id="xpack.stackAlerts.threshold.ui.previewAlertVisualizationDescription"
                    defaultMessage="Complete the expression to generate a preview."
                  />
                </EuiText>
              }
            />
          </Fragment>
        ) : (
          <Fragment>
            <ThresholdVisualization
              data-test-subj="thresholdVisualization"
              alertParams={alertParams}
              alertInterval={alertInterval}
              aggregationTypes={builtInAggregationTypes}
              comparators={builtInComparators}
              charts={charts}
              dataFieldsFormats={data!.fieldFormats}
            />
          </Fragment>
        )}
      </div>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexThresholdAlertTypeExpression as default };

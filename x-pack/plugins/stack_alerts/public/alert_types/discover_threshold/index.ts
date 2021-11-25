/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { validateExpression } from './validation';
import { DiscoverThresholdAlertParams } from './types';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';

export { DiscoverThresholdAlertParams } from './types';

export function getAlertType(): AlertTypeModel<DiscoverThresholdAlertParams> {
  return {
    id: '.discover-threshold',
    description: i18n.translate('xpack.stackAlerts.threshold.ui.alertType.descriptionText', {
      defaultMessage: 'Alert when number of documents meets the threshold.',
    }),
    iconClass: 'alert',
    documentationUrl: (docLinks) => docLinks.links.alerting.indexThreshold,
    alertParamsExpression: lazy(() => import('./expression')),
    validate: validateExpression,
    defaultActionMessage: i18n.translate(
      'xpack.stackAlerts.threshold.ui.alertType.defaultActionMessage',
      {
        defaultMessage: `alert '\\{\\{alertName\\}\\}' is active for group '\\{\\{context.group\\}\\}':

- Value: \\{\\{context.value\\}\\}
- Conditions Met: \\{\\{context.conditions\\}\\} over \\{\\{params.timeWindowSize\\}\\}\\{\\{params.timeWindowUnit\\}\\}
- Timestamp: \\{\\{context.date\\}\\}`,
      }
    ),
    // if true users can only created in the application context not in alerting UI
    requiresAppContext: false,
  };
}

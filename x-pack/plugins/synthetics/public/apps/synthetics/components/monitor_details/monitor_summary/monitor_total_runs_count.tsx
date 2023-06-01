/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/react-public';
import React from 'react';
import { ReportTypes } from '@kbn/exploratory-view-plugin/public';
import { i18n } from '@kbn/i18n';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryId } from '../hooks/use_monitor_query_id';
import { useSelectedLocation } from '../hooks/use_selected_location';

interface MonitorTotalRunsCountProps {
  from: string;
  to: string;
}

export const MonitorTotalRunsCount = (props: MonitorTotalRunsCountProps) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const monitorId = useMonitorQueryId();
  const selectedLocation = useSelectedLocation();

  if (!monitorId || !selectedLocation) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id="monitorTotalRunsCount"
      align="left"
      reportType={ReportTypes.SINGLE_METRIC}
      attributes={[
        {
          time: props,
          reportDefinitions: {
            'monitor.id': [monitorId],
            'observer.geo.name': [selectedLocation.label],
          },
          dataType: 'synthetics',
          selectedMetricField: 'monitor_total_runs',
          name: TOTAL_RUNS_LABEL,
        },
      ]}
    />
  );
};

const TOTAL_RUNS_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.totalRuns', {
  defaultMessage: 'Total runs',
});

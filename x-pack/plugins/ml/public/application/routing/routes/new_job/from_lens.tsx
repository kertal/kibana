/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { Redirect } from 'react-router-dom';
import { parse } from 'query-string';
import { useMlKibana } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../locator';
import type { MlRoute, PageProps } from '../../router';
import { createPath, PageLoader } from '../../router';
import { useRouteResolver } from '../../use_resolver';
import { resolver } from '../../../jobs/new_job/job_from_lens';
import { useMlJobService } from '../../../services/job_service';

export const fromLensRouteFactory = (): MlRoute => ({
  path: createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [],
});

const PageWrapper: FC<PageProps> = ({ location }) => {
  const { vis, from, to, query, filters, layerIndex }: Record<string, any> = parse(
    location.search,
    {
      sort: false,
    }
  );
  const {
    services: {
      data: {
        dataViews,
        query: {
          timefilter: { timefilter: timeFilter },
        },
      },
      dashboard: dashboardService,
      uiSettings: kibanaConfig,
      mlServices: { mlApi },
      lens,
    },
  } = useMlKibana();
  const mlJobService = useMlJobService();

  const { context } = useRouteResolver('full', ['canCreateJob'], {
    redirect: () =>
      resolver(
        {
          dataViews,
          lens,
          mlApi,
          mlJobService,
          timeFilter,
          kibanaConfig,
          dashboardService,
        },
        vis,
        from,
        to,
        query,
        filters,
        layerIndex
      ),
  });

  return (
    <PageLoader context={context}>
      {<Redirect to={createPath(ML_PAGES.ANOMALY_DETECTION_CREATE_JOB)} />}
    </PageLoader>
  );
};

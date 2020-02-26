/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, FC } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { npStart } from 'ui/new_platform';

import { useApi } from '../../hooks/use_api';

import { APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { TransformPivotConfig } from '../../common';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';
import { documentationLinksService } from '../../services/documentation';
import { PrivilegesWrapper } from '../../lib/authorization';
import {
  getIndexPatternIdByTitle,
  loadIndexPatterns,
  KibanaProvider,
  RenderOnlyWithInitializedKibanaContext,
} from '../../lib/kibana';

import { Wizard } from '../create_transform/components/wizard';

const indexPatterns = npStart.plugins.data.indexPatterns;
const savedObjectsClient = npStart.core.savedObjects.client;

interface GetTransformsResponseOk {
  count: number;
  transforms: TransformPivotConfig[];
}

interface GetTransformsResponseError {
  error: {
    msg: string;
    path: string;
    query: any;
    statusCode: number;
    response: string;
  };
}

function isGetTransformsResponseError(arg: any): arg is GetTransformsResponseError {
  return arg.error !== undefined;
}

type GetTransformsResponse = GetTransformsResponseOk | GetTransformsResponseError;

type Props = RouteComponentProps<{ transformId: string }>;
export const CloneTransformSection: FC<Props> = ({ match }) => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.CLONE_TRANSFORM);
    docTitleService.setTitle('createTransform');
  }, []);

  const api = useApi();

  const transformId = match.params.transformId;

  const [transformConfig, setTransformConfig] = useState<TransformPivotConfig>();
  const [errorMessage, setErrorMessage] = useState();
  const [isInitialized, setIsInitialized] = useState(false);
  const [savedObjectId, setSavedObjectId] = useState<string | undefined>(undefined);

  const fetchTransformConfig = async () => {
    try {
      const transformConfigs: GetTransformsResponse = await api.getTransforms(transformId);
      if (isGetTransformsResponseError(transformConfigs)) {
        setTransformConfig(undefined);
        setErrorMessage(transformConfigs.error.msg);
        setIsInitialized(true);
        return;
      }

      await loadIndexPatterns(savedObjectsClient, indexPatterns);
      const indexPatternTitle = Array.isArray(transformConfigs.transforms[0].source.index)
        ? transformConfigs.transforms[0].source.index.join(',')
        : transformConfigs.transforms[0].source.index;
      const indexPatternId = getIndexPatternIdByTitle(indexPatternTitle);

      if (indexPatternId === undefined) {
        throw new Error(
          i18n.translate('xpack.transform.clone.errorPromptText', {
            defaultMessage: 'Could not fetch the Kibana index pattern ID.',
          })
        );
      }

      setSavedObjectId(indexPatternId);

      setTransformConfig(transformConfigs.transforms[0]);
      setErrorMessage(undefined);
      setIsInitialized(true);
    } catch (e) {
      setTransformConfig(undefined);
      if (e.message !== undefined) {
        setErrorMessage(e.message);
      } else {
        setErrorMessage(JSON.stringify(e, null, 2));
      }
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    fetchTransformConfig();
    // The effect should only be called once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PrivilegesWrapper privileges={APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES}>
      <EuiPageContent data-test-subj="transformPageCloneTransform">
        <EuiTitle size="l">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={true}>
              <h1>
                <FormattedMessage
                  id="xpack.transform.transformsWizard.cloneTransformTitle"
                  defaultMessage="Clone transform"
                />
                <span>&nbsp;</span>
                <EuiBetaBadge
                  label={i18n.translate('xpack.transform.transformsWizard.betaBadgeLabel', {
                    defaultMessage: `Beta`,
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.transform.transformsWizard.betaBadgeTooltipContent',
                    {
                      defaultMessage: `Transforms are a beta feature. We'd love to hear your feedback.`,
                    }
                  )}
                />
              </h1>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={documentationLinksService.getTransformsDocUrl()}
                target="_blank"
                iconType="help"
                data-test-subj="documentationLink"
              >
                <FormattedMessage
                  id="xpack.transform.transformsWizard.transformDocsLinkText"
                  defaultMessage="Transform docs"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
        <EuiPageContentBody>
          <EuiSpacer size="l" />
          {typeof errorMessage !== 'undefined' && (
            <EuiCallOut
              title={i18n.translate('xpack.transform.clone.errorPromptTitle', {
                defaultMessage: 'An error occurred getting the transform configuration.',
              })}
              color="danger"
              iconType="alert"
            >
              <pre>{JSON.stringify(errorMessage)}</pre>
            </EuiCallOut>
          )}
          {savedObjectId !== undefined && isInitialized === true && transformConfig !== undefined && (
            <KibanaProvider savedObjectId={savedObjectId}>
              <RenderOnlyWithInitializedKibanaContext>
                <Wizard cloneConfig={transformConfig} />
              </RenderOnlyWithInitializedKibanaContext>
            </KibanaProvider>
          )}
        </EuiPageContentBody>
      </EuiPageContent>
    </PrivilegesWrapper>
  );
};

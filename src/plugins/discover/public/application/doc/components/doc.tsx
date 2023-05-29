/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiPage, EuiPageBody } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { DocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import { buildDataTableRecord } from '@kbn/unified-discover';
import { getRootBreadcrumbs } from '../../../utils/breadcrumbs';
import { ElasticRequestState } from '../types';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

export interface DocProps {
  /**
   * Id of the doc in ES
   */
  id: string;
  /**
   * Index in ES to query
   */
  index: string;
  /**
   * DataView entity
   */
  dataView: DataView;
  /**
   * If set, will always request source, regardless of the global `fieldsFromSource` setting
   */
  requestSource?: boolean;
  /**
   * Discover main view url
   */
  referrer?: string;
}

export function Doc(props: DocProps) {
  const { dataView } = props;
  const [reqState, hit] = useEsDocSearch(props);
  const { locator, chrome, docLinks } = useDiscoverServices();
  const indexExistsLink = docLinks.links.apis.indexExists;

  useEffect(() => {
    chrome.setBreadcrumbs([
      ...getRootBreadcrumbs(props.referrer),
      { text: `${props.index}#${props.id}` },
    ]);
  }, [chrome, props.referrer, props.index, props.id, dataView, locator]);

  return (
    <EuiPage>
      <h1
        id="singleDocTitle"
        className="euiScreenReaderOnly"
        data-test-subj="discoverSingleDocTitle"
      >
        {i18n.translate('discover.doc.pageTitle', {
          defaultMessage: 'Single document - #{id}',
          values: { id: props.id },
        })}
      </h1>
      <EuiPageBody panelled paddingSize="l" panelProps={{ role: 'main' }}>
        {reqState === ElasticRequestState.NotFoundDataView && (
          <EuiCallOut
            color="danger"
            data-test-subj={`doc-msg-notFoundDataView`}
            iconType="warning"
            title={
              <FormattedMessage
                id="discover.doc.failedToLocateDataView"
                defaultMessage="No data view matches ID {dataViewId}."
                values={{ dataViewId: dataView.id }}
              />
            }
          />
        )}
        {reqState === ElasticRequestState.NotFound && (
          <EuiCallOut
            color="danger"
            data-test-subj={`doc-msg-notFound`}
            iconType="warning"
            title={
              <FormattedMessage
                id="discover.doc.failedToLocateDocumentDescription"
                defaultMessage="Cannot find document"
              />
            }
          >
            <FormattedMessage
              id="discover.doc.couldNotFindDocumentsDescription"
              defaultMessage="No documents match that ID."
            />
          </EuiCallOut>
        )}

        {reqState === ElasticRequestState.Error && (
          <EuiCallOut
            color="danger"
            data-test-subj={`doc-msg-error`}
            iconType="warning"
            title={
              <FormattedMessage
                id="discover.doc.failedToExecuteQueryDescription"
                defaultMessage="Cannot run search"
              />
            }
          >
            <FormattedMessage
              id="discover.doc.somethingWentWrongDescription"
              defaultMessage="{indexName} is missing."
              values={{ indexName: props.index }}
            />{' '}
            <EuiLink href={indexExistsLink} target="_blank">
              <FormattedMessage
                id="discover.doc.somethingWentWrongDescriptionAddon"
                defaultMessage="Please ensure the index exists."
              />
            </EuiLink>
          </EuiCallOut>
        )}

        {reqState === ElasticRequestState.Loading && (
          <EuiCallOut data-test-subj={`doc-msg-loading`}>
            <EuiLoadingSpinner size="m" />{' '}
            <FormattedMessage id="discover.doc.loadingDescription" defaultMessage="Loading…" />
          </EuiCallOut>
        )}

        {reqState === ElasticRequestState.Found && hit !== null && dataView && (
          <div data-test-subj="doc-hit">
            {/* TODO: Clean up use of hit/datatable record */}
            <DocViewer hit={buildDataTableRecord(hit)} dataView={dataView} />
          </div>
        )}
      </EuiPageBody>
    </EuiPage>
  );
}

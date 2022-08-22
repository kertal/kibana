/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from '@xstate/react';
import React, { memo } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import {
  DataAccessService,
  selectIsReloading,
} from '../../state_machines/data_access_state_machine';
import { LogExplorerGrid } from '../log_explorer_grid';

const LogExplorerGridMemoized = React.memo(LogExplorerGrid);

function LogExplorerComponent({ stateMachine }: { stateMachine: DataAccessService }) {
  const { fieldFormats } = useDiscoverServices();

  const isReloading = useSelector(stateMachine, selectIsReloading);

  if (isReloading) {
    return (
      <div className="dscDocuments__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingDocuments" defaultMessage="Loading documents" />
        </EuiText>
      </div>
    );
  }

  return (
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel">
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      <div className="dscDiscoverGrid">
        <LogExplorerGridMemoized fieldFormats={fieldFormats} />
      </div>
    </EuiFlexItem>
  );
}

export const LogExplorer = memo(LogExplorerComponent);

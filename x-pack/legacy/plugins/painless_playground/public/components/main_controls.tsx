/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiBottomBar, EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  submit: () => void;
  disabled: boolean;
  toggleFlyout: () => void;
}

export function MainControls({ submit, disabled, toggleFlyout, isFlyoutOpen }: Props) {
  return (
    <>
      <div className="painlessPlaygroundBottomBarPlaceholder" />

      <EuiBottomBar>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="ghost"
              onClick={toggleFlyout}
              isDisabled={disabled}
              data-test-subj="btnViewRequest"
            >
              {isFlyoutOpen
                ? i18n.translate('xpack.painless_playground.hideRequestButtonLabel', {
                    defaultMessage: 'Hide API request',
                  })
                : i18n.translate('xpack.painless_playground.showRequestButtonLabel', {
                    defaultMessage: 'Show API request',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={submit} isDisabled={disabled} data-test-subj="btnExecute">
              <FormattedMessage
                id="xpack.painless_playground.executeButtonLabel"
                defaultMessage="Test"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBottomBar>
    </>
  );
}

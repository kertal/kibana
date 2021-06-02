/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { I18nStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSpacer, EuiButton, EuiText, EuiWrappingPopover, EuiCode } from '@elastic/eui';
import { getServices } from '../../../kibana_services';
import './open_options_popover.scss';
import { DOC_TABLE_LEGACY } from '../../../../common';

interface OptionsPopoverProps {
  onClose: () => void;
  anchorElement: HTMLElement;
}

export function OptionsPopover({ onClose, anchorElement }: OptionsPopoverProps) {
  const {
    core: { uiSettings },
    addBasePath,
  } = getServices();
  const isLegacy = uiSettings.get(DOC_TABLE_LEGACY);
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
    if (renderCount.current === 2) {
      // Close the popover when the triggering link is clicked a second time
      onClose();
    }
  }, [onClose]);

  const mode = isLegacy
    ? i18n.translate('discover.openOptionsPopover.legacyTableText', {
        defaultMessage: 'Classic table',
      })
    : i18n.translate('discover.openOptionsPopover.dataGridText', {
        defaultMessage: 'New table',
      });

  return (
    <EuiWrappingPopover ownFocus button={anchorElement} closePopover={onClose} isOpen={true}>
      <div className="dscOptionsPopover">
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="discover.topNav.optionsPopover.currentViewMode"
              defaultMessage="{viewModeLabel}: {currentViewMode}"
              values={{
                viewModeLabel: (
                  <strong>
                    <FormattedMessage
                      id="discover.topNav.optionsPopover.currentViewModeLabel"
                      defaultMessage="Current view mode"
                    />
                  </strong>
                ),
                currentViewMode: <EuiCode data-test-subj="docTableMode">{mode}</EuiCode>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="discover.topNav.openOptionsPopover.description"
            defaultMessage="Great news! Discover has better ways to sort data, drag and drop columns, and compare documents. Toggle 'Use classic table' in Advanced Settings to get started."
          />
        </EuiText>
        <EuiSpacer />
        <EuiButton
          iconType="tableDensityNormal"
          fullWidth
          href={addBasePath(`/app/management/kibana/settings?query=${DOC_TABLE_LEGACY}`)}
        >
          {i18n.translate('discover.openOptionsPopover.goToAdvancedSettings', {
            defaultMessage: 'Get started',
          })}
        </EuiButton>
      </div>
    </EuiWrappingPopover>
  );
}

export function getContainer() {
  const id = 'dscOptionsPopoverContainer';
  const container = document.getElementById(id);
  if (container) {
    return container;
  }
  const newContainer = document.createElement('div');
  newContainer.id = id;
  document.body.appendChild(newContainer);
  return newContainer;
}

export function openOptionsPopover({
  I18nContext,
  anchorElement,
}: {
  I18nContext: I18nStart['Context'];
  anchorElement: HTMLElement;
}) {
  const container = getContainer();

  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };

  const element = (
    <I18nContext>
      <OptionsPopover onClose={onClose} anchorElement={anchorElement} />
    </I18nContext>
  );
  ReactDOM.render(element, container);
}

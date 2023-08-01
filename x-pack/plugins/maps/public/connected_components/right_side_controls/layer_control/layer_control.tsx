/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButton,
  EuiTitle,
  EuiSpacer,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LayerTOC } from './layer_toc';
import { isScreenshotMode } from '../../../kibana_services';
import { ILayer } from '../../../classes/layers/layer';

export interface Props {
  isReadOnly: boolean;
  isLayerTOCOpen: boolean;
  layerList: ILayer[];
  isFlyoutOpen: boolean;
  showAddLayerWizard: () => Promise<void>;
  closeLayerTOC: () => void;
  openLayerTOC: () => void;
  hideAllLayers: () => void;
  showAllLayers: () => void;
  zoom: number;
}

function renderExpandButton({
  hasErrors,
  isLoading,
  onClick,
}: {
  hasErrors: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const expandLabel = i18n.translate('xpack.maps.layerControl.openLayerTOCButtonAriaLabel', {
    defaultMessage: 'Expand layers panel',
  });

  return (
    <EuiButtonIcon
      className="mapLayerControl__openLayerTOCButton"
      color="text"
      isLoading={isLoading}
      onClick={onClick}
      iconType={hasErrors ? 'warning' : 'menuLeft'}
      aria-label={expandLabel}
      data-test-subj="mapExpandLayerControlButton"
    />
  );
}

export function LayerControl({
  isReadOnly,
  isLayerTOCOpen,
  showAddLayerWizard,
  closeLayerTOC,
  openLayerTOC,
  layerList,
  isFlyoutOpen,
  hideAllLayers,
  showAllLayers,
  zoom,
}: Props) {
  if (!isLayerTOCOpen) {
    if (isScreenshotMode()) {
      return null;
    }
    const hasErrors = layerList.some((layer) => {
      return layer.hasErrors();
    });
    const isLoading = layerList.some((layer) => {
      return layer.isLayerLoading(zoom);
    });

    return (
      <EuiToolTip
        delay="long"
        content={i18n.translate('xpack.maps.layerControl.openLayerTOCButtonAriaLabel', {
          defaultMessage: 'Expand layers panel',
        })}
        position="left"
      >
        {renderExpandButton({ hasErrors, isLoading, onClick: openLayerTOC })}
      </EuiToolTip>
    );
  }

  let addLayer;
  if (!isReadOnly) {
    addLayer = (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiButton
          isDisabled={isFlyoutOpen}
          className="mapLayerControl__addLayerButton"
          fill
          fullWidth
          onClick={showAddLayerWizard}
          data-test-subj="addLayerButton"
        >
          <FormattedMessage
            id="xpack.maps.layerControl.addLayerButtonLabel"
            defaultMessage="Add layer"
          />
        </EuiButton>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiPanel
        className="mapWidgetControl mapWidgetControl-hasShadow"
        paddingSize="none"
        grow={false}
      >
        <EuiFlexItem className="mapWidgetControl__headerFlexItem" grow={false}>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            responsive={false}
            gutterSize="none"
          >
            <EuiFlexItem>
              <EuiTitle size="xxxs" className="mapWidgetControl__header">
                <h2>
                  <FormattedMessage
                    id="xpack.maps.layerControl.layersTitle"
                    defaultMessage="Layers"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                delay="long"
                content={i18n.translate('xpack.maps.layerControl.hideAllLayersButton', {
                  defaultMessage: 'Hide all layers',
                })}
              >
                <EuiButtonIcon
                  onClick={hideAllLayers}
                  iconType="eyeClosed"
                  color="text"
                  aria-label={i18n.translate('xpack.maps.layerControl.hideAllLayersButton', {
                    defaultMessage: 'Hide all layers',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                delay="long"
                content={i18n.translate('xpack.maps.layerControl.showAllLayersButton', {
                  defaultMessage: 'Show all layers',
                })}
              >
                <EuiButtonIcon
                  onClick={showAllLayers}
                  iconType="eye"
                  color="text"
                  aria-label={i18n.translate('xpack.maps.layerControl.showAllLayersButton', {
                    defaultMessage: 'Show all layers',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                delay="long"
                content={i18n.translate('xpack.maps.layerControl.closeLayerTOCButtonAriaLabel', {
                  defaultMessage: 'Collapse layers panel',
                })}
              >
                <EuiButtonIcon
                  className="mapLayerControl__closeLayerTOCButton"
                  onClick={closeLayerTOC}
                  iconType="menuRight"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.maps.layerControl.closeLayerTOCButtonAriaLabel',
                    {
                      defaultMessage: 'Collapse layers panel',
                    }
                  )}
                  data-test-subj="mapToggleLegendButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem className="mapLayerControl">
          <LayerTOC />
        </EuiFlexItem>
      </EuiPanel>

      {addLayer}
    </Fragment>
  );
}

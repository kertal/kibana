/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { DiscoverServices } from '../../../build_services';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../kibana_react/public';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export interface NotFoundRouteProps {
  /**
   * Kibana core services used by discover
   */
  services: DiscoverServices;
}
let bannerId: string | undefined;

export function NotFoundRoute(props: NotFoundRouteProps) {
  const { services } = props;
  const { urlForwarding, restorePreviousUrl } = services;

  useEffect(() => {
    const path = window.location.hash.substr(1);
    restorePreviousUrl();
    const { navigated } = urlForwarding.navigateToLegacyKibanaUrl(path);
    if (!navigated) {
      const bannerMessage = i18n.translate('discover.noMatchRoute.bannerTitleText', {
        defaultMessage: 'Page not found',
      });

      bannerId = services.core.overlays.banners.replace(
        bannerId,
        toMountPoint(
          <EuiCallOut color="warning" iconType="iInCircle" title={bannerMessage}>
            <p>
              <FormattedMessage
                id="discover.noMatchRoute.bannerText"
                defaultMessage="Invalid URL for Discover application."
              />
            </p>
          </EuiCallOut>
        )
      );

      // hide the message after the user has had a chance to acknowledge it -- so it doesn't permanently stick around
      setTimeout(() => {
        if (bannerId) {
          services.core.overlays.banners.remove(bannerId);
        }
      }, 15000);

      urlForwarding.navigateToDefaultApp();
    }
  }, [restorePreviousUrl, services.core.overlays.banners, urlForwarding]);

  return null;
}

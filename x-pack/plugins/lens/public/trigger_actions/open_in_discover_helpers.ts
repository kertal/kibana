/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocator } from '@kbn/discover-plugin/public';
import { Filter } from '@kbn/es-query';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Embeddable } from '../embeddable';
import { DOC_TYPE } from '../../common';

interface Context {
  embeddable: IEmbeddable;
  filters?: Filter[];
  openInSameTab?: boolean;
  hasDiscoverAccess: boolean;
  locator?: DiscoverAppLocator;
}

export function isLensEmbeddable(embeddable: IEmbeddable): embeddable is Embeddable {
  return embeddable.type === DOC_TYPE;
}

export async function isCompatible({ hasDiscoverAccess, embeddable }: Context) {
  if (!hasDiscoverAccess) return false;
  try {
    return isLensEmbeddable(embeddable) && (await embeddable.canViewUnderlyingData());
  } catch (e) {
    // Fetching underlying data failed, log the error and behave as if the action is not compatible
    // eslint-disable-next-line no-console
    console.error(e);
    return false;
  }
}

export function execute({ embeddable, locator, timeRange, filters, openInSameTab }: Context) {
  if (!isLensEmbeddable(embeddable)) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Can only be executed in the context of Lens visualization');
  }
  const args = embeddable.getViewUnderlyingDataArgs();
  if (!args) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Underlying data is not ready');
  }
  const discoverUrl = locator?.getRedirectUrl({
    ...args,
    timeRange: timeRange || args.timeRange,
    filters: [...(filters || []), ...args.filters],
  });
  window.open(discoverUrl, !openInSameTab ? '_blank' : '_self');
}

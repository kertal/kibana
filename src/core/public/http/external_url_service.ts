/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IExternalUrlPolicy } from 'src/core/server/types';

import { CoreService } from 'src/core/types';
import { IExternalUrl } from './types';
import { InjectedMetadataSetup } from '../injected_metadata';
import { Sha256 } from '../utils';

interface SetupDeps {
  location: Pick<Location, 'origin'>;
  injectedMetadata: InjectedMetadataSetup;
}

function* getHostHashes(actualHost: string) {
  yield new Sha256().update(actualHost, 'utf8').digest('hex');
  let host = actualHost.substr(actualHost.indexOf('.') + 1);
  while (host) {
    yield new Sha256().update(host, 'utf8').digest('hex');
    if (host.indexOf('.') === -1) {
      break;
    }
    host = host.substr(host.indexOf('.') + 1);
  }
}

const isHostMatch = (actualHost: string, ruleHostHash: string) => {
  // If the host contains a `[`, then it's likely an IPv6 address. Otherwise, append a `.` if it doesn't already contain one
  const hostToHash =
    !actualHost.includes('[') && !actualHost.endsWith('.') ? `${actualHost}.` : actualHost;
  for (const hash of getHostHashes(hostToHash)) {
    if (hash === ruleHostHash) {
      return true;
    }
  }
  return false;
};

const isProtocolMatch = (actualProtocol: string, ruleProtocol: string) => {
  return normalizeProtocol(actualProtocol) === normalizeProtocol(ruleProtocol);
};

function normalizeProtocol(protocol: string) {
  return protocol.endsWith(':') ? protocol.slice(0, -1).toLowerCase() : protocol.toLowerCase();
}

const createExternalUrlValidation = (
  rules: IExternalUrlPolicy[],
  location: Pick<Location, 'origin'>,
  serverBasePath: string
) => {
  const base = new URL(location.origin + serverBasePath);
  return function validateExternalUrl(next: string) {
    const url = new URL(next, base);

    const isInternalURL =
      url.origin === base.origin &&
      (!serverBasePath || url.pathname.startsWith(`${serverBasePath}/`));

    if (isInternalURL) {
      return url;
    }

    let allowed: null | boolean = null;
    rules.forEach((rule) => {
      const hostMatch = rule.host ? isHostMatch(url.hostname || '', rule.host) : true;

      const protocolMatch = rule.protocol ? isProtocolMatch(url.protocol, rule.protocol) : true;

      const isRuleMatch = hostMatch && protocolMatch;

      if (isRuleMatch && allowed !== false) {
        allowed = rule.allow;
      }
    });

    return allowed === true ? url : null;
  };
};

export class ExternalUrlService implements CoreService<IExternalUrl> {
  setup({ injectedMetadata, location }: SetupDeps): IExternalUrl {
    const serverBasePath = injectedMetadata.getServerBasePath();
    const { policy } = injectedMetadata.getExternalUrlConfig();

    return {
      validateUrl: createExternalUrlValidation(policy, location, serverBasePath),
    };
  }

  start() {}

  stop() {}
}

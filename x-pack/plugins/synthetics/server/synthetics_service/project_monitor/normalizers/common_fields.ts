/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { formatKibanaNamespace } from '../../../../common/formatters';
import {
  BrowserFields,
  ConfigKey,
  CommonFields,
  DataStream,
  PrivateLocation,
  Locations,
  ProjectMonitor,
  ScheduleUnit,
  SourceType,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { DEFAULT_COMMON_FIELDS } from '../../../../common/constants/monitor_defaults';
import { NormalizedProjectProps } from '.';

export const getNormalizeCommonFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): CommonFields => {
  const defaultFields = DEFAULT_COMMON_FIELDS;

  const normalizedFields = {
    [ConfigKey.JOURNEY_ID]: monitor.id || defaultFields[ConfigKey.JOURNEY_ID],
    [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
    [ConfigKey.NAME]: monitor.name || '',
    [ConfigKey.SCHEDULE]: {
      number: `${monitor.schedule}`,
      unit: ScheduleUnit.MINUTES,
    },
    [ConfigKey.PROJECT_ID]: projectId,
    [ConfigKey.LOCATIONS]: getMonitorLocations({
      monitor,
      privateLocations,
      publicLocations: locations,
    }),
    [ConfigKey.APM_SERVICE_NAME]:
      monitor.apmServiceName || defaultFields[ConfigKey.APM_SERVICE_NAME],
    [ConfigKey.TAGS]: getOptionalListField(monitor.tags) || defaultFields[ConfigKey.TAGS],
    [ConfigKey.NAMESPACE]: formatKibanaNamespace(namespace) || defaultFields[ConfigKey.NAMESPACE],
    [ConfigKey.ORIGINAL_SPACE]: namespace || defaultFields[ConfigKey.NAMESPACE],
    [ConfigKey.CUSTOM_HEARTBEAT_ID]: getCustomHeartbeatId(monitor, projectId, namespace),
    [ConfigKey.ENABLED]: monitor.enabled ?? defaultFields[ConfigKey.ENABLED],
  };
  return {
    ...defaultFields,
    ...normalizedFields,
  };
};

export const getCustomHeartbeatId = (
  monitor: NormalizedProjectProps['monitor'],
  projectId: string,
  namespace: string
) => {
  return `${monitor.id}-${projectId}-${namespace}`;
};

export const getMonitorLocations = ({
  privateLocations,
  publicLocations,
  monitor,
}: {
  monitor: ProjectMonitor;
  privateLocations: PrivateLocation[];
  publicLocations: Locations;
}) => {
  const publicLocs =
    monitor.locations?.map((id) => {
      return publicLocations.find((location) => location.id === id);
    }) || [];
  const privateLocs =
    monitor.privateLocations?.map((locationName) => {
      return privateLocations.find(
        (location) =>
          location.label.toLowerCase() === locationName.toLowerCase() ||
          location.id.toLowerCase() === locationName.toLowerCase()
      );
    }) || [];

  return [...publicLocs, ...privateLocs].filter(
    (location) => location !== undefined
  ) as BrowserFields[ConfigKey.LOCATIONS];
};

export const getValueInSeconds = (value: string) => {
  const keyMap = {
    h: 60 * 60,
    m: 60,
    s: 1,
  };
  const key = value.slice(-1) as 'h' | 'm' | 's';
  const time = parseInt(value.slice(0, -1), 10);
  const valueInSeconds = time * (keyMap[key] || 1);
  return typeof valueInSeconds === 'number' ? `${valueInSeconds}` : null;
};

/**
 * Accounts for array values that are optionally defined as a comma seperated list
 *
 * @param {Array | string} [value]
 * @returns {array} Returns an array
 */
export const getOptionalListField = (value?: string[] | string): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? value.split(',') : [];
};

/**
 * Accounts for heartbeat fields that are optionally an array or single string
 *
 * @param {Array | string} [value]
 * @returns {string} Returns first item when the value is an array, or the value itself
 */
export const getOptionalArrayField = (value: string[] | string = '') => {
  const array = getOptionalListField(value);
  return array[0];
};

/**
 * Flattens arbitrary yaml into a synthetics monitor compatible configuration
 *
 * @param {Object} [monitor]
 * @returns {Object} Returns an object containing synthetics-compatible configuration keys
 */
const flattenAndFormatObject = (obj: Record<string, unknown>, prefix = '', keys: string[]) =>
  Object.keys(obj).reduce<Record<string, unknown>>((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    const key = pre + k;

    /* If the key is an array of numbers, convert to an array of strings */
    if (Array.isArray(obj[k])) {
      acc[key] = (obj[k] as unknown[]).map((value) =>
        typeof value === 'number' ? String(value) : value
      );
      return acc;
    }

    /* if the key is a supported key stop flattening early */
    if (keys.includes(key)) {
      acc[key] = obj[k];
      return acc;
    }

    if (typeof obj[k] === 'object') {
      Object.assign(acc, flattenAndFormatObject(obj[k] as Record<string, unknown>, pre + k, keys));
    } else {
      acc[key] = obj[k];
    }
    return acc;
  }, {});

export const normalizeYamlConfig = (monitor: NormalizedProjectProps['monitor']) => {
  const defaultFields = DEFAULT_FIELDS[monitor.type as DataStream];
  const supportedKeys = Object.keys(defaultFields);
  const flattenedConfig = flattenAndFormatObject(monitor, '', supportedKeys);
  const {
    locations: _locations,
    privateLocations: _privateLocations,
    content: _content,
    id: _id,
    ...yamlConfig
  } = flattenedConfig;
  const unsupportedKeys = Object.keys(yamlConfig).filter((key) => !supportedKeys.includes(key));
  const supportedYamlConfig = omit(yamlConfig, unsupportedKeys);

  return {
    yamlConfig: supportedYamlConfig,
    unsupportedKeys,
  };
};

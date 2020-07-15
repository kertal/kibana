/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLResolveInfo } from 'graphql';
import { getOr } from 'lodash/fp';

import {
  PaginationInput,
  PaginationInputPaginated,
  SortField,
  Source,
  TimerangeInput,
  DocValueFieldsInput,
} from '../../graphql/types';
import { RequestOptions, RequestOptionsPaginated } from '../../lib/framework';
import { parseFilterQuery } from '../serialized_query';

import { getFields } from '.';

export type Configuration = Pick<Source, 'configuration'>;

export type FieldNodes = Pick<GraphQLResolveInfo, 'fieldNodes'>;

// TODO: Once all the widgets are using sortField, this will be swapped out
// for a generic type Similar to EventsSourceArgs that all GraphQL is using
// and sortField won't be optional and might support multi-sort
export interface Args {
  timerange?: TimerangeInput | null;
  pagination?: PaginationInput | null;
  filterQuery?: string | null;
  sortField?: SortField | null;
  defaultIndex: string[];
  docValueFields?: DocValueFieldsInput[];
}
export interface ArgsPaginated {
  timerange?: TimerangeInput | null;
  pagination?: PaginationInputPaginated | null;
  filterQuery?: string | null;
  sortField?: SortField | null;
  defaultIndex: string[];
  docValueFields?: DocValueFieldsInput[];
}

export const createOptions = (
  source: Configuration,
  args: Args,
  info: FieldNodes,
  fieldReplacement: string = 'edges.node.'
): RequestOptions => {
  const fields = getFields(getOr([], 'fieldNodes[0]', info));
  return {
    defaultIndex: args.defaultIndex,
    docValueFields: args.docValueFields ?? [],
    sourceConfiguration: source.configuration,
    timerange: args.timerange!,
    pagination: args.pagination!,
    sortField: args.sortField!,
    filterQuery: parseFilterQuery(args.filterQuery || ''),
    fields: fields
      .filter((field) => !field.includes('__typename'))
      .map((field) => field.replace(fieldReplacement, '')),
  };
};

export const createOptionsPaginated = (
  source: Configuration,
  args: ArgsPaginated,
  info: FieldNodes,
  fieldReplacement: string = 'edges.node.'
): RequestOptionsPaginated => {
  const fields = getFields(getOr([], 'fieldNodes[0]', info));
  return {
    defaultIndex: args.defaultIndex,
    docValueFields: args.docValueFields ?? [],
    sourceConfiguration: source.configuration,
    timerange: args.timerange!,
    pagination: args.pagination!,
    sortField: args.sortField!,
    filterQuery: parseFilterQuery(args.filterQuery || ''),
    fields: fields
      .filter((field) => !field.includes('__typename'))
      .map((field) => field.replace(fieldReplacement, '')),
  };
};

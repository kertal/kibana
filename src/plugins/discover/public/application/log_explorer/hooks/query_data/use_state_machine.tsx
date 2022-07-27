/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISearchSource, QueryStart } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import moment from 'moment';
import { useMemo } from 'react';
import { assign } from 'xstate';
import {
  dataAccessStateMachine,
  loadAround,
  updateChunksFromLoadAround,
} from '../../state_machines/data_access_state_machine';
import { useSubscription } from '../use_observable';

export const useStateMachineService = ({
  virtualRowCount,
  dataView,
  query,
  searchSource,
}: {
  virtualRowCount: number;
  dataView: DataView;
  query: QueryStart;
  searchSource: ISearchSource;
}) => {
  const centerRowIndex = useMemo(() => Math.floor(virtualRowCount / 2), [virtualRowCount]);

  const dataAccessService = useInterpret(
    () => {
      const initialTimeRange = query.timefilter.timefilter.getAbsoluteTime();

      return dataAccessStateMachine.withContext({
        dataView,
        timeRange: initialTimeRange,
        position: {
          timestamp: getMiddleOfTimeRange(initialTimeRange),
          tiebreaker: 0,
        },
        topChunk: {
          status: 'uninitialized',
        },
        bottomChunk: {
          status: 'uninitialized',
        },
      });
    },
    {
      actions: {
        resetChunks: assign((context) => ({
          ...context,
          topChunk: {
            status: 'uninitialized' as const,
          },
          bottomChunk: {
            status: 'uninitialized' as const,
          },
        })),
        updateChunksFromLoadAround,
      },
      guards: {
        succeededTop: constantGuard(true),
        succeededBottom: constantGuard(true),
        isNearStart: constantGuard(false),
        isNearEnd: constantGuard(false),
        isWithinLoadedChunks: constantGuard(false),
        startTimestampExtendsLoadedTop: constantGuard(false),
        startTimestampReducesLoadedTop: constantGuard(false),
        endTimestampExtendsLoadedBottom: constantGuard(false),
        endTimestampReducesLoadedBottom: constantGuard(false),
      },
      services: {
        loadAround: loadAround({
          centerRowIndex,
          dataView,
          query,
          searchSource,
        }),
      },
      devTools: true,
    }
  );

  // react to time filter changes
  useSubscription(query.timefilter.timefilter.getFetch$(), {
    next: () => {
      dataAccessService.send({
        type: 'timeRangeChanged',
        timeRange: query.timefilter.timefilter.getAbsoluteTime(),
      });
    },
  });

  return dataAccessService;
};

export const [StateMachineProvider, useStateMachineContext] =
  createContainer(useStateMachineService);

// export const useStateMachineContextSelector = <T, TEmitted = DataAccessService['state']>(
//   selector: (emitted: TEmitted) => T,
//   compare?: (a: T, b: T) => boolean,
//   getSnapshot?: (a: DataAccessService) => TEmitted
// ) => {
//   const dataAccessMachine = useStateMachineContext();

//   return useSelector(dataAccessMachine, selector, compare, getSnapshot);
// };

// export const useStateMachineContextActor = () => {
//   const dataAccessService = useStateMachineContext();
//   return useActor(dataAccessService);
// };

const getMiddleOfTimeRange = ({ from, to }: TimeRange): string => {
  const fromMoment = moment.utc(from);
  const toMoment = moment.utc(to);

  return fromMoment.add(toMoment.diff(fromMoment) / 2, 'ms').toISOString();
};

const constantGuard =
  <Value extends unknown>(value: Value) =>
  () =>
    value;

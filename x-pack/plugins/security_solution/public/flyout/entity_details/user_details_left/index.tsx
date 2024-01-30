/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useManagedUser } from '../../../timelines/components/side_panel/new_user_detail/hooks/use_managed_user';
import { useTabs } from './tabs';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import type {
  EntityDetailsLeftPanelTab,
  LeftPanelTabsType,
} from '../shared/components/left_panel/left_panel_header';
import { LeftPanelHeader } from '../shared/components/left_panel/left_panel_header';
import { LeftPanelContent } from '../shared/components/left_panel/left_panel_content';

interface UserParam {
  name: string;
  email: string[];
}

export interface UserDetailsPanelProps extends Record<string, unknown> {
  isRiskScoreExist: boolean;
  user: UserParam;
  path?: PanelPath;
}
export interface UserDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'user_details';
  params: UserDetailsPanelProps;
}
export const UserDetailsPanelKey: UserDetailsExpandableFlyoutProps['key'] = 'user_details';

export const UserDetailsPanel = ({ isRiskScoreExist, user, path }: UserDetailsPanelProps) => {
  const managedUser = useManagedUser(user.name, user.email);
  const tabs = useTabs(managedUser.data, user.name, isRiskScoreExist);
  const { selectedTabId, setSelectedTabId } = useSelectedTab(isRiskScoreExist, user, tabs, path);

  if (managedUser.isLoading) return <FlyoutLoading />;

  return (
    <>
      <LeftPanelHeader
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        tabs={tabs}
      />
      <LeftPanelContent selectedTabId={selectedTabId} tabs={tabs} />
    </>
  );
};

const useSelectedTab = (
  isRiskScoreExist: boolean,
  user: UserParam,
  tabs: LeftPanelTabsType,
  path: PanelPath | undefined
) => {
  const { openLeftPanel } = useExpandableFlyoutApi();

  const selectedTabId = useMemo(() => {
    const defaultTab = tabs[0].id;
    if (!path) return defaultTab;

    return tabs.find((tab) => tab.id === path.tab)?.id ?? defaultTab;
  }, [path, tabs]);

  const setSelectedTabId = (tabId: EntityDetailsLeftPanelTab) => {
    openLeftPanel({
      id: UserDetailsPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        user,
        isRiskScoreExist,
      },
    });
  };

  return { setSelectedTabId, selectedTabId };
};

UserDetailsPanel.displayName = 'UserDetailsPanel';

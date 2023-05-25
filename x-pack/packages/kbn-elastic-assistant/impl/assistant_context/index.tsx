/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCommentProps } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { omit } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { updatePromptContexts } from './helpers';
import type {
  PromptContext,
  RegisterPromptContext,
  UnRegisterPromptContext,
} from '../assistant/prompt_context/types';
import type { Conversation } from './types';
import { DEFAULT_ASSISTANT_TITLE } from '../assistant/translations';
import { CodeBlockDetails } from '../assistant/use_conversation/helpers';

export interface ShowAssistantOverlayProps {
  showOverlay: boolean;
  promptContextId?: string;
  conversationId?: string;
}

type ShowAssistantOverlay = ({
  showOverlay,
  promptContextId,
  conversationId,
}: ShowAssistantOverlayProps) => void;
interface AssistantProviderProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  augmentMessageCodeBlocks: (currentConversation: Conversation) => CodeBlockDetails[][];
  children: React.ReactNode;
  getComments: ({
    currentConversation,
    lastCommentRef,
  }: {
    currentConversation: Conversation;
    lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  }) => EuiCommentProps[];
  http: HttpSetup;
  getInitialConversations: () => Record<string, Conversation>;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  title?: string;
}

interface UseAssistantContext {
  actionTypeRegistry: ActionTypeRegistryContract;
  augmentMessageCodeBlocks: (currentConversation: Conversation) => CodeBlockDetails[][];
  conversationIds: string[];
  conversations: Record<string, Conversation>;
  getComments: ({
    currentConversation,
    lastCommentRef,
  }: {
    currentConversation: Conversation;
    lastCommentRef: React.MutableRefObject<HTMLDivElement | null>;
  }) => EuiCommentProps[];
  http: HttpSetup;
  promptContexts: Record<string, PromptContext>;
  registerPromptContext: RegisterPromptContext;
  setConversations: React.Dispatch<React.SetStateAction<Record<string, Conversation>>>;
  setShowAssistantOverlay: (showAssistantOverlay: ShowAssistantOverlay) => void;
  showAssistantOverlay: ShowAssistantOverlay;
  title: string;
  unRegisterPromptContext: UnRegisterPromptContext;
}

const AssistantContext = React.createContext<UseAssistantContext | undefined>(undefined);

export const AssistantProvider: React.FC<AssistantProviderProps> = ({
  actionTypeRegistry,
  augmentMessageCodeBlocks,
  children,
  getComments,
  http,
  getInitialConversations,
  setConversations,
  title = DEFAULT_ASSISTANT_TITLE,
}) => {
  /**
   * Prompt contexts are used to provide components a way to register and make their data available to the assistant.
   */
  const [promptContexts, setQueryContexts] = useState<Record<string, PromptContext>>({});

  const registerPromptContext: RegisterPromptContext = useCallback(
    (promptContext: PromptContext) => {
      setQueryContexts((prevPromptContexts) =>
        updatePromptContexts({
          prevPromptContexts,
          promptContext,
        })
      );
    },
    []
  );

  const unRegisterPromptContext: UnRegisterPromptContext = useCallback(
    (queryContextId: string) =>
      setQueryContexts((prevQueryContexts) => omit(queryContextId, prevQueryContexts)),
    []
  );

  /**
   * Global Assistant Overlay actions
   */
  const [showAssistantOverlay, setShowAssistantOverlay] = useState<ShowAssistantOverlay>(
    (showAssistant) => {}
  );

  const [conversations, setConversationsInternal] = useState(getInitialConversations());
  const conversationIds = useMemo(() => Object.keys(conversations).sort(), [conversations]);

  // TODO: This is a fix for conversations not loading out of localstorage. Also re-introduces our cascading render issue (as it loops back in localstorage)
  useEffect(() => {
    setConversationsInternal(getInitialConversations());
  }, [getInitialConversations]);

  const onConversationsUpdated = useCallback<
    React.Dispatch<React.SetStateAction<Record<string, Conversation>>>
  >(
    (
      newConversations:
        | Record<string, Conversation>
        | ((prev: Record<string, Conversation>) => Record<string, Conversation>)
    ) => {
      if (typeof newConversations === 'function') {
        const updater = newConversations;
        setConversationsInternal((prevValue) => {
          const newValue = updater(prevValue);
          setConversations(newValue);
          return newValue;
        });
      } else {
        setConversations(newConversations);
        setConversationsInternal(newConversations);
      }
    },
    [setConversations]
  );

  const value = useMemo(
    () => ({
      actionTypeRegistry,
      augmentMessageCodeBlocks,
      conversationIds,
      conversations,
      getComments,
      http,
      promptContexts,
      registerPromptContext,
      setConversations: onConversationsUpdated,
      setShowAssistantOverlay,
      showAssistantOverlay,
      title,
      unRegisterPromptContext,
    }),
    [
      actionTypeRegistry,
      augmentMessageCodeBlocks,
      conversationIds,
      conversations,
      getComments,
      http,
      promptContexts,
      registerPromptContext,
      onConversationsUpdated,
      showAssistantOverlay,
      title,
      unRegisterPromptContext,
    ]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
};

export const useAssistantContext = () => {
  const context = React.useContext(AssistantContext);

  if (context == null) {
    throw new Error('useAssistantContext must be used within a AssistantProvider');
  }

  return context;
};

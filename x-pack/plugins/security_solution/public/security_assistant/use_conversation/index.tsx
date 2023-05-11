/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Conversation, Message } from '../security_assistant_context/types';
import { useSecurityAssistantContext } from '../security_assistant_context';

interface UseConversation {
  appendMessage: (conversationId: string, message: Message) => Message[];
  clearConversation: (conversationId: string) => void;
}

export const useConversation = (): UseConversation => {
  const { setConversations } = useSecurityAssistantContext();

  /**
   * Append a message to the conversation[] for a given conversationId
   */
  const appendMessage = useCallback(
    (conversationId: string, message: Message): Message[] => {
      let messages: Message[] = [];
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          messages = [...prevConversation.messages, message];
          const newConversation = {
            ...prevConversation,
            messages,
          };

          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });
      return messages;
    },
    [setConversations]
  );

  /**
   * Clear the messages[] for a given conversationId
   */
  const clearConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev: Record<string, Conversation>) => {
        const prevConversation: Conversation | undefined = prev[conversationId];

        if (prevConversation != null) {
          const newConversation = {
            ...prevConversation,
            messages: [],
          };

          return {
            ...prev,
            [conversationId]: newConversation,
          };
        } else {
          return prev;
        }
      });
    },
    [setConversations]
  );

  return { clearConversation, appendMessage };
};

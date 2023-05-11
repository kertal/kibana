/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { Message } from '../security_assistant_context/types';
import { useSecurityAssistantContext } from '../security_assistant_context';
import { fetchChatCompletion } from '../api';

interface UseSendMessages {
  isLoading: boolean;
  sendMessages: (messages: Message[]) => Promise<string>;
}

export const useSendMessages = (): UseSendMessages => {
  const { apiConfig } = useSecurityAssistantContext();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessages = useCallback(
    async (messages: Message[]) => {
      setIsLoading(true);
      try {
        return await fetchChatCompletion({
          messages,
          baseUrl: apiConfig.openAI.baseUrl,
          apiKey: apiConfig.openAI.apiKey,
        });
      } catch (e) {
        console.error(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [apiConfig]
  );

  return { isLoading, sendMessages };
};

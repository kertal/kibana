/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { useAssistantContext } from '../../assistant_context';
import { Message } from '../../assistant_context/types';

interface UseSendMessages {
  isLoading: boolean;
  sendMessages: (messages: Message[]) => Promise<string>;
}

export const useSendMessages = (): UseSendMessages => {
  const { apiConfig } = useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);

  const sendMessages = useCallback(
    async (messages: Message[]) => {
      setIsLoading(true);
      try {
        messages.filter((e) => apiConfig != null);
        // wait 2 seconds then continue todo: add temporary assistant chat bubble loader w/ skeleton
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return 'This string is cheaper than cloud spend!';
        // return await fetchChatCompletion({
        //   messages,
        //   baseUrl: apiConfig.openAI.baseUrl,
        //   apiKey: apiConfig.openAI.apiKey,
        // });
      } finally {
        setIsLoading(false);
      }
    },
    [apiConfig]
  );

  return { isLoading, sendMessages };
};

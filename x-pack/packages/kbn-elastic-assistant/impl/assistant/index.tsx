/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiCommentList,
  EuiPageHeader,
  EuiToolTip,
  EuiSplitPanel,
} from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';

import { getCombinedMessage, getMessageFromRawResponse } from './helpers';

import { SettingsPopover } from './settings_popover';
import { useAssistantContext } from '../assistant_context';
import { ContextPills } from './context_pills';
import { PromptTextArea } from './prompt_textarea';
import type { PromptContext } from './prompt_context/types';
import { useConversation } from './use_conversation';
import { CodeBlockDetails } from './use_conversation/helpers';
import { useSendMessages } from './use_send_messages';
import type { Message } from '../assistant_context/types';
import { ConversationSelector } from './conversation_selector';
import { PromptEditor } from './prompt_editor';
import { getDefaultSystemPrompt, getSuperheroPrompt } from './prompt/helpers';
import type { Prompt } from './types';
import { getPromptById } from './prompt_editor/helpers';
import { QuickPrompts } from './quick_prompts/quick_prompts';

const CommentsContainer = styled.div`
  max-height: 600px;
  overflow-y: scroll;
`;

const ChatOptionsFlexItem = styled(EuiFlexItem)`
  left: -44px;
  position: relative;
  top: 11px;
`;

const ChatContainerFlexGroup = styled(EuiFlexGroup)`
  width: 102%;
`;

const StyledCommentList = styled(EuiCommentList)`
  margin-right: 20px;
`;

export interface Props {
  promptContextId?: string;
  conversationId?: string;
  showTitle?: boolean;
  shouldRefocusPrompt?: boolean;
}

/**
 * Renders a chat window with a prompt input and a chat history, along with
 * quick prompts for common actions, settings, and prompt context providers.
 */
const AssistantComponent: React.FC<Props> = ({
  promptContextId = '',
  showTitle = true,
  conversationId = 'default',
  shouldRefocusPrompt = false,
}) => {
  const { augmentMessageCodeBlocks, conversations, getComments, promptContexts, title } =
    useAssistantContext();
  const [selectedPromptContextIds, setSelectedPromptContextIds] = useState<string[]>([]);

  const { appendMessage, clearConversation, createConversation } = useConversation();
  const { isLoading, sendMessages } = useSendMessages();

  const [selectedConversationId, setSelectedConversationId] = useState<string>(conversationId);
  const currentConversation = useMemo(
    () => conversations[selectedConversationId] ?? createConversation({ conversationId }),
    [conversationId, conversations, createConversation, selectedConversationId]
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCommentRef = useRef<HTMLDivElement | null>(null);

  const [promptTextPreview, setPromptTextPreview] = useState<string>('');
  const [systemPrompts] = useState<Prompt[]>([getDefaultSystemPrompt(), getSuperheroPrompt()]);
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string | null>(
    getDefaultSystemPrompt().id
  );
  const [autoPopulatedOnce, setAutoPopulatedOnce] = useState<boolean>(false);
  const [suggestedUserPrompt, setSuggestedUserPrompt] = useState<string | null>(null);

  const [messageCodeBlocks, setMessageCodeBlocks] = useState<CodeBlockDetails[][]>(
    augmentMessageCodeBlocks(currentConversation)
  );
  const [_, setCodeBlockControlsVisible] = useState(false);
  useLayoutEffect(() => {
    setMessageCodeBlocks(augmentMessageCodeBlocks(currentConversation));
  }, [augmentMessageCodeBlocks, currentConversation]);

  // Fixes initial render not showing buttons as code block controls are added to the DOM really late
  useEffect(() => {
    const updateElements = () => {
      const elements = document.querySelectorAll('.euiCodeBlock__controls');
      setCodeBlockControlsVisible(elements.length > 0);
    };

    updateElements(); // Initial update

    const observer = new MutationObserver(updateElements);
    observer.observe(document.body, { subtree: true, childList: true });

    return () => {
      observer.disconnect(); // Clean up the observer if component unmounts
    };
  }, []);
  // End drill in `Add To Timeline` action

  // For auto-focusing prompt within timeline
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (shouldRefocusPrompt && promptTextAreaRef.current) {
      promptTextAreaRef?.current.focus();
    }
  }, [shouldRefocusPrompt]);

  // Scroll to bottom on conversation change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    promptTextAreaRef?.current?.focus();
  }, [currentConversation.messages.length, selectedPromptContextIds.length]);
  ////

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText) => {
      const message = await getCombinedMessage({
        isNewChat: currentConversation.messages.length === 0,
        promptContexts,
        promptText,
        selectedPromptContextIds,
        selectedSystemPrompt: getPromptById({
          id: selectedSystemPromptId ?? '',
          prompts: systemPrompts,
        }),
      });

      const updatedMessages = appendMessage({
        conversationId: selectedConversationId,
        message,
      });

      // Reset prompt context selection and preview before sending:
      setSelectedPromptContextIds([]);
      setPromptTextPreview('');

      const rawResponse = await sendMessages(updatedMessages);
      const responseMessage: Message = getMessageFromRawResponse(rawResponse);
      appendMessage({ conversationId: selectedConversationId, message: responseMessage });
    },
    [
      appendMessage,
      currentConversation.messages.length,
      promptContexts,
      selectedConversationId,
      selectedPromptContextIds,
      selectedSystemPromptId,
      sendMessages,
      systemPrompts,
    ]
  );

  const handleButtonSendMessage = useCallback(() => {
    handleSendMessage(promptTextAreaRef.current?.value?.trim() ?? '');
  }, [handleSendMessage, promptTextAreaRef]);

  const shouldDisableConversationSelectorHotkeys = useCallback(() => {
    const promptTextAreaHasFocus = document.activeElement === promptTextAreaRef.current;
    return promptTextAreaHasFocus;
  }, [promptTextAreaRef]);

  // Add min-height to all codeblocks so timeline icon doesn't overflow
  const codeBlockContainers = [...document.getElementsByClassName('euiCodeBlock')];
  // @ts-ignore-expect-error
  codeBlockContainers.forEach((e) => (e.style.minHeight = '75px'));
  ////

  const comments = getComments({ currentConversation, lastCommentRef });

  useEffect(() => {
    // Adding `conversationId !== selectedConversationId` to prevent auto-run still executing after changing selected conversation
    if (currentConversation.messages.length || conversationId !== selectedConversationId) {
      return;
    }

    if (autoPopulatedOnce) {
      return;
    }

    const promptContext: PromptContext | undefined = promptContexts[promptContextId];
    if (promptContext != null) {
      setAutoPopulatedOnce(true);

      // select this prompt context
      if (!selectedPromptContextIds.includes(promptContext.id)) {
        setSelectedPromptContextIds((prev) => [...prev, promptContext.id]);
      }

      if (promptContext?.suggestedUserPrompt != null) {
        setSuggestedUserPrompt(promptContext.suggestedUserPrompt);
      }
    }
  }, [
    currentConversation.messages,
    promptContexts,
    promptContextId,
    handleSendMessage,
    conversationId,
    selectedConversationId,
    selectedPromptContextIds,
    autoPopulatedOnce,
  ]);

  return (
    <EuiSplitPanel.Outer
      grow={false}
      css={css`
        width: 100%;
      `}
    >
      <EuiSplitPanel.Inner grow={false}>
        {showTitle && (
          <>
            <EuiPageHeader
              pageTitle={title}
              rightSideItems={[
                <ConversationSelector
                  conversationId={selectedConversationId}
                  onSelectionChange={(id) => setSelectedConversationId(id)}
                  shouldDisableKeyboardShortcut={shouldDisableConversationSelectorHotkeys}
                />,
              ]}
              iconType="logoSecurity"
            />
            <EuiHorizontalRule margin={'m'} />
          </>
        )}

        {/* Create portals for each EuiCodeBlock to add the `Investigate in Timeline` action */}
        {messageCodeBlocks.map((codeBlocks: CodeBlockDetails[]) => {
          return codeBlocks.map((codeBlock: CodeBlockDetails) => {
            const element: Element = codeBlock.controlContainer as Element;

            return codeBlock.controlContainer != null ? (
              createPortal(codeBlock.button, element)
            ) : (
              <></>
            );
          });
        })}

        <ContextPills
          promptContexts={promptContexts}
          selectedPromptContextIds={selectedPromptContextIds}
          setSelectedPromptContextIds={setSelectedPromptContextIds}
        />

        <EuiSpacer />

        <CommentsContainer className="eui-scrollBar">
          <StyledCommentList comments={comments} />
          <div ref={bottomRef} />

          <EuiSpacer />

          <>
            {(currentConversation.messages.length === 0 || selectedPromptContextIds.length > 0) && (
              <PromptEditor
                isNewConversation={currentConversation.messages.length === 0}
                promptContexts={promptContexts}
                promptTextPreview={promptTextPreview}
                selectedPromptContextIds={selectedPromptContextIds}
                selectedSystemPromptId={selectedSystemPromptId}
                setSelectedPromptContextIds={setSelectedPromptContextIds}
                setSelectedSystemPromptId={setSelectedSystemPromptId}
                systemPrompts={systemPrompts}
              />
            )}
          </>
        </CommentsContainer>

        <EuiSpacer />

        <ChatContainerFlexGroup gutterSize="s">
          <PromptTextArea
            onPromptSubmit={handleSendMessage}
            ref={promptTextAreaRef}
            handlePromptChange={setPromptTextPreview}
            value={suggestedUserPrompt ?? ''}
          />

          <ChatOptionsFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiToolTip position="right" content={'Clear chat'}>
                  <EuiButtonIcon
                    display="base"
                    iconType="trash"
                    aria-label="Delete"
                    color="danger"
                    onClick={() => {
                      setPromptTextPreview('');
                      clearConversation(selectedConversationId);
                      setSelectedSystemPromptId(getDefaultSystemPrompt().id);
                      setSelectedPromptContextIds([]);
                    }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip position="right" content={'Submit message'}>
                  <EuiButtonIcon
                    display="base"
                    iconType="returnKey"
                    aria-label="submit-message"
                    color="primary"
                    onClick={handleButtonSendMessage}
                    isLoading={isLoading}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <SettingsPopover />
              </EuiFlexItem>
            </EuiFlexGroup>
          </ChatOptionsFlexItem>
        </ChatContainerFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        css={css`
          padding: 8px;
        `}
      >
        <QuickPrompts setInput={setSuggestedUserPrompt} />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

AssistantComponent.displayName = 'AssistantComponent';

export const Assistant = React.memo(AssistantComponent);

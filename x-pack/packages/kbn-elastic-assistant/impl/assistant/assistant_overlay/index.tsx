/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiModal } from '@elastic/eui';

import useEvent from 'react-use/lib/useEvent';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';
import { ShowAssistantOverlayProps, useAssistantContext } from '../../assistant_context';
import { Assistant } from '..';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const StyledEuiModal = styled(EuiModal)`
  min-width: 1200px;
  max-height: 100%;
  height: 100%;
`;

/**
 * Modal container for Security Assistant conversations, receiving the page contents as context, plus whatever
 * component currently has focus and any specific context it may provide through the SAssInterface.
 */
export const AssistantOverlay: React.FC = React.memo(() => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>('default');
  const [promptContextId, setPromptContextId] = useState<string | undefined>();
  const { setShowAssistantOverlay } = useAssistantContext();

  // Bind `showAssistantOverlay` in SecurityAssistantContext to this modal instance
  const showOverlay = useCallback(
    () =>
      ({
        showOverlay: so,
        promptContextId: pid,
        conversationId: cid,
      }: ShowAssistantOverlayProps) => {
        setIsModalVisible(so);
        setPromptContextId(pid);
        setConversationId(cid);
      },
    [setIsModalVisible]
  );
  useEffect(() => {
    setShowAssistantOverlay(showOverlay);
  }, [setShowAssistantOverlay, showOverlay]);

  // Register keyboard listener to show the modal when cmd + / is pressed
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === ';' && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        setIsModalVisible(!isModalVisible);
      }
    },
    [isModalVisible]
  );
  useEvent('keydown', onKeyDown);

  // Modal control functions
  const cleanupAndCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setPromptContextId(undefined);
    setConversationId('default');
  }, [setIsModalVisible]);

  const handleCloseModal = useCallback(() => {
    cleanupAndCloseModal();
  }, [cleanupAndCloseModal]);

  return (
    <>
      {isModalVisible && (
        <StyledEuiModal onClose={handleCloseModal}>
          <Assistant conversationId={conversationId} promptContextId={promptContextId} />
        </StyledEuiModal>
      )}
    </>
  );
});

AssistantOverlay.displayName = 'AssistantOverlay';

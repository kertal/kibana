/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useKibana } from '../../../utils/kibana_react';
import { useDeleteSlo } from '../../../hooks/slo/use_delete_slo';

export interface SloDeleteConfirmationModalProps {
  slo: SLOWithSummaryResponse;
  onCancel: () => void;
}

export function SloDeleteConfirmationModal({
  slo: { id, name },
  onCancel,
}: SloDeleteConfirmationModalProps) {
  const {
    notifications: { toasts },
  } = useKibana().services;

  const [isVisible, setIsVisible] = useState(true);

  const { mutate: deleteSlo, isSuccess, isError } = useDeleteSlo(id);

  if (isSuccess) {
    toasts.addSuccess(getDeleteSuccesfulMessage(name));
  }

  if (isError) {
    toasts.addDanger(getDeleteFailMessage(name));
  }

  const handleConfirm = () => {
    setIsVisible(false);
    deleteSlo({ id });
  };

  return isVisible ? (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloDeleteConfirmationModal"
      title={getTitle()}
      cancelButtonText={getCancelButtonText()}
      confirmButtonText={getConfirmButtonText(name)}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      {i18n.translate('xpack.observability.slo.slo.deleteConfirmationModal.descriptionText', {
        defaultMessage: "You can't recover {name} after deleting.",
        values: { name },
      })}
    </EuiConfirmModal>
  ) : null;
}

const getTitle = () =>
  i18n.translate('xpack.observability.slo.slo.deleteConfirmationModal.title', {
    defaultMessage: 'Are you sure?',
  });

const getCancelButtonText = () =>
  i18n.translate('xpack.observability.slo.slo.deleteConfirmationModal.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  });

const getConfirmButtonText = (name: string) =>
  i18n.translate('xpack.observability.slo.slo.deleteConfirmationModal.deleteButtonLabel', {
    defaultMessage: 'Delete {name}',
    values: { name },
  });

const getDeleteSuccesfulMessage = (name: string) =>
  i18n.translate(
    'xpack.observability.slo.slo.deleteConfirmationModal.successNotification.descriptionText',
    {
      defaultMessage: 'Deleted {name}',
      values: { name },
    }
  );

const getDeleteFailMessage = (name: string) =>
  i18n.translate(
    'xpack.observability.slo.slo.deleteConfirmationModal.errorNotification.descriptionText',
    {
      defaultMessage: 'Failed to delete {name}',
      values: { name },
    }
  );

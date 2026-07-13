import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal.js';

export interface AboutDialogProps {
    onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
    const { t } = useTranslation();
    return (
        <Modal title={t('dialog.about.title')} onClose={onClose} width={400}>
            <div className="font-mono text-circuit-base text-circuit-text-secondary leading-relaxed">
                <h3 className="text-circuit-text text-circuit-lg font-semibold mb-2">{t('dialog.about.heading')}</h3>
                <p className="mb-3">
                    {t('dialog.about.description')}
                </p>
                <p className="mb-3">
                    {t('dialog.about.credits')}<br />
                    {t('dialog.about.ported')}
                </p>
                <p className="mb-4 text-circuit-text-muted">
                    {t('dialog.about.version')}
                </p>
                <div className="text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base"
                    >
                        {t('dialog.about.ok')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

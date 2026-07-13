import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ExportAsTextDialogProps {
    onClose: () => void;
}

export function ExportAsTextDialog({ onClose }: ExportAsTextDialogProps) {
    const { t } = useTranslation();
    const simManager = useCircuitStore((s) => s.simManager);
    const [circuitText, setCircuitText] = useState(t('dialog.exportText.loading'));

    useEffect(() => {
        (async () => {
            if (!simManager) {
                setCircuitText(t('dialog.exportText.noCircuit'));
                return;
            }
            try {
                const { Serializer } = await import('@circuitjs/core');
                const text = Serializer.dumpCircuit(simManager);
                setCircuitText(text);
            } catch {
                setCircuitText(t('dialog.exportText.error'));
            }
        })();
    }, [simManager, t]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(circuitText);
        } catch {
            // Fallback: select text manually
        }
    }, [circuitText]);

    return (
        <Modal title={t('dialog.exportText.title')} onClose={onClose} width={500}>
            <div className="font-mono text-circuit-base">
                <p className="text-circuit-text-muted mb-2">
                    {t('dialog.exportText.instruction')}
                </p>
                <textarea
                    readOnly
                    value={circuitText}
                    className="w-full h-[300px] bg-circuit-bg-canvas text-circuit-text border border-circuit-border rounded p-2 font-mono text-circuit-sm resize-none box-border"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <div className="flex justify-end gap-2 mt-3">
                    <button
                        onClick={handleCopy}
                        className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base"
                    >
                        {t('dialog.exportText.copyToClipboard')}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-circuit-accent-bg text-circuit-text border border-accent rounded cursor-pointer font-mono text-circuit-base"
                    >
                        {t('dialog.exportText.close')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

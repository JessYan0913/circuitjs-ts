import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ImportFromTextDialogProps {
    onClose: () => void;
}

export function ImportFromTextDialog({ onClose }: ImportFromTextDialogProps) {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const setComponents = useCircuitStore((s) => s.setComponents);
    const setSimManager = useCircuitStore((s) => s.setSimManager);
    const storeSetTime = useCircuitStore((s) => s.setTime);
    const autoCenter = useCircuitStore((s) => s.autoCenter);

    const handleImport = useCallback(async () => {
        if (!text.trim()) {
            setError(t('dialog.importText.errors.empty'));
            return;
        }
        try {
            const { Serializer, SimulationManager } = await import('@circuitjs/core');
            const { components } = Serializer.parseCircuit(text);
            if (components.length === 0) {
                setError(t('dialog.importText.errors.noComponents'));
                return;
            }
            const sim = new SimulationManager();
            sim.loadComponents(components);
            const ok = sim.analyzeCircuit();
            if (!ok) {
                setError(t('dialog.importText.errors.error', { message: sim.stopMessage }));
                return;
            }
            setSimManager(sim);
            setComponents(sim.components);
            storeSetTime(sim.getTime());
            setTimeout(() => autoCenter(), 50);
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(t('dialog.importText.errors.importError', { message: msg }));
        }
    }, [text, setComponents, setSimManager, storeSetTime, autoCenter, onClose, t]);

    return (
        <Modal title={t('dialog.importText.title')} onClose={onClose} width={500}>
            <div className="font-mono text-circuit-base">
                <p className="text-circuit-text-muted mb-2">
                    {t('dialog.importText.instruction')}
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('dialog.importText.placeholder')}
                    className="w-full h-[300px] bg-circuit-bg-canvas text-circuit-text border border-circuit-border rounded p-2 font-mono text-circuit-sm resize-none box-border"
                />
                {error && (
                    <p className="text-red-500 mt-2 text-circuit-sm">{error}</p>
                )}
                <div className="flex justify-end gap-2 mt-3">
                    <button
                        onClick={handleImport}
                        className="px-4 py-1.5 bg-circuit-accent-bg text-circuit-text border border-accent rounded cursor-pointer font-mono text-circuit-base"
                    >
                        {t('dialog.importText.import')}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base"
                    >
                        {t('dialog.importText.cancel')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

import React, { useCallback, useState } from 'react';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ImportFromTextDialogProps {
    onClose: () => void;
}

export function ImportFromTextDialog({ onClose }: ImportFromTextDialogProps) {
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const setComponents = useCircuitStore((s) => s.setComponents);
    const setSimManager = useCircuitStore((s) => s.setSimManager);
    const storeSetTime = useCircuitStore((s) => s.setTime);
    const autoCenter = useCircuitStore((s) => s.autoCenter);

    const handleImport = useCallback(async () => {
        if (!text.trim()) {
            setError('Please paste circuit data first.');
            return;
        }
        try {
            const { Serializer, SimulationManager } = await import('@circuitjs/core');
            const { components } = Serializer.parseCircuit(text);
            if (components.length === 0) {
                setError('No components found in circuit data.');
                return;
            }
            const sim = new SimulationManager();
            sim.loadComponents(components);
            const ok = sim.analyzeCircuit();
            if (!ok) {
                setError(`Error: ${sim.stopMessage}`);
                return;
            }
            setSimManager(sim);
            setComponents(sim.components);
            storeSetTime(sim.getTime());
            setTimeout(() => autoCenter(), 50);
            onClose();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(`Import error: ${msg}`);
        }
    }, [text, setComponents, setSimManager, storeSetTime, autoCenter, onClose]);

    return (
        <Modal title="Import From Text" onClose={onClose} width={500}>
            <div className="font-mono text-circuit-base">
                <p className="text-circuit-text-muted mb-2">
                    Paste circuit data text below and click Import:
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste circuit data here..."
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
                        Import
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </Modal>
    );
}

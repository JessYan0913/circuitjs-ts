import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ExportAsTextDialogProps {
    onClose: () => void;
}

export function ExportAsTextDialog({ onClose }: ExportAsTextDialogProps) {
    const simManager = useCircuitStore((s) => s.simManager);
    const [circuitText, setCircuitText] = useState('Loading...');

    useEffect(() => {
        (async () => {
            if (!simManager) {
                setCircuitText('No circuit loaded.');
                return;
            }
            try {
                const { Serializer } = await import('@circuitjs/core');
                const text = Serializer.dumpCircuit(simManager);
                setCircuitText(text);
            } catch {
                setCircuitText('Error generating circuit text.');
            }
        })();
    }, [simManager]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(circuitText);
        } catch {
            // Fallback: select text manually
        }
    }, [circuitText]);

    return (
        <Modal title="Export As Text" onClose={onClose} width={500}>
            <div className="font-mono text-circuit-base">
                <p className="text-circuit-text-muted mb-2">
                    Copy the circuit data below to share or save:
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
                        Copy to Clipboard
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-circuit-accent-bg text-circuit-text border border-accent rounded cursor-pointer font-mono text-circuit-base"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}

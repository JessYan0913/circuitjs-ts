import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from './Modal.js';
import { useCircuitStore } from '../store/circuitStore.js';

export interface ExportAsUrlDialogProps {
    onClose: () => void;
}

export function ExportAsUrlDialog({ onClose }: ExportAsUrlDialogProps) {
    const simManager = useCircuitStore((s) => s.simManager);
    const [urlText, setUrlText] = useState('Loading...');

    useEffect(() => {
        (async () => {
            if (!simManager) {
                setUrlText('No circuit loaded.');
                return;
            }
            try {
                const { Serializer } = await import('@circuitjs/core');
                const text = Serializer.dumpCircuit(simManager);
                const encoded = encodeURIComponent(text);
                setUrlText(`${window.location.origin}${window.location.pathname}?circuit=${encoded}`);
            } catch {
                setUrlText('Error generating URL.');
            }
        })();
    }, [simManager]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(urlText);
        } catch {
            // fallback
        }
    }, [urlText]);

    return (
        <Modal title="Export As URL" onClose={onClose} width={550}>
            <div className="font-mono text-circuit-base">
                <p className="text-circuit-text-muted mb-2">
                    Share this URL to load the current circuit:
                </p>
                <textarea
                    readOnly
                    value={urlText}
                    className="w-full h-[100px] bg-circuit-bg-canvas text-circuit-text border border-circuit-border rounded p-2 font-mono text-circuit-sm resize-none box-border break-all"
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

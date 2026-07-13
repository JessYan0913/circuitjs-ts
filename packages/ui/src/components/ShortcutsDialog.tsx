import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal.js';

export interface ShortcutsDialogProps {
    onClose: () => void;
}

interface ShortcutEntry {
    key: string;
    descriptionKey: string;
}

const shortcuts: ShortcutEntry[] = [
    { key: 'Space', descriptionKey: 'dialog.shortcuts.list.runStop' },
    { key: 'Delete / Backspace', descriptionKey: 'dialog.shortcuts.list.delete' },
    { key: 'Ctrl+Z', descriptionKey: 'dialog.shortcuts.list.undo' },
    { key: 'Ctrl+Y', descriptionKey: 'dialog.shortcuts.list.redo' },
    { key: 'Ctrl+C', descriptionKey: 'dialog.shortcuts.list.copy' },
    { key: 'Ctrl+V', descriptionKey: 'dialog.shortcuts.list.paste' },
    { key: 'Ctrl+A', descriptionKey: 'dialog.shortcuts.list.selectAll' },
    { key: 'X', descriptionKey: 'dialog.shortcuts.list.flipH' },
    { key: 'Y', descriptionKey: 'dialog.shortcuts.list.flipV' },
    { key: 'Arrow keys', descriptionKey: 'dialog.shortcuts.list.nudge' },
    { key: 'Escape', descriptionKey: 'dialog.shortcuts.list.clearSel' },
    { key: 'Ctrl+Click', descriptionKey: 'dialog.shortcuts.list.toggleSel' },
    { key: 'Shift+Drag', descriptionKey: 'dialog.shortcuts.list.boxSelect' },
    { key: 'Double-click', descriptionKey: 'dialog.shortcuts.list.editProps' },
    { key: 'Right-click', descriptionKey: 'dialog.shortcuts.list.contextMenu' },
    { key: 'Scroll wheel', descriptionKey: 'dialog.shortcuts.list.zoom' },
    { key: 'Middle button / Alt+Click', descriptionKey: 'dialog.shortcuts.list.pan' },
];

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
    const { t } = useTranslation();
    return (
        <Modal title={t('dialog.shortcuts.title')} onClose={onClose} width={450}>
            <div className="font-mono text-circuit-base">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-circuit-border">
                            <th className="text-left px-3 py-1.5 text-circuit-text-muted font-normal">{t('dialog.shortcuts.key')}</th>
                            <th className="text-left px-3 py-1.5 text-circuit-text-muted font-normal">{t('dialog.shortcuts.action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shortcuts.map((s, i) => (
                            <tr key={i} className="border-b border-[#2a2a2a]">
                                <td className="px-3 py-1 whitespace-nowrap" style={{ color: '#FFD700' }}>
                                    {s.key}
                                </td>
                                <td className="px-3 py-1 text-circuit-text-secondary">{t(s.descriptionKey)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="text-center mt-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-1.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-base"
                    >
                        {t('dialog.shortcuts.ok')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

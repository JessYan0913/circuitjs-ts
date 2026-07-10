import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CircuitComponent } from '@circuitjs/core';
import { CustomCompositeComponent, CustomCompositeChipComponent, CustomCompositeModel } from '@circuitjs/core';
import type { EditInfo } from '@circuitjs/shared';
import { CircuitCanvas } from './CircuitCanvas.js';
import { MenuBar } from './MenuBar.js';
import { EditDialog } from './EditDialog.js';
import { EditCompositeModelDialog, type PinEditor } from './EditCompositeModelDialog.js';
import { AboutDialog } from './AboutDialog.js';
import { ShortcutsDialog } from './ShortcutsDialog.js';
import { ExportAsTextDialog } from './ExportAsTextDialog.js';
import { ExportAsUrlDialog } from './ExportAsUrlDialog.js';
import { ImportFromTextDialog } from './ImportFromTextDialog.js';
import { SliderPanel } from './SliderPanel.js';
import { ScopePanel } from './ScopePanel.js';
import { ScopeConfigDialog } from './ScopeConfigDialog.js';
import { Modal } from './Modal.js';
import { EXAMPLES } from '../data/examples.js';
import { createScopeConfig, createScopePlot } from '../canvas/scope-capture.js';
import { useCircuitStore } from '../store/circuitStore.js';

type DialogState =
    | { type: 'edit'; component: CircuitComponent }
    | { type: 'about' }
    | { type: 'shortcuts' }
    | { type: 'export-text' }
    | { type: 'export-url' }
    | { type: 'import-text' }
    | { type: 'examples' }
    | { type: 'scope-config'; scopeIndex: number }
    | { type: 'edit-composite'; model: CustomCompositeModel; component: CircuitComponent }
    | { type: 'none' };

export function App() {
    const [statusText, setStatusText] = useState('Ready');
    const [refreshKey, setRefreshKey] = useState(0);
    const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
    const [selectedExample, setSelectedExample] = useState<string | null>(null);

    // The current "add component type" selected from the Draw menu
    const [addComponentType, setAddComponentType] = useState<string | null>(null);

    // Ref to canvas for dispatching keyboard events
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    const simManager = useCircuitStore((s) => s.simManager);
    const running = useCircuitStore((s) => s.running);
    const setSimManager = useCircuitStore((s) => s.setSimManager);
    const setRunning = useCircuitStore((s) => s.setRunning);
    const setComponents = useCircuitStore((s) => s.setComponents);
    const storeSetTime = useCircuitStore((s) => s.setTime);
    const autoCenter = useCircuitStore((s) => s.autoCenter);
    const setCanUndo = useCircuitStore((s) => s.setCanUndo);
    const setCanRedo = useCircuitStore((s) => s.setCanRedo);
    const components = useCircuitStore((s) => s.components);
    const scopes = useCircuitStore((s) => s.scopes);
    const setScopes = useCircuitStore((s) => s.setScopes);

    const simLoaded = simManager !== null && components.length > 0;

    // Global keyboard shortcuts (Space for run/stop)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.code === 'Space') {
                e.preventDefault();
                const store = useCircuitStore.getState();
                if (store.running) {
                    store.simManager?.stop();
                    store.setRunning(false);
                } else {
                    store.simManager?.start();
                    store.setRunning(true);
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Load a circuit from dump text
    const loadCircuit = useCallback(async (text: string, label?: string) => {
        try {
            const { Serializer, SimulationManager } = await import('@circuitjs/core');
            const parsed = Serializer.parseCircuit(text);
            const sim = new SimulationManager();
            sim.loadComponents(parsed.components);
            const ok = sim.analyzeCircuit();
            if (!ok) {
                setStatusText(`Error: ${sim.stopMessage}`);
                return;
            }
            setSimManager(sim);
            setComponents(sim.components);
            storeSetTime(sim.getTime());
            setRefreshKey((k) => k + 1);
            setTimeout(() => autoCenter(), 50);
            setAddComponentType(null); // Reset add mode
            setStatusText(label ? `Loaded: ${label}` : `Loaded: ${parsed.components.length} components`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatusText(`Error: ${msg}`);
        }
    }, [setSimManager, setComponents, storeSetTime, autoCenter]);

    // --- MenuBar actions ---

    const handleNewCircuit = useCallback(() => {
        setSimManager(null);
        setComponents([]);
        storeSetTime(0);
        setRefreshKey((k) => k + 1);
        setStatusText('New circuit');
    }, [setSimManager, setComponents, storeSetTime]);

    const handleOpenFile = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.circuit,.circ';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const text = await file.text();
            loadCircuit(text, file.name);
        };
        input.click();
    }, [loadCircuit]);

    const handleImportText = useCallback(() => {
        setDialog({ type: 'import-text' });
    }, []);

    const handleExportText = useCallback(() => {
        setDialog({ type: 'export-text' });
    }, []);

    const handleExportUrl = useCallback(() => {
        setDialog({ type: 'export-url' });
    }, []);

    const handleExportImage = useCallback(() => {
        // Use HTMLCanvasElement to capture an image
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'circuit.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }, []);

    const handleShowAbout = useCallback(() => {
        setDialog({ type: 'about' });
    }, []);

    const handleShowShortcuts = useCallback(() => {
        setDialog({ type: 'shortcuts' });
    }, []);

    const handleShowExamples = useCallback(() => {
        setDialog({ type: 'examples' });
    }, []);

    const handleScopeAction = useCallback((action: string) => {
        switch (action) {
            case 'add': {
                // Find first component to bind scope to
                const state = useCircuitStore.getState();
                const comps = state.components.filter((c) => c.volts.length > 0);
                if (comps.length === 0) {
                    setStatusText('No components to probe — add components first');
                    return;
                }
                const target = comps[0];
                const plot = createScopePlot(target.id, 0, '#FFD700', 5, 0);
                const scope = createScopeConfig(target.id, { x: 0, y: 0, width: 400, height: 150 }, 64);
                scope.plots = [plot];
                const updated = [...state.scopes, scope];
                setScopes(updated);
                setStatusText(`Added scope, probing ${target.constructor.name.replace(/Component$/, '')}`);
                break;
            }
            case 'remove': {
                const state = useCircuitStore.getState();
                if (state.scopes.length > 0) {
                    setScopes(state.scopes.slice(0, -1));
                    setStatusText('Removed last scope');
                }
                break;
            }
        }
    }, [setScopes]);

    // Dispatch keyboard events to the canvas element
    const dispatchKeyEvent = useCallback((key: string, ctrl: boolean = false) => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        canvas.dispatchEvent(new KeyboardEvent('keydown', {
            key,
            ctrlKey: ctrl,
            metaKey: ctrl,
            bubbles: true,
        }));
    }, []);

    // Handle Edit menu actions that map to keyboard shortcuts
    const handleEditMenuAction = useCallback((action: string) => {
        switch (action) {
            case 'cut':
                dispatchKeyEvent('x', true);
                break;
            case 'copy':
                dispatchKeyEvent('c', true);
                break;
            case 'paste':
                dispatchKeyEvent('v', true);
                break;
            case 'select_all':
                dispatchKeyEvent('a', true);
                break;
            case 'delete':
                dispatchKeyEvent('Delete');
                break;
        }
    }, [dispatchKeyEvent]);

    const handleUndo = useCallback(() => {
        dispatchKeyEvent('z', true);
    }, [dispatchKeyEvent]);

    const handleRedo = useCallback(() => {
        dispatchKeyEvent('y', true);
    }, [dispatchKeyEvent]);

    // Handle undo state changes from CircuitCanvas
    const handleUndoStateChange = useCallback((canUndo: boolean, canRedo: boolean) => {
        setCanUndo(canUndo);
        setCanRedo(canRedo);
    }, [setCanUndo, setCanRedo]);

    // Handle edit component (from double-click or context menu)
    const handleEditComponent = useCallback((component: CircuitComponent) => {
        setAddComponentType(null);
        setDialog({ type: 'edit', component });
    }, []);

    // Handle edit dialog apply
    const handleEditApply = useCallback((component: CircuitComponent) => {
        if (simManager) {
            simManager.analyzeCircuit();
        }
        setComponents([...useCircuitStore.getState().components]);
        setStatusText('Applied changes');
    }, [simManager, setComponents]);

    // Handle add component type
    const handleAddComponentType = useCallback((type: string | null) => {
        setAddComponentType(type);
    }, []);

    const handleScopeConfig = useCallback((scopeIndex: number) => {
        setDialog({ type: 'scope-config', scopeIndex });
    }, []);

    // Handle edit dialog button actions (e.g., opening composite model editor)
    const handleEditButtonAction = useCallback((_n: number, _info: EditInfo, component: CircuitComponent) => {
        if (component instanceof CustomCompositeComponent || component instanceof CustomCompositeChipComponent) {
            const model = (component as any).model as CustomCompositeModel;
            if (model) {
                setDialog({ type: 'edit-composite', model, component });
            }
        }
    }, []);

    // Handle composite model save
    const handleCompositeModelSave = useCallback((data: { name: string; pins: PinEditor[]; sizeX: number; sizeY: number }) => {
        const state = useCircuitStore.getState();
        const dialogState = dialog;
        if (dialogState.type !== 'edit-composite') return;

        const { model, component } = dialogState;
        if (data.name) model.name = data.name;
        model.sizeX = data.sizeX;
        model.sizeY = data.sizeY;
        model.pinNames = data.pins.map(p => p.name);
        model.extList = data.pins.map((p, i) => ({
            name: p.name,
            node: p.node,
            pos: p.pos,
            side: p.side,
        }));

        if (state.simManager) {
            state.simManager.analyzeCircuit();
        }
        setComponents([...state.components]);
        setStatusText('Composite model updated');

        // Re-open the edit dialog for the component
        setDialog({ type: 'edit', component });
    }, [dialog, setComponents]);

    // Handle loading examples
    const handleLoadExample = useCallback((name: string) => {
        const text = EXAMPLES[name];
        if (text) {
            loadCircuit(text, name);
            setDialog({ type: 'none' });
        }
    }, [loadCircuit]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#000',
            color: '#FFF',
            fontFamily: 'monospace',
            fontSize: '13px',
        }}>
            {/* Menu bar with simulation controls */}
            <MenuBar
                onAddComponentType={handleAddComponentType}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onEditMenuAction={handleEditMenuAction}
                onImportText={handleImportText}
                onExportText={handleExportText}
                onExportUrl={handleExportUrl}
                onExportImage={handleExportImage}
                onNewCircuit={handleNewCircuit}
                onOpenFile={handleOpenFile}
                onShowAbout={handleShowAbout}
                onShowShortcuts={handleShowShortcuts}
                onShowExamples={handleShowExamples}
                onScopeAction={handleScopeAction}
                running={running}
                simLoaded={simLoaded}
            />

            {/* Main content: canvas + optional slider panel */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <CircuitCanvas
                            key={refreshKey}
                            onEditComponent={handleEditComponent}
                            onAddComponentType={addComponentType}
                            onUndoStateChange={handleUndoStateChange}
                        />
                    </div>
                    {scopes.length > 0 && (
                        <ScopePanel onConfigScope={handleScopeConfig} />
                    )}
                </div>
                <SliderPanel />
            </div>

            {/* Status bar */}
            <div style={{
                padding: '3px 12px',
                backgroundColor: '#1a1a1a',
                borderTop: '1px solid #333',
                color: '#888',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
            }}>
                <span>{statusText}</span>
                {simLoaded && <span>{components.length} components</span>}
            </div>

            {/* Dialogs */}
            {dialog.type === 'edit' && dialog.component && (
                <EditDialog
                    component={dialog.component}
                    onApply={handleEditApply}
                    onClose={() => setDialog({ type: 'none' })}
                    onButtonAction={handleEditButtonAction}
                />
            )}

            {dialog.type === 'edit-composite' && (
                <EditCompositeModelDialog
                    pinCount={dialog.model.pinNames.length}
                    initialPins={dialog.model.extList.length > 0 ? dialog.model.extList.map(e => ({
                        name: e.name,
                        node: e.node,
                        pos: e.pos,
                        side: e.side,
                    })) : dialog.model.pinNames.map((name, i) => ({
                        name,
                        node: i,
                        pos: i,
                        side: 2,
                    }))}
                    initialSizeX={dialog.model.sizeX}
                    initialSizeY={dialog.model.sizeY}
                    initialName={dialog.model.name || undefined}
                    isNew={!dialog.model.name}
                    onSave={handleCompositeModelSave}
                    onClose={() => setDialog({ type: 'none' })}
                />
            )}

            {dialog.type === 'about' && (
                <AboutDialog onClose={() => setDialog({ type: 'none' })} />
            )}

            {dialog.type === 'shortcuts' && (
                <ShortcutsDialog onClose={() => setDialog({ type: 'none' })} />
            )}

            {dialog.type === 'export-text' && (
                <ExportAsTextDialog onClose={() => setDialog({ type: 'none' })} />
            )}

            {dialog.type === 'export-url' && (
                <ExportAsUrlDialog onClose={() => setDialog({ type: 'none' })} />
            )}

            {dialog.type === 'import-text' && (
                <ImportFromTextDialog onClose={() => setDialog({ type: 'none' })} />
            )}

            {dialog.type === 'scope-config' && (
                <ScopeConfigDialog
                    scopeIndex={dialog.scopeIndex}
                    onClose={() => setDialog({ type: 'none' })}
                />
            )}

            {dialog.type === 'examples' && (
                <Modal title="Example Circuits" onClose={() => setDialog({ type: 'none' })} width={400}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.keys(EXAMPLES).map((name) => (
                            <div
                                key={name}
                                onClick={() => handleLoadExample(name)}
                                style={{
                                    padding: '8px 12px',
                                    color: '#CCC',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    borderRadius: '3px',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#333'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {name}
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}

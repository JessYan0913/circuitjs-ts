import React, { useCallback, useRef, useState } from 'react';
import { CircuitCanvas } from './CircuitCanvas.js';
import { useCircuitStore } from '../store/circuitStore.js';

export function App() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [statusText, setStatusText] = useState('Ready');
    const [refreshKey, setRefreshKey] = useState(0);

    const simManager = useCircuitStore((s) => s.simManager);
    const running = useCircuitStore((s) => s.running);
    const time = useCircuitStore((s) => s.time);
    const setSimManager = useCircuitStore((s) => s.setSimManager);
    const setRunning = useCircuitStore((s) => s.setRunning);
    const setComponents = useCircuitStore((s) => s.setComponents);
    const setShowCurrent = useCircuitStore((s) => s.setShowCurrent);
    const showCurrent = useCircuitStore((s) => s.showCurrent);
    const storeSetTime = useCircuitStore((s) => s.setTime);
    const autoCenter = useCircuitStore((s) => s.autoCenter);

    const handleLoadCircuit = useCallback(async () => {
        const text = prompt('Paste circuit data text:');
        if (!text) return;

        try {
            const { Serializer, SimulationManager } = await import('@circuitjs/core');
            const { components } = Serializer.parseCircuit(text);
            const sim = new SimulationManager();
            sim.loadComponents(components);
            const ok = sim.analyzeCircuit();
            if (!ok) {
                setStatusText(`Error: ${sim.stopMessage}`);
                return;
            }
            setSimManager(sim);
            setComponents(sim.components);
            storeSetTime(sim.getTime());
            setTimeout(() => autoCenter(), 50);
            setStatusText(`Loaded: ${components.length} components, ${sim.getNodeCount()} nodes`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatusText(`Error: ${msg}`);
        }
    }, [setSimManager, setComponents, storeSetTime, autoCenter]);

    const handleStart = useCallback(() => {
        if (!simManager) return;
        simManager.start();
        setRunning(true);
        setStatusText('Running');
    }, [simManager, setRunning]);

    const handleStop = useCallback(() => {
        if (!simManager) return;
        simManager.stop();
        setRunning(false);
        const t = simManager.getTime();
        storeSetTime(t);
        setRefreshKey((k: number) => k + 1);
        setStatusText(`Stopped at t=${t.toExponential(3)}s`);
    }, [simManager, setRunning, storeSetTime]);

    const handleStep = useCallback(() => {
        if (!simManager) return;
        simManager.runSteps(100);
        storeSetTime(simManager.getTime());
        setRefreshKey((k: number) => k + 1);
        setStatusText(`Stepped: t=${simManager.getTime().toExponential(3)}s`);
    }, [simManager, storeSetTime]);

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
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#1a1a1a',
                borderBottom: '1px solid #333',
                userSelect: 'none',
            }}>
                <button onClick={handleLoadCircuit}
                    style={btnStyle}>Load</button>
                <button onClick={handleStart} disabled={!simManager || running}
                    style={btnStyle}>Start</button>
                <button onClick={handleStop} disabled={!running}
                    style={btnStyle}>Stop</button>
                <button onClick={handleStep} disabled={!simManager || running}
                    style={btnStyle}>Step</button>
                <label style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                        type="checkbox"
                        checked={showCurrent}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowCurrent(e.target.checked)}
                    />
                    Current
                </label>
                <span style={{ marginLeft: 'auto', color: '#888' }}>
                    {simManager ? `t=${time.toExponential(3)}s` : 'No circuit loaded'}
                </span>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <CircuitCanvas key={refreshKey} />
            </div>

            {/* Status bar */}
            <div style={{
                padding: '3px 12px',
                backgroundColor: '#1a1a1a',
                borderTop: '1px solid #333',
                color: '#888',
                fontSize: '12px',
            }}>
                {statusText}
            </div>

            <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".txt,.circuit" />
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    padding: '4px 12px',
    backgroundColor: '#333',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
};

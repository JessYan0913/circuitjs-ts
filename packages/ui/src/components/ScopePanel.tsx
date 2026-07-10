import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import type { ScopeConfig } from '@circuitjs/shared';
import { SCOPE_POINT_COUNT_INITIAL } from '@circuitjs/shared';
import { drawWaveform } from '../canvas/WaveformRenderer.js';
import { getScopeValue } from '../canvas/scope-capture.js';
import { useCircuitStore } from '../store/circuitStore.js';

const TITLE_BAR_HEIGHT = 24;
const MIN_SCOPE_HEIGHT = 60;
const DEFAULT_SCOPE_HEIGHT = 150;

export interface ScopePanelProps {
    onConfigScope?: (scopeIndex: number) => void;
}

export function ScopePanel({ onConfigScope }: ScopePanelProps) {
    const scopes = useCircuitStore((s) => s.scopes);
    const simManager = useCircuitStore((s) => s.simManager);
    const running = useCircuitStore((s) => s.running);
    const setScopes = useCircuitStore((s) => s.setScopes);

    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const rafRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);

    const maxTimeStep = simManager?.config.maxTimeStep ?? 5e-6;

    // Track scope heights
    const scopeHeights = useMemo(() => {
        return scopes.map((s) => s.rect.height || DEFAULT_SCOPE_HEIGHT);
    }, [scopes]);

    // Set canvas ref for a scope
    const setCanvasRef = useCallback((scopeIndex: number, canvas: HTMLCanvasElement | null) => {
        if (canvas) {
            canvasRefs.current.set(scopeIndex, canvas);
        } else {
            canvasRefs.current.delete(scopeIndex);
        }
    }, []);

    // Render all scope waveforms
    const renderScopes = useCallback(() => {
        const state = useCircuitStore.getState();
        const currentScopes = state.scopes;
        const currentTime = state.time;

        for (let i = 0; i < currentScopes.length; i++) {
            const canvas = canvasRefs.current.get(i);
            if (!canvas) continue;

            const scope = currentScopes[i];
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            drawWaveform(
                ctx,
                { x: 0, y: 0, width: canvas.width, height: canvas.height },
                scope,
                (bufIndex: number, plotIndex: number) => {
                    const plot = scope.plots[plotIndex];
                    if (!plot) return { max: 0, min: 0 };
                    return getScopeValue(plot, bufIndex);
                },
                currentTime * 1000,
                maxTimeStep,
            );
        }
    }, [maxTimeStep]);

    // Animation loop
    useEffect(() => {
        if (running && scopes.length > 0) {
            lastFrameTimeRef.current = 0;
            const loop = (timestamp: number) => {
                renderScopes();
                if (useCircuitStore.getState().running) {
                    rafRef.current = requestAnimationFrame(loop);
                }
            };
            rafRef.current = requestAnimationFrame(loop);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [running, scopes.length, renderScopes]);

    // Remove a scope
    const handleRemoveScope = useCallback((index: number) => {
        const current = useCircuitStore.getState().scopes;
        const updated = current.filter((_, i) => i !== index);
        setScopes(updated);
    }, [setScopes]);

    if (scopes.length === 0) return null;

    return (
        <div style={{
            backgroundColor: '#111',
            borderTop: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {scopes.map((scope, index) => (
                <ScopeView
                    key={index}
                    scope={scope}
                    scopeIndex={index}
                    maxTimeStep={maxTimeStep}
                    onRemove={() => handleRemoveScope(index)}
                    onConfig={() => onConfigScope?.(index)}
                    setCanvasRef={setCanvasRef}
                />
            ))}
        </div>
    );
}

interface ScopeViewProps {
    scope: ScopeConfig;
    scopeIndex: number;
    maxTimeStep: number;
    onRemove: () => void;
    onConfig: () => void;
    setCanvasRef: (index: number, canvas: HTMLCanvasElement | null) => void;
}

function ScopeView({ scope, scopeIndex, maxTimeStep, onRemove, onConfig, setCanvasRef }: ScopeViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Height state
    const [height, setHeight] = React.useState(scope.rect.height || DEFAULT_SCOPE_HEIGHT);

    useEffect(() => {
        setCanvasRef(scopeIndex, canvasRef.current);
        return () => setCanvasRef(scopeIndex, null);
    }, [scopeIndex, setCanvasRef]);

    // Resize canvas to match container
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Mouse wheel for timebase speed
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const store = useCircuitStore.getState();
        const updated = [...store.scopes];
        const scope = { ...updated[scopeIndex] };
        const delta = e.deltaY > 0 ? 1.2 : 1 / 1.2;
        scope.speed = Math.max(1, Math.min(1024, Math.round(scope.speed * delta)));
        updated[scopeIndex] = scope;
        store.setScopes(updated);
    }, [scopeIndex]);

    const scopeLabel = scope.plots.length > 0
        ? `Scope ${scopeIndex + 1}`
        : `Scope ${scopeIndex + 1} (unbound)`;

    return (
        <div style={{ borderBottom: '1px solid #333' }}>
            {/* Title bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '2px 8px',
                height: TITLE_BAR_HEIGHT,
                backgroundColor: '#1a1a1a',
                userSelect: 'none',
                gap: '8px',
            }}>
                <span style={{ color: '#CCC', fontFamily: 'monospace', fontSize: '11px', flex: 1 }}>
                    {scopeLabel}
                </span>
                <span style={{ color: '#666', fontFamily: 'monospace', fontSize: '10px' }}>
                    speed={scope.speed}
                </span>
                <button
                    onClick={onConfig}
                    style={titleBtnStyle}
                    title="Configure Scope"
                >
                    ⚙
                </button>
                <button
                    onClick={onRemove}
                    style={titleBtnStyle}
                    title="Remove Scope"
                >
                    ✕
                </button>
            </div>

            {/* Waveform canvas */}
            <div
                ref={containerRef}
                onWheel={handleWheel}
                style={{ width: '100%', height: `${height}px` }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}

const titleBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '2px 4px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    lineHeight: 1,
};

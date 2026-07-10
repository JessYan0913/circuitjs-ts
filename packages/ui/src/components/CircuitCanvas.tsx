import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Serializer, type CircuitComponent } from '@circuitjs/core';
import { captureScopePoint, getScopeValue } from '../canvas/scope-capture.js';
import { CircuitRenderer } from '../canvas/CircuitRenderer.js';
import { CanvasGraphics } from '../canvas/CanvasGraphics.js';
import { InteractionHandler, type ContextMenuState } from '../canvas/InteractionHandler.js';
import { UndoStack } from '../canvas/UndoStack.js';
import { useCircuitStore } from '../store/circuitStore.js';
import { setRendererRef, setCanvasSize } from '../store/types.js';

const MENU_WIDTH = 160;
const MENU_ITEM_HEIGHT = 28;

export interface CircuitCanvasProps {
    onEditComponent?: (component: CircuitComponent) => void;
    onAddComponentType?: string | null;
    onUndoStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export function CircuitCanvas({ onEditComponent, onAddComponentType, onUndoStateChange }: CircuitCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<CircuitRenderer | null>(null);
    const interactionRef = useRef<InteractionHandler | null>(null);
    const undoStackRef = useRef<UndoStack>(new UndoStack());
    const rafRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const prevAddTypeRef = useRef<string | null | undefined>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const running = useCircuitStore((s) => s.running);

    /** Render canvas with optional box selection overlay */
    function renderFrameToCtx(
        ctx: CanvasRenderingContext2D,
        width: number, height: number,
        renderer: CircuitRenderer,
        handler: InteractionHandler | null,
    ) {
        renderer.render(ctx, width, height);

        // Draw box selection rect
        if (handler) {
            const box = handler.getBoxSelectRect();
            if (box) {
                ctx.strokeStyle = '#4488FF';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
                ctx.fillStyle = 'rgba(68, 136, 255, 0.1)';
                ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);
                ctx.setLineDash([]);
            }
        }

        // Draw component being dragged (ADD_ELM preview)
        if (handler) {
            const dragElm = handler.getDragElm();
            if (dragElm) {
                ctx.save();
                const { ox, oy, scale } = renderer.transform;
                ctx.translate(ox, oy);
                ctx.scale(scale, scale);

                const g = new CanvasGraphics(ctx);
                g.setLineWidth(2);
                dragElm.draw(g);

                // Draw posts at endpoints
                for (let j = 0; j < dragElm.getPostCount(); j++) {
                    const pt = dragElm.getPost(j);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }
        }
    }

    // Take undo snapshot
    const takeUndoSnapshot = useCallback(() => {
        undoStackRef.current.snapshot(useCircuitStore.getState().components);
        onUndoStateChange?.(undoStackRef.current.canUndo(), undoStackRef.current.canRedo());
    }, [onUndoStateChange]);

    // Notify undo state after restore
    const notifyUndoState = useCallback(() => {
        onUndoStateChange?.(undoStackRef.current.canUndo(), undoStackRef.current.canRedo());
    }, [onUndoStateChange]);

    // Restore undo/redo state
    const restoreFromUndo = useCallback((direction: 'undo' | 'redo') => {
        const stack = undoStackRef.current;
        const entry = direction === 'undo' ? stack.undo() : stack.redo();
        if (!entry) return;

        const header = '$ 1 5e-6 10 50 5 50 1e-12';
        const text = `${header}\n${entry.dumps.join('\n')}`;
        const parsed = Serializer.parseCircuit(text);

        if (parsed.components.length === 0) return;

        const state = useCircuitStore.getState();
        const mgr = state.simManager;
        if (mgr) {
            mgr.loadComponents(parsed.components);
            mgr.analyzeCircuit();
        }
        state.setComponents(parsed.components);
        state.setTime(mgr?.getTime() ?? 0);

        // Restore selection
        const handler = interactionRef.current;
        if (handler) {
            handler.clearSelection();
            for (const c of parsed.components) {
                if (handler.state.selected.has(c.id)) {
                    c.selected = true;
                }
            }
        }

        notifyUndoState();
    }, [notifyUndoState]);

    useEffect(() => {
        const renderer = new CircuitRenderer(
            () => useCircuitStore.getState().components,
        );
        renderer.getNodeVoltage = (node: number) => {
            const mgr = useCircuitStore.getState().simManager;
            if (!mgr) return 0;
            return mgr.getNodeVoltage(node);
        };
        rendererRef.current = renderer;
        setRendererRef(renderer);

        const handler = new InteractionHandler(
            () => rendererRef.current!,
            () => useCircuitStore.getState().components,
            {
                onRenderNeeded: () => {
                    const canvas = canvasRef.current;
                    const renderer = rendererRef.current;
                    if (canvas && renderer) {
                        renderer.hoveredComponentId =
                            interactionRef.current?.state.mouseElm?.id ?? null;
                        const ctx = canvas.getContext('2d');
                        if (ctx) renderFrameToCtx(ctx, canvas.width, canvas.height, renderer, handler);
                    }
                },
                onTopologyChanged: () => {
                    const mgr = useCircuitStore.getState().simManager;
                    if (mgr) {
                        mgr.analyzeCircuit();
                    }
                },
                onComponentsChanged: (components) => {
                    const state = useCircuitStore.getState();
                    const mgr = state.simManager;
                    if (mgr) {
                        mgr.loadComponents(components);
                        mgr.analyzeCircuit();
                    }
                    state.setComponents(components);
                },
                onUndoSnapshot: () => {
                    takeUndoSnapshot();
                },
                onContextMenu: (menu) => {
                    setContextMenu(menu);
                },
                setCursor: (cursor) => {
                    const canvas = canvasRef.current;
                    if (canvas) canvas.style.cursor = cursor;
                },
                onEditComponent: (component) => {
                    onEditComponent?.(component);
                },
            },
        );
        interactionRef.current = handler;

        return () => { setRendererRef(null); };
    }, [takeUndoSnapshot, onEditComponent]);

    // Watch onAddComponentType prop to set add type on handler
    useEffect(() => {
        if (onAddComponentType !== prevAddTypeRef.current) {
            prevAddTypeRef.current = onAddComponentType;
            interactionRef.current?.setAddType(onAddComponentType ?? null);
        }
    }, [onAddComponentType]);

    // Sync renderer options from store
    useEffect(() => {
        const unsub = useCircuitStore.subscribe((state) => {
            const renderer = rendererRef.current;
            if (!renderer) return;
            // Trigger re-render when options change
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                renderer.render(ctx, canvasRef.current.width, canvasRef.current.height);
            }
        });
        return unsub;
    }, []);

    // Sync hovered component to renderer before each render
    const renderFrame = useCallback((timestamp: number) => {
        const canvas = canvasRef.current;
        const renderer = rendererRef.current;
        const handler = interactionRef.current;
        if (!canvas || !renderer) return;

        // Advance simulation
        const mgr = useCircuitStore.getState().simManager;
        if (mgr && useCircuitStore.getState().running) {
            const frameDelta = lastFrameTimeRef.current > 0 ? timestamp - lastFrameTimeRef.current : 16;
            lastFrameTimeRef.current = timestamp;
            mgr.update();
            mgr.updateCurrentAnimation(frameDelta);

            // Capture scope data for all active scopes
            const scopes = useCircuitStore.getState().scopes;
            const components = useCircuitStore.getState().components;
            for (const scope of scopes) {
                for (const plot of scope.plots) {
                    const comp = components.find((c) => c.id === plot.componentId);
                    if (comp && comp.volts.length > 0) {
                        captureScopePoint(plot, comp.volts[0], plot.maxValues.length);
                    }
                }
            }

            useCircuitStore.getState().setTime(mgr.getTime());
        }

        // Sync hover state
        renderer.hoveredComponentId = handler?.state.mouseElm?.id ?? null;

        // Render
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderer.running = useCircuitStore.getState().running;
        renderFrameToCtx(ctx, canvas.width, canvas.height, renderer, handler);

        if (useCircuitStore.getState().running) {
            rafRef.current = requestAnimationFrame(renderFrame);
        }
    }, []);

    // Mouse events
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        // Close context menu on any mouse click
        setContextMenu(null);

        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        handler.onMouseDown(e.clientX - rect.left, e.clientY - rect.top, e.button, e.ctrlKey, e.altKey, e.shiftKey);
        canvas.focus();
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        handler.onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
    }, []);

    const handleMouseUp = useCallback(() => {
        interactionRef.current?.onMouseUp();
    }, []);

    // Window-level mouseup for safety
    useEffect(() => {
        const onUp = () => interactionRef.current?.onMouseUp();
        window.addEventListener('mouseup', onUp);
        return () => window.removeEventListener('mouseup', onUp);
    }, []);

    // Keyboard events
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
        // Undo/redo handling
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            setContextMenu(null);
            if (undoStackRef.current.canUndo()) {
                takeUndoSnapshot(); // Save current state for redo
                restoreFromUndo('undo');
            }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            setContextMenu(null);
            if (undoStackRef.current.canRedo()) {
                restoreFromUndo('redo');
            }
            return;
        }

        const handler = interactionRef.current;
        if (handler && handler.onKeyDown(e as unknown as KeyboardEvent)) {
            return;
        }
    }, [takeUndoSnapshot, restoreFromUndo]);

    const handleBlur = useCallback(() => {
        // Deselect everything in the interaction handler's hover state on blur
        // but don't clear component selections
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        // Let the InteractionHandler handle it via onMouseDown (button === 2)
    }, []);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        handler.onMouseWheel(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
    }, []);

    // Touch events
    const touchRef = useRef<{ x: number; y: number; dist: number } | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        setContextMenu(null);
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;

        if (e.touches.length === 1) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            touchRef.current = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
                dist: 0,
            };
            handler.onMouseDown(touch.clientX - rect.left, touch.clientY - rect.top, 0, false, false, false);
        } else if (e.touches.length === 2) {
            // Pinch start
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            touchRef.current = {
                x: (t1.clientX + t2.clientX) / 2,
                y: (t1.clientY + t2.clientY) / 2,
                dist: Math.sqrt(dx * dx + dy * dy),
            };
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        const handler = interactionRef.current;
        const canvas = canvasRef.current;
        if (!handler || !canvas) return;
        e.preventDefault();

        if (e.touches.length === 1 && touchRef.current) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            handler.onMouseMove(touch.clientX - rect.left, touch.clientY - rect.top);
        } else if (e.touches.length === 2 && touchRef.current) {
            // Pinch zoom
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scale = dist / touchRef.current.dist;
            if (Math.abs(scale - 1) > 0.05) {
                handler.zoom(scale, touchRef.current.x, touchRef.current.y);
            }
            touchRef.current.dist = dist;
        }
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        const handler = interactionRef.current;
        handler?.onMouseUp();

        // Double tap detection for edit
        if (e.changedTouches.length === 1 && touchRef.current) {
            const now = Date.now();
            const lastTap = (touchEndRef.current?.time ?? 0);
            const lastX = (touchEndRef.current?.x ?? 0);
            const lastY = (touchEndRef.current?.y ?? 0);
            const touch = e.changedTouches[0];
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const tx = touch.clientX - rect.left;
                const ty = touch.clientY - rect.top;
                const comp = handler?.state.mouseElm;
                if (now - lastTap < 300 && Math.abs(tx - lastX) < 30 && Math.abs(ty - lastY) < 30) {
                    if (comp) {
                        onEditComponent?.(comp);
                    }
                }
                touchEndRef.current = { x: tx, y: ty, time: now };
            }
        }
        touchRef.current = null;
    }, [onEditComponent]);

    const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null);

    // Start/stop animation
    useEffect(() => {
        if (running) {
            lastFrameTimeRef.current = 0;
            rafRef.current = requestAnimationFrame(renderFrame);
        } else {
            const canvas = canvasRef.current;
            const renderer = rendererRef.current;
            if (canvas && renderer) {
                renderer.hoveredComponentId = interactionRef.current?.state.mouseElm?.id ?? null;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    renderFrameToCtx(ctx, canvas.width, canvas.height, renderer, interactionRef.current);
                }
            }
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [running, renderFrame]);

    // Resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const parent = canvas.parentElement;
            if (!parent) return;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            setCanvasSize(canvas.width, canvas.height);
            const renderer = rendererRef.current;
            if (renderer) {
                const ctx = canvas.getContext('2d');
                if (ctx) renderer.render(ctx, canvas.width, canvas.height);
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    // Context menu action handler
    const handleContextAction = useCallback((action: string, componentId: number | null) => {
        interactionRef.current?.handleContextAction(action, componentId);
        setContextMenu(null);
    }, []);

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        // Use setTimeout to avoid the right-click event itself triggering close
        const id = setTimeout(() => {
            window.addEventListener('click', close, { once: true });
        }, 0);
        return () => {
            clearTimeout(id);
            window.removeEventListener('click', close);
        };
    }, [contextMenu]);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                tabIndex={0}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                onWheel={handleWheel}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    display: 'block', width: '100%', height: '100%',
                    cursor: 'crosshair', outline: 'none',
                }}
            />

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{
                        position: 'absolute',
                        left: contextMenu.x,
                        top: contextMenu.y,
                        width: MENU_WIDTH,
                        backgroundColor: '#2a2a2a',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        boxShadow: '2px 2px 8px rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        padding: '4px 0',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: '#FFF',
                        userSelect: 'none',
                    }}
                >
                    {contextMenu.items.map((item, i) => (
                        <div
                            key={i}
                            onClick={() => handleContextAction(item.action, contextMenu.componentId)}
                            style={{
                                padding: '4px 12px',
                                height: MENU_ITEM_HEIGHT,
                                lineHeight: `${MENU_ITEM_HEIGHT}px`,
                                cursor: item.enabled ? 'pointer' : 'default',
                                opacity: item.enabled ? 1 : 0.4,
                                backgroundColor: 'transparent',
                            }}
                            onMouseEnter={(e) => {
                                if (item.enabled) e.currentTarget.style.backgroundColor = '#444';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

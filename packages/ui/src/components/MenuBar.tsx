import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '../store/circuitStore.js';

// ─── Component category mapping ────────────────────────────────────────────
// Maps component register names to display labels and menu categories.
// Derived from the original Java menu structure.
interface ComponentEntry {
    label: string;
    name: string; // register name (e.g. "ResistorElm")
}

const PASSIVE_COMPONENTS: ComponentEntry[] = [
    { label: 'Resistor', name: 'ResistorElm' },
    { label: 'Capacitor', name: 'CapacitorElm' },
    { label: 'Polarized Capacitor', name: 'PolarCapacitorElm' },
    { label: 'Inductor', name: 'InductorElm' },
    { label: 'Potentiometer', name: 'PotElm' },
    { label: 'Lamp', name: 'LampElm' },
    { label: 'Memristor', name: 'MemristorElm' },
    { label: 'Thermistor', name: 'ThermistorNTCElm' },
    { label: 'LDR', name: 'LDRElm' },
    { label: 'LED', name: 'LEDElm' },
    { label: 'LED Array', name: 'LEDArrayElm' },
];

const SOURCE_COMPONENTS: ComponentEntry[] = [
    { label: 'DC Voltage', name: 'DCVoltageElm' },
    { label: 'AC Voltage', name: 'VoltageElm' },
    { label: 'Square Wave', name: 'SquareRailElm' },
    { label: 'Clock', name: 'ClockElm' },
    { label: 'Variable Voltage', name: 'RailElm' },
    { label: 'Current Source', name: 'CurrentElm' },
    { label: 'Sweep', name: 'SweepElm' },
    { label: 'Noise', name: 'NoiseElm' },
    { label: 'AM Source', name: 'AMElm' },
    { label: 'FM Source', name: 'FMElm' },
    { label: 'Antenna', name: 'AntennaElm' },
    { label: 'VCO', name: 'VCOElm' },
    { label: 'Seq Gen', name: 'SeqGenElm' },
    { label: 'Var. Rail', name: 'VarRailElm' },
    { label: 'Ground', name: 'GroundElm' },
];

const OUTPUT_COMPONENTS: ComponentEntry[] = [
    { label: 'Output', name: 'OutputElm' },
    { label: 'Probe', name: 'ProbeElm' },
    { label: 'Ammeter', name: 'AmmeterElm' },
    { label: 'Ohmmeter', name: 'OhmMeterElm' },
    { label: 'Test Point', name: 'TestPointElm' },
    { label: 'Data Recorder', name: 'DataRecorderElm' },
    { label: 'Audio Output', name: 'AudioOutputElm' },
    { label: 'Audio Input', name: 'AudioInputElm' },
    { label: 'Stop Trigger', name: 'StopTriggerElm' },
    { label: 'Text', name: 'TextElm' },
    { label: 'Labeled Node', name: 'LabeledNodeElm' },
    { label: 'Phase Comp', name: 'PhaseCompElm' },
];

const ANALOG_COMPONENTS: ComponentEntry[] = [
    { label: 'Diode', name: 'DiodeElm' },
    { label: 'Zener Diode', name: 'ZenerElm' },
    { label: 'Varactor', name: 'VaractorElm' },
    { label: 'Tunnel Diode', name: 'TunnelDiodeElm' },
    { label: 'NPN Transistor', name: 'NTransistorElm' },
    { label: 'PNP Transistor', name: 'PTransistorElm' },
    { label: 'NMOS', name: 'NMosfetElm' },
    { label: 'PMOS', name: 'PMosfetElm' },
    { label: 'N-JFET', name: 'NJfetElm' },
    { label: 'P-JFET', name: 'PJfetElm' },
    { label: 'Op Amp', name: 'OpAmpElm' },
    { label: 'SCR', name: 'SCRElm' },
    { label: 'CCCS', name: 'CCCSElm' },
    { label: 'CCVS', name: 'CCVSElm' },
    { label: 'VCCS', name: 'VCCSElm' },
    { label: 'VCVS', name: 'VCVSElm' },
];

const LOGIC_COMPONENTS: ComponentEntry[] = [
    { label: 'Logic Input', name: 'LogicInputElm' },
    { label: 'Logic Output', name: 'LogicOutputElm' },
    { label: 'AND Gate', name: 'AndGateElm' },
    { label: 'NAND Gate', name: 'NandGateElm' },
    { label: 'OR Gate', name: 'OrGateElm' },
    { label: 'NOR Gate', name: 'NorGateElm' },
    { label: 'XOR Gate', name: 'XorGateElm' },
    { label: 'Inverter', name: 'InverterElm' },
    { label: 'Schmitt Inverter', name: 'InvertingSchmittElm' },
    { label: 'Schmitt Trigger', name: 'SchmittElm' },
    { label: 'Analog Switch', name: 'AnalogSwitchElm' },
    { label: 'Analog Switch (2)', name: 'AnalogSwitch2Elm' },
    { label: 'TriState', name: 'TriStateElm' },
    { label: 'Latch', name: 'LatchElm' },
    { label: 'D Flip-Flop', name: 'DFlipFlopElm' },
    { label: 'JK Flip-Flop', name: 'JKFlipFlopElm' },
    { label: 'T Flip-Flop', name: 'TFlipFlopElm' },
    { label: 'Monostable', name: 'MonostableElm' },
    { label: 'Multiplexer', name: 'MultiplexerElm' },
    { label: 'Demultiplexer', name: 'DeMultiplexerElm' },
    { label: 'Half Adder', name: 'HalfAdderElm' },
    { label: 'Full Adder', name: 'FullAdderElm' },
];

const CHIP_COMPONENTS: ComponentEntry[] = [
    { label: 'Counter', name: 'CounterElm' },
    { label: 'Ring Counter', name: 'RingCounterElm' },
    { label: 'ADC', name: 'ADCElm' },
    { label: 'DAC', name: 'DACElm' },
    { label: '7-Segment', name: 'SevenSegElm' },
    { label: '7-Seg Decoder', name: 'SevenSegDecoderElm' },
    { label: 'SRAM', name: 'SRAMElm' },
    { label: 'PISO Shift', name: 'PisoShiftElm' },
    { label: 'SIPO Shift', name: 'SipoShiftElm' },
];

const TRANSFORMER_COMPONENTS: ComponentEntry[] = [
    { label: 'Transformer', name: 'TransformerElm' },
    { label: 'Tapped Transformer', name: 'TappedTransformerElm' },
    { label: 'Custom Transformer', name: 'CustomTransformerElm' },
    { label: 'Transmission Line', name: 'TransLineElm' },
    { label: 'Crystal', name: 'CrystalElm' },
    { label: 'Relay', name: 'RelayElm' },
    { label: 'Time Delay Relay', name: 'TimeDelayRelayElm' },
];

const ELECTROMECHANICAL_COMPONENTS: ComponentEntry[] = [
    { label: 'DC Motor', name: 'DCMotorElm' },
    { label: 'Fuse', name: 'FuseElm' },
    { label: 'Spark Gap', name: 'SparkGapElm' },
    { label: 'Switch', name: 'SwitchElm' },
    { label: 'SPDT Switch', name: 'Switch2Elm' },
    { label: 'Push Switch', name: 'MBBSwitchElm' },
    { label: 'Timer (555)', name: 'TimerElm' },
    { label: 'Box', name: 'BoxElm' },
    { label: 'Wire', name: 'WireElm' },
];

interface CategoryGroup {
    label: string;
    items: ComponentEntry[];
}

const DRAW_CATEGORIES: CategoryGroup[] = [
    { label: 'Passive', items: PASSIVE_COMPONENTS },
    { label: 'Sources', items: SOURCE_COMPONENTS },
    { label: 'Outputs', items: OUTPUT_COMPONENTS },
    { label: 'Analog ICs', items: ANALOG_COMPONENTS },
    { label: 'Logic Gates', items: LOGIC_COMPONENTS },
    { label: 'Chips', items: CHIP_COMPONENTS },
    { label: 'Transformers', items: TRANSFORMER_COMPONENTS },
    { label: 'Electromechanical', items: ELECTROMECHANICAL_COMPONENTS },
];

// ─── Menu item types ───────────────────────────────────────────────────────

interface MenuSeparator {
    type: 'separator';
}

interface MenuItemAction {
    type: 'action';
    label: string;
    action: () => void;
    disabled?: boolean;
    checked?: boolean;
}

interface SubMenu {
    type: 'submenu';
    label: string;
    items: (MenuItemAction | MenuSeparator | SubMenu)[];
}

type MenuItem = MenuItemAction | MenuSeparator | SubMenu;

interface MenuDef {
    label: string;
    items: MenuItem[];
}

// ─── Style constants ───────────────────────────────────────────────────────

const menuBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #333',
    userSelect: 'none',
    height: '30px',
};

const menuHeaderStyle: React.CSSProperties = {
    padding: '0 10px',
    height: '30px',
    lineHeight: '30px',
    color: '#CCC',
    fontFamily: 'monospace',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '180px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #555',
    borderRadius: '4px',
    boxShadow: '2px 2px 8px rgba(0,0,0,0.5)',
    zIndex: 2000,
    padding: '4px 0',
};

const dropdownItemStyle: React.CSSProperties = {
    padding: '4px 14px',
    color: '#FFF',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const shortcutStyle: React.CSSProperties = {
    color: '#666',
    marginLeft: '20px',
    fontSize: '11px',
};

const separatorStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: '#444',
    margin: '4px 8px',
};

const submenuArrowStyle: React.CSSProperties = {
    marginLeft: '16px',
    color: '#888',
};

const submenuContainerStyle: React.CSSProperties = {
    position: 'relative',
};

const submenuDropdownStyle: React.CSSProperties = {
    ...dropdownStyle,
    position: 'absolute',
    left: '100%',
    top: '-4px',
};

const controlBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: 'auto',
    padding: '0 10px',
};

const btnStyle: React.CSSProperties = {
    padding: '2px 10px',
    backgroundColor: '#333',
    color: '#FFF',
    border: '1px solid #555',
    borderRadius: '3px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: '11px',
    height: '22px',
};

const timeDisplayStyle: React.CSSProperties = {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: '11px',
    marginLeft: '8px',
};

// ─── MenuBar component ─────────────────────────────────────────────────────

export interface MenuBarProps {
    onAddComponentType?: (type: string | null) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onEditMenuAction?: (action: string) => void;
    onImportText?: () => void;
    onExportText?: () => void;
    onExportUrl?: () => void;
    onExportImage?: () => void;
    onNewCircuit?: () => void;
    onOpenFile?: () => void;
    onShowAbout?: () => void;
    onShowShortcuts?: () => void;
    onShowExamples?: () => void;
    onScopeAction?: (action: string) => void;
    running?: boolean;
    simLoaded?: boolean;
}

export function MenuBar({
    onAddComponentType,
    onUndo,
    onRedo,
    onEditMenuAction,
    onImportText,
    onExportText,
    onExportUrl,
    onExportImage,
    onNewCircuit,
    onOpenFile,
    onShowAbout,
    onShowShortcuts,
    onShowExamples,
    onScopeAction,
    running,
    simLoaded,
}: MenuBarProps) {
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const store = useCircuitStore();
    const canUndo = useCircuitStore((s) => s.canUndo);
    const canRedo = useCircuitStore((s) => s.canRedo);
    const showCurrent = useCircuitStore((s) => s.showCurrent);
    const showVoltageLabels = useCircuitStore((s) => s.showVoltageLabels);
    const showValues = useCircuitStore((s) => s.showValues);
    const smallGrid = useCircuitStore((s) => s.smallGrid);
    const euroResistors = useCircuitStore((s) => s.euroResistors);
    const showSliders = useCircuitStore((s) => s.showSliders);
    const time = useCircuitStore((s) => s.time);

    // Close dropdown on outside click
    useEffect(() => {
        if (!openMenu) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        // Delay to avoid the opening click itself
        const id = setTimeout(() => {
            window.addEventListener('click', close);
        }, 0);
        return () => {
            clearTimeout(id);
            window.removeEventListener('click', close);
        };
    }, [openMenu]);

    const toggleMenu = useCallback((label: string) => {
        setOpenMenu((prev) => (prev === label ? null : label));
    }, []);

    const closeMenu = useCallback(() => {
        setOpenMenu(null);
    }, []);

    const handleComponentSelect = useCallback((typeName: string) => {
        onAddComponentType?.(typeName);
        closeMenu();
    }, [onAddComponentType, closeMenu]);

    const handleAction = useCallback((action: string, fn?: () => void) => {
        return () => {
            fn?.();
            // Only close menu for single actions, not toggles
            if (action !== 'toggle') closeMenu();
        };
    }, [closeMenu]);

    function renderMenuItems(items: MenuItem[]): React.ReactNode[] {
        return items.map((item, i) => {
            if (item.type === 'separator') {
                return <div key={`sep-${i}`} style={separatorStyle} />;
            }
            if (item.type === 'submenu') {
                return (
                    <SubmenuItem key={`sub-${i}`} label={item.label} items={item.items} onSelect={handleComponentSelect} onAction={handleAction} />
                );
            }
            const actionItem = item as MenuItemAction;
            return (
                <div
                    key={`action-${i}`}
                    style={{
                        ...dropdownItemStyle,
                        opacity: actionItem.disabled ? 0.4 : 1,
                        cursor: actionItem.disabled ? 'default' : 'pointer',
                    }}
                    onClick={(e) => {
                        if (actionItem.disabled) return;
                        e.stopPropagation();
                        actionItem.action();
                    }}
                    onMouseEnter={(e) => {
                        if (!actionItem.disabled) e.currentTarget.style.backgroundColor = '#444';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <span>
                        {actionItem.checked !== undefined && (
                            <span style={{ width: '16px', display: 'inline-block', color: actionItem.checked ? '#4A4' : '#555' }}>
                                {actionItem.checked ? '✓' : ' '}
                            </span>
                        )}
                        {actionItem.checked !== undefined ? actionItem.label :
                            <span style={{ marginLeft: '16px' }}>{actionItem.label}</span>
                        }
                    </span>
                </div>
            );
        });
    }

    // ── Define menus ───────────────────────────────────────────────────────

    const fileMenuItems: MenuItem[] = [
        {
            type: 'action' as const, label: 'New Circuit', action: () => handleAction('new', onNewCircuit)()
                ?? onNewCircuit?.() ?? closeMenu(),
        },
        {
            type: 'action' as const, label: 'Open File...', action: () => handleAction('open', onOpenFile)()
                ?? onOpenFile?.() ?? closeMenu(),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Import From Text...', action: () => handleAction('import', onImportText)()
                ?? onImportText?.() ?? closeMenu(),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Examples...', action: () => handleAction('examples', onShowExamples)()
                ?? onShowExamples?.() ?? closeMenu(),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Export As Text...', action: () => handleAction('export-text', onExportText)()
                ?? onExportText?.() ?? closeMenu(),
        },
        {
            type: 'action' as const, label: 'Export As URL...', action: () => handleAction('export-url', onExportUrl)()
                ?? onExportUrl?.() ?? closeMenu(),
        },
        {
            type: 'action' as const, label: 'Export As Image...', action: () => handleAction('export-image', onExportImage)()
                ?? onExportImage?.() ?? closeMenu(),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'About', action: () => handleAction('about', onShowAbout)()
                ?? onShowAbout?.() ?? closeMenu(),
        },
    ];

    const editMenuItems: MenuItem[] = [
        {
            type: 'action' as const, label: 'Undo', action: () => onUndo?.() ?? closeMenu(),
            disabled: !canUndo,
        },
        {
            type: 'action' as const, label: 'Redo', action: () => onRedo?.() ?? closeMenu(),
            disabled: !canRedo,
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Cut', action: () => {
                onEditMenuAction?.('cut'); closeMenu();
            },
            disabled: !simLoaded,
        },
        {
            type: 'action' as const, label: 'Copy', action: () => {
                onEditMenuAction?.('copy'); closeMenu();
            },
            disabled: !simLoaded,
        },
        {
            type: 'action' as const, label: 'Paste', action: () => {
                onEditMenuAction?.('paste'); closeMenu();
            },
            disabled: !simLoaded,
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Select All', action: () => {
                onEditMenuAction?.('select_all'); closeMenu();
            },
            disabled: !simLoaded,
        },
        {
            type: 'action' as const, label: 'Delete', action: () => {
                onEditMenuAction?.('delete'); closeMenu();
            },
            disabled: !simLoaded,
        },
        {
            type: 'action' as const, label: 'Center Circuit', action: () => {
                store.autoCenter(); closeMenu();
            },
            disabled: !simLoaded,
        },
    ];

    const drawMenuItems: MenuItem[] = DRAW_CATEGORIES.map((cat) => ({
        type: 'submenu' as const,
        label: cat.label,
        items: cat.items.map((entry) => ({
            type: 'action' as const,
            label: entry.label,
            action: () => handleComponentSelect(entry.name),
        })),
    }));

    const scopeMenuItems: MenuItem[] = [
        {
            type: 'action' as const, label: 'Add Scope', action: () => {
                onScopeAction?.('add'); closeMenu();
            },
            disabled: !simLoaded,
        },
        {
            type: 'action' as const, label: 'Remove Scope', action: () => {
                onScopeAction?.('remove'); closeMenu();
            },
            disabled: !simLoaded,
        },
    ];

    const optionsMenuItems: MenuItem[] = [
        {
            type: 'action' as const, label: 'Show Current', checked: showCurrent,
            action: () => store.setShowCurrent(!showCurrent),
        },
        {
            type: 'action' as const, label: 'Show Voltage', checked: showVoltageLabels,
            action: () => store.setShowVoltageLabels(!showVoltageLabels),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Show Values', checked: showValues,
            action: () => store.setShowValues(!showValues),
        },
        {
            type: 'action' as const, label: 'Small Grid', checked: smallGrid,
            action: () => store.setSmallGrid(!smallGrid),
        },
        {
            type: 'action' as const, label: 'European Resistors', checked: euroResistors,
            action: () => store.setEuroResistors(!euroResistors),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Show Sliders', checked: showSliders,
            action: () => store.setShowSliders(!showSliders),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'Keyboard Shortcuts...', action: () => handleAction('shortcuts', onShowShortcuts)()
                ?? onShowShortcuts?.() ?? closeMenu(),
        },
    ];

    const helpMenuItems: MenuItem[] = [
        {
            type: 'action' as const, label: 'Keyboard Shortcuts...', action: () => handleAction('shortcuts', onShowShortcuts)()
                ?? onShowShortcuts?.() ?? closeMenu(),
        },
        { type: 'separator' as const },
        {
            type: 'action' as const, label: 'About', action: () => handleAction('about', onShowAbout)()
                ?? onShowAbout?.() ?? closeMenu(),
        },
    ];

    const menus: { label: string; items: MenuItem[] }[] = [
        { label: 'File', items: fileMenuItems },
        { label: 'Edit', items: editMenuItems },
        { label: 'Draw', items: drawMenuItems },
        { label: 'Scope', items: scopeMenuItems },
        { label: 'Options', items: optionsMenuItems },
        { label: 'Help', items: helpMenuItems },
    ];

    return (
        <div ref={menuRef} style={menuBarStyle}>
            {menus.map((menu) => (
                <div key={menu.label} style={{ position: 'relative' }}>
                    <div
                        style={{
                            ...menuHeaderStyle,
                            backgroundColor: openMenu === menu.label ? '#333' : 'transparent',
                        }}
                        onMouseEnter={() => {
                            // For submenu navigation when already open
                        }}
                        onClick={(e) => { e.stopPropagation(); toggleMenu(menu.label); }}
                    >
                        {menu.label}
                    </div>
                    {openMenu === menu.label && (
                        <div style={dropdownStyle}>
                            {renderMenuItems(menu.items)}
                        </div>
                    )}
                </div>
            ))}

            {/* Simulation controls */}
            <div style={controlBarStyle}>
                <button
                    onClick={() => {
                        const s = useCircuitStore.getState();
                        if (s.running) { s.simManager?.stop(); s.setRunning(false); }
                        else { s.simManager?.start(); s.setRunning(true); }
                    }}
                    style={btnStyle}
                    disabled={!simLoaded}
                >
                    {running ? '■ Stop' : '▶ Start'}
                </button>
                <button
                    onClick={() => {
                        const s = useCircuitStore.getState();
                        if (!s.simManager) return;
                        s.simManager.runSteps(100);
                        s.setTime(s.simManager.getTime());
                    }}
                    style={btnStyle}
                    disabled={!simLoaded || running}
                >
                    ⏭ Step
                </button>
                {simLoaded && (
                    <span style={timeDisplayStyle}>
                        t={time.toExponential(3)}s
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Submenu item (for nested menus) ───────────────────────────────────────

function SubmenuItem({
    label,
    items,
    onSelect,
    onAction,
}: {
    label: string;
    items: MenuItem[];
    onSelect: (name: string) => void;
    onAction: (action: string, fn?: () => void) => () => void;
}) {
    const [open, setOpen] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => {
            if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        setTimeout(() => window.addEventListener('click', close), 0);
        return () => window.removeEventListener('click', close);
    }, [open]);

    function renderSubItems(subitems: MenuItem[]): React.ReactNode[] {
        return subitems.map((item, i) => {
            if (item.type === 'separator') {
                return <div key={`ss-${i}`} style={separatorStyle} />;
            }
            if (item.type === 'submenu') {
                return (
                    <SubmenuItem key={`ss-${i}`} label={item.label} items={item.items} onSelect={onSelect} onAction={onAction} />
                );
            }
            const actionItem = item as MenuItemAction;
            return (
                <div
                    key={`ss-${i}`}
                    style={dropdownItemStyle}
                    onClick={(e) => {
                        e.stopPropagation();
                        actionItem.action();
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    {actionItem.label}
                </div>
            );
        });
    }

    return (
        <div ref={itemRef} style={submenuContainerStyle}>
            <div
                style={dropdownItemStyle}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#444'; setOpen(true); }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
            >
                <span style={{ marginLeft: '16px' }}>{label}</span>
                <span style={submenuArrowStyle}>▸</span>
            </div>
            {open && (
                <div style={submenuDropdownStyle}>
                    {renderSubItems(items)}
                </div>
            )}
        </div>
    );
}

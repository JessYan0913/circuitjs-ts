import React, { useCallback } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';
import { useCircuitStore } from '../store/circuitStore.js';

interface ComponentEntry {
    label: string;
    name: string;
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

// ─── Radix menu class helpers ─────────────────────────────────────────────

const itemClass =
    'relative flex cursor-pointer select-none items-center gap-2 rounded-none ' +
    'px-3.5 py-1 text-circuit-base text-foreground outline-none ' +
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-40 ' +
    'data-[highlighted]:bg-circuit-bg-hover font-mono';

const subTriggerClass =
    itemClass +
    ' data-[state=open]:bg-circuit-bg-hover';

const contentClass =
    'z-50 min-w-[180px] max-h-[70vh] overflow-y-auto rounded-md ' +
    'border border-circuit-border-light bg-circuit-bg-tertiary p-1 ' +
    'shadow-[2px_2px_8px_rgba(0,0,0,0.5)] font-mono';

// ─── Props ─────────────────────────────────────────────────────────────────

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

// ─── MenuBar ────────────────────────────────────────────────────────────────

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

    const handleComponentSelect = useCallback((typeName: string) => {
        onAddComponentType?.(typeName);
    }, [onAddComponentType]);

    // ── Render helpers ───────────────────────────────────────────────────────

    function renderComponentSubmenu(cat: CategoryGroup) {
        return (
            <DropdownMenu.Sub key={cat.label}>
                <DropdownMenu.SubTrigger className={subTriggerClass}>
                    {cat.label}
                    <ChevronRight className="ml-auto h-3 w-3 text-circuit-text-dim" />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                        className={contentClass}
                        sideOffset={4}
                        collisionPadding={10}
                    >
                        {cat.items.map((entry) => (
                            <DropdownMenu.Item
                                key={entry.name}
                                className={itemClass}
                                onSelect={() => handleComponentSelect(entry.name)}
                            >
                                {entry.label}
                            </DropdownMenu.Item>
                        ))}
                    </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
            </DropdownMenu.Sub>
        );
    }

    function renderItem(label: string, onClick: () => void, disabled = false) {
        return (
            <DropdownMenu.Item
                disabled={disabled}
                className={itemClass}
                onSelect={onClick}
            >
                {label}
            </DropdownMenu.Item>
        );
    }

    function renderCheckItem(label: string, checked: boolean, onToggle: () => void) {
        return (
            <DropdownMenu.CheckboxItem
                checked={checked}
                className={itemClass}
                onSelect={(e) => {
                    e.preventDefault();
                    onToggle();
                }}
            >
                <DropdownMenu.ItemIndicator>
                    <span className="w-4 text-center text-circuit-success">✓</span>
                </DropdownMenu.ItemIndicator>
                {!checked && <span className="w-4" />}
                {label}
            </DropdownMenu.CheckboxItem>
        );
    }

    // ── Menus ────────────────────────────────────────────────────────────────

    return (
        <div className="flex items-center bg-circuit-bg-secondary border-b border-circuit-border select-none h-menu font-mono">
            {/* File */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        File
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem('New Circuit', () => onNewCircuit?.())}
                        {renderItem('Open File...', () => onOpenFile?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('Import From Text...', () => onImportText?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('Examples...', () => onShowExamples?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('Export As Text...', () => onExportText?.())}
                        {renderItem('Export As URL...', () => onExportUrl?.())}
                        {renderItem('Export As Image...', () => onExportImage?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('About', () => onShowAbout?.())}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Edit */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        Edit
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem('Undo', () => onUndo?.(), !canUndo)}
                        {renderItem('Redo', () => onRedo?.(), !canRedo)}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('Cut', () => onEditMenuAction?.('cut'), !simLoaded)}
                        {renderItem('Copy', () => onEditMenuAction?.('copy'), !simLoaded)}
                        {renderItem('Paste', () => onEditMenuAction?.('paste'), !simLoaded)}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('Select All', () => onEditMenuAction?.('select_all'), !simLoaded)}
                        {renderItem('Delete', () => onEditMenuAction?.('delete'), !simLoaded)}
                        {renderItem('Center Circuit', () => store.autoCenter(), !simLoaded)}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Draw */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        Draw
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0} align="start">
                        {DRAW_CATEGORIES.map((cat) => renderComponentSubmenu(cat))}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Scope */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        Scope
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem('Add Scope', () => onScopeAction?.('add'), !simLoaded)}
                        {renderItem('Remove Scope', () => onScopeAction?.('remove'), !simLoaded)}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Options */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        Options
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderCheckItem('Show Current', showCurrent, () => store.setShowCurrent(!showCurrent))}
                        {renderCheckItem('Show Voltage', showVoltageLabels, () => store.setShowVoltageLabels(!showVoltageLabels))}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderCheckItem('Show Values', showValues, () => store.setShowValues(!showValues))}
                        {renderCheckItem('Small Grid', smallGrid, () => store.setSmallGrid(!smallGrid))}
                        {renderCheckItem('European Resistors', euroResistors, () => store.setEuroResistors(!euroResistors))}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderCheckItem('Show Sliders', showSliders, () => store.setShowSliders(!showSliders))}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('Keyboard Shortcuts...', () => onShowShortcuts?.())}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Help */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        Help
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem('Keyboard Shortcuts...', () => onShowShortcuts?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem('About', () => onShowAbout?.())}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Simulation controls */}
            <div className="flex items-center gap-1.5 ml-auto px-2.5">
                <button
                    onClick={() => {
                        const s = useCircuitStore.getState();
                        if (s.running) { s.simManager?.stop(); s.setRunning(false); }
                        else { s.simManager?.start(); s.setRunning(true); }
                    }}
                    disabled={!simLoaded}
                    className="px-2.5 py-0.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-sm h-[22px] disabled:opacity-40"
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
                    disabled={!simLoaded || running}
                    className="px-2.5 py-0.5 bg-circuit-bg-tertiary text-circuit-text border border-circuit-border-light rounded cursor-pointer font-mono text-circuit-sm h-[22px] disabled:opacity-40"
                >
                    {'⏭'} Step
                </button>
                {simLoaded && (
                    <span className="text-circuit-text-muted font-mono text-circuit-sm ml-2">
                        t={time.toExponential(3)}s
                    </span>
                )}
            </div>
        </div>
    );
}

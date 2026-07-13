import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight, Languages } from 'lucide-react';
import { useCircuitStore } from '../store/circuitStore.js';

interface ComponentEntry {
    labelKey: string;
    name: string;
}

const PASSIVE_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.Resistor', name: 'ResistorElm' },
    { labelKey: 'menu.components.Capacitor', name: 'CapacitorElm' },
    { labelKey: 'menu.components.Polarized Capacitor', name: 'PolarCapacitorElm' },
    { labelKey: 'menu.components.Inductor', name: 'InductorElm' },
    { labelKey: 'menu.components.Potentiometer', name: 'PotElm' },
    { labelKey: 'menu.components.Lamp', name: 'LampElm' },
    { labelKey: 'menu.components.Memristor', name: 'MemristorElm' },
    { labelKey: 'menu.components.Thermistor', name: 'ThermistorNTCElm' },
    { labelKey: 'menu.components.LDR', name: 'LDRElm' },
    { labelKey: 'menu.components.LED', name: 'LEDElm' },
    { labelKey: 'menu.components.LED Array', name: 'LEDArrayElm' },
];

const SOURCE_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.DC Voltage', name: 'DCVoltageElm' },
    { labelKey: 'menu.components.AC Voltage', name: 'VoltageElm' },
    { labelKey: 'menu.components.Square Wave', name: 'SquareRailElm' },
    { labelKey: 'menu.components.Clock', name: 'ClockElm' },
    { labelKey: 'menu.components.Variable Voltage', name: 'RailElm' },
    { labelKey: 'menu.components.Current Source', name: 'CurrentElm' },
    { labelKey: 'menu.components.Sweep', name: 'SweepElm' },
    { labelKey: 'menu.components.Noise', name: 'NoiseElm' },
    { labelKey: 'menu.components.AM Source', name: 'AMElm' },
    { labelKey: 'menu.components.FM Source', name: 'FMElm' },
    { labelKey: 'menu.components.Antenna', name: 'AntennaElm' },
    { labelKey: 'menu.components.VCO', name: 'VCOElm' },
    { labelKey: 'menu.components.Seq Gen', name: 'SeqGenElm' },
    { labelKey: 'menu.components.Var. Rail', name: 'VarRailElm' },
    { labelKey: 'menu.components.Ground', name: 'GroundElm' },
];

const OUTPUT_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.Output', name: 'OutputElm' },
    { labelKey: 'menu.components.Probe', name: 'ProbeElm' },
    { labelKey: 'menu.components.Ammeter', name: 'AmmeterElm' },
    { labelKey: 'menu.components.Ohmmeter', name: 'OhmMeterElm' },
    { labelKey: 'menu.components.Test Point', name: 'TestPointElm' },
    { labelKey: 'menu.components.Data Recorder', name: 'DataRecorderElm' },
    { labelKey: 'menu.components.Audio Output', name: 'AudioOutputElm' },
    { labelKey: 'menu.components.Audio Input', name: 'AudioInputElm' },
    { labelKey: 'menu.components.Stop Trigger', name: 'StopTriggerElm' },
    { labelKey: 'menu.components.Text', name: 'TextElm' },
    { labelKey: 'menu.components.Labeled Node', name: 'LabeledNodeElm' },
    { labelKey: 'menu.components.Phase Comp', name: 'PhaseCompElm' },
];

const ANALOG_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.Diode', name: 'DiodeElm' },
    { labelKey: 'menu.components.Zener Diode', name: 'ZenerElm' },
    { labelKey: 'menu.components.Varactor', name: 'VaractorElm' },
    { labelKey: 'menu.components.Tunnel Diode', name: 'TunnelDiodeElm' },
    { labelKey: 'menu.components.NPN Transistor', name: 'NTransistorElm' },
    { labelKey: 'menu.components.PNP Transistor', name: 'PTransistorElm' },
    { labelKey: 'menu.components.NMOS', name: 'NMosfetElm' },
    { labelKey: 'menu.components.PMOS', name: 'PMosfetElm' },
    { labelKey: 'menu.components.N-JFET', name: 'NJfetElm' },
    { labelKey: 'menu.components.P-JFET', name: 'PJfetElm' },
    { labelKey: 'menu.components.Op Amp', name: 'OpAmpElm' },
    { labelKey: 'menu.components.SCR', name: 'SCRElm' },
    { labelKey: 'menu.components.CCCS', name: 'CCCSElm' },
    { labelKey: 'menu.components.CCVS', name: 'CCVSElm' },
    { labelKey: 'menu.components.VCCS', name: 'VCCSElm' },
    { labelKey: 'menu.components.VCVS', name: 'VCVSElm' },
];

const LOGIC_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.Logic Input', name: 'LogicInputElm' },
    { labelKey: 'menu.components.Logic Output', name: 'LogicOutputElm' },
    { labelKey: 'menu.components.AND Gate', name: 'AndGateElm' },
    { labelKey: 'menu.components.NAND Gate', name: 'NandGateElm' },
    { labelKey: 'menu.components.OR Gate', name: 'OrGateElm' },
    { labelKey: 'menu.components.NOR Gate', name: 'NorGateElm' },
    { labelKey: 'menu.components.XOR Gate', name: 'XorGateElm' },
    { labelKey: 'menu.components.Inverter', name: 'InverterElm' },
    { labelKey: 'menu.components.Schmitt Inverter', name: 'InvertingSchmittElm' },
    { labelKey: 'menu.components.Schmitt Trigger', name: 'SchmittElm' },
    { labelKey: 'menu.components.Analog Switch', name: 'AnalogSwitchElm' },
    { labelKey: 'menu.components.Analog Switch (2)', name: 'AnalogSwitch2Elm' },
    { labelKey: 'menu.components.TriState', name: 'TriStateElm' },
    { labelKey: 'menu.components.Latch', name: 'LatchElm' },
    { labelKey: 'menu.components.D Flip-Flop', name: 'DFlipFlopElm' },
    { labelKey: 'menu.components.JK Flip-Flop', name: 'JKFlipFlopElm' },
    { labelKey: 'menu.components.T Flip-Flop', name: 'TFlipFlopElm' },
    { labelKey: 'menu.components.Monostable', name: 'MonostableElm' },
    { labelKey: 'menu.components.Multiplexer', name: 'MultiplexerElm' },
    { labelKey: 'menu.components.Demultiplexer', name: 'DeMultiplexerElm' },
    { labelKey: 'menu.components.Half Adder', name: 'HalfAdderElm' },
    { labelKey: 'menu.components.Full Adder', name: 'FullAdderElm' },
];

const CHIP_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.Counter', name: 'CounterElm' },
    { labelKey: 'menu.components.Ring Counter', name: 'RingCounterElm' },
    { labelKey: 'menu.components.ADC', name: 'ADCElm' },
    { labelKey: 'menu.components.DAC', name: 'DACElm' },
    { labelKey: 'menu.components.7-Segment', name: 'SevenSegElm' },
    { labelKey: 'menu.components.7-Seg Decoder', name: 'SevenSegDecoderElm' },
    { labelKey: 'menu.components.SRAM', name: 'SRAMElm' },
    { labelKey: 'menu.components.PISO Shift', name: 'PisoShiftElm' },
    { labelKey: 'menu.components.SIPO Shift', name: 'SipoShiftElm' },
];

const TRANSFORMER_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.Transformer', name: 'TransformerElm' },
    { labelKey: 'menu.components.Tapped Transformer', name: 'TappedTransformerElm' },
    { labelKey: 'menu.components.Custom Transformer', name: 'CustomTransformerElm' },
    { labelKey: 'menu.components.Transmission Line', name: 'TransLineElm' },
    { labelKey: 'menu.components.Crystal', name: 'CrystalElm' },
    { labelKey: 'menu.components.Relay', name: 'RelayElm' },
    { labelKey: 'menu.components.Time Delay Relay', name: 'TimeDelayRelayElm' },
];

const ELECTROMECHANICAL_COMPONENTS: ComponentEntry[] = [
    { labelKey: 'menu.components.DC Motor', name: 'DCMotorElm' },
    { labelKey: 'menu.components.Fuse', name: 'FuseElm' },
    { labelKey: 'menu.components.Spark Gap', name: 'SparkGapElm' },
    { labelKey: 'menu.components.Switch', name: 'SwitchElm' },
    { labelKey: 'menu.components.SPDT Switch', name: 'Switch2Elm' },
    { labelKey: 'menu.components.Push Switch', name: 'MBBSwitchElm' },
    { labelKey: 'menu.components.Timer (555)', name: 'TimerElm' },
    { labelKey: 'menu.components.Box', name: 'BoxElm' },
    { labelKey: 'menu.components.Wire', name: 'WireElm' },
];

interface CategoryGroup {
    labelKey: string;
    items: ComponentEntry[];
}

const DRAW_CATEGORIES: CategoryGroup[] = [
    { labelKey: 'menu.categories.passive', items: PASSIVE_COMPONENTS },
    { labelKey: 'menu.categories.sources', items: SOURCE_COMPONENTS },
    { labelKey: 'menu.categories.outputs', items: OUTPUT_COMPONENTS },
    { labelKey: 'menu.categories.analogIcs', items: ANALOG_COMPONENTS },
    { labelKey: 'menu.categories.logicGates', items: LOGIC_COMPONENTS },
    { labelKey: 'menu.categories.chips', items: CHIP_COMPONENTS },
    { labelKey: 'menu.categories.transformers', items: TRANSFORMER_COMPONENTS },
    { labelKey: 'menu.categories.electromechanical', items: ELECTROMECHANICAL_COMPONENTS },
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
    const { t, i18n } = useTranslation();
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
            <DropdownMenu.Sub key={cat.labelKey}>
                <DropdownMenu.SubTrigger className={subTriggerClass}>
                    {t(cat.labelKey)}
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
                                {t(entry.labelKey)}
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
                        {t('menu.file')}
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem(t('menu.items.newCircuit'), () => onNewCircuit?.())}
                        {renderItem(t('menu.items.openFile'), () => onOpenFile?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.importFromText'), () => onImportText?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.examples'), () => onShowExamples?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.exportAsText'), () => onExportText?.())}
                        {renderItem(t('menu.items.exportAsUrl'), () => onExportUrl?.())}
                        {renderItem(t('menu.items.exportAsImage'), () => onExportImage?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.about'), () => onShowAbout?.())}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Edit */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        {t('menu.edit')}
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem(t('menu.items.undo'), () => onUndo?.(), !canUndo)}
                        {renderItem(t('menu.items.redo'), () => onRedo?.(), !canRedo)}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.cut'), () => onEditMenuAction?.('cut'), !simLoaded)}
                        {renderItem(t('menu.items.copy'), () => onEditMenuAction?.('copy'), !simLoaded)}
                        {renderItem(t('menu.items.paste'), () => onEditMenuAction?.('paste'), !simLoaded)}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.selectAll'), () => onEditMenuAction?.('select_all'), !simLoaded)}
                        {renderItem(t('menu.items.delete'), () => onEditMenuAction?.('delete'), !simLoaded)}
                        {renderItem(t('menu.items.centerCircuit'), () => store.autoCenter(), !simLoaded)}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Draw */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        {t('menu.draw')}
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
                        {t('menu.scope')}
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem(t('menu.items.addScope'), () => onScopeAction?.('add'), !simLoaded)}
                        {renderItem(t('menu.items.removeScope'), () => onScopeAction?.('remove'), !simLoaded)}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Options */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        {t('menu.options')}
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderCheckItem(t('menu.items.showCurrent'), showCurrent, () => store.setShowCurrent(!showCurrent))}
                        {renderCheckItem(t('menu.items.showVoltage'), showVoltageLabels, () => store.setShowVoltageLabels(!showVoltageLabels))}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderCheckItem(t('menu.items.showValues'), showValues, () => store.setShowValues(!showValues))}
                        {renderCheckItem(t('menu.items.smallGrid'), smallGrid, () => store.setSmallGrid(!smallGrid))}
                        {renderCheckItem(t('menu.items.europeanResistors'), euroResistors, () => store.setEuroResistors(!euroResistors))}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderCheckItem(t('menu.items.showSliders'), showSliders, () => store.setShowSliders(!showSliders))}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.keyboardShortcuts'), () => onShowShortcuts?.())}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Help */}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button className="px-2.5 h-menu text-circuit-text-secondary text-circuit-lg cursor-pointer whitespace-nowrap font-mono hover:bg-circuit-bg-active data-[state=open]:bg-circuit-bg-active">
                        {t('menu.help')}
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content className={contentClass} sideOffset={0}>
                        {renderItem(t('menu.items.keyboardShortcuts'), () => onShowShortcuts?.())}
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        <DropdownMenu.Sub>
                            <DropdownMenu.SubTrigger className={subTriggerClass}>
                                {t('menu.language')}
                                <ChevronRight className="ml-auto h-3 w-3 text-circuit-text-dim" />
                            </DropdownMenu.SubTrigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.SubContent className={contentClass} sideOffset={4}>
                                    <DropdownMenu.Item
                                        className={itemClass}
                                        onSelect={() => i18n.changeLanguage('en')}
                                    >
                                        English {i18n.language?.startsWith('en') ? '✓' : ''}
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        className={itemClass}
                                        onSelect={() => i18n.changeLanguage('zh-CN')}
                                    >
                                        中文 {i18n.language?.startsWith('zh') ? '✓' : ''}
                                    </DropdownMenu.Item>
                                </DropdownMenu.SubContent>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Sub>
                        <DropdownMenu.Separator className="h-px bg-circuit-separator mx-2 my-1" />
                        {renderItem(t('menu.items.about'), () => onShowAbout?.())}
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
                    {running ? t('menu.items.stop') : t('menu.items.start')}
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
                    {t('menu.items.step')}
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

export * from './matrix/MNAMatrix.js';
export * from './matrix/LUSolver.js';
export * from './matrix/RowInfo.js';

export * from './circuit/SimulationManager.js';
export * from './circuit/Serializer.js';
export { StampContextImpl } from './circuit/StampContextImpl.js';
export type { StampContextImpl as StampContext } from './circuit/StampContextImpl.js';

export * from './components/base/CircuitComponent.js';
export * from './components/base/GraphicElm.js';
export * from './components/base/Polygon.js';
export * from './components/base/Point.js';
export * from './components/registry.js';

export * from './demo.js';

// Import components to register them
import './components/passive/ResistorComponent.js';
import './components/passive/CapacitorComponent.js';
import './components/passive/InductorComponent.js';
import './components/passive/WireComponent.js';
import './components/passive/OutputComponent.js';
import './components/sources/DCVoltageComponent.js';
import './components/sources/RailComponent.js';
import './components/sources/GroundComponent.js';
import './components/sources/CurrentComponent.js';
import './components/active/DiodeComponent.js';
import './components/active/TransistorComponent.js';
import './components/passive/SwitchComponent.js';
import './components/passive/PolarCapacitorComponent.js';
import './components/passive/Switch2Component.js';
import './components/passive/PushSwitchComponent.js';
import './components/passive/MBBSwitchComponent.js';
import './components/passive/FuseComponent.js';
import './components/passive/BoxComponent.js';
// Source components
import './components/sources/NoiseComponent.js';
import './components/sources/AntennaComponent.js';
import './components/sources/VarRailComponent.js';
import './components/sources/SweepComponent.js';
import './components/sources/AMComponent.js';
import './components/sources/FMComponent.js';
import './components/sources/VCOComponent.js';
import './components/sources/SeqGenComponent.js';
import './components/sources/TimerComponent.js';
// Semiconductor / active components (Module 4)
import './components/active/ZenerComponent.js';
import './components/active/TunnelDiodeComponent.js';
import './components/active/VaractorComponent.js';
import './components/active/MosfetComponent.js';
import './components/active/JfetComponent.js';
import './components/active/OpAmpComponent.js';
import './components/active/SCRComponent.js';
import './components/active/ControlledSources.js';

// Digital Logic (Module 5) — gates
import './components/gates/GateComponent.js';
import './components/gates/AndGateComponent.js';
import './components/gates/NandGateComponent.js';
import './components/gates/OrGateComponent.js';
import './components/gates/NorGateComponent.js';
import './components/gates/XorGateComponent.js';
import './components/gates/InverterComponent.js';
import './components/gates/SchmittComponent.js';
import './components/gates/InvertingSchmittComponent.js';
import './components/gates/LogicInputComponent.js';
import './components/gates/LogicOutputComponent.js';
import './components/gates/DFlipFlopComponent.js';
import './components/gates/JKFlipFlopComponent.js';
import './components/gates/TFlipFlopComponent.js';
import './components/gates/LatchComponent.js';
// Digital Logic (Module 5) — chips & switches
import './components/chips/MultiplexerComponent.js';
import './components/chips/DeMultiplexerComponent.js';
import './components/chips/CounterComponent.js';
import './components/chips/RingCounterComponent.js';
import './components/chips/FullAdderComponent.js';
import './components/chips/HalfAdderComponent.js';
import './components/chips/SevenSegComponent.js';
import './components/chips/SevenSegDecoderComponent.js';
import './components/chips/ADCComponent.js';
import './components/chips/DACComponent.js';
import './components/chips/SRAMComponent.js';
import './components/chips/PisoShiftComponent.js';
import './components/chips/SipoShiftComponent.js';
import './components/chips/MonostableComponent.js';
import './components/chips/AnalogSwitchComponent.js';
import './components/chips/AnalogSwitch2Component.js';
import './components/chips/TriStateComponent.js';

// Custom logic (Module 5.6)
import './components/composite/CustomLogicComponent.js';
import './components/composite/CustomCompositeComponent.js';
import './components/composite/CustomCompositeChipComponent.js';

// Transformers, transmission lines, electromechanical (Module 6)
import './components/electromechanical/LEDComponent.js';
import './components/electromechanical/LampComponent.js';
import './components/electromechanical/TransformerComponent.js';
import './components/electromechanical/TappedTransformerComponent.js';
import './components/electromechanical/CustomTransformerComponent.js';
import './components/electromechanical/TransLineComponent.js';
import './components/electromechanical/RelayComponent.js';
import './components/electromechanical/TimeDelayRelayComponent.js';
import './components/electromechanical/DCMotorComponent.js';
import './components/electromechanical/CrystalComponent.js';
import './components/electromechanical/LEDArrayComponent.js';
import './components/electromechanical/SparkGapComponent.js';

// Measurement & Display components (Module 7)
import './components/measurement/TextElm.js';
import './components/measurement/LabeledNodeElm.js';
import './components/measurement/ProbeElm.js';
import './components/measurement/AmmeterElm.js';
import './components/measurement/OhmMeterElm.js';
import './components/measurement/AudioOutputElm.js';
import './components/measurement/TestPointElm.js';
import './components/measurement/PhaseCompElm.js';
import './components/measurement/DataRecorderElm.js';
import './components/measurement/StopTriggerElm.js';
import './components/measurement/AudioInputElm.js';

// Sensors & Special Devices (Module 8)
import './components/passive/PotComponent.js';
import './components/passive/ThermistorComponent.js';
import './components/passive/LDRComponent.js';
import './components/passive/MemristorComponent.js';

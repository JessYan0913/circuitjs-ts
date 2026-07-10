// CircuitJS Next — Build Verification Script
// Run: node packages/core/dist/verify.js

import { LUSolver } from './matrix/LUSolver.js';
import { solveDivider } from './demo.js';
import { Serializer } from './circuit/Serializer.js';
import { SimulationManager } from './circuit/SimulationManager.js';

// Import to register components
import './components/passive/ResistorComponent.js';
import './components/passive/CapacitorComponent.js';
import './components/passive/InductorComponent.js';
import './components/passive/WireComponent.js';
import './components/sources/DCVoltageComponent.js';
import './components/sources/GroundComponent.js';
import './components/active/DiodeComponent.js';
import './components/active/TransistorComponent.js';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDir = resolve(__dirname, '../../../tests');

let passed = 0;
let total = 0;

function check(name: string, ok: boolean) {
    total++;
    if (ok) { passed++; console.log(`  ✓ ${name}`); }
    else { console.log(`  ✗ ${name}`); }
}

console.log('=== CircuitJS Next — Build Verification ===\n');

// 1. LU Solver
console.log('1. LU Solver');
const a = new Float64Array([2, 1, 1, 1]);
const ipvt = new Int32Array(2);
const b = new Float64Array([4, 3]);
LUSolver.factor(a, 2, ipvt);
LUSolver.solve(a, 2, ipvt, b);
check('2x2 system', Math.abs(b[0] - 1) < 1e-10 && Math.abs(b[1] - 2) < 1e-10);

// 2. Resistor Divider
console.log('\n2. Resistor Divider');
const r = solveDivider(1000, 2000, 5);
check('V1=5V', Math.abs(r.V1 - 5) < 1e-10);
check('V2=3.333V', Math.abs(r.V2 - 3.33333) < 0.001);

// 3. RC Circuit
console.log('\n3. RC Circuit');
const rcText = readFileSync(resolve(testDir, 'circuits/rc-circuit.txt'), 'utf-8');
const { components: rcComps } = Serializer.parseCircuit(rcText);
const sim = new SimulationManager();
sim.loadComponents(rcComps);
sim.config.maxTimeStep = 5e-6;
sim.analyzeCircuit();
check('analyze OK', sim.stopMessage === null);
sim.runSteps(2000);
check('transient advances', sim.getTime() > 0);
const v = sim.getAllNodeVoltages();
check('cap charging', Math.abs(v[1]) > 3); // |Vsrc terminal| > 3V after 1 tau

// 4. Diode Rectifier
console.log('\n4. Diode Rectifier');
const rectText = readFileSync(resolve(testDir, 'circuits/rectifier.txt'), 'utf-8');
const { components: dComps } = Serializer.parseCircuit(rectText);
const ds = new SimulationManager();
ds.loadComponents(dComps);
ds.config.maxTimeStep = 5e-6;
ds.analyzeCircuit();
check('diode circuit OK', ds.stopMessage === null);
ds.runSteps(2000);
const dv = ds.getAllNodeVoltages();
const hasRectification = dv.some((x, i) => i > 0 && Math.abs(x) > 1);
check('rectifier produces output', hasRectification);

// Summary
console.log(`\n=== ${passed}/${total} passed ===`);

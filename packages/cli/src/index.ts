#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { Serializer } from '@circuitjs/core';
import { SimulationManager } from '@circuitjs/core';

const program = new Command();

program
    .name('circuitjs')
    .description('CircuitJS Next — circuit simulator CLI')
    .version('0.1.0');

program
    .command('simulate')
    .description('Run simulation and print node voltages')
    .argument('<file>', 'path to circuit file')
    .option('-s, --steps <n>', 'simulation steps', parseInt)
    .option('-d, --duration <sec>', 'simulation duration (seconds)', parseFloat)
    .option('-o, --output <file>', 'output file')
    .action((file, options) => {
        const text = readFileSync(file, 'utf-8');
        const { header, components } = Serializer.parseCircuit(text);

        console.error(`Loaded ${components.length} components`);

        const sim = new SimulationManager();
        sim.loadComponents(components);
        sim.config.maxTimeStep = header.maxTimeStep;
        sim.config.voltageRange = header.voltageRange;

        sim.analyzeCircuit();

        if (sim.stopMessage) {
            console.error('Error:', sim.stopMessage);
            process.exit(1);
        }

        if (options.duration) {
            sim.runForDuration(options.duration);
        } else if (options.steps) {
            sim.runSteps(options.steps);
        }

        const voltages = sim.getAllNodeVoltages();
        const result = {
            time: sim.getTime(),
            timeStep: sim.getTimeStep(),
            nodeCount: sim.getNodeCount(),
            nodeVoltages: voltages,
        };

        const output = JSON.stringify(result, null, 2);
        if (options.output) {
            writeFileSync(options.output, output, 'utf-8');
        } else {
            console.log(output);
        }
    });

program
    .command('nodes')
    .description('List all circuit nodes')
    .argument('<file>', 'path to circuit file')
    .action((file) => {
        const text = readFileSync(file, 'utf-8');
        const { components } = Serializer.parseCircuit(text);
        console.log(`Components: ${components.length}`);
        for (const c of components) {
            console.log(`  ${c.constructor.name}`);
        }
    });

program.parse();

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';

import { SimulationManager } from '@circuitjs/core';
import { Serializer } from '@circuitjs/core';
import { CircuitComponent } from '@circuitjs/core';
import { getAllRegisteredNames } from '@circuitjs/core';

// ---- Circuit State ----

let sim: SimulationManager | null = null;
let currentCircuitText = '';

// ---- MCP Server ----

const server = new McpServer({
    name: 'circuitjs-mcp',
    version: '0.1.0',
}, {
    capabilities: {
        tools: {},
    },
});

// ---- Tool Implementations ----

server.tool(
    'load_circuit',
    'Load a circuit from its text representation. Accepts both the old text format and the XML format used by falstad.com.',
    {
        circuit: z.string().describe('The circuit text content (old text format or XML format)'),
    },
    async ({ circuit }) => {
        try {
            const parsed = Serializer.parseCircuit(circuit);
            if (parsed.components.length === 0) {
                return {
                    content: [{ type: 'text' as const, text: 'No components found in circuit data.' }],
                    isError: true,
                };
            }

            sim = new SimulationManager({
                maxTimeStep: parsed.header.maxTimeStep,
                minTimeStep: parsed.header.minTimeStep,
                voltageRange: parsed.header.voltageRange,
            });

            sim.loadComponents(parsed.components);
            currentCircuitText = circuit;

            const ok = sim.analyzeCircuit();
            if (!ok) {
                return {
                    content: [{ type: 'text' as const, text: `Circuit analysis failed: ${sim.stopMessage}` }],
                    isError: true,
                };
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: `Loaded ${parsed.components.length} components (${sim.getNodeCount()} nodes).${sim.circuitNonLinear ? ' Non-linear circuit detected.' : ''}`,
                }],
            };
        } catch (e) {
            return {
                content: [{ type: 'text' as const, text: `Error loading circuit: ${e instanceof Error ? e.message : String(e)}` }],
                isError: true,
            };
        }
    },
);

server.tool(
    'export_circuit',
    'Export the current circuit as text in the standard circuitjs format.',
    {},
    async () => {
        if (!sim || sim.components.length === 0) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        const text = Serializer.dumpCircuit(sim);
        return {
            content: [{ type: 'text' as const, text }],
        };
    },
);

server.tool(
    'start_simulation',
    'Start (or resume) the circuit simulation.',
    {},
    async () => {
        if (!sim) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        if (sim.isRunning()) {
            return {
                content: [{ type: 'text' as const, text: 'Simulation is already running.' }],
            };
        }
        sim.start();
        return {
            content: [{ type: 'text' as const, text: 'Simulation started.' }],
        };
    },
);

server.tool(
    'stop_simulation',
    'Stop the running circuit simulation.',
    {},
    async () => {
        if (!sim) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        if (!sim.isRunning()) {
            return {
                content: [{ type: 'text' as const, text: 'Simulation is not running.' }],
            };
        }
        sim.stop();
        return {
            content: [{ type: 'text' as const, text: 'Simulation stopped.' }],
        };
    },
);

server.tool(
    'step_simulation',
    'Run the simulation for a specified number of steps or duration.',
    {
        steps: z.number().int().min(1).optional().describe('Number of simulation steps to run'),
        duration: z.number().positive().optional().describe('Duration in seconds to simulate'),
    },
    async ({ steps, duration }) => {
        if (!sim) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        if (steps !== undefined && duration !== undefined) {
            return {
                content: [{ type: 'text' as const, text: 'Specify either steps or duration, not both.' }],
                isError: true,
            };
        }
        if (steps === undefined && duration === undefined) {
            return {
                content: [{ type: 'text' as const, text: 'Specify either steps or duration.' }],
                isError: true,
            };
        }

        try {
            if (duration !== undefined) {
                sim.runForDuration(duration);
            } else {
                sim.runSteps(steps!);
            }

            if (sim.stopMessage) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: `Simulation stopped: ${sim.stopMessage}. Time: ${sim.getTime().toExponential(3)}s`,
                    }],
                };
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: `Completed. Time: ${sim.getTime().toExponential(3)}s, steps: ${sim.timeStepCount}`,
                }],
            };
        } catch (e) {
            return {
                content: [{ type: 'text' as const, text: `Simulation error: ${e instanceof Error ? e.message : String(e)}` }],
                isError: true,
            };
        }
    },
);

server.tool(
    'get_voltage',
    'Query the voltage at a specific circuit node.',
    {
        node: z.number().int().min(0).describe('Node index (0 = ground)'),
    },
    async ({ node }) => {
        if (!sim) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        if (node < 0 || node >= sim.getNodeCount()) {
            return {
                content: [{
                    type: 'text' as const,
                    text: `Invalid node index ${node}. Valid range: 0..${sim.getNodeCount() - 1}`,
                }],
                isError: true,
            };
        }
        const v = sim.getNodeVoltage(node);
        return {
            content: [{ type: 'text' as const, text: `V(${node}) = ${v.toFixed(6)} V` }],
        };
    },
);

server.tool(
    'get_node_list',
    'List all circuit nodes with their current voltages.',
    {},
    async () => {
        if (!sim) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        const voltages = sim.getAllNodeVoltages();
        const lines = voltages.map((v, i) => `Node ${i}: ${v.toFixed(6)} V`).join('\n');
        return {
            content: [{ type: 'text' as const, text: lines || 'No nodes.' }],
        };
    },
);

server.tool(
    'list_components',
    'List all components in the current circuit with their type, position, and state.',
    {},
    async () => {
        if (!sim || sim.components.length === 0) {
            return {
                content: [{ type: 'text' as const, text: 'No circuit loaded.' }],
                isError: true,
            };
        }
        const lines = sim.components.map((c, i) => {
            const type = c.getDumpClass();
            const label = `${type} (#${c.id}) at (${c.x},${c.y})-(${c.x2},${c.y2})`;
            const vdiff = c.getVoltageDiff();
            const power = c.getPower();
            return `${i}: ${label} | Vdiff=${vdiff.toFixed(4)}V I=${c.current.toExponential(4)}A P=${power.toExponential(4)}W`;
        });
        return {
            content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
    },
);

// ---- Startup ----

async function main(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err: unknown) => {
    console.error('MCP Server error:', err);
    process.exit(1);
});

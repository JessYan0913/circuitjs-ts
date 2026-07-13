import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const circuitsDir = path.resolve(__dirname, '../circuits');

function circuitsServePlugin(): Plugin {
    return {
        name: 'circuits-serve',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url === '/setuplist.txt') {
                    const filePath = path.join(circuitsDir, 'setuplist.txt');
                    if (!fs.existsSync(filePath)) return next();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    fs.createReadStream(filePath).pipe(res);
                    return;
                }
                const m = req.url?.match(/^\/circuits\/([^?#]+)/);
                if (m) {
                    const filePath = path.join(circuitsDir, m[1]);
                    if (!fs.existsSync(filePath)) return next();
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    fs.createReadStream(filePath).pipe(res);
                    return;
                }
                next();
            });
        },
        generateBundle() {
            const setuplist = fs.readFileSync(path.join(circuitsDir, 'setuplist.txt'), 'utf-8');
            this.emitFile({ type: 'asset', fileName: 'setuplist.txt', source: setuplist });

            for (const file of fs.readdirSync(circuitsDir)) {
                if (file.endsWith('.txt') && file !== 'setuplist.txt') {
                    this.emitFile({
                        type: 'asset',
                        fileName: `circuits/${file}`,
                        source: fs.readFileSync(path.join(circuitsDir, file), 'utf-8'),
                    });
                }
            }
        },
    };
}

export default defineConfig({
    plugins: [react(), circuitsServePlugin()],
    server: { port: 3000, open: true },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@circuitjs/core': path.resolve(__dirname, '../core/src/index.ts'),
        },
        conditions: ['development', 'browser'],
    },
});

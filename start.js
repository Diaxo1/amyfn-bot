const { spawn } = require('child_process');
const path = require('path');

function startProcess(name, script) {
    const child = spawn(
        process.execPath,
        [path.join(__dirname, script)],
        {
            stdio: 'inherit',
            env: process.env
        }
    );

    child.on('exit', (code, signal) => {
        console.log(
            `${name} exited with code ${code ?? 'null'}${signal ? ` (signal ${signal})` : ''}`
        );
    });

    child.on('error', (error) => {
        console.error(`❌ Failed to start ${name}:`, error);
    });

    return child;
}

console.log('🚀 Starting Amyfn bot + dashboard...');

const botProcess = startProcess(
    'Amyfn bot',
    'index.js'
);

const dashboardProcess = startProcess(
    'Amyfn dashboard',
    path.join('dashboard', 'server.js')
);

function shutdown(signal) {
    console.log(`🛑 ${signal} received. Shutting down...`);

    botProcess.kill('SIGTERM');
    dashboardProcess.kill('SIGTERM');

    setTimeout(() => {
        botProcess.kill('SIGKILL');
        dashboardProcess.kill('SIGKILL');
        process.exit(0);
    }, 5000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
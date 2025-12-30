module.exports = {
    apps: [
        {
            name: 'api',
            script: '.output/server/index.mjs',
            instances: 'max',
            exec_mode: 'cluster',
            env_file: '.env',
            env: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'websocket',
            script: 'server/websocket/index.ts',
            instances: 1,
            interpreter: 'tsx',
            env_file: '.env',
            env: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'worker-deck-processor',
            script: 'server/workers/deck-processor.ts',
            instances: 1,
            interpreter: 'tsx',
            env_file: '.env',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};

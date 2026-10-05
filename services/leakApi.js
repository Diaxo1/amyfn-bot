const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.LEAK_API_PORT || 3000;
const API_KEY = process.env.LEAK_API_KEY;

const CACHE_PATH = '/data/leakCache.json';

function readLeakCache() {
    if (!fs.existsSync(CACHE_PATH)) {
        throw new Error(
            `Leak cache not found: ${CACHE_PATH}`
        );
    }

    const raw = fs.readFileSync(
        CACHE_PATH,
        'utf8'
    );

    const leaks = JSON.parse(raw);

    if (!Array.isArray(leaks)) {
        throw new Error(
            'leakCache.json does not contain an array.'
        );
    }

    return leaks;
}

const server = http.createServer(
    (req, res) => {

        // ------------------------------------------
        // HEALTH CHECK
        // ------------------------------------------

        if (
            req.method === 'GET' &&
            req.url === '/health'
        ) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(
                JSON.stringify({
                    success: true,
                    service: 'amyfn-leak-api'
                })
            );

            return;
        }

        // ------------------------------------------
        // LEAK API
        // ------------------------------------------

        if (
            req.method === 'GET' &&
            req.url === '/api/leaks'
        ) {

            if (!API_KEY) {
                res.writeHead(500, {
                    'Content-Type': 'application/json'
                });

                res.end(
                    JSON.stringify({
                        success: false,
                        error: 'LEAK_API_KEY is not configured.'
                    })
                );

                return;
            }

            const providedKey =
                req.headers['x-xaid-api-key'];

            if (
                !providedKey ||
                providedKey !== API_KEY
            ) {
                res.writeHead(401, {
                    'Content-Type': 'application/json'
                });

                res.end(
                    JSON.stringify({
                        success: false,
                        error: 'Unauthorized.'
                    })
                );

                return;
            }

            try {
                const leaks = readLeakCache();

                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store'
                });

                res.end(
                    JSON.stringify({
                        success: true,
                        count: leaks.length,
                        leaks
                    })
                );

            } catch (error) {

                console.error(
                    '❌ Leak API error:',
                    error
                );

                res.writeHead(500, {
                    'Content-Type': 'application/json'
                });

                res.end(
                    JSON.stringify({
                        success: false,
                        error: 'Could not read leak cache.'
                    })
                );
            }

            return;
        }

        // ------------------------------------------
        // NOT FOUND
        // ------------------------------------------

        res.writeHead(404, {
            'Content-Type': 'application/json'
        });

        res.end(
            JSON.stringify({
                success: false,
                error: 'Not found.'
            })
        );
    }
);

function startLeakApi() {
    server.listen(
        PORT,
        '0.0.0.0',
        () => {
            console.log(
                `🌐 Leak API running on port ${PORT}`
            );
        }
    );
}

module.exports = {
    startLeakApi
};
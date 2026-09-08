require('dotenv').config();

const API_URL = 'https://fortnite-api.com';

async function getPlayerStats(username, timeWindow = 'lifetime') {
    if (!process.env.FORTNITE_API_KEY) {
        throw new Error('FORTNITE_API_KEY is missing from .env');
    }

    const url =
        `${API_URL}/v2/stats/br/v2` +
        `?name=${encodeURIComponent(username)}` +
        `&timeWindow=${timeWindow}`;

    console.log(`📊 Fortnite player stats request: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: process.env.FORTNITE_API_KEY
            }
        });

        console.log(`📊 Fortnite Stats API status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                '❌ Fortnite Stats API response:',
                errorText
            );

            const error = new Error(
                `Fortnite Stats API error: ${response.status} ${response.statusText}`
            );

            error.status = response.status;

            throw error;
        }

        const result = await response.json();

        return result.data;

    } catch (error) {
        console.error(
            '❌ Fortnite player stats request failed:',
            error
        );

        throw error;
    }
}

async function getPlayerSeasonStats(username) {
    return await getPlayerStats(username, 'season');
}

async function getPlayerLifetimeStats(username) {
    return await getPlayerStats(username, 'lifetime');
}

module.exports = {
    getPlayerStats,
    getPlayerSeasonStats,
    getPlayerLifetimeStats
};
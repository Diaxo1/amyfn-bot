require('dotenv').config();

const API_URL = 'https://prod.api-fortnite.com';

async function seasonRequest(endpoint) {
    if (!process.env.FORTNITE_STATS_API_KEY) {
        throw new Error(
            'FORTNITE_STATS_API_KEY is missing from .env'
        );
    }

    const url = `${API_URL}${endpoint}`;

    console.log(`🌎 Fortnite Season API request: ${url}`);

    const response = await fetch(url, {
        headers: {
            'x-api-key': process.env.FORTNITE_STATS_API_KEY
        }
    });

    console.log(
        `🌎 Fortnite Season API status: ${response.status}`
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            '❌ Fortnite Season API response:',
            errorText
        );

        const error = new Error(
            `Fortnite Season API error: ${response.status} ${response.statusText}`
        );

        error.status = response.status;

        throw error;
    }

    return await response.json();
}

async function getCurrentSeason() {
    return await seasonRequest('/api/v1/season');
}

module.exports = {
    getCurrentSeason
};
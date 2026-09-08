require('dotenv').config();

const API_URL = 'https://fortnite-api.com';

async function apiRequest(endpoint) {
    const url = `${API_URL}${endpoint}`;

    console.log(`🌐 Fortnite API request: ${url}`);

    try {
        const response = await fetch(url);

        console.log(`📡 Fortnite API status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();

            console.error('❌ Fortnite API response:', errorText);

            throw new Error(
                `Fortnite API error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        return data.data;

    } catch (error) {
        console.error('❌ Fortnite API request failed:', error);
        throw error;
    }
}

async function getCosmeticById(id) {

    return await apiRequest(
        `/v2/cosmetics/br/${encodeURIComponent(id)}`
    );

}

async function searchCosmetics(name) {

    try {

        return await apiRequest(
            `/v2/cosmetics/br/search?name=${encodeURIComponent(name)}`
        );

    } catch (error) {

        if (error.message.includes('404')) {
            return null;
        }

        throw error;
    }
}

async function searchCosmeticsAll(name) {

    try {

        return await apiRequest(
            `/v2/cosmetics/br/search/all?language=en&searchLanguage=en&matchMethod=contains&name=${encodeURIComponent(name)}`
        );

    } catch (error) {

        if (error.message.includes('404')) {
            return [];
        }

        throw error;
    }
}

async function getShop() {

    return await apiRequest(
        '/v2/shop'
    );

}

async function getNewCosmetics() {

    return await apiRequest(
        '/v2/cosmetics/new'
    );

}

async function getNews() {

    return await apiRequest(
        '/v2/news'
    );

}

module.exports = {

    getCosmeticById,
    searchCosmetics,
    searchCosmeticsAll,
    getShop,
    getNewCosmetics,
    getNews

};
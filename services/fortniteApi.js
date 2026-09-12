require('dotenv').config();

const API_URL = 'https://fortnite-api.com';

// ==========================================
// COSMETIC CACHE
// ==========================================

let cosmeticsCache = null;
let cosmeticsCacheTime = 0;

const COSMETIC_CACHE_DURATION =
    6 * 60 * 60 * 1000; // 6 hours

let cosmeticsLoadingPromise = null;


// ==========================================
// API REQUEST
// ==========================================

async function apiRequest(endpoint) {

    const url = `${API_URL}${endpoint}`;

    console.log(`🌐 Fortnite API request: ${url}`);

    try {

        const response = await fetch(url);

        console.log(
            `📡 Fortnite API status: ${response.status}`
        );

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                '❌ Fortnite API response:',
                errorText
            );

            throw new Error(
                `Fortnite API error: ${response.status} ${response.statusText}`
            );
        }

        const data =
            await response.json();

        return data.data;

    } catch (error) {

        console.error(
            '❌ Fortnite API request failed:',
            error
        );

        throw error;
    }
}


// ==========================================
// LOAD ALL COSMETICS
// ==========================================

async function loadCosmetics() {

    const now = Date.now();

    // Cache is still valid
    if (
        cosmeticsCache &&
        now - cosmeticsCacheTime <
            COSMETIC_CACHE_DURATION
    ) {

        return cosmeticsCache;
    }


    // If another request is already loading
    // the database, wait for that request
    if (cosmeticsLoadingPromise) {

        return cosmeticsLoadingPromise;
    }


    console.log(
        '🎨 Loading Fortnite cosmetics into memory...'
    );


    cosmeticsLoadingPromise =
        (async () => {

            try {

                const cosmetics =
                    await apiRequest(
                        '/v2/cosmetics/br'
                    );

                cosmeticsCache =
                    Array.isArray(cosmetics)
                        ? cosmetics
                        : [];

                cosmeticsCacheTime =
                    Date.now();

                console.log(
                    `✅ Cosmetic cache loaded: ${cosmeticsCache.length} cosmetics`
                );

                return cosmeticsCache;

            } catch (error) {

                console.error(
                    '❌ Failed to load cosmetic cache:',
                    error
                );

                throw error;

            } finally {

                cosmeticsLoadingPromise =
                    null;
            }

        })();


    return cosmeticsLoadingPromise;
}


// ==========================================
// GET COSMETIC BY ID
// ==========================================

async function getCosmeticById(id) {

    if (!id) {
        return null;
    }

    const cosmetics =
        await loadCosmetics();

    const cosmetic =
        cosmetics.find(
            item =>
                item.id?.toLowerCase() ===
                id.toLowerCase()
        );

    if (cosmetic) {
        return cosmetic;
    }


    // Fallback to API if it isn't in cache
    return await apiRequest(
        `/v2/cosmetics/br/${encodeURIComponent(id)}`
    );
}


// ==========================================
// SEARCH COSMETICS
// ==========================================

async function searchCosmetics(name) {

    const query =
        String(name || '')
            .trim()
            .toLowerCase();

    if (!query) {
        return null;
    }

    const cosmetics =
        await loadCosmetics();


    // Exact match first
    const exact =
        cosmetics.find(
            cosmetic =>
                cosmetic.name
                    ?.toLowerCase() === query
        );

    if (exact) {
        return exact;
    }


    // Starts-with match
    const startsWith =
        cosmetics.find(
            cosmetic =>
                cosmetic.name
                    ?.toLowerCase()
                    .startsWith(query)
        );

    if (startsWith) {
        return startsWith;
    }


    // Contains match
    const contains =
        cosmetics.find(
            cosmetic =>
                cosmetic.name
                    ?.toLowerCase()
                    .includes(query)
        );

    return contains || null;
}


// ==========================================
// SEARCH ALL COSMETICS
// USED BY AUTOCOMPLETE
// ==========================================

async function searchCosmeticsAll(name) {

    const query =
        String(name || '')
            .trim()
            .toLowerCase();

    if (!query) {
        return [];
    }

    const cosmetics =
        await loadCosmetics();


    return cosmetics.filter(
        cosmetic =>
            cosmetic.name
                ?.toLowerCase()
                .includes(query)
    );
}


// ==========================================
// COSMETIC SUGGESTIONS
// ==========================================

async function searchCosmeticSuggestions(name) {

    return await searchCosmeticsAll(name);
}


// ==========================================
// SHOP
// ==========================================

async function getShop() {

    return await apiRequest(
        '/v2/shop'
    );
}


// ==========================================
// NEW COSMETICS
// ==========================================

async function getNewCosmetics() {

    return await apiRequest(
        '/v2/cosmetics/new'
    );
}


// ==========================================
// NEWS
// ==========================================

async function getNews() {

    return await apiRequest(
        '/v2/news'
    );
}


// ==========================================
// MANUAL CACHE REFRESH
// ==========================================

async function refreshCosmeticCache() {

    cosmeticsCache = null;
    cosmeticsCacheTime = 0;

    console.log(
        '🔄 Cosmetic cache cleared.'
    );

    return await loadCosmetics();
}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    getCosmeticById,

    searchCosmetics,

    searchCosmeticsAll,

    searchCosmeticSuggestions,

    getShop,

    getNewCosmetics,

    getNews,

    loadCosmetics,

    refreshCosmeticCache
};
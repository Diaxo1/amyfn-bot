const API_URL = 'https://fortnite-api.com';

let skinPool = null;
let skinPoolExpiresAt = 0;

const SKIN_CACHE_TTL = 6 * 60 * 60 * 1000;

function getHeaders() {
    const headers = {};

    if (process.env.FORTNITE_API_KEY) {
        headers.Authorization = process.env.FORTNITE_API_KEY;
    }

    return headers;
}

function findImageUrl(value) {
    if (!value || typeof value !== 'object') return null;

    const candidates = [
        value.images?.featured,
        value.images?.icon,
        value.images?.smallIcon,
        value.images?.small,
        value.images?.full_background,
        value.image,
        value.url
    ];

    return candidates.find(
        url => typeof url === 'string' && /^https?:\/\//i.test(url)
    ) || null;
}

function findCurrentSkinImage(data) {
    const candidates = [
        data?.account?.outfit,
        data?.account?.skin,
        data?.account?.currentSkin,
        data?.account?.currentOutfit,
        data?.outfit,
        data?.skin,
        data?.currentSkin,
        data?.currentOutfit
    ];

    for (const candidate of candidates) {
        const image = findImageUrl(candidate);
        if (image) return image;
    }

    return null;
}

async function loadSkinPool() {
    if (skinPool && Date.now() < skinPoolExpiresAt) {
        return skinPool;
    }

    const response = await fetch(`${API_URL}/v2/cosmetics/br`, {
        headers: getHeaders()
    });

    if (!response.ok) {
        throw new Error(`Fortnite cosmetics request failed: ${response.status}`);
    }

    const result = await response.json();
    const cosmetics = Array.isArray(result.data) ? result.data : [];

    // Only keep actual character/outfit cosmetics with usable artwork.
    skinPool = cosmetics
        .filter(cosmetic => {
            const type = String(
                cosmetic?.type?.value ||
                cosmetic?.type?.name ||
                cosmetic?.type ||
                ''
            ).toLowerCase();

            const backendType = String(cosmetic?.backendType || '').toLowerCase();

            return type === 'outfit' || backendType === 'athenacharacter';
        })
        .map(findImageUrl)
        .filter(Boolean);

    skinPoolExpiresAt = Date.now() + SKIN_CACHE_TTL;

    console.log(`Loaded ${skinPool.length} Fortnite outfit images.`);

    return skinPool;
}

async function getAccountSkinImage(seasonData, lifetimeData) {
    // If the stats provider ever gives us the player's actual equipped outfit,
    // use it automatically.
    const currentSkin =
        findCurrentSkinImage(seasonData) ||
        findCurrentSkinImage(lifetimeData);

    if (currentSkin) {
        console.log('Using player current Fortnite outfit.');
        return currentSkin;
    }

    // Otherwise use a random BR outfit from Fortnite-API.
    try {
        const pool = await loadSkinPool();

        if (pool.length) {
            const skin = pool[Math.floor(Math.random() * pool.length)];
            console.log('Using random Fortnite outfit fallback.');
            return skin;
        }
    } catch (error) {
        console.error('Could not load Fortnite skin pool:', error.message);
    }

    return null;
}

module.exports = {
    getAccountSkinImage
};

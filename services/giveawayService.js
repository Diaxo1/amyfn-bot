const fs = require('fs');
const path = require('path');

const DATA_FOLDER = path.join(__dirname, '..', 'data');
const GIVEAWAY_FILE = path.join(DATA_FOLDER, 'giveaways.json');

function ensureDataFolder() {
    if (!fs.existsSync(DATA_FOLDER)) {
        fs.mkdirSync(DATA_FOLDER, { recursive: true });
    }

    if (!fs.existsSync(GIVEAWAY_FILE)) {
        fs.writeFileSync(GIVEAWAY_FILE, '{}', 'utf8');
    }
}

function loadGiveaways() {
    ensureDataFolder();

    try {
        const data = fs.readFileSync(GIVEAWAY_FILE, 'utf8');

        if (!data.trim()) {
            return {};
        }

        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Failed to load giveaways:', error);
        return {};
    }
}

function saveGiveaways(giveaways) {
    ensureDataFolder();

    fs.writeFileSync(
        GIVEAWAY_FILE,
        JSON.stringify(giveaways, null, 2),
        'utf8'
    );
}

function createGiveaway(giveaway) {
    const giveaways = loadGiveaways();

    giveaways[giveaway.id] = giveaway;

    saveGiveaways(giveaways);

    return giveaway;
}

function getGiveaway(id) {
    const giveaways = loadGiveaways();

    return giveaways[id] || null;
}

function getAllGiveaways() {
    return loadGiveaways();
}

function updateGiveaway(id, updates) {
    const giveaways = loadGiveaways();

    if (!giveaways[id]) {
        return null;
    }

    giveaways[id] = {
        ...giveaways[id],
        ...updates
    };

    saveGiveaways(giveaways);

    return giveaways[id];
}

function deleteGiveaway(id) {
    const giveaways = loadGiveaways();

    delete giveaways[id];

    saveGiveaways(giveaways);
}

function addEntry(id, userId) {
    const giveaways = loadGiveaways();

    if (!giveaways[id]) {
        return null;
    }

    if (!giveaways[id].entries.includes(userId)) {
        giveaways[id].entries.push(userId);

        saveGiveaways(giveaways);
    }

    return giveaways[id];
}

function removeEntry(id, userId) {
    const giveaways = loadGiveaways();

    if (!giveaways[id]) {
        return null;
    }

    giveaways[id].entries =
        giveaways[id].entries.filter(
            entry => entry !== userId
        );

    saveGiveaways(giveaways);

    return giveaways[id];
}

function getActiveGiveawayForGuild(guildId) {
    const giveaways = loadGiveaways();

    return Object.values(giveaways).find(
        giveaway =>
            giveaway.guildId === guildId &&
            giveaway.status === 'active'
    ) || null;
}

function getLatestEndedGiveawayForGuild(guildId) {
    const giveaways = loadGiveaways();

    return Object.values(giveaways)
        .filter(
            giveaway =>
                giveaway.guildId === guildId &&
                giveaway.status === 'ended'
        )
        .sort(
            (a, b) =>
                (b.endedAt || b.endsAt || b.startedAt || 0) -
                (a.endedAt || a.endsAt || a.startedAt || 0)
        )[0] || null;
}

function getExpiredGiveaways() {
    const giveaways = loadGiveaways();

    return Object.values(giveaways).filter(
        giveaway =>
            giveaway.status === 'active' &&
            Date.now() >= giveaway.endsAt
    );
}

module.exports = {
    createGiveaway,
    getGiveaway,
    getAllGiveaways,
    updateGiveaway,
    deleteGiveaway,
    addEntry,
    removeEntry,
    getActiveGiveawayForGuild,
    getLatestEndedGiveawayForGuild,
    getExpiredGiveaways
};
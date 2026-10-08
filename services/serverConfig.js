const fs = require('fs');
const path = require('path');

const dataFolder = path.join(
    __dirname,
    '..',
    'data'
);

const configFile = path.join(
    dataFolder,
    'serverConfigs.json'
);

// ==========================================
// ENSURE DATA FOLDER
// ==========================================

function ensureDataFolder() {

    if (!fs.existsSync(dataFolder)) {

        fs.mkdirSync(
            dataFolder,
            {
                recursive: true
            }
        );

    }

}

// ==========================================
// LOAD CONFIGS
// ==========================================

function loadConfigs() {

    ensureDataFolder();

    if (!fs.existsSync(configFile)) {

        fs.writeFileSync(
            configFile,
            '{}',
            'utf8'
        );

    }

    try {

        return JSON.parse(
            fs.readFileSync(
                configFile,
                'utf8'
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to load server configs:',
            error
        );

        return {};

    }

}

// ==========================================
// SAVE CONFIGS
// ==========================================

function saveConfigs(configs) {

    ensureDataFolder();

    fs.writeFileSync(
        configFile,
        JSON.stringify(
            configs,
            null,
            2
        ),
        'utf8'
    );

}

// ==========================================
// SET SERVER CONFIG
// ==========================================

function setServerConfig(
    guildId,
    config
) {

    const configs =
        loadConfigs();

    const existing =
        configs[guildId] || {};

    configs[guildId] = {

        // ==================================
        // SHOP
        // ==================================

        channelId:
            config.channelId ??
            existing.channelId ??
            null,

        roleId:
            config.roleId ??
            existing.roleId ??
            null,

        // ==================================
        // NEWS + LEAKS
        // ==================================

        updatesChannelId:
            config.updatesChannelId ??
            existing.updatesChannelId ??
            existing.newsChannelId ??
            existing.leaksChannelId ??
            null,

        updatesRoleId:
            config.updatesRoleId ??
            existing.updatesRoleId ??
            existing.newsRoleId ??
            existing.leaksRoleId ??
            null,

        // ==================================
        // LOGGING
        // ==================================

        logsChannelId:
            config.logsChannelId ??
            existing.logsChannelId ??
            null,

    };

    saveConfigs(configs);

}

// ==========================================
// GET SERVER CONFIG
// ==========================================

function getServerConfig(
    guildId
) {

    const configs =
        loadConfigs();

    return configs[guildId] || null;

}

// ==========================================
// GET ALL SERVER CONFIGS
// ==========================================

function getAllServerConfigs() {

    return loadConfigs();

}

// ==========================================
// REMOVE SERVER CONFIG
// ==========================================

function removeServerConfig(
    guildId
) {

    const configs =
        loadConfigs();

    delete configs[guildId];

    saveConfigs(configs);

}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    setServerConfig,
    getServerConfig,
    getAllServerConfigs,
    removeServerConfig
};
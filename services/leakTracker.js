const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const {
    EmbedBuilder
} = require('discord.js');

const {
    getServerConfig,
    getAllServerConfigs
} = require('./serverConfig');

const BRIDGE_PATH = path.join(
    __dirname,
    '..',
    'leak_bridge.py'
);


// ==========================================
// PERSISTENT DATA STORAGE
// ==========================================

const persistentDataFolder = '/data';

const localDataFolder = path.join(
    __dirname,
    '..',
    'data'
);

const dataFolder = fs.existsSync(
    persistentDataFolder
)
    ? persistentDataFolder
    : localDataFolder;

const SNAPSHOT_PATH = path.join(
    dataFolder,
    'leakSnapshot.json'
);

const LEAK_CACHE_PATH = path.join(
    dataFolder,
    'leakCache.json'
);

const OLD_SNAPSHOT_PATH = path.join(
    localDataFolder,
    'leakSnapshot.json'
);

const CHECK_INTERVAL = 60 * 1000;

// Only one leak role ping every 10 minutes globally.
// Leak detection and posting continue normally during the cooldown.
const LEAK_PING_COOLDOWN = 10 * 60 * 1000;
let lastLeakPingAt = 0;


// ==========================================
// DATA FOLDER
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
// MIGRATE OLD SNAPSHOT
// ==========================================

function migrateSnapshot() {

    ensureDataFolder();

    if (
        dataFolder === persistentDataFolder &&
        !fs.existsSync(SNAPSHOT_PATH) &&
        fs.existsSync(OLD_SNAPSHOT_PATH)
    ) {

        try {

            fs.copyFileSync(
                OLD_SNAPSHOT_PATH,
                SNAPSHOT_PATH
            );

            console.log(
                '📦 Migrated leak snapshot to persistent storage.'
            );

        } catch (error) {

            console.error(
                '❌ Failed to migrate leak snapshot:',
                error
            );

        }

    }

}


// ==========================================
// LOAD SNAPSHOT
// ==========================================

function loadSnapshot() {

    migrateSnapshot();

    if (!fs.existsSync(SNAPSHOT_PATH)) {

        return {};

    }

    try {

        return JSON.parse(
            fs.readFileSync(
                SNAPSHOT_PATH,
                'utf8'
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to load leak snapshot:',
            error
        );

        return {};

    }

}


// ==========================================
// SAVE SNAPSHOT
// ==========================================

function saveSnapshot(snapshot) {

    ensureDataFolder();

    try {

        fs.writeFileSync(
            SNAPSHOT_PATH,
            JSON.stringify(
                snapshot,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to save leak snapshot:',
            error
        );

    }

}

// ==========================================
// SAVE LEAK CACHE
// ==========================================

function saveLeakCache(tweets) {

    ensureDataFolder();

    try {

        fs.writeFileSync(
            LEAK_CACHE_PATH,
            JSON.stringify(
                tweets,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to save leak cache:',
            error
        );

    }

}

// ==========================================
// GET CACHED LEAKS
// ==========================================

function getCachedLeaks() {

    if (!fs.existsSync(LEAK_CACHE_PATH)) {
        return [];
    }

    try {

        const leaks =
            JSON.parse(
                fs.readFileSync(
                    LEAK_CACHE_PATH,
                    'utf8'
                )
            );

        return Array.isArray(leaks)
            ? leaks
            : [];

    } catch (error) {

        console.error(
            '❌ Failed to load leak cache:',
            error
        );

        return [];

    }

}

// ==========================================
// PYTHON BRIDGE
// ==========================================

function runPythonBridge(manual = false) {

    return new Promise(
        (resolve, reject) => {

            const pythonCommand =
                process.platform === 'win32'
                    ? 'python'
                    : 'python3';

            const python =
                spawn(
                    pythonCommand,
                    [
    BRIDGE_PATH,
    ...(manual ? ['manual'] : [])
],
                    {
                        windowsHide: true
                    }
                );

            let stdout = '';
            let stderr = '';

            python.stdout.on(
                'data',
                data => {

                    stdout +=
                        data.toString();

                }
            );

            python.stderr.on(
                'data',
                data => {

                    stderr +=
                        data.toString();

                }
            );

            python.on(
                'error',
                error => {

                    reject(error);

                }
            );

            python.on(
                'close',
                code => {

                    if (stderr.trim()) {

                        console.log(
                            '🐍 Leak bridge stderr:',
                            stderr.trim()
                        );

                    }

                    if (code !== 0) {

                        reject(
                            new Error(
                                stderr ||
                                `Python exited with code ${code}`
                            )
                        );

                        return;

                    }

                    try {

                        const tweets =
                            JSON.parse(
                                stdout
                            );

                        resolve(tweets);

                    } catch (error) {

                        console.error(
                            '❌ Python bridge output:',
                            stdout
                        );

                        reject(error);

                    }

                }
            );

        }
    );

}


// ==========================================
// CREATE LEAK EMBED
// ==========================================

function createLeakEmbed(tweet) {

    const embed =
        new EmbedBuilder()

            .setColor(0x1493ff)

            .setAuthor({
                name:
                    `${tweet.displayName} (@${tweet.username})`,
                url:
                    tweet.url
            })

            .setTitle(
                'Fortnite Leak'
            )

            .setDescription(
                tweet.text ||
                '*No tweet text*'
            )

            .setURL(
                tweet.url
            )

            .setFooter({
                text:
                    'AMYFN • FORTNITE LEAK TRACKER'
            })

            .setTimestamp(
                new Date(
                    tweet.date
                )
            );

    if (
        tweet.images &&
        tweet.images.length > 0
    ) {

        embed.setImage(
            tweet.images[0]
        );

    }

    return embed;

}


// ==========================================
// SEND LEAK TO ONE GUILD
// ==========================================

async function sendLeakToGuild(
    client,
    guildId,
    tweet,
    pingRole = true
) {

    const config =
        getServerConfig(
            guildId
        );

    if (
        !config ||
        !config.updatesChannelId
    ) {

        return false;

    }

    try {

        const channel =
            await client.channels.fetch(
                config.updatesChannelId
            );

        if (
            !channel ||
            !channel.isTextBased()
        ) {

            return false;

        }

        const roleMention =
            pingRole &&
            config.updatesRoleId
                ? `<@&${config.updatesRoleId}>`
                : undefined;

        const videoUrl =
            tweet.videos &&
            tweet.videos.length > 0
                ? tweet.videos[0]
                : undefined;

        const contentParts = [];

        if (roleMention) {

            contentParts.push(
                roleMention
            );

        }

        if (videoUrl) {

            contentParts.push(
                videoUrl
            );

        }

        await channel.send({

            content:
                contentParts.length > 0
                    ? contentParts.join('\n')
                    : undefined,

            embeds: [
                createLeakEmbed(
                    tweet
                )
            ],

            allowedMentions:
                config.updatesRoleId

                    ? {
                        roles: [
                            config.updatesRoleId
                        ]
                    }

                    : {
                        roles: []
                    }

        });

        return true;

    } catch (error) {

        console.error(
            `❌ Failed to send leak to guild ${guildId}:`,
            error
        );

        return false;

    }

}


// ==========================================
// ANNOUNCE LEAK TO ALL SERVERS
// ==========================================

async function announceLeak(
    client,
    tweet
) {

    const configs =
        getAllServerConfigs();

    // The scraper still detects and sends every leak.
    // This only controls whether the configured role gets pinged.
    const now = Date.now();
    const shouldPing = now - lastLeakPingAt >= LEAK_PING_COOLDOWN;

    if (shouldPing) {
        lastLeakPingAt = now;
    }

    for (
        const guildId of Object.keys(
            configs
        )
    ) {

        try {

            await sendLeakToGuild(
                client,
                guildId,
                tweet,
                shouldPing
            );

        } catch (error) {

            console.error(
                `❌ Leak send failed (${guildId}):`,
                error
            );

        }

    }

}


// ==========================================
// CHECK FOR LEAKS
// ==========================================

async function checkForLeaks(
    client
) {

    try {

        console.log(
            '🕵️ Checking Fortnite leaks...'
        );

        const tweets =
            await runPythonBridge();

        if (
            !Array.isArray(tweets)
        ) {

            console.error(
                '❌ Leak bridge did not return an array.'
            );

            return;

        }

        const snapshot =
            loadSnapshot();
        
        saveLeakCache(tweets);    

        console.log(
            '🧪 Leak debug latest tweets:',
            tweets.slice(0, 10).map(tweet => ({
                id: tweet.id,
                username: tweet.username,
                date: tweet.date,
                seen: !!snapshot[tweet.id]
            }))
        );

        // ==================================
        // FIRST RUN
        // ==================================

        if (
            !snapshot.initialized
        ) {

            tweets.forEach(
                tweet => {

                    snapshot[
                        tweet.id
                    ] = true;

                }
            );

            snapshot.initialized =
                true;

            saveSnapshot(
                snapshot
            );

            console.log(
                `📸 Leak baseline saved (${tweets.length} tweets).`
            );

            return;

        }

        // ==================================
        // FIND NEW LEAKS
        // ==================================

        const newTweets =
            tweets

                .filter(
                    tweet =>
                        !snapshot[
                            tweet.id
                        ]
                )

                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );

        if (
            newTweets.length === 0
        ) {

            console.log(
                '🕵️ No new leaks.'
            );

            return;

        }

        console.log(
            `🚨 Found ${newTweets.length} new leak(s)!`
        );

        // ==================================
        // SEND NEW LEAKS
        // ==================================

        for (
            const tweet of newTweets
        ) {

            await announceLeak(
                client,
                tweet
            );

            snapshot[
                tweet.id
            ] = true;

        }

        // ==================================
        // LIMIT SNAPSHOT
        // ==================================

        const ids =
            Object.keys(
                snapshot
            )

                .filter(
                    id =>
                        id !== 'initialized'
                )

                .slice(-500);

        const cleanedSnapshot = {
            initialized: true
        };

        ids.forEach(
            id => {

                cleanedSnapshot[
                    id
                ] = true;

            }
        );

        saveSnapshot(
            cleanedSnapshot
        );

    } catch (error) {

        console.error(
            '❌ Leak tracker error:',
            error
        );

    }

}


// ==========================================
// START LEAK TRACKER
// ==========================================

function startLeakTracker(
    client
) {

    console.log(
        '🕵️ Starting Fortnite leak tracker...'
    );

    checkForLeaks(
        client
    );

    setInterval(
        () =>
            checkForLeaks(
                client
            ),
        CHECK_INTERVAL
    );

}


// ==========================================
// GET LATEST LEAKS
// ==========================================

async function getLatestLeaks() {

    return await runPythonBridge(true);

}

// ==========================================
// GET LEAK TRACKER STATUS
// ==========================================

function getLeakStatus() {

    const snapshot =
        loadSnapshot();

    const tracked =
        Object.keys(
            snapshot
        )

            .filter(
                id =>
                    id !== 'initialized'
            )

            .length;

    return {

        active:
            true,

        interval:
            60,

        lastCheck:
            null,

        tracked

    };

}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    startLeakTracker,

    getLatestLeaks,

    getCachedLeaks,

    getLeakStatus,

    createLeakEmbed,

    sendLeakToGuild

};
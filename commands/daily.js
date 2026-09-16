const fs = require('fs');
const path = require('path');

const {
    AttachmentBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getShop
} = require('./fortniteApi');

const {
    getAllServerConfigs
} = require('./serverConfig');

const {
    createEmbed
} = require('./embedStyle');

const {
    downloadImage
} = require('./dailyShopImage');


/*
==================================================
DATA STORAGE
==================================================
*/

// Railway persistent volume is mounted here.
// Local development falls back to ./data.
const persistentDataFolder = '/data';

const localDataFolder = path.join(
    __dirname,
    '..',
    'data'
);

const dataFolder =
    fs.existsSync(persistentDataFolder)
        ? persistentDataFolder
        : localDataFolder;

const snapshotFile = path.join(
    dataFolder,
    'shopSnapshot.json'
);

const dailyResultFile = path.join(
    dataFolder,
    'dailyResult.json'
);

const oldSnapshotFile = path.join(
    localDataFolder,
    'shopSnapshot.json'
);

const oldDailyResultFile = path.join(
    localDataFolder,
    'dailyResult.json'
);

let checking = false;


/*
==================================================
DATA FOLDER
==================================================
*/

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


/*
==================================================
MIGRATE OLD LOCAL DATA
==================================================
*/

function migrateFile(
    source,
    destination,
    label
) {
    if (
        source === destination ||
        fs.existsSync(destination) ||
        !fs.existsSync(source)
    ) {
        return;
    }

    try {
        fs.copyFileSync(
            source,
            destination
        );

        console.log(
            `📦 Migrated ${label} to persistent storage.`
        );

    } catch (error) {
        console.error(
            `❌ Failed to migrate ${label}:`,
            error
        );
    }
}


function migratePersistentData() {
    ensureDataFolder();

    if (
        dataFolder === persistentDataFolder
    ) {
        migrateFile(
            oldSnapshotFile,
            snapshotFile,
            'shop snapshot'
        );

        migrateFile(
            oldDailyResultFile,
            dailyResultFile,
            'daily result'
        );
    }
}


/*
==================================================
SHOP ITEM EXTRACTION
==================================================
*/

function getShopItems(shop) {
    const items = [];
    const seen = new Set();

    for (
        const entry of shop.entries || []
    ) {
        const shopItems = [
            ...(entry.brItems || []),
            ...(entry.items || [])
        ];

        for (
            const item of shopItems
        ) {
            if (!item) {
                continue;
            }

            const id =
                item.id ||
                item.name;

            if (
                !id ||
                seen.has(id)
            ) {
                continue;
            }

            seen.add(id);

            items.push({
                id,

                name:
                    item.name ||
                    'Unknown Item',

                image:
                    item.images?.featured ||
                    item.images?.icon ||
                    null
            });
        }
    }

    return items;
}


/*
==================================================
ITEM SIGNATURE
==================================================
*/

function createItemSignature(items) {
    return items
        .map(item => item.id)
        .filter(Boolean)
        .sort()
        .join('|');
}


/*
==================================================
LOAD SHOP SNAPSHOT
==================================================
*/

function loadSnapshot() {
    ensureDataFolder();
    migratePersistentData();

    if (
        !fs.existsSync(snapshotFile)
    ) {
        return null;
    }

    try {
        const data =
            JSON.parse(
                fs.readFileSync(
                    snapshotFile,
                    'utf8'
                )
            );

        if (
            !data ||
            !Array.isArray(
                data.currentItems
            )
        ) {
            console.log(
                '⚠️ Existing shopSnapshot.json is invalid. Ignoring it.'
            );

            return null;
        }

        return data;

    } catch (error) {
        console.error(
            '❌ Failed to load shop snapshot:',
            error
        );

        return null;
    }
}


/*
==================================================
SAVE SHOP SNAPSHOT
==================================================
*/

function saveSnapshot(
    shop,
    currentItems
) {
    ensureDataFolder();

    const snapshot = {
        shopHash:
            shop.hash ||
            null,

        shopDate:
            shop.date ||
            null,

        itemSignature:
            createItemSignature(
                currentItems
            ),

        currentItems,

        updatedAt:
            new Date().toISOString()
    };

    fs.writeFileSync(
        snapshotFile,
        JSON.stringify(
            snapshot,
            null,
            2
        )
    );
}


/*
==================================================
DAILY RESULT
==================================================
*/

function saveDailyResult(
    result
) {
    ensureDataFolder();

    fs.writeFileSync(
        dailyResultFile,
        JSON.stringify(
            result,
            null,
            2
        )
    );
}


function loadDailyResult() {
    ensureDataFolder();
    migratePersistentData();

    if (
        !fs.existsSync(
            dailyResultFile
        )
    ) {
        return null;
    }

    try {
        return JSON.parse(
            fs.readFileSync(
                dailyResultFile,
                'utf8'
            )
        );

    } catch (error) {
        console.error(
            '❌ Failed to load daily result:',
            error
        );

        return null;
    }
}


/*
==================================================
POST DAILY SHOP
==================================================
*/

async function postToServer(
    client,
    guildId,
    config,
    result
) {
    try {
        if (!config || !config.channelId) {
            console.log(`ℹ️ No shop channel configured for server ${guildId}`);
            return;
        }

        const channel = await client.channels.fetch(config.channelId);

        if (!channel) {
            console.log(`❌ Shop channel not found for server ${guildId}`);
            return;
        }

        const {
            releasedToday = [],
            removedToday = []
        } = result;

        const logo = client.user?.displayAvatarURL({
            extension: 'png',
            size: 256
        });

        const separator = () =>
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small);

        const formatList = (names, emptyText) => {
            if (!names.length) return emptyText;

            const MAX_VISIBLE = 24;
            const visible = names.slice(0, MAX_VISIBLE);
            const remaining = names.length - visible.length;

            let text = visible
                .map(name => `• ${name}`)
                .join('\n');

            if (remaining > 0) {
                text += `\n\n*+ ${remaining} more*`;
            }

            return text;
        };

        const releasedNames = releasedToday
            .map(item => item.name)
            .filter(Boolean);

        const removedNames = removedToday
            .map(item => item.name)
            .filter(Boolean);

        const detectedAt = result.detectedAt
            ? new Date(result.detectedAt)
            : new Date();

        const dateText = detectedAt.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const container = new ContainerBuilder()
            .setAccentColor(0x1493ff)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# __Fortnite Shop Reset__'),
                        new TextDisplayBuilder()
                            .setContent(
                                `**${releasedToday.length}** new cosmetic${releasedToday.length === 1 ? '' : 's'} ` +
                                `and **${removedToday.length}** removed.\n\n` +
                                `Reset detected **${dateText}**.`
                            )
                    )
                    .setThumbnailAccessory(
                        thumbnail =>
                            thumbnail
                                .setURL(logo)
                                .setDescription('Amyfn')
                    )
            )
            .addSeparatorComponents(separator())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## New In The Shop  •  ${releasedToday.length}\n\n` +
                        formatList(
                            releasedNames,
                            'No new cosmetics were released.'
                        )
                    )
            )
            .addSeparatorComponents(separator())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## Removed From Shop  •  ${removedToday.length}\n\n` +
                        formatList(
                            removedNames,
                            'No cosmetics were removed.'
                        )
                    )
            )
            .addSeparatorComponents(separator())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent('-# AMYFN • DAILY SHOP TRACKER')
            );

        const roleId = config.roleId;

        // Components V2 cannot use the legacy content + embeds layout.
        // Send the role ping separately, then send the Daily V2 panel.
        if (roleId) {
            await channel.send({
                content: `<@&${roleId}>`,
                allowedMentions: {
                    roles: [roleId]
                }
            });
        }

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        console.log(`✅ Daily shop posted to server ${guildId}`);

        const imageItems = releasedToday.filter(
            item => item && item.image
        );

        if (imageItems.length === 0) {
            console.log(`ℹ️ No new cosmetic images for server ${guildId}`);
            return;
        }

        console.log(
            `🖼️ Downloading ${imageItems.length} new cosmetic images for server ${guildId}...`
        );

        const attachments = [];

        for (let i = 0; i < imageItems.length; i++) {
            const item = imageItems[i];

            try {
                const buffer = await downloadImage(item.image);

                const attachment = new AttachmentBuilder(buffer)
                    .setName(`daily-shop-${i + 1}.png`);

                attachments.push(attachment);
            } catch (error) {
                console.error(
                    `⚠️ Failed to download image for ${item.name}:`,
                    error.message
                );
            }
        }

        if (attachments.length === 0) {
            console.log(
                `⚠️ No daily images could be downloaded for server ${guildId}`
            );
            return;
        }

        for (let i = 0; i < attachments.length; i += 10) {
            const batch = attachments.slice(i, i + 10);

            const imageContainer = new ContainerBuilder()
                .setAccentColor(0x1493ff)
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent('# __New Shop Images__'),
                            new TextDisplayBuilder()
                                .setContent(
                                    i === 0
                                        ? `Images for **${imageItems.length}** newly released cosmetic${imageItems.length === 1 ? '' : 's'}.`
                                        : 'More newly released cosmetics from this shop rotation.'
                                )
                        )
                        .setThumbnailAccessory(
                            thumbnail =>
                                thumbnail
                                    .setURL(logo)
                                    .setDescription('Amyfn')
                        )
                )
                .addSeparatorComponents(separator())
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('-# AMYFN • DAILY SHOP TRACKER')
                );

            await channel.send({
                components: [imageContainer],
                files: batch,
                flags: MessageFlags.IsComponentsV2
            });
        }

        console.log(
            `✅ New cosmetic image gallery sent to server ${guildId}`
        );

    } catch (error) {
        console.error(
            `❌ Failed posting shop update to server ${guildId}:`,
            error
        );
    }
}

/*
==================================================
ANNOUNCE TO ALL SERVERS
==================================================
*/

async function announceToAllServers(
    client,
    result
) {
    const configs =
        getAllServerConfigs();

    const guildIds =
        Object.keys(configs);


    if (
        guildIds.length === 0
    ) {
        console.log(
            'ℹ️ No servers have configured /setup yet.'
        );

        return;
    }


    console.log(
        `📢 Sending shop reset to ${guildIds.length} configured server(s)...`
    );


    for (
        const guildId of guildIds
    ) {
        await postToServer(
            client,
            guildId,
            configs[guildId],
            result
        );
    }
}


/*
==================================================
CHECK SHOP
==================================================
*/

async function checkShop(
    client
) {
    if (checking) {
        return;
    }

    checking = true;


    try {
        const shop =
            await getShop();


        if (
            !shop ||
            !Array.isArray(
                shop.entries
            )
        ) {
            console.log(
                '⚠️ Shop unavailable.'
            );

            return;
        }


        const currentItems =
            getShopItems(shop);


        if (
            currentItems.length === 0
        ) {
            console.log(
                '⚠️ No shop items found.'
            );

            return;
        }


        console.log(
            `🛒 Current shop: ${currentItems.length} unique items`
        );


        /*
        ==========================================
        LOAD PREVIOUS SHOP
        ==========================================
        */

        const previousSnapshot =
            loadSnapshot();


        /*
        ==========================================
        FIRST VALID SNAPSHOT
        ==========================================
        */

        if (
            !previousSnapshot
        ) {
            saveSnapshot(
                shop,
                currentItems
            );


            console.log(
                `📸 Initial SHOP snapshot saved (${currentItems.length} items).`
            );


            console.log(
                `🕒 Shop date: ${shop.date || 'unknown'}`
            );


            console.log(
                `🔑 Shop hash: ${shop.hash || 'unknown'}`
            );


            console.log(
                '⏳ No announcement sent because this is the initial snapshot.'
            );

            return;
        }


        /*
        ==========================================
        COMPARE SHOP ROTATION
        ==========================================
        */

        const previousHash =
            previousSnapshot.shopHash;

        const currentHash =
            shop.hash;


        const previousDate =
            previousSnapshot.shopDate;

        const currentDate =
            shop.date;


        const previousSignature =
            previousSnapshot.itemSignature ||
            createItemSignature(
                previousSnapshot.currentItems || []
            );


        const currentSignature =
            createItemSignature(
                currentItems
            );


        const hashChanged =
            Boolean(
                currentHash &&
                previousHash &&
                currentHash !== previousHash
            );


        const dateChanged =
            Boolean(
                currentDate &&
                previousDate &&
                currentDate !== previousDate
            );


        const itemsChanged =
            currentSignature !==
            previousSignature;


        /*
        ==========================================
        NO ROTATION CHANGE
        ==========================================
        */

        if (
            !hashChanged &&
            !dateChanged &&
            !itemsChanged
        ) {
            console.log(
                '🛒 Shop unchanged.'
            );

            return;
        }


        /*
        ==========================================
        NEW ROTATION DETECTED
        ==========================================
        */

        console.log(
            '🔄 NEW SHOP ROTATION DETECTED!'
        );


        console.log(
            `Previous hash: ${previousHash || 'unknown'}`
        );


        console.log(
            `Current hash: ${currentHash || 'unknown'}`
        );


        console.log(
            `Previous date: ${previousDate || 'unknown'}`
        );


        console.log(
            `Current date: ${currentDate || 'unknown'}`
        );


        /*
        ==========================================
        BUILD ITEM MAPS
        ==========================================
        */

        const previousItems =
            Array.isArray(
                previousSnapshot.currentItems
            )
                ? previousSnapshot.currentItems
                : [];


        const previousMap =
            new Map();


        for (
            const item of previousItems
        ) {
            if (
                item &&
                item.id
            ) {
                previousMap.set(
                    item.id,
                    item
                );
            }
        }


        const currentMap =
            new Map();


        for (
            const item of currentItems
        ) {
            if (
                item &&
                item.id
            ) {
                currentMap.set(
                    item.id,
                    item
                );
            }
        }


        /*
        ==========================================
        NEW ITEMS
        ==========================================
        */

        const releasedToday =
            currentItems.filter(
                item =>
                    !previousMap.has(
                        item.id
                    )
            );


        /*
        ==========================================
        REMOVED ITEMS
        ==========================================
        */

        const removedToday =
            previousItems.filter(
                item =>
                    !currentMap.has(
                        item.id
                    )
            );


        console.log(
            `🆕 New: ${releasedToday.length}`
        );


        console.log(
            `❌ Removed: ${removedToday.length}`
        );


        /*
        ==========================================
        CREATE RESULT
        ==========================================
        */

        const result = {
            detectedAt:
                new Date().toISOString(),

            shopHash:
                currentHash ||
                null,

            shopDate:
                currentDate ||
                null,

            releasedToday,

            removedToday
        };


        /*
        ==========================================
        SAVE BEFORE ANNOUNCING
        ==========================================
        */

        saveDailyResult(
            result
        );


        saveSnapshot(
            shop,
            currentItems
        );


        console.log(
            '💾 New shop snapshot saved before announcement.'
        );


        /*
        ==========================================
        ANNOUNCE
        ==========================================
        */

        await announceToAllServers(
            client,
            result
        );


    } catch (error) {
        console.error(
            '❌ Shop tracker error:',
            error
        );

    } finally {
        checking = false;
    }
}


/*
==================================================
START TRACKER
==================================================
*/

function startShopTracker(
    client
) {
    console.log(
        '🔎 Starting Fortnite shop tracker...'
    );


    console.log(
        `💾 Shop tracker storage: ${dataFolder}`
    );


    /*
    Check immediately.
    */

    checkShop(client);


    /*
    Then check every 5 minutes.
    */

    setInterval(
        () => {
            checkShop(client);
        },
        5 * 60 * 1000
    );
}


/*
==================================================
LATEST DAILY RESULT
==================================================
*/

function getLatestDailyResult() {
    return loadDailyResult();
}


/*
==================================================
EXPORTS
==================================================
*/

module.exports = {
    startShopTracker,
    getLatestDailyResult
};
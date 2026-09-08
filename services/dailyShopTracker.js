const fs = require('fs');
const path = require('path');

const { getShop } = require('./fortniteApi');

const {
    getAllServerConfigs
} = require('./serverConfig');

const dataFolder = path.join(
    __dirname,
    '..',
    'data'
);

const snapshotFile = path.join(
    dataFolder,
    'shopSnapshot.json'
);

const dailyResultFile = path.join(
    dataFolder,
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
LOAD SHOP SNAPSHOT
==================================================
*/

function loadSnapshot() {

    ensureDataFolder();

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

        /*
        Old/broken snapshot protection.

        A valid shop snapshot MUST contain
        currentItems.

        If the file contains something like:

        {
            "ids": [...],
            "updatedAt": "..."
        }

        that's a news snapshot, not a shop snapshot.
        */

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
POST TO SERVER
==================================================
*/

async function postToServer(

    client,

    guildId,

    config,

    result

) {

    try {

        if (
            !config ||
            !config.channelId
        ) {

            console.log(
                `ℹ️ No shop channel configured for server ${guildId}`
            );

            return;
        }

        const channel =
            await client.channels.fetch(
                config.channelId
            );

        if (!channel) {

            console.log(
                `❌ Shop channel not found for server ${guildId}`
            );

            return;
        }

        const {

            releasedToday = [],

            removedToday = []

        } = result;


        let description = '';


        /*
        RELEASED
        */

        description +=
            '🆕 **NEW IN THE SHOP**\n\n';

        if (
            releasedToday.length > 0
        ) {

            description +=

                releasedToday
                    .map(
                        item =>
                            `• **${item.name}**`
                    )
                    .join('\n');

        } else {

            description +=
                'No new cosmetics detected.';
        }


        /*
        REMOVED
        */

        description +=
            '\n\n❌ **REMOVED FROM SHOP**\n\n';

        if (
            removedToday.length > 0
        ) {

            description +=

                removedToday
                    .map(
                        item =>
                            `• **${item.name}**`
                    )
                    .join('\n');

        } else {

            description +=
                'Nothing removed.';
        }


        /*
        SUMMARY
        */

        description +=
            '\n\n' +

            `*${releasedToday.length} new • ` +

            `${removedToday.length} removed*`;


        const roleId =
            config.roleId;

        const content =
            roleId
                ? `<@&${roleId}>`
                : undefined;


        /*
        SEND MAIN MESSAGE
        */

        await channel.send({

            content,

            embeds: [

                {

                    title:
                        '🛒 Fortnite Shop Reset',

                    description,

                    timestamp:
                        new Date().toISOString(),

                    footer: {

                        text:
                            'Amyfn • Fortnite Shop'

                    }

                }

            ],

            allowedMentions:

                roleId

                    ? {

                        roles: [
                            roleId
                        ]

                    }

                    : {

                        parse: []

                    }

        });


        console.log(
            `✅ Daily shop posted to server ${guildId}`
        );


        /*
        SEND NEW COSMETIC IMAGES
        */

        const images =

            releasedToday

                .map(
                    item =>
                        item.image
                )

                .filter(Boolean);


        if (
            images.length === 0
        ) {

            console.log(
                `ℹ️ No new cosmetic images for server ${guildId}`
            );

            return;
        }


        console.log(
            `🖼️ Sending ${images.length} new cosmetic images to server ${guildId}...`
        );


        /*
        Discord allows max 10 embeds per message.
        */

        for (
            let i = 0;

            i < images.length;

            i += 10
        ) {

            const batch =
                images.slice(
                    i,
                    i + 10
                );


            await channel.send({

                embeds:

                    batch.map(
                        image => ({

                            image: {
                                url: image
                            }

                        })
                    )

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
        LOAD PREVIOUS SHOP
        */

        const previousSnapshot =
            loadSnapshot();


        /*
        FIRST VALID SNAPSHOT
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

            return;
        }


        /*
        CHECK WHETHER THE SHOP ROTATED
        */

        const previousHash =
            previousSnapshot.shopHash;

        const currentHash =
            shop.hash;


        const previousDate =
            previousSnapshot.shopDate;

        const currentDate =
            shop.date;


        const shopChanged =

            (

                currentHash &&
                previousHash &&
                currentHash !== previousHash

            )

            ||

            (

                currentDate &&
                previousDate &&
                currentDate !== previousDate

            );


        /*
        IF THE API HAS NOT GIVEN US A NEW
        SHOP ROTATION YET, DON'T TOUCH THE
        SNAPSHOT.
        */

        if (!shopChanged) {

            console.log(
                '🛒 Shop unchanged.'
            );

            return;
        }


        console.log(
            '🔄 NEW SHOP ROTATION DETECTED!'
        );


        console.log(
            `Previous hash: ${previousHash || 'unknown'}`
        );


        console.log(
            `Current hash: ${currentHash || 'unknown'}`
        );


        /*
        BUILD MAPS
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
        NEW ITEMS
        */

        const releasedToday =

            currentItems.filter(

                item =>

                    !previousMap.has(
                        item.id
                    )

            );


        /*
        REMOVED ITEMS
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
        IMPORTANT:
        SAVE THE NEW SHOP SNAPSHOT
        BEFORE ANNOUNCING.

        This prevents the same rotation
        from being announced again if
        Discord posting fails halfway.
        */

        const result = {

            detectedAt:
                new Date().toISOString(),

            shopHash:
                currentHash || null,

            shopDate:
                currentDate || null,

            releasedToday,

            removedToday

        };


        saveDailyResult(
            result
        );


        saveSnapshot(

            shop,

            currentItems

        );


        /*
        SEND DISCORD ANNOUNCEMENT
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
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    PermissionFlagsBits,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getServerConfig,
    getAllServerConfigs
} = require('../services/serverConfig');


// ==========================================
// AMYFN DEVELOPER UPDATE
// ==========================================
//
// EDIT THIS SECTION WHEN YOU HAVE A NEW UPDATE.
//
// You can change:
// - title
// - body
// - color
// - image
//
// After changing it and deploying:
// AmyFN automatically detects the change
// and publishes the new update.
//
// You can also manually use /announcement.
//
// Previous updates are NOT edited or deleted.
// Every update is published as a NEW message.
// ==========================================

const UPDATE = {

    title: '🟢 AmyFN Update log',

    body: `
## What's New

AmyFN is officially back online.

You may have noticed that the bot was unavailable for a while. We ran into some **hosting and deployment issues** while moving the bot to a new environment, which caused the downtime and took longer to resolve than expected.

Everything is now back up and running, and we're continuing to work on improving AmyFN.

### What's next?

We're not stopping here. More features, improvements, commands, and updates are already being worked on and will be added over time.

Thanks to everyone who waited while we got everything sorted out. We appreciate you using AmyFN and sticking around.

**AmyFN is back. More is coming.**
    `,

    color: 0x00c853,

    image: 'amyfn-announcement.png'

};


// ==========================================
// ASSET
// ==========================================

const UPDATE_IMAGE = path.join(
    __dirname,
    '..',
    'assets',
    UPDATE.image
);


// ==========================================
// SEPARATOR
// ==========================================

function separator() {

    return new SeparatorBuilder()
        .setDivider(true)
        .setSpacing(
            SeparatorSpacingSize.Small
        );

}


// ==========================================
// CREATE UPDATE CONTAINER
// ==========================================

function createUpdateContainer(client) {

    const logo =
        client.user.displayAvatarURL({
            extension: 'png',
            size: 256
        });


    // ==========================================
    // HEADER
    // ==========================================

    const header =
        new SectionBuilder()
            .addTextDisplayComponents(

                new TextDisplayBuilder()
                    .setContent(
                        `# ${UPDATE.title}`
                    ),

                new TextDisplayBuilder()
                    .setContent(
                        '**Developer Update**\n' +
                        'The AmyFN development team has a new update for you.'
                    )

            )
            .setThumbnailAccessory(
                thumbnail =>
                    thumbnail
                        .setURL(logo)
                        .setDescription(
                            'AmyFN logo'
                        )
            );


    // ==========================================
    // MAIN CONTAINER
    // ==========================================

    const container =
        new ContainerBuilder()
            .setAccentColor(
                UPDATE.color
            )
            .addSectionComponents(
                header
            )
            .addSeparatorComponents(
                separator()
            )
            .addTextDisplayComponents(

                new TextDisplayBuilder()
                    .setContent(
                        UPDATE.body.trim()
                    )

            );


    // ==========================================
    // UPDATE IMAGE
    // ==========================================

    if (
        UPDATE.image &&
        fs.existsSync(UPDATE_IMAGE)
    ) {

        container
            .addSeparatorComponents(
                separator()
            )
            .addMediaGalleryComponents(

                new MediaGalleryBuilder()
                    .addItems(

                        new MediaGalleryItemBuilder()
                            .setURL(
                                `attachment://${UPDATE.image}`
                            )

                    )

            );

    }


    // ==========================================
    // FOOTER
    // ==========================================

    container
        .addSeparatorComponents(
            separator()
        )
        .addTextDisplayComponents(

            new TextDisplayBuilder()
                .setContent(
                    '-# AMYFN • DEVELOPER UPDATE'
                )

        );


    return container;

}


// ==========================================
// AUTOMATIC UPDATE STATE
// ==========================================
//
// Railway provides a persistent /data folder.
//
// Locally:
// ./data/announcementState.json
//
// Railway:
// /data/announcementState.json
//
// This prevents the same update from being
// posted again every time the bot restarts.
// ==========================================

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

const announcementStatePath = path.join(
    dataFolder,
    'announcementState.json'
);


// ==========================================
// ENSURE DATA FOLDER
// ==========================================

function ensureAnnouncementDataFolder() {

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
// LOAD ANNOUNCEMENT STATE
// ==========================================

function loadAnnouncementState() {

    ensureAnnouncementDataFolder();

    if (
        !fs.existsSync(
            announcementStatePath
        )
    ) {

        return null;

    }


    try {

        return JSON.parse(
            fs.readFileSync(
                announcementStatePath,
                'utf8'
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to load announcement state:',
            error
        );

        return null;

    }

}


// ==========================================
// SAVE ANNOUNCEMENT STATE
// ==========================================

function saveAnnouncementState(hash) {

    ensureAnnouncementDataFolder();

    fs.writeFileSync(

        announcementStatePath,

        JSON.stringify(
            {
                hash
            },
            null,
            2
        ),

        'utf8'

    );

}


// ==========================================
// UPDATE FINGERPRINT
// ==========================================
//
// The fingerprint changes when:
// - title changes
// - body changes
// - color changes
// - image filename changes
// - image contents change
//
// This lets AmyFN detect a new developer update.
// ==========================================

function getUpdateFingerprint() {

    const hash =
        crypto.createHash('sha256');


    hash.update(

        JSON.stringify({

            title:
                UPDATE.title,

            body:
                UPDATE.body,

            color:
                UPDATE.color,

            image:
                UPDATE.image

        })

    );


    // Include actual image contents
    // in the fingerprint.

    if (
        UPDATE.image &&
        fs.existsSync(UPDATE_IMAGE)
    ) {

        hash.update(
            fs.readFileSync(
                UPDATE_IMAGE
            )
        );

    }


    return hash.digest('hex');

}


// ==========================================
// AUTOMATIC DEVELOPER UPDATE CHECK
// ==========================================
//
// Called when the bot becomes ready.
//
// FIRST STARTUP:
// Saves the current update as the baseline.
// Does NOT publish.
//
// FUTURE STARTUP:
// If the update changed, publish it.
//
// NO CHANGE:
// Do nothing.
//
// CHANNEL PRIORITY:
//
// 1. Logs
// 2. Updates
//
// Updates is the merged News + Leaks channel.
// ==========================================

async function checkForAnnouncementUpdate(client) {

    try {

        const currentHash =
            getUpdateFingerprint();


        const previousState =
            loadAnnouncementState();


        // ==========================================
        // FIRST RUN
        // ==========================================

        if (
            !previousState ||
            !previousState.hash
        ) {

            saveAnnouncementState(
                currentHash
            );

            console.log(
                '📢 Announcement baseline created. No automatic update published.'
            );

            return;

        }


        // ==========================================
        // NOTHING CHANGED
        // ==========================================

        if (
            previousState.hash ===
            currentHash
        ) {

            console.log(
                '📢 No developer announcement changes detected.'
            );

            return;

        }


        // ==========================================
        // UPDATE CHANGED
        // ==========================================

        console.log(
            '📢 New developer announcement detected!'
        );


        const configs =
            getAllServerConfigs();


        let publishedCount = 0;


        // ==========================================
        // PUBLISH TO EVERY CONFIGURED SERVER
        // ==========================================

        for (
            const [
                guildId,
                config
            ] of Object.entries(configs)
        ) {

            try {

                // ==========================================
                // CHANNEL PRIORITY
                // ==========================================

                const channelIds = [

                    config.logsChannelId,

                    config.updatesChannelId

                ].filter(Boolean);


                if (
                    channelIds.length === 0
                ) {

                    console.log(
                        `⚠️ No announcement channel configured for guild ${guildId}.`
                    );

                    continue;

                }


                // ==========================================
                // FIND FIRST AVAILABLE CHANNEL
                // ==========================================

                let channel = null;


                for (
                    const channelId
                    of channelIds
                ) {

                    try {

                        const candidate =
                            await client.channels.fetch(
                                channelId
                            );


                        if (
                            candidate &&
                            candidate.isTextBased()
                        ) {

                            channel =
                                candidate;

                            break;

                        }

                    } catch (channelError) {

                        console.log(

                            `⚠️ Could not access channel ${channelId} in guild ${guildId}. Trying fallback...`

                        );

                    }

                }


                if (!channel) {

                    console.log(
                        `⚠️ No accessible announcement channel for guild ${guildId}.`
                    );

                    continue;

                }


                // ==========================================
                // BUILD UPDATE
                // ==========================================

                const container =
                    createUpdateContainer(
                        client
                    );


                const files = [];


                if (
                    UPDATE.image &&
                    fs.existsSync(
                        UPDATE_IMAGE
                    )
                ) {

                    files.push(

                        new AttachmentBuilder(
                            UPDATE_IMAGE,
                            {
                                name:
                                    UPDATE.image
                            }
                        )

                    );

                }


                // ==========================================
                // PUBLISH
                // ==========================================

                await channel.send({

                    components: [
                        container
                    ],

                    files,

                    flags:
                        MessageFlags.IsComponentsV2

                });


                publishedCount++;


                console.log(
                    `✅ Developer update published to guild ${guildId}.`
                );


            } catch (guildError) {

                console.error(

                    `❌ Failed to publish developer update to guild ${guildId}:`,

                    guildError

                );

            }

        }


        // ==========================================
        // SAVE NEW HASH
        // ==========================================
        //
        // Only mark the update as completed if at
        // least one server actually received it.
        //
        // If every server failed, keep the old hash
        // so the bot can retry on the next startup.
        // ==========================================

        if (
            publishedCount > 0
        ) {

            saveAnnouncementState(
                currentHash
            );


            console.log(

                `📢 Developer update finished. Published to ${publishedCount} server(s).`

            );

        } else {

            console.log(

                '⚠️ Developer update was not published to any server. The previous hash was kept so it can be retried.'

            );

        }


    } catch (error) {

        console.error(
            '❌ Automatic announcement check failed:',
            error
        );

    }

}


// ==========================================
// COMMAND
// ==========================================

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                'announcement'
            )

            .setDescription(
                'Publish a new AmyFN developer update'
            )

            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator
            ),


    // ==========================================
    // MANUAL /ANNOUNCEMENT COMMAND
    // ==========================================

    async execute(
        interaction,
        client
    ) {

        await interaction.deferReply({

            flags:
                MessageFlags.Ephemeral

        });


        try {

            // ==========================================
            // SERVER CONFIG
            // ==========================================

            const config =
                getServerConfig(
                    interaction.guild.id
                );


            if (!config) {

                return interaction.editReply({

                    content:
                        '❌ AmyFN has not been configured for this server yet. Use `/setup` first.'

                });

            }


            // ==========================================
            // FIND ANNOUNCEMENT CHANNEL
            // ==========================================
            //
            // Priority:
            //
            // 1. Logs
            // 2. Updates
            //
            // Updates = News + Leaks
            // ==========================================

            const channelIds = [

                config.logsChannelId,

                config.updatesChannelId

            ].filter(Boolean);


            if (
                channelIds.length === 0
            ) {

                return interaction.editReply({

                    content:
                        '❌ No announcement channel has been configured. Please configure a Logs or Updates channel first.'

                });

            }


            let channel = null;

            let selectedChannelId = null;


            // ==========================================
            // FIND FIRST ACCESSIBLE CHANNEL
            // ==========================================

            for (
                const channelId of channelIds
            ) {

                try {

                    const candidate =
                        await client.channels.fetch(
                            channelId
                        );


                    if (
                        candidate &&
                        candidate.isTextBased()
                    ) {

                        channel =
                            candidate;

                        selectedChannelId =
                            channelId;

                        break;

                    }


                } catch (error) {

                    console.log(

                        `⚠️ Could not access announcement channel ${channelId}. Trying the next configured channel...`

                    );

                }

            }


            if (!channel) {

                return interaction.editReply({

                    content:
                        '❌ AmyFN could not access any configured announcement channel.'

                });

            }


            console.log(

                `📢 Developer update channel selected: ${selectedChannelId}`

            );


            // ==========================================
            // BUILD UPDATE
            // ==========================================

            const container =
                createUpdateContainer(
                    client
                );


            const files = [];


            if (
                UPDATE.image &&
                fs.existsSync(
                    UPDATE_IMAGE
                )
            ) {

                files.push(

                    new AttachmentBuilder(
                        UPDATE_IMAGE,
                        {
                            name:
                                UPDATE.image
                        }
                    )

                );

            }


            // ==========================================
            // PUBLISH NEW PUBLIC UPDATE
            // ==========================================

            await channel.send({

                components: [
                    container
                ],

                files,

                flags:
                    MessageFlags.IsComponentsV2

            });


            // ==========================================
            // PRIVATE CONFIRMATION
            // ==========================================

            await interaction.editReply({

                content:
                    '✅ Developer update published successfully.'

            });


        } catch (error) {

            console.error(
                '❌ Developer announcement error:',
                error
            );


            await interaction.editReply({

                content:
                    '❌ Failed to publish the developer update. Check the bot console for details.'

            });

        }

    },


    // ==========================================
    // AUTOMATIC DEPLOYMENT UPDATE CHECK
    // ==========================================

    checkForAnnouncementUpdate

};
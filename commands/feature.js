const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    getNewCosmetics
} = require('../services/fortniteApi');

const {
    createDailyShopGallery,
    getGalleryPageCount
} = require('../services/dailyShopImage');

// ==========================================
// FEATURE COMMAND
// ==========================================

const featureCommand = {
    data: new SlashCommandBuilder()
        .setName('feature')
        .setDescription(
            'View the newest Fortnite cosmetics'
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            console.log(
                '🔎 Fetching new Fortnite cosmetics...'
            );

            const data =
                await getNewCosmetics();

            console.log(
                '✅ API response received'
            );

            // ==========================================
            // FIND API SOURCE
            // ==========================================

            let source = data;

            if (
                data &&
                data.items &&
                typeof data.items === 'object'
            ) {
                source = data.items;
            }

            // ==========================================
            // COLLECT ITEMS
            // ==========================================

            const items = [];

            for (
                const [category, value]
                of Object.entries(source || {})
            ) {
                if (!Array.isArray(value)) {
                    continue;
                }

                console.log(
                    `📦 ${category}: ${value.length} items`
                );

                for (const item of value) {
                    items.push({
                        ...item,
                        category
                    });
                }
            }

            console.log(
                `🆕 Found ${items.length} cosmetics.`
            );

            if (items.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x1493ff)
                            .setTitle(
                                '🆕 New Cosmetics'
                            )
                            .setDescription(
                                'No new Fortnite cosmetics were found right now.'
                            )
                            .setFooter({
                                text:
                                    'Amyfn • Fortnite Community'
                            })
                            .setTimestamp()
                    ]
                });
            }

            // ==========================================
            // REMOVE DUPLICATES
            // ==========================================

            const uniqueItems = [];
            const seen = new Set();

            for (const item of items) {

                if (!item.id) {
                    uniqueItems.push(item);
                    continue;
                }

                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    uniqueItems.push(item);
                }
            }

            console.log(
                `📦 Unique cosmetics: ${uniqueItems.length}`
            );

            // ==========================================
            // GET ARTWORK
            // ==========================================

            const images = [];

            for (const item of uniqueItems) {

                const image =
                    item.images?.featured ||
                    item.images?.icon ||
                    item.images?.large ||
                    item.images?.smallIcon ||
                    item.images?.small ||
                    item.images?.wide;

                if (image) {
                    images.push(image);
                }
            }

            console.log(
                `🖼️ Usable cosmetic images: ${images.length}`
            );

            if (images.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x1493ff)
                            .setTitle(
                                '🆕 New Cosmetics'
                            )
                            .setDescription(
                                'New cosmetics were found, but no artwork was available.'
                            )
                            .setFooter({
                                text:
                                    'Amyfn • Fortnite Community'
                            })
                            .setTimestamp()
                    ]
                });
            }

            // ==========================================
            // GALLERY
            // ==========================================

            const totalPages =
                getGalleryPageCount(images);

            let currentPage = 1;

            async function buildGallery(page) {

                console.log(
                    `🖼️ Building feature gallery page ${page}/${totalPages}...`
                );

                const buffer =
                    await createDailyShopGallery(
                        images,
                        page
                    );

                const attachment =
                    new AttachmentBuilder(
                        buffer,
                        {
                            name:
                                'feature-gallery.png'
                        }
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x1493ff)
                        .setImage(
                            'attachment://feature-gallery.png'
                        )
                        .setFooter({
                            text:
                                totalPages > 1
                                    ? `Amyfn • Fortnite Community • Page ${page}/${totalPages}`
                                    : 'Amyfn • Fortnite Community'
                        })
                        .setTimestamp();

                return {
                    embed,
                    attachment
                };
            }

            // ==========================================
            // BUTTONS
            // ==========================================

            function buildButtons(page) {

                if (totalPages <= 1) {
                    return [];
                }

                return [
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    'feature_previous'
                                )
                                .setLabel(
                                    'Previous'
                                )
                                .setEmoji('⬅️')
                                .setStyle(
                                    ButtonStyle.Secondary
                                )
                                .setDisabled(
                                    page === 1
                                ),

                            new ButtonBuilder()
                                .setCustomId(
                                    'feature_next'
                                )
                                .setLabel(
                                    'Next'
                                )
                                .setEmoji('➡️')
                                .setStyle(
                                    ButtonStyle.Primary
                                )
                                .setDisabled(
                                    page === totalPages
                                )
                        )
                ];
            }

            // ==========================================
            // FIRST PAGE
            // ==========================================

            const firstPage =
                await buildGallery(
                    currentPage
                );

            await interaction.editReply({
                embeds: [
                    firstPage.embed
                ],
                files: [
                    firstPage.attachment
                ],
                components:
                    buildButtons(
                        currentPage
                    )
            });

            console.log(
                `🖼️ Feature gallery sent: page ${currentPage}/${totalPages}`
            );

            // ==========================================
            // PAGINATION
            // ==========================================

            if (totalPages > 1) {

                const message =
                    await interaction.fetchReply();

                const collector =
                    message.createMessageComponentCollector({
                        time:
                            5 * 60 * 1000
                    });

                collector.on(
                    'collect',
                    async buttonInteraction => {

                        // ==========================================
                        // USER CHECK
                        // ==========================================

                        if (
                            buttonInteraction.user.id !==
                            interaction.user.id
                        ) {
                            if (
                                !buttonInteraction.replied &&
                                !buttonInteraction.deferred
                            ) {
                                await buttonInteraction.reply({
                                    content:
                                        '❌ Only the person who used `/feature` can control this gallery.',
                                    flags: 64
                                });
                            }

                            return;
                        }

                        // ==========================================
                        // ACKNOWLEDGE BUTTON IMMEDIATELY
                        // ==========================================

                        try {

                            await buttonInteraction.deferUpdate();

                        } catch (error) {

                            console.error(
                                '❌ Failed to acknowledge feature button:',
                                error.message
                            );

                            return;
                        }

                        // ==========================================
                        // CHANGE PAGE
                        // ==========================================

                        if (
                            buttonInteraction.customId ===
                            'feature_previous'
                        ) {
                            if (
                                currentPage > 1
                            ) {
                                currentPage--;
                            }
                        }

                        if (
                            buttonInteraction.customId ===
                            'feature_next'
                        ) {
                            if (
                                currentPage <
                                totalPages
                            ) {
                                currentPage++;
                            }
                        }

                        // ==========================================
                        // BUILD NEW PAGE
                        // ==========================================

                        try {

                            const page =
                                await buildGallery(
                                    currentPage
                                );

                            // ==========================================
                            // EDIT ORIGINAL MESSAGE
                            // ==========================================

                            await interaction.editReply({
                                embeds: [
                                    page.embed
                                ],
                                files: [
                                    page.attachment
                                ],
                                components:
                                    buildButtons(
                                        currentPage
                                    )
                            });

                            console.log(
                                `🖼️ Feature gallery changed to page ${currentPage}/${totalPages}`
                            );

                        } catch (error) {

                            console.error(
                                '❌ Feature gallery page error:',
                                error
                            );
                        }
                    }
                );

                // ==========================================
                // DISABLE BUTTONS AFTER 5 MINUTES
                // ==========================================

                collector.on(
                    'end',
                    async () => {

                        try {

                            const disabledRow =
                                new ActionRowBuilder()
                                    .addComponents(

                                        new ButtonBuilder()
                                            .setCustomId(
                                                'feature_previous'
                                            )
                                            .setLabel(
                                                'Previous'
                                            )
                                            .setEmoji(
                                                '⬅️'
                                            )
                                            .setStyle(
                                                ButtonStyle.Secondary
                                            )
                                            .setDisabled(
                                                true
                                            ),

                                        new ButtonBuilder()
                                            .setCustomId(
                                                'feature_next'
                                            )
                                            .setLabel(
                                                'Next'
                                            )
                                            .setEmoji(
                                                '➡️'
                                            )
                                            .setStyle(
                                                ButtonStyle.Primary
                                            )
                                            .setDisabled(
                                                true
                                            )
                                    );

                            await interaction.editReply({
                                components: [
                                    disabledRow
                                ]
                            });

                        } catch (error) {

                            console.error(
                                '❌ Failed to disable feature buttons:',
                                error.message
                            );
                        }
                    }
                );
            }

            console.log(
                '✅ Feature command completed successfully.'
            );

        } catch (error) {

            console.error(
                '================================'
            );

            console.error(
                '❌ FEATURE COMMAND ERROR'
            );

            console.error(
                '================================'
            );

            console.error(error);

            try {

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x1493ff)
                            .setTitle(
                                '❌ Feature Error'
                            )
                            .setDescription(
                                'Something went wrong while loading the newest Fortnite cosmetics.'
                            )
                            .setFooter({
                                text:
                                    'Amyfn • Fortnite Community'
                            })
                            .setTimestamp()
                    ],
                    components: []
                });

            } catch (replyError) {

                console.error(
                    '❌ Could not send feature error:',
                    replyError
                );
            }
        }
    }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = featureCommand;
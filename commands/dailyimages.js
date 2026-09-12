const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MessageFlags,
    AttachmentBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getLatestDailyResult
} = require('../services/dailyShopTracker');

const {
    downloadImage
} = require('../services/dailyShopImage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dailyimages')
        .setDescription(
            'Shows images of cosmetics released in the latest Fortnite Shop reset'
        ),

    async execute(interaction) {
        console.log('DAILYIMAGES STARTED');

        try {
            await interaction.deferReply();

            const result = getLatestDailyResult();

            const separator = () =>
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Small);

            // ==========================================
            // NO RESET
            // ==========================================

            if (!result) {
                const container = new ContainerBuilder()
                    .setAccentColor(0x1493ff)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# __Daily Shop Images__'),

                        new TextDisplayBuilder()
                            .setContent(
                                '**NO SHOP RESET DETECTED**\n\n' +
                                'Amyfn is watching the Fortnite Item Shop. ' +
                                'Released cosmetics will appear here after the next reset.'
                            )
                    )
                    .addSeparatorComponents(separator())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • DAILY SHOP TRACKER'
                            )
                    );

                return interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const releasedToday = result.releasedToday || [];

            // ==========================================
            // NOTHING NEW
            // ==========================================

            if (releasedToday.length === 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(0x1493ff)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# __Daily Shop Images__'),

                        new TextDisplayBuilder()
                            .setContent(
                                '**NO NEW COSMETICS**\n\n' +
                                'The latest shop reset did not add any new cosmetics.'
                            )
                    )
                    .addSeparatorComponents(separator())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • DAILY SHOP TRACKER'
                            )
                    );

                return interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ==========================================
            // GET ITEMS WITH IMAGES
            // ==========================================

            const itemsWithImages = releasedToday
                .filter(item => item.image);

            if (itemsWithImages.length === 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(0x1493ff)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('# __Daily Shop Images__'),

                        new TextDisplayBuilder()
                            .setContent(
                                '**NO IMAGES AVAILABLE**\n\n' +
                                'The released cosmetics were detected, ' +
                                'but no usable images were found.'
                            )
                    )
                    .addSeparatorComponents(separator())
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • DAILY SHOP TRACKER'
                            )
                    );

                return interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ==========================================
            // DOWNLOAD IMAGES
            // ==========================================

            const attachments = [];

            for (
                let i = 0;
                i < itemsWithImages.length;
                i++
            ) {
                const item = itemsWithImages[i];

                try {
                    console.log(
                        `Downloading daily image ${i + 1}/${itemsWithImages.length}: ${item.name || 'Unknown'}`
                    );

                    const buffer =
                        await downloadImage(item.image);

                    const safeName =
                        String(
                            item.name ||
                            `daily-shop-${i + 1}`
                        )
                            .replace(
                                /[<>:"/\\|?*\x00-\x1F]/g,
                                ''
                            )
                            .trim()
                            .replace(/\s+/g, '-')
                            .slice(0, 70) ||
                        `daily-shop-${i + 1}`;

                    attachments.push(
                        new AttachmentBuilder(buffer)
                            .setName(
                                `${safeName}.png`
                            )
                    );

                } catch (error) {
                    console.error(
                        `Failed to download daily image ${i + 1}:`,
                        error.message
                    );
                }
            }

            // ==========================================
            // NO IMAGES DOWNLOADED
            // ==========================================

            if (attachments.length === 0) {
                return interaction.editReply({
                    content:
                        'Failed to download the Daily Shop images.'
                });
            }

            // ==========================================
            // HEADER
            // ==========================================

            const detectedAt =
                result.detectedAt
                    ? new Date(result.detectedAt)
                    : new Date();

            const dateText =
                detectedAt.toLocaleString(
                    'en-GB',
                    {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }
                );

            const header =
                new ContainerBuilder()
                    .setAccentColor(0x1493ff)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '# __Daily Shop Images__'
                            ),

                        new TextDisplayBuilder()
                            .setContent(
                                `**${attachments.length}** new cosmetic image${attachments.length === 1 ? '' : 's'} ` +
                                `from the latest Fortnite Shop reset.\n\n` +
                                `Reset detected **${dateText}**.`
                            )
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • DAILY SHOP TRACKER'
                            )
                    );

            // ==========================================
            // DISCORD ATTACHMENT LIMIT
            // ==========================================

            const BATCH_SIZE = 10;

            const batches = [];

            for (
                let i = 0;
                i < attachments.length;
                i += BATCH_SIZE
            ) {
                batches.push(
                    attachments.slice(
                        i,
                        i + BATCH_SIZE
                    )
                );
            }

            // ==========================================
            // HEADER + FIRST 10 IMAGES
            // ==========================================
            //
            // The first batch is attached directly to
            // the original interaction response.
            //
            // This keeps the header and first images
            // visually connected instead of creating
            // a separate message immediately below it.
            //

            await interaction.editReply({
                components: [header],
                files: batches[0],
                flags: MessageFlags.IsComponentsV2
            });

            // ==========================================
            // REMAINING BATCHES
            // ==========================================
            //
            // Discord allows up to 10 attachments
            // per message, so anything after the
            // first batch is sent normally underneath.
            //

            for (
                let i = 1;
                i < batches.length;
                i++
            ) {
                await interaction.followUp({
                    files: batches[i]
                });
            }

            console.log(
                `DAILYIMAGES: Sent ${attachments.length} images in ${batches.length} image message(s).`
            );

        } catch (error) {
            console.error(
                'DAILYIMAGES ERROR:',
                error
            );

            try {
                if (
                    interaction.deferred ||
                    interaction.replied
                ) {
                    await interaction.editReply({
                        content:
                            'Failed to load the Daily Shop images.',
                        components: []
                    });
                } else {
                    await interaction.reply({
                        content:
                            'Failed to load the Daily Shop images.'
                    });
                }

            } catch (replyError) {
                console.error(
                    'Could not send Daily Images error:',
                    replyError
                );
            }
        }
    }
};
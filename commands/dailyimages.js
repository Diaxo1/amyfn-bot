const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder
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

    execute: async function(interaction) {

        console.log('🖼️ DAILYIMAGES STARTED');

        try {

            // Acknowledge the slash command immediately
            await interaction.deferReply();

            const result = getLatestDailyResult();

            // ==========================================
            // NO SHOP RESET
            // ==========================================

            if (!result) {

                const embed = new EmbedBuilder()
                    .setColor(0x1493ff)
                    .setTitle('🛒 Daily Shop Images')
                    .setDescription(
                        '⏳ **No shop reset has been detected yet.**\n\n' +
                        'The automatic tracker is watching the Fortnite Item Shop.\n\n' +
                        'Once a reset is detected, the released items will appear here.'
                    )
                    .setFooter({
                        text: 'Amyfn • Fortnite Community'
                    })
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            const releasedToday =
                result.releasedToday || [];

            // ==========================================
            // NOTHING RELEASED
            // ==========================================

            if (releasedToday.length === 0) {

                const embed = new EmbedBuilder()
                    .setColor(0x1493ff)
                    .setTitle('🛒 Daily Shop Images')
                    .setDescription(
                        '📭 **No new cosmetics were released in the latest shop reset.**'
                    )
                    .setFooter({
                        text: 'Amyfn • Fortnite Community'
                    })
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            // ==========================================
            // GET IMAGE URLS
            // ==========================================

            const images = releasedToday
                .map(item => item.image)
                .filter(Boolean);

            if (images.length === 0) {

                const embed = new EmbedBuilder()
                    .setColor(0x1493ff)
                    .setTitle('🛒 Daily Shop Images')
                    .setDescription(
                        '⚠️ **No images were available for the released items.**'
                    )
                    .setFooter({
                        text: 'Amyfn • Fortnite Community'
                    })
                    .setTimestamp();

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            // ==========================================
            // DOWNLOAD IMAGES
            // ==========================================

            const attachments = [];

            for (let i = 0; i < images.length; i++) {

                try {

                    console.log(
                        `🖼️ Downloading daily image ${i + 1}/${images.length}`
                    );

                    const buffer =
                        await downloadImage(images[i]);

                    const attachment =
                        new AttachmentBuilder(buffer)
                            .setName(
                                `daily-shop-${i + 1}.png`
                            );

                    attachments.push(attachment);

                } catch (error) {

                    console.error(
                        `⚠️ Failed to download daily image ${i + 1}:`,
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
                        '❌ Failed to download the Daily Shop images.'
                });
            }

            // ==========================================
            // GALLERY EMBED
            // ==========================================

            const headerEmbed =
                new EmbedBuilder()
                    .setColor(0x1493ff)
                    .setTitle('🛒 Daily Shop Images')
                    .setDescription(
                        `🔥 **${attachments.length} new cosmetic image${attachments.length === 1 ? '' : 's'} from the latest Fortnite Shop reset.**`
                    )
                    .setFooter({
                        text: 'Amyfn • Fortnite Community'
                    })
                    .setTimestamp(
                        result.detectedAt
                            ? new Date(result.detectedAt)
                            : new Date()
                    );

            // ==========================================
            // BATCH IMAGES
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
            // HEADER MESSAGE
            // ==========================================

            await interaction.editReply({
                embeds: [headerEmbed]
            });

            // ==========================================
            // FIRST BATCH OF IMAGES
            // ==========================================

            await interaction.followUp({
                files: batches[0]
            });

            // ==========================================
            // REMAINING BATCHES
            // ==========================================

            for (let i = 1; i < batches.length; i++) {

                await interaction.followUp({
                    files: batches[i]
                });

            }

            console.log(
                `✅ DAILYIMAGES: Sent ${attachments.length} individual images in ${batches.length} image message(s).`
            );

        } catch (error) {

            console.error(
                '❌ DAILYIMAGES ERROR:',
                error
            );

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply({
                        content:
                            '❌ Failed to load the Daily Shop images.',
                        embeds: [],
                        files: []
                    });

                } else {

                    await interaction.reply({
                        content:
                            '❌ Failed to load the Daily Shop images.'
                    });

                }

            } catch (replyError) {

                console.error(
                    '❌ Could not send Daily Images error:',
                    replyError
                );

            }
        }
    }
};
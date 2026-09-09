console.log('🔥 NEW DAILY.JS LOADED');

const {
    SlashCommandBuilder
} = require('discord.js');

const {
    getLatestDailyResult
} = require('../services/dailyShopTracker');

const {
    createEmbed
} = require('../services/embedStyle');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(
            'Shows what released and was removed from the Fortnite Shop'
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const result = getLatestDailyResult();

            // ==========================================
            // NO RESET DETECTED
            // ==========================================

            if (!result) {
                const embed = createEmbed({
                    title: 'FORTNITE SHOP RESET',
                    description:
                        'No shop reset has been detected yet.\n\n' +
                        'The automatic tracker is watching the Fortnite Item Shop.',
                    timestamp: true
                });

                await interaction.editReply({
                    embeds: [embed]
                });

                return;
            }

            const {
                releasedToday = [],
                removedToday = []
            } = result;

            // ==========================================
            // RELEASED ITEMS
            // ==========================================

            let releasedText;

            if (releasedToday.length > 0) {
                releasedText = releasedToday
                    .map(item => item.name)
                    .join('\n');
            } else {
                releasedText = 'Nothing new released.';
            }

            // ==========================================
            // REMOVED ITEMS
            // ==========================================

            let removedText;

            if (removedToday.length > 0) {
                removedText = removedToday
                    .map(item => item.name)
                    .join('\n');
            } else {
                removedText = 'Nothing removed.';
            }

            // ==========================================
            // EMBED
            // ==========================================

            const embed = createEmbed({
                title: 'FORTNITE SHOP RESET',
                description:
                    'The latest Fortnite Item Shop rotation has been detected.',
                timestamp: false
            });

            // Use actual detection time
            if (result.detectedAt) {
                embed.setTimestamp(
                    new Date(result.detectedAt)
                );
            }

            // ==========================================
            // SHOP CHANGES
            // ==========================================

            embed.addFields(
                {
                    name: `NEW IN THE SHOP  •  ${releasedToday.length}`,
                    value: releasedText,
                    inline: true
                },
                {
                    name: `REMOVED FROM SHOP  •  ${removedToday.length}`,
                    value: removedText,
                    inline: true
                }
            );

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error(
                '❌ Daily command error:',
                error
            );

            // Only try to reply if the interaction is still usable
            try {
                if (
                    interaction.deferred ||
                    interaction.replied
                ) {
                    await interaction.editReply(
                        '❌ Failed to load the Daily Shop results.'
                    );
                } else {
                    await interaction.reply(
                        '❌ Failed to load the Daily Shop results.'
                    );
                }
            } catch (replyError) {
                console.error(
                    '❌ Could not send error response:',
                    replyError
                );
            }
        }
    }
};
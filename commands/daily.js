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
                    title: '🛒 Daily Shop Reset',
                    description:
                        '⏳ **No shop reset has been detected yet.**\n\n' +
                        'The automatic tracker is watching the Fortnite Item Shop.\n\n' +
                        'Once the shop resets, I\'ll detect the changes automatically.',
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

            let description = '';

            // ==========================================
            // RELEASED TODAY
            // ==========================================

            description += '🆕 **RELEASED TODAY**\n\n';

            if (releasedToday.length > 0) {
                description += releasedToday
                    .map(item => `• **${item.name}**`)
                    .join('\n');
            } else {
                description += 'Nothing new released.';
            }

            description += '\n\n';

            // ==========================================
            // REMOVED
            // ==========================================

            description += '❌ **REMOVED**\n\n';

            if (removedToday.length > 0) {
                description += removedToday
                    .map(item => `• **${item.name}**`)
                    .join('\n');
            } else {
                description += 'Nothing removed.';
            }

            // ==========================================
            // EMBED
            // ==========================================

            const embed = createEmbed({
                title: '🛒 Daily Shop Reset',
                description: description,
                timestamp: result.detectedAt
                    ? false
                    : true
            });

            // Use the actual detection time
            if (result.detectedAt) {
                embed.setTimestamp(
                    new Date(result.detectedAt)
                );
            }

            // Keep the counts without replacing
            // the global Amyfn footer
            embed.addFields({
                name: '📊 SHOP CHANGES',
                value:
                    `🆕 **${releasedToday.length}** released\n` +
                    `❌ **${removedToday.length}** removed`,
                inline: true
            });

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
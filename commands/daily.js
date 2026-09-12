const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getLatestDailyResult
} = require('../services/dailyShopTracker');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription(
            'Shows what released and was removed from the Fortnite Shop'
        ),

    async execute(interaction) {
        try {
            const result = getLatestDailyResult();

            const logo = interaction.client.user.displayAvatarURL({
                extension: 'png',
                size: 256
            });

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
                    .addSectionComponents(
                        new SectionBuilder()
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent('# __Fortnite Shop Reset__'),
                                new TextDisplayBuilder()
                                    .setContent(
                                        '**NO SHOP RESET DETECTED**\n\n' +
                                        'Amyfn is currently watching the Fortnite Item Shop. ' +
                                        'The latest reset will appear here once detected.'
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

                return interaction.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const releasedToday = result.releasedToday || [];
            const removedToday = result.removedToday || [];

            const releasedNames = releasedToday
                .map(item => item.name)
                .filter(Boolean);

            const removedNames = removedToday
                .map(item => item.name)
                .filter(Boolean);

            const formatList = (names, emptyText) => {
                if (!names.length) return emptyText;

                // Keep the component compact and readable on large shop resets.
                const MAX_VISIBLE = 24;
                const visible = names.slice(0, MAX_VISIBLE);
                const remaining = names.length - visible.length;

                let text = visible.map(name => `• ${name}`).join('\n');

                if (remaining > 0) {
                    text += `\n\n*+ ${remaining} more*`;
                }

                return text;
            };

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

            // ==========================================
            // MAIN CONTAINER
            // ==========================================

            const container = new ContainerBuilder()
                .setAccentColor(0x1493ff)

                // HEADER
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

                // NEW
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

                // REMOVED
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
                        .setContent(
                            '-# AMYFN • DAILY SHOP TRACKER'
                        )
                );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Daily command error:', error);

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(
                        'Failed to load the Daily Shop results.'
                    );
                } else {
                    await interaction.reply(
                        'Failed to load the Daily Shop results.'
                    );
                }
            } catch (replyError) {
                console.error(
                    'Could not send Daily command error response:',
                    replyError
                );
            }
        }
    }
};

const {
    SlashCommandBuilder,
    ContainerBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    PermissionFlagsBits,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getLatestLeaks,
    getLeakStatus,
    createLeakEmbed,
    sendLeakToGuild
} = require('../services/leakTracker');

module.exports = {

    data: new SlashCommandBuilder()
        .setName('leaks')
        .setDescription('View and test the Fortnite leak system')

        .addSubcommand(sub =>
            sub
                .setName('latest')
                .setDescription('Show the newest leaks')
        )

        .addSubcommand(sub =>
            sub
                .setName('status')
                .setDescription('Check leak tracker status')
        )

        .addSubcommand(sub =>
            sub
                .setName('test')
                .setDescription('Send a test leak to your configured channel')
        ),

    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        // ==========================================
        // LATEST
        // ==========================================

        if (sub === 'latest') {

            await interaction.deferReply();

            try {

                const tweets = await getLatestLeaks();

                if (!tweets.length) {
                    return interaction.editReply({
                        content: 'No leaks were returned.'
                    });
                }

                const latest = tweets.slice(0, 5);

                /*
                 * The actual tweet embeds are still created by
                 * createLeakEmbed() from leakTracker.js.
                 * This keeps tweet content, images and links intact.
                 */
                return interaction.editReply({
                    content:
                        `## Latest Fortnite Leaks\n` +
                        `Showing the ${latest.length} newest leak${latest.length === 1 ? '' : 's'}.`,
                    embeds: latest.map(tweet =>
                        createLeakEmbed(tweet)
                    )
                });

            } catch (error) {

                console.error(
                    'Failed to retrieve latest leaks:',
                    error
                );

                return interaction.editReply({
                    content:
                        'Failed to retrieve the latest leaks.'
                });
            }
        }

        // ==========================================
        // STATUS
        // ==========================================

        if (sub === 'status') {

            const status = getLeakStatus();

            const lastCheck =
                status.lastCheck
                    ? `<t:${Math.floor(
                        new Date(status.lastCheck).getTime() / 1000
                    )}:R>`
                    : 'Waiting for first check...';

            const container =
                new ContainerBuilder()
                    .setAccentColor(0x1493ff)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '# Leak Tracker\n' +
                                'Live status of the Amyfn Fortnite leak monitor.'
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(
                                SeparatorSpacingSize.Small
                            )
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `## Status\n**${
                                    status.active
                                        ? 'Running'
                                        : 'Offline'
                                }`
                            ),

                        new TextDisplayBuilder()
                            .setContent(
                                `## Check Interval\n` +
                                `Every **${status.interval}s**`
                            ),

                        new TextDisplayBuilder()
                            .setContent(
                                `## Tracked Tweets\n` +
                                `**${status.tracked}**`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(
                                SeparatorSpacingSize.Small
                            )
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '## Watching\n' +
                                'HYPEX\n' +
                                'ShiinaBR\n' +
                                'GhostyLeaks4'
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(
                                SeparatorSpacingSize.Small
                            )
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                `## Last Check\n${lastCheck}`
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(
                                SeparatorSpacingSize.Small
                            )
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • LEAK TRACKER'
                            )
                    );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // ==========================================
        // TEST
        // ==========================================

        if (sub === 'test') {

            if (
                !interaction.memberPermissions.has(
                    PermissionFlagsBits.ManageGuild
                )
            ) {

                return interaction.reply({
                    content:
                        'You need Manage Server permission to run a leak test.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const fakeTweet = {
                id: 'TEST',
                username: 'Amyfn',
                displayName: 'Amyfn Test Leak',
                text:
                    'This is a test leak.\n\n' +
                    'Your automatic Fortnite leak channel is working correctly.',
                date: new Date().toISOString(),
                url: 'https://x.com',
                images: [],
                videos: []
            };

            const sent =
                await sendLeakToGuild(
                    client,
                    interaction.guild.id,
                    fakeTweet,
                    true
                );

            if (!sent) {

                return interaction.reply({
                    content:
                        'No leak channel has been configured yet. Use `/setup` first.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const container =
                new ContainerBuilder()
                    .setAccentColor(0x1493ff)

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '# Leak Test Sent\n' +
                                'The test leak was successfully sent to the configured leak channel.'
                            )
                    )

                    .addSeparatorComponents(
                        new SeparatorBuilder()
                            .setSpacing(
                                SeparatorSpacingSize.Small
                            )
                    )

                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • LEAK TRACKER'
                            )
                    );

            return interaction.reply({
                components: [container],
                flags:
                    MessageFlags.Ephemeral |
                    MessageFlags.IsComponentsV2
            });
        }
    }
};

const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    PermissionFlagsBits,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getLatestLeaks,
    getLeakStatus,
    createLeakContainer,
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

                    const container =
                        new ContainerBuilder()
                            .setAccentColor(0x1493ff)

                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent(
                                        '# __Latest Fortnite Leaks__'
                                    ),

                                new TextDisplayBuilder()
                                    .setContent(
                                        '**NO LEAKS FOUND**\n\n' +
                                        'Amyfn did not receive any recent Fortnite leaks.'
                                    )
                            )

                            .addSeparatorComponents(
                                new SeparatorBuilder()
                                    .setDivider(true)
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

                    return interaction.editReply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                const latest =
                    tweets
                        .slice(0, 5);

                const logo =
                    interaction.client.user.displayAvatarURL({
                        extension: 'png',
                        size: 256
                    });

                const separator =
                    () =>
                        new SeparatorBuilder()
                            .setDivider(true)
                            .setSpacing(
                                SeparatorSpacingSize.Small
                            );

                const header =
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(
                                    '# __Latest Fortnite Leaks__'
                                ),

                            new TextDisplayBuilder()
                                .setContent(
                                    `**${latest.length}** newest leak${latest.length === 1 ? '' : 's'} detected by Amyfn.`
                                )
                        )
                        .setThumbnailAccessory(
                            thumbnail =>
                                thumbnail
                                    .setURL(logo)
                                    .setDescription('Amyfn logo')
                        );

                const container =
                    new ContainerBuilder()
                        .setAccentColor(0x1493ff)
                        .addSectionComponents(
                            header
                        )
                        .addSeparatorComponents(
                            separator()
                        );

                /*
                 * Keep each leak visually separate inside the same
                 * Components V2 container.
                 *
                 * Videos/images are intentionally handled below as
                 * attachments where applicable.
                 */
                for (
                    let i = 0;
                    i < latest.length;
                    i++
                ) {

                    const tweet =
                        latest[i];

                    const author =
                        tweet.displayName ||
                        tweet.username ||
                        'Unknown Leaker';

                    const username =
                        tweet.username
                            ? `(@${tweet.username})`
                            : '';

                    const tweetText =
                        tweet.text ||
                        '*No tweet text*';

                    const tweetLink =
                        tweet.url ||
                        'https://x.com';

                    container
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(
                                    `## ${i + 1}. ${author} ${username}\n\n` +
                                    tweetText
                                ),

                            new TextDisplayBuilder()
                                .setContent(
                                    `🔗 **[View Original Post](${tweetLink})**`
                                )
                        );

                    if (
                        i <
                        latest.length - 1
                    ) {
                        container.addSeparatorComponents(
                            separator()
                        );
                    }
                }

                container
                    .addSeparatorComponents(
                        separator()
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '-# AMYFN • FORTNITE LEAK TRACKER'
                            )
                    );

                /*
                 * /leaks latest returns the V2 panel.
                 *
                 * We deliberately do not try to embed remote X videos
                 * inside the container. The automatic tracker already
                 * handles native Discord video attachments through
                 * sendLeakToGuild().
                 */
                return interaction.editReply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
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
                            .setDivider(true)
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
                            .setDivider(true)
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
                            .setDivider(true)
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
                            .setDivider(true)
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
                            .setDivider(true)
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

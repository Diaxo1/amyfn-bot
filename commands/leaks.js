const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    PermissionFlagsBits,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getLatestLeaks,
    getLeakStatus,
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

                const latest = tweets.slice(0, 5);

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

                /*
                 * X/Twitter sometimes returns HTML entities in tweet text.
                 * Decode the common ones so the Discord message shows
                 * "&" instead of "&amp;", etc.
                 */
                const decodeText = (text) => {
                    if (!text) return '*No tweet text*';

                    return String(text)
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&#x27;/gi, "'")
                        .replace(/&nbsp;/g, ' ');
                };

                /*
                 * Build ONE container per leak.
                 *
                 * This is intentional:
                 * - Each leak gets its own Discord message.
                 * - Leaks are no longer merged into one giant panel.
                 * - Tweet images are rendered inside the V2 container
                 *   using MediaGalleryBuilder.
                 */
                const buildLeakContainer = (tweet, index) => {

                    const author =
                        tweet.displayName ||
                        tweet.username ||
                        'Unknown Leaker';

                    const username =
                        tweet.username
                            ? `(@${tweet.username})`
                            : '';

                    const tweetText =
                        decodeText(tweet.text);

                    const tweetLink =
                        tweet.url ||
                        'https://x.com';

                    const container =
                        new ContainerBuilder()
                            .setAccentColor(0x1493ff)

                            .addSectionComponents(
                                new SectionBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder()
                                            .setContent(
                                                `# __Fortnite Leak #${index + 1}__`
                                            ),

                                        new TextDisplayBuilder()
                                            .setContent(
                                                `**${author}** ${username}`
                                            )
                                    )
                                    .setThumbnailAccessory(
                                        thumbnail =>
                                            thumbnail
                                                .setURL(logo)
                                                .setDescription('Amyfn logo')
                                    )
                            )

                            .addSeparatorComponents(
                                separator()
                            )

                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent(
                                        tweetText
                                    )
                            );

                    /*
                     * Put tweet images INSIDE the V2 container.
                     * Limit to Discord's media-gallery item limit.
                     */
                    const images =
                        Array.isArray(tweet.images)
                            ? tweet.images
                                .filter(Boolean)
                                .slice(0, 10)
                            : [];

                    if (images.length) {

                        const gallery =
                            new MediaGalleryBuilder();

                        for (const image of images) {

                            gallery.addItems(
                                new MediaGalleryItemBuilder()
                                    .setURL(image)
                            );
                        }

                        container
                            .addSeparatorComponents(
                                separator()
                            )
                            .addMediaGalleryComponents(
                                gallery
                            );
                    }

                    /*
                     * If a tweet has a video but it is not being downloaded
                     * for this command, keep the video link visible inside
                     * the V2 panel rather than silently losing it.
                     */
                    const videos =
                        Array.isArray(tweet.videos)
                            ? tweet.videos.filter(Boolean)
                            : [];

                    if (videos.length) {

                        container
                            .addSeparatorComponents(
                                separator()
                            )
                            .addTextDisplayComponents(
                                new TextDisplayBuilder()
                                    .setContent(
                                        `🎥 **[Watch Video](${videos[0]})**`
                                    )
                            );
                    }

                    container
                        .addSeparatorComponents(
                            separator()
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder()
                                .setContent(
                                    `🔗 **[View Original Post](${tweetLink})**`
                                ),

                            new TextDisplayBuilder()
                                .setContent(
                                    '-# AMYFN • FORTNITE LEAK TRACKER'
                                )
                        );

                    return container;
                };

                /*
                 * Send each leak separately.
                 *
                 * First leak replaces the deferred interaction.
                 * Remaining leaks are follow-up messages.
                 */
                for (
                    let i = 0;
                    i < latest.length;
                    i++
                ) {

                    const container =
                        buildLeakContainer(
                            latest[i],
                            i
                        );

                    const payload = {
                        components: [container],
                        flags: MessageFlags.IsComponentsV2
                    };

                    if (i === 0) {

                        await interaction.editReply(
                            payload
                        );

                    } else {

                        await interaction.followUp(
                            payload
                        );
                    }
                }

                return;

            } catch (error) {

                console.error(
                    'Failed to retrieve latest leaks:',
                    error
                );

                if (interaction.deferred || interaction.replied) {

                    return interaction.editReply({
                        content:
                            'Failed to retrieve the latest leaks.'
                    });
                }

                return interaction.reply({
                    content:
                        'Failed to retrieve the latest leaks.',
                    flags: MessageFlags.Ephemeral
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

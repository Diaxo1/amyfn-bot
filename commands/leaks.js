const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const {
    getLatestLeaks,
    getLeakStatus,
    createLeakEmbed,
    sendLeakToGuild
} = require('../services/leakTracker');

module.exports = {

    data:
        new SlashCommandBuilder()

            .setName('leaks')

            .setDescription(
                'View and test the Fortnite leak system'
            )

            .addSubcommand(sub =>
                sub
                    .setName('latest')
                    .setDescription(
                        'Show the newest leaks'
                    )
            )

            .addSubcommand(sub =>
                sub
                    .setName('status')
                    .setDescription(
                        'Check leak tracker status'
                    )
            )

            .addSubcommand(sub =>
                sub
                    .setName('test')
                    .setDescription(
                        'Send a test leak to your configured channel'
                    )
            ),

    async execute(interaction, client) {

        const sub =
            interaction.options.getSubcommand();

        if (sub === 'latest') {

            await interaction.deferReply();

            const tweets =
                await getLatestLeaks();

            if (!tweets.length) {

                await interaction.editReply(
                    '❌ No leaks were returned.'
                );

                return;
            }

            const latest =
                tweets.slice(0, 5);

            await interaction.editReply({
                embeds:
                    latest.map(tweet =>
                        createLeakEmbed(tweet)
                    )
            });

            return;
        }

        if (sub === 'status') {

            const status =
                getLeakStatus();

            const embed =
                new EmbedBuilder()

                    .setColor(0x57F287)

                    .setTitle(
                        '🕵️ Leak Tracker Status'
                    )

                    .addFields(
                        {
                            name: 'Status',
                            value: '🟢 Running',
                            inline: true
                        },
                        {
                            name: 'Checking',
                            value:
                                `Every ${status.interval}s`,
                            inline: true
                        },
                        {
                            name: 'Tracked Tweets',
                            value:
                                `${status.tracked}`,
                            inline: true
                        },
                        {
                            name: 'Watching',
                            value:
                                '• HYPEX\n• ShiinaBR\n• GhostyLeaks4'
                        },
                        {
                            name: 'Last Check',
                            value:
                                status.lastCheck
                                    ? `<t:${Math.floor(new Date(status.lastCheck).getTime() / 1000)}:R>`
                                    : 'Waiting...'
                        }
                    )

                    .setFooter({
                        text:
                            'Amyfn • Leak System'
                    });

            await interaction.reply({
                embeds: [embed]
            });

            return;
        }

        if (sub === 'test') {

            if (
                !interaction.memberPermissions.has(
                    PermissionFlagsBits.ManageGuild
                )
            ) {

                await interaction.reply({
                    content:
                        '❌ You need Manage Server permission.',
                    ephemeral: true
                });

                return;
            }

            const fakeTweet = {
                id: 'TEST',
                username: 'Amyfn',
                displayName: 'Amyfn Test Leak',
                text:
                    '🚨 This is a test leak!\n\nYour automatic Fortnite leak channel is working perfectly.',
                date:
                    new Date().toISOString(),
                url:
                    'https://x.com',
                images: []
            };

            const sent =
                await sendLeakToGuild(
                    client,
                    interaction.guild.id,
                    fakeTweet,
                    true
                );

            if (!sent) {

                await interaction.reply({
                    content:
                        '❌ No leak channel has been configured yet. Use `/setup` first.',
                    ephemeral: true
                });

                return;
            }

            await interaction.reply({
                content:
                    '✅ Test leak sent successfully!',
                ephemeral: true
            });

            return;
        }

    }

};
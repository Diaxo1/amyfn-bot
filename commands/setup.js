const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    AttachmentBuilder
} = require('discord.js');

const path = require('path');

const {
    setServerConfig,
    getServerConfig
} = require('../services/serverConfig');

const {
    createEmbed
} = require('../services/embedStyle');

module.exports = {

    data: new SlashCommandBuilder()

        .setName('setup')

        .setDescription(
            'Configure Amyfn automatic Fortnite announcements'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )

        // ==========================================
        // DAILY SHOP
        // ==========================================

        .addChannelOption(option =>
            option
                .setName('daily_channel')
                .setDescription(
                    'Channel for Daily Shop announcements'
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(false)
        )

        .addRoleOption(option =>
            option
                .setName('daily_role')
                .setDescription(
                    'Role to ping for Daily Shop announcements'
                )
                .setRequired(false)
        )

        // ==========================================
        // NEWS + LEAKS
        // ==========================================

        .addChannelOption(option =>
            option
                .setName('updates_channel')
                .setDescription(
                    'Channel for Fortnite News and Leak announcements'
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(false)
        )

        .addRoleOption(option =>
            option
                .setName('updates_role')
                .setDescription(
                    'Role to ping for Fortnite News and Leak announcements'
                )
                .setRequired(false)
        )

        // ==========================================
        // LOGGING
        // ==========================================

        .addChannelOption(option =>
            option
                .setName('logs_channel')
                .setDescription(
                    'Channel where Amyfn sends server logs'
                )
                .addChannelTypes(
                    ChannelType.GuildText
                )
                .setRequired(false)
        ),

    async execute(interaction) {

        try {

            await interaction.deferReply();

            // ==========================================
            // SERVER CHECK
            // ==========================================

            if (!interaction.guild) {

                await interaction.editReply(
                    '❌ This command can only be used inside a server.'
                );

                return;
            }

            console.log(
                `⚙️ Processing setup for ${interaction.guild.name}`
            );

            // ==========================================
            // EXISTING CONFIG
            // ==========================================

            const existingConfig =
                getServerConfig(
                    interaction.guild.id
                ) || {};

            // ==========================================
            // OPTIONS
            // ==========================================

            const dailyChannel =
                interaction.options.getChannel(
                    'daily_channel'
                );

            const dailyRole =
                interaction.options.getRole(
                    'daily_role'
                );

            const updatesChannel =
                interaction.options.getChannel(
                    'updates_channel'
                );

            const updatesRole =
                interaction.options.getRole(
                    'updates_role'
                );

            const logsChannel =
                interaction.options.getChannel(
                    'logs_channel'
                );

            // ==========================================
            // PRESERVE EXISTING SETTINGS
            // ==========================================

            const finalDailyChannelId =
                dailyChannel?.id ??
                existingConfig.channelId ??
                null;

            const finalDailyRoleId =
                dailyRole?.id ??
                existingConfig.roleId ??
                null;

            const finalUpdatesChannelId =
                updatesChannel?.id ??
                existingConfig.updatesChannelId ??
                null;

            const finalUpdatesRoleId =
                updatesRole?.id ??
                existingConfig.updatesRoleId ??
                null;

            const finalLogsChannelId =
                logsChannel?.id ??
                existingConfig.logsChannelId ??
                null;

            // ==========================================
            // SAVE CONFIG
            // ==========================================

            setServerConfig(
                interaction.guild.id,
                {
                    channelId:
                        finalDailyChannelId,

                    roleId:
                        finalDailyRoleId,

                    updatesChannelId:
                        finalUpdatesChannelId,

                    updatesRoleId:
                        finalUpdatesRoleId,

                    logsChannelId:
                        finalLogsChannelId
                }
            );

            // ==========================================
            // FETCH SAVED OBJECTS
            // ==========================================

            let savedDailyChannel =
                dailyChannel || null;

            let savedDailyRole =
                dailyRole || null;

            let savedUpdatesChannel =
                updatesChannel || null;

            let savedUpdatesRole =
                updatesRole || null;

            let savedLogsChannel =
                logsChannel || null;

            try {

                if (
                    !savedDailyChannel &&
                    finalDailyChannelId
                ) {

                    savedDailyChannel =
                        await interaction.guild.channels.fetch(
                            finalDailyChannelId
                        );
                }

                if (
                    !savedDailyRole &&
                    finalDailyRoleId
                ) {

                    savedDailyRole =
                        await interaction.guild.roles.fetch(
                            finalDailyRoleId
                        );
                }

                if (
                    !savedUpdatesChannel &&
                    finalUpdatesChannelId
                ) {

                    savedUpdatesChannel =
                        await interaction.guild.channels.fetch(
                            finalUpdatesChannelId
                        );
                }

                if (
                    !savedUpdatesRole &&
                    finalUpdatesRoleId
                ) {

                    savedUpdatesRole =
                        await interaction.guild.roles.fetch(
                            finalUpdatesRoleId
                        );
                }

                if (
                    !savedLogsChannel &&
                    finalLogsChannelId
                ) {

                    savedLogsChannel =
                        await interaction.guild.channels.fetch(
                            finalLogsChannelId
                        );
                }

            } catch (fetchError) {

                console.log(
                    '⚠️ Could not fetch one or more saved setup objects:',
                    fetchError.message
                );

            }

            // ==========================================
            // STATUS
            // ==========================================

            const dailyStatus =
                savedDailyChannel

                    ? `🟢 **Configured**\n` +
                      `> 📢 Channel: ${savedDailyChannel}\n` +
                      `> 🔔 Role: ${
                          savedDailyRole ||
                          'None'
                      }`

                    : `⚪ **Not configured**\n` +
                      `> Use \`daily_channel\` to choose a channel.`;

            const updatesStatus =
                savedUpdatesChannel

                    ? `🟢 **Configured**\n` +
                      `> 📢 Channel: ${savedUpdatesChannel}\n` +
                      `> 🔔 Role: ${
                          savedUpdatesRole ||
                          'None'
                      }`

                    : `⚪ **Not configured**\n` +
                      `> Use \`updates_channel\` to choose a channel.`;

            const logsStatus =
                savedLogsChannel

                    ? `🟢 **Configured**\n` +
                      `> 📋 Channel: ${savedLogsChannel}`

                    : `⚪ **Not configured**\n` +
                      `> Use \`logs_channel\` to choose a channel.`;

            // ==========================================
            // SETUP BANNER
            // ==========================================

            const bannerPath =
                path.join(
                    __dirname,
                    '..',
                    'assets',
                    'setup-banner.png'
                );

            const banner =
                new AttachmentBuilder(
                    bannerPath,
                    {
                        name: 'setup-banner.png'
                    }
                );

            // ==========================================
            // EMBED
            // ==========================================

            const embed =
                createEmbed({

                    title:
                        '⚙️ Amyfn Server Setup',

                    description:
                        'Configure where Amyfn sends automatic Fortnite updates and server logs.\n\n' +
                        'Your current configuration is shown below.',

                    image:
                        'attachment://setup-banner.png',

                    fields: [

                        {
                            name:
                                '🛒 DAILY SHOP',

                            value:
                                dailyStatus,

                            inline:
                                false
                        },

                        {
                            name:
                                '📡 NEWS & LEAKS',

                            value:
                                updatesStatus,

                            inline:
                                false
                        },

                        {
                            name:
                                '📋 SERVER LOGGING',

                            value:
                                logsStatus,

                            inline:
                                false
                        },

                        {
                            name:
                                '💡 AUTOMATIC UPDATES',

                            value:
                                '🛒 **Daily Shop** → Shop changes and daily announcements\n' +
                                '📰 **News** → Fortnite news posted to News & Leaks\n' +
                                '🕵️ **Leaks** → Fortnite leaks posted to News & Leaks\n' +
                                '📋 **Logs** → Important server events posted to Logs',

                            inline:
                                false
                        },

                        {
                            name:
                                '🔧 SETUP OPTIONS',

                            value:
                                '`daily_channel` • `daily_role`\n' +
                                '`updates_channel` • `updates_role`\n' +
                                '`logs_channel`',

                            inline:
                                false
                        }

                    ]

                });

            // ==========================================
            // SEND
            // ==========================================

            await interaction.editReply({

                embeds: [
                    embed
                ],

                files: [
                    banner
                ]

            });

            console.log(
                '✅ Setup completed successfully.'
            );

        } catch (error) {

            console.error(
                '❌ Setup command error:',
                error
            );

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply({

                        content:
                            '❌ Failed to save the server setup.',

                        embeds: [],

                        files: []

                    });

                } else {

                    await interaction.reply({

                        content:
                            '❌ Failed to save the server setup.'

                    });

                }

            } catch (replyError) {

                console.error(
                    '❌ Could not send setup error response:',
                    replyError
                );

            }

        }

    }

};
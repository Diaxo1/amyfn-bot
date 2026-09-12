const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    setServerConfig,
    getServerConfig
} = require('../services/serverConfig');


// ==========================================
// COMMAND
// ==========================================

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


    // ==========================================
    // EXECUTE
    // ==========================================

    async execute(interaction) {

        try {

            await interaction.deferReply({
                flags: MessageFlags.IsComponentsV2
            });


            // ==========================================
            // SERVER CHECK
            // ==========================================

            if (!interaction.guild) {

                await interaction.editReply({

                    components: [
                        new TextDisplayBuilder()
                            .setContent(
                                '## ❌ Server Only\n\n' +
                                '> This command can only be used inside a server.'
                            )
                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

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
            // AMYFN LOGO
            // ==========================================

            const amyfnLogo =
                interaction.client.user.displayAvatarURL({
                    extension: 'png',
                    size: 256
                });


            // ==========================================
            // HEADER
            // ==========================================

            const header =
                new SectionBuilder()

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(
                                '# __⚙️ Amyfn Server Setup__'
                            ),

                        new TextDisplayBuilder()
                            .setContent(
                                '**CONFIGURE AMYFN FOR YOUR FORTNITE SERVER.**\n\n' +

                                '> Choose where Amyfn sends automatic Fortnite updates, ' +
                                'leaks, news and server logs.\n\n' +

                                '> Your current configuration is shown below.'
                            )

                    )

                    .setThumbnailAccessory(
                        thumbnail =>
                            thumbnail
                                .setURL(amyfnLogo)
                                .setDescription(
                                    'Amyfn logo'
                                )
                    );


            // ==========================================
            // REAL SEPARATOR
            // ==========================================

            const separator =
                () =>
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(
                            SeparatorSpacingSize.Small
                        );


            // ==========================================
            // DAILY SHOP
            // ==========================================

            const dailySection =
                new TextDisplayBuilder()
                    .setContent(

                        '## 🛒 Daily Shop\n\n' +
                        dailyStatus

                    );


            // ==========================================
            // NEWS & LEAKS
            // ==========================================

            const updatesSection =
                new TextDisplayBuilder()
                    .setContent(

                        '## 📡 News & Leaks\n\n' +
                        updatesStatus

                    );


            // ==========================================
            // LOGGING
            // ==========================================

            const logsSection =
                new TextDisplayBuilder()
                    .setContent(

                        '## 📋 Server Logging\n\n' +
                        logsStatus

                    );


            // ==========================================
            // AUTOMATIC UPDATES
            // ==========================================

            const automaticSection =
                new TextDisplayBuilder()
                    .setContent(

                        '## 💡 Automatic Updates\n\n' +

                        '🛒 **Daily Shop**\n' +
                        '> Shop changes and daily announcements.\n\n' +

                        '📰 **News**\n' +
                        '> Fortnite news posted to your News & Leaks channel.\n\n' +

                        '🕵️ **Leaks**\n' +
                        '> Fortnite leaks posted to your News & Leaks channel.\n\n' +

                        '📋 **Logs**\n' +
                        '> Important server events posted to your Logs channel.'

                    );


            // ==========================================
            // SETUP OPTIONS
            // ==========================================

            const optionsSection =
                new TextDisplayBuilder()
                    .setContent(

                        '## 🔧 Setup Options\n\n' +

                        '`daily_channel` • `daily_role`\n' +
                        '`updates_channel` • `updates_role`\n' +
                        '`logs_channel`\n\n' +

                        '🔒 **Manage Server permission required.**'

                    );


            // ==========================================
            // FOOTER
            // ==========================================

            const footer =
                new TextDisplayBuilder()
                    .setContent(
                        '-# AMYFN • SERVER CONFIGURATION'
                    );


            // ==========================================
            // MAIN CONTAINER
            // ==========================================

            const container =
                new ContainerBuilder()

                    .setAccentColor(
                        0x1493ff
                    )

                    // HEADER
                    .addSectionComponents(
                        header
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    // DAILY SHOP
                    .addTextDisplayComponents(
                        dailySection
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    // NEWS & LEAKS
                    .addTextDisplayComponents(
                        updatesSection
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    // LOGGING
                    .addTextDisplayComponents(
                        logsSection
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    // AUTOMATIC UPDATES
                    .addTextDisplayComponents(
                        automaticSection
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    // OPTIONS
                    .addTextDisplayComponents(
                        optionsSection
                    )

                    .addSeparatorComponents(
                        separator()
                    )

                    // FOOTER
                    .addTextDisplayComponents(
                        footer
                    );


            // ==========================================
            // SEND
            // ==========================================

            await interaction.editReply({

                components: [
                    container
                ],

                flags:
                    MessageFlags.IsComponentsV2

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

                        components: [

                            new TextDisplayBuilder()
                                .setContent(
                                    '## ❌ Setup Error\n\n' +
                                    '> Failed to save the server setup.'
                                )

                        ],

                        flags:
                            MessageFlags.IsComponentsV2

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
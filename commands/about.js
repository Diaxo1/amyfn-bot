const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');


// ==========================================
// LINKS
// ==========================================

const DASHBOARD_URL =
    process.env.AMYFN_DASHBOARD_URL ||
    'https://amyfn.up.railway.app/';

const SUPPORT_URL =
    process.env.AMYFN_SUPPORT_URL ||
    'https://discord.gg/mwNKev8ZEY';

const INVITE_URL =
    process.env.AMYFN_INVITE_URL ||
    'https://discord.com/oauth2/authorize?client_id=1545634405412905090&permissions=8&scope=bot%20applications.commands';


// ==========================================
// COMMAND
// ==========================================

module.exports = {

    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription(
            'Learn more about Amyfn and its features'
        ),


    async execute(interaction) {

        console.log('ℹ️ Calling ABOUT handler...');


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
                            '# __About Amyfn__'
                        ),

                    new TextDisplayBuilder()
                        .setContent(
                            '**YOUR ALL-IN-ONE FORTNITE DISCORD COMPANION.**\n\n' +
                            '> Amyfn brings Fortnite updates, Item Shop tracking, cosmetics, leaks, news, giveaways and moderation directly to your Discord server.\n\n' +
                            '> Built for players, creators and communities who live and breathe Fortnite.'
                        )
                )

                .setThumbnailAccessory(
                    thumbnail =>
                        thumbnail
                            .setURL(amyfnLogo)
                            .setDescription('Amyfn logo')
                );


        // ==========================================
        // FEATURES
        // ==========================================

        const features =
            new TextDisplayBuilder()
                .setContent(
                    '## ⚡ Features\n\n' +

                    '**🛒 Daily Shop**\n' +
                    '> Automatically track the Fortnite Item Shop and get fresh updates.\n\n' +

                    '**👕 Cosmetics**\n' +
                    '> Search and discover Fortnite cosmetics quickly and easily.\n\n' +

                    '**🔭 Leaks**\n' +
                    '> Stay ahead with the latest Fortnite leaks from trusted sources.\n\n' +

                    '**📰 News**\n' +
                    '> Keep your community updated with the latest Fortnite news.\n\n' +

                    '**🎁 Giveaways**\n' +
                    '> Run and manage giveaways directly through your Discord server.\n\n' +

                    '**🛡️ Moderation**\n' +
                    '> Powerful tools to help keep your community clean and organized.'
                );


        // ==========================================
        // COMMUNITY SECTION
        // ==========================================

        const community =
            new TextDisplayBuilder()
                .setContent(
                    '## 👥 Built for Fortnite Communities\n\n' +

                    '> Whether you are a casual player, competitive grinder, ' +
                    'content creator or running a full Fortnite community — ' +
                    '**Amyfn keeps your server informed, connected and ahead of the game.**'
                );


        // ==========================================
        // SUPPORT SECTION
        // ==========================================

        const support =
            new TextDisplayBuilder()
                .setContent(
                    '## 💙 Support Amyfn\n\n' +

                    '> Support the project by using Fortnite Shop Code **`XAID`** ' +
                    'when purchasing items from the Fortnite Item Shop.\n\n' +

                    'Every bit of support helps keep Amyfn growing. ❤️'
                );


        // ==========================================
        // FOOTER
        // ==========================================

        const footer =
            new TextDisplayBuilder()
                .setContent(
                    '-# AMYFN • YOUR FORTNITE COMPANION'
                );


        // ==========================================
        // SEPARATORS
        // ==========================================

        const separator =
            () =>
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    );


        // ==========================================
        // MAIN CONTAINER
        // ==========================================

        const container =
            new ContainerBuilder()

                .setAccentColor(0x1493ff)

                // HEADER
                .addSectionComponents(
                    header
                )

                // REAL DIVIDER
                .addSeparatorComponents(
                    separator()
                )

                // FEATURES
                .addTextDisplayComponents(
                    features
                )

                // REAL DIVIDER
                .addSeparatorComponents(
                    separator()
                )

                // COMMUNITY
                .addTextDisplayComponents(
                    community
                )

                // REAL DIVIDER
                .addSeparatorComponents(
                    separator()
                )

                // SUPPORT
                .addTextDisplayComponents(
                    support
                )

                // REAL DIVIDER
                .addSeparatorComponents(
                    separator()
                )

                // FOOTER
                .addTextDisplayComponents(
                    footer
                );


        // ==========================================
        // BUTTONS
        // ==========================================

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setLabel('Configure Amyfn')
                        .setEmoji('⚙️')
                        .setStyle(ButtonStyle.Link)
                        .setURL(DASHBOARD_URL),

                    new ButtonBuilder()
                        .setLabel('Support Server')
                        .setEmoji('💬')
                        .setStyle(ButtonStyle.Link)
                        .setURL(SUPPORT_URL),

                    new ButtonBuilder()
                        .setLabel('Invite Amyfn')
                        .setEmoji('➕')
                        .setStyle(ButtonStyle.Link)
                        .setURL(INVITE_URL)

                );


        // ==========================================
        // SEND
        // ==========================================

        await interaction.reply({

            components: [
                container,
                buttons
            ],

            flags:
                MessageFlags.IsComponentsV2

        });

    }

};
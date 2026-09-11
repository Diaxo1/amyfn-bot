const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const path = require('path');

// ==========================================
// BANNER
// ==========================================

const ABOUT_BANNER = path.join(
    __dirname,
    '..',
    'assets',
    'about-banner.png'
);

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

        console.log(
            'ℹ️ Calling ABOUT handler...'
        );

        const embed =
            new EmbedBuilder()

                // ==================================
                // COLOR
                // ==================================

                .setColor(0x1493ff)

                // ==================================
                // TITLE
                // ==================================

                .setTitle(
                    '👑 About Amyfn'
                )

                // ==================================
                // DESCRIPTION
                // ==================================

                .setDescription(
                    '**Your all-in-one Fortnite Discord companion.**\n\n' +

                    'Amyfn brings Fortnite updates, Item Shop tracking, ' +
                    'cosmetics, leaks, news, giveaways and more directly ' +
                    'to your Discord server.\n\n' +

                    'Built for players, creators and communities ' +
                    'who live and breathe Fortnite.'
                )

                // ==================================
                // BANNER
                // ==================================

                .setImage(
                    'attachment://about-banner.png'
                )

                // ==================================
                // FEATURES
                // ==================================

                .addFields(

                    {
                        name: '✨ What Amyfn can do',
                        value:
                            'ㅤ',
                        inline: false
                    },

                    {
                        name: '🛒 Daily Shop',
                        value:
                            'Track the Fortnite Item Shop with fresh updates.',
                        inline: true
                    },

                    {
                        name: '👕 Cosmetics',
                        value:
                            'Search and view Fortnite cosmetics with ease.',
                        inline: true
                    },

                    {
                        name: '🔭 Leaks',
                        value:
                            'Get the latest Fortnite leaks from trusted sources.',
                        inline: true
                    },

                    {
                        name: '📰 News',
                        value:
                            'Stay updated with the latest Fortnite news.',
                        inline: true
                    },

                    {
                        name: '🎁 Giveaways',
                        value:
                            'Run and manage giveaways for your community.',
                        inline: true
                    },

                    {
                        name: '🛡️ Moderation',
                        value:
                            'Keep your Discord server clean and safe.',
                        inline: true
                    },

                    {
                        name: '🎯 Built for Fortnite communities.',
                        value:
                            'Whether you are a casual player, a competitive grinder, ' +
                            'or a content creator — Amyfn is here to keep you informed, ' +
                            'connected and ahead of the game.',
                        inline: false
                    },

                    // ==================================
                    // SHOP CODE
                    // ==================================

                    {
                        name: '💙 Support Amyfn',
                        value:
                            'Please use Fortnite Shop Code **`XAID`** when ' +
                            'purchasing items in the Fortnite Item Shop. ' +
                            'It helps support the creator! ❤️',
                        inline: false
                    }

                )

                // ==================================
                // FOOTER
                // ==================================

                .setFooter({
                    text:
                        'AMYFN • Your Fortnite Companion • Track • Discover • Stay Updated • Together'
                })

                .setTimestamp();


        // ==========================================
        // BUTTONS
        // ==========================================

        const buttons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setLabel(
                            'Configure Amyfn'
                        )
                        .setEmoji('⚙️')
                        .setStyle(
                            ButtonStyle.Link
                        )
                        .setURL(
                            DASHBOARD_URL
                        ),

                    new ButtonBuilder()
                        .setLabel(
                            'Support Server'
                        )
                        .setEmoji('💬')
                        .setStyle(
                            ButtonStyle.Link
                        )
                        .setURL(
                            SUPPORT_URL
                        ),

                    new ButtonBuilder()
                        .setLabel(
                            'Invite Amyfn'
                        )
                        .setEmoji('➕')
                        .setStyle(
                            ButtonStyle.Link
                        )
                        .setURL(
                            INVITE_URL
                        )

                );


        // ==========================================
        // SEND
        // ==========================================

        await interaction.reply({

            embeds: [
                embed
            ],

            files: [
                new AttachmentBuilder(
                    ABOUT_BANNER
                ).setName(
                    'about-banner.png'
                )
            ],

            components: [
                buttons
            ]

        });

    }

};
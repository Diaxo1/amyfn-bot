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
        .setName('help')
        .setDescription('Shows all Amyfn commands and features'),


    async execute(interaction) {

        console.log('ℹ️ Calling HELP handler...');


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
                            '# __💙 Amyfn Help Center__'
                        ),

                    new TextDisplayBuilder()
                        .setContent(
                            '**YOUR ALL-IN-ONE FORTNITE COMMUNITY BOT.**\n\n' +

                            '> Welcome to **Amyfn** — your all-in-one Fortnite community bot. 🎮\n\n' +

                            '> Use the commands below to explore Fortnite cosmetics, ' +
                            'the Item Shop, news, leaks, giveaways, quizzes and more.'
                        )

                )

                .setThumbnailAccessory(
                    thumbnail =>
                        thumbnail
                            .setURL(amyfnLogo)
                            .setDescription('Amyfn logo')
                );


        // ==========================================
        // SHOP
        // ==========================================

        const shop =
            new TextDisplayBuilder()
                .setContent(

                    '## 🛒 Fortnite Shop\n\n' +

                    '**`/shop`**\n' +
                    '> Browse the current Fortnite Item Shop.\n\n' +

                    '**`/daily`**\n' +
                    '> See what was added and removed in the latest shop reset.\n\n' +

                    '**`/dailyimages`**\n' +
                    '> View images of cosmetics from the latest shop reset.'

                );


        // ==========================================
        // COSMETICS
        // ==========================================

        const cosmetics =
            new TextDisplayBuilder()
                .setContent(

                    '## 🔎 Cosmetics\n\n' +

                    '**`/cosmetic [name]`**\n' +
                    '> Search for a specific Fortnite cosmetic.\n\n' +

                    '**`/feature`**\n' +
                    '> Discover the newest Fortnite cosmetics.'

                );


        // ==========================================
        // NEWS & LEAKS
        // ==========================================

        const news =
            new TextDisplayBuilder()
                .setContent(

                    '## 📰 News & Leaks\n\n' +

                    '**`/news`**\n' +
                    '> Get the latest Fortnite news.\n\n' +

                    '**`/leaks`**\n' +
                    '> Check the latest Fortnite leaks detected by Amyfn.'

                );


        // ==========================================
        // QUIZ
        // ==========================================

        const quiz =
            new TextDisplayBuilder()
                .setContent(

                    '## 🧠 Fortnite Quiz\n\n' +

                    '**`/fortnitequiz`**\n' +
                    '> Test your Fortnite knowledge with a random trivia question.\n\n' +

                    '> Answer using the **A / B / C / D** buttons and see instantly ' +
                    'if you got it right.'

                );


        // ==========================================
        // GIVEAWAYS
        // ==========================================

        const giveaways =
            new TextDisplayBuilder()
                .setContent(

                    '## 🎁 Giveaways\n\n' +

                    '**`/giveaway`**\n' +
                    '> Create and manage Fortnite giveaways in your server.\n\n' +

                    '> Amyfn can handle entries, winners, ending giveaways and rerolls.'

                );


        // ==========================================
        // SERVER SETUP
        // ==========================================

        const setup =
            new TextDisplayBuilder()
                .setContent(

                    '## ⚙️ Server Setup\n\n' +

                    '**`/setup`**\n' +
                    '> Configure Amyfn for automatic Fortnite updates in your server.\n\n' +

                    '**After setup, Amyfn can automatically:**\n' +
                    '> • Detect Item Shop changes\n' +
                    '> • Post Daily Shop updates\n' +
                    '> • Ping your selected role\n' +
                    '> • Send newly released cosmetic images\n\n' +

                    '🔒 **Requires Manage Server permission.**'

                );


        // ==========================================
        // UTILITY
        // ==========================================

        const utility =
            new TextDisplayBuilder()
                .setContent(

                    '## 🏓 Utility\n\n' +

                    '**`/ping`**\n' +
                    '> Check if Amyfn is online and responding.\n\n' +

                    '**`/help`**\n' +
                    '> Open this help menu.'

                );


        // ==========================================
        // FOOTER
        // ==========================================

        const footer =
            new TextDisplayBuilder()
                .setContent(
                    '-# AMYFN • FORTNITE COMMUNITY BOT'
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
        // MAIN CONTAINER
        // ==========================================

        const container =
            new ContainerBuilder()

                .setAccentColor(0x1493ff)

                // HEADER
                .addSectionComponents(
                    header
                )

                .addSeparatorComponents(
                    separator()
                )

                // SHOP
                .addTextDisplayComponents(
                    shop
                )

                .addSeparatorComponents(
                    separator()
                )

                // COSMETICS
                .addTextDisplayComponents(
                    cosmetics
                )

                .addSeparatorComponents(
                    separator()
                )

                // NEWS
                .addTextDisplayComponents(
                    news
                )

                .addSeparatorComponents(
                    separator()
                )

                // QUIZ
                .addTextDisplayComponents(
                    quiz
                )

                .addSeparatorComponents(
                    separator()
                )

                // GIVEAWAYS
                .addTextDisplayComponents(
                    giveaways
                )

                .addSeparatorComponents(
                    separator()
                )

                // SETUP
                .addTextDisplayComponents(
                    setup
                )

                .addSeparatorComponents(
                    separator()
                )

                // UTILITY
                .addTextDisplayComponents(
                    utility
                )

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
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all Amyfn commands and features'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x1493ff)
            .setTitle('💙 Amyfn Help Center')
            .setDescription(
                'Welcome to **Amyfn** — your all-in-one Fortnite community bot. 🎮\n\n' +
                'Use the commands below to explore Fortnite cosmetics, the Item Shop, news, leaks, giveaways, quizzes and more.'
            )

            .addFields(
                {
                    name: '🛒 Fortnite Shop',
                    value:
                        '`/shop` — Browse the current Fortnite Item Shop.\n' +
                        '`/daily` — See what was added and removed in the latest shop reset.\n' +
                        '`/dailyimages` — View images of cosmetics from the latest shop reset.',
                    inline: false
                },

                {
                    name: '🔎 Cosmetics',
                    value:
                        '`/cosmetic [name]` — Search for a specific Fortnite cosmetic.\n' +
                        '`/feature` — Discover the newest Fortnite cosmetics.',
                    inline: false
                },

                {
                    name: '📰 News & Leaks',
                    value:
                        '`/news` — Get the latest Fortnite news.\n' +
                        '`/leaks` — Check the latest Fortnite leaks detected by Amyfn.',
                    inline: false
                },

                {
                    name: '🧠 Fortnite Quiz',
                    value:
                        '`/fortnitequiz` — Test your Fortnite knowledge with a random trivia question.\n\n' +
                        'Answer using the **A / B / C / D** buttons and see instantly if you got it right.',
                    inline: false
                },

                {
                    name: '🎁 Giveaways',
                    value:
                        '`/giveaway` — Create and manage Fortnite giveaways in your server.\n\n' +
                        'Amyfn can handle entries, winners, ending giveaways and rerolls.',
                    inline: false
                },

                {
                    name: '⚙️ Server Setup',
                    value:
                        '`/setup` — Configure Amyfn for automatic Fortnite updates in your server.\n\n' +
                        'After setup, Amyfn can automatically:\n' +
                        '• Detect Item Shop changes\n' +
                        '• Post Daily Shop updates\n' +
                        '• Ping your selected role\n' +
                        '• Send newly released cosmetic images\n\n' +
                        '🔒 **Requires Manage Server permission.**',
                    inline: false
                },

                {
                    name: '🏓 Utility',
                    value:
                        '`/ping` — Check if Amyfn is online and responding.\n' +
                        '`/help` — Open this help menu.',
                    inline: false
                }
            )

            .setFooter({
                text: 'Amyfn • Fortnite Community Bot'
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};
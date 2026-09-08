
const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const {
    getNews
} = require('../services/fortniteApi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Shows the latest Fortnite news'),

    async execute(interaction) {

        console.log('📰 NEWS COMMAND STARTED');

        await interaction.deferReply();

        try {

            const newsData = await getNews();

            console.log('📰 Fortnite news data received');

            if (
                !newsData ||
                !newsData.br ||
                !Array.isArray(newsData.br.motds)
            ) {
                await interaction.editReply(
                    '❌ No Fortnite news is available right now.'
                );

                return;
            }

            const newsItems = newsData.br.motds
                .filter(item => !item.hidden)
                .sort(
                    (a, b) =>
                        (b.sortingPriority || 0) -
                        (a.sortingPriority || 0)
                )
                .slice(0, 5);

            if (newsItems.length === 0) {
                await interaction.editReply(
                    '❌ No Fortnite news is available right now.'
                );

                return;
            }

            const embeds = [];

            for (const item of newsItems) {

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(
                        item.title || 'Fortnite News'
                    )
                    .setDescription(
                        item.body ||
                        'No description available.'
                    )
                    .setFooter({
                        text: 'Amyfn • Fortnite News'
                    })
                    .setTimestamp(
                        newsData.br.date
                            ? new Date(newsData.br.date)
                            : new Date()
                    );

                if (item.image) {
                    embed.setImage(item.image);
                }

                embeds.push(embed);
            }

            await interaction.editReply({
                content:
                    '📰 **Latest Fortnite News**\n' +
                    'Here are the newest updates from Fortnite:',
                embeds: embeds
            });

            console.log(
                `✅ Sent ${newsItems.length} Fortnite news articles`
            );

        } catch (error) {

            console.error(
                '❌ NEWS COMMAND ERROR:',
                error
            );

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply(
                        '❌ Failed to fetch Fortnite news right now. Please try again.'
                    );

                } else {

                    await interaction.reply(
                        '❌ Failed to fetch Fortnite news right now. Please try again.'
                    );
                }

            } catch (replyError) {

                console.error(
                    '❌ Could not send news error:',
                    replyError
                );
            }
        }
    }
};
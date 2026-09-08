const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const { getShop } = require('../services/fortniteApi');
const { createEmbed } = require('../services/embedStyle');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View the current Fortnite Item Shop'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const shop = await getShop();

            if (!shop || !shop.entries || shop.entries.length === 0) {
                return interaction.editReply(
                    '❌ The Fortnite Item Shop is currently unavailable.'
                );
            }

            const entries = shop.entries;

            // One item per page
            let page = 0;

            const createPage = (pageNumber) => {
                const entry = entries[pageNumber];

                const item =
                    entry.brItems?.[0] ||
                    entry.items?.[0];

                if (!item) {
                    return createEmbed({
                        title: '🛒 Fortnite Item Shop',
                        description: '❌ Could not read this shop item.'
                    });
                }

                const name = item.name || 'Unknown Item';

                const type =
                    item.type?.displayValue ||
                    item.type?.value ||
                    'Unknown';

                const rarity =
                    item.rarity?.displayValue ||
                    item.rarity?.value ||
                    'Unknown';

                const price =
                    entry.finalPrice !== undefined
                        ? `${entry.finalPrice.toLocaleString()} V-Bucks`
                        : 'Price unavailable';

                const image =
                    item.images?.featured ||
                    item.images?.icon ||
                    null;

                const embed = createEmbed({
                    title: `🛒 ${name}`,
                    description:
                        `**Type:** ${type}\n` +
                        `**Rarity:** ${rarity}\n` +
                        `**Price:** ${price}\n\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `🛍️ **Item ${pageNumber + 1} / ${entries.length}**`,
                    timestamp: true
                });

                if (image) {
                    embed.setImage(image);
                }

                return embed;
            };

            const createButtons = (pageNumber) => {
                return new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_previous')
                            .setLabel('◀ Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pageNumber === 0),

                        new ButtonBuilder()
                            .setCustomId('shop_next')
                            .setLabel('Next ▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(
                                pageNumber >= entries.length - 1
                            )
                    );
            };

            const message = await interaction.editReply({
                embeds: [createPage(page)],
                components: [createButtons(page)]
            });

            const collector =
                message.createMessageComponentCollector({
                    time: 5 * 60 * 1000
                });

            collector.on(
                'collect',
                async buttonInteraction => {

                    if (
                        buttonInteraction.user.id !==
                        interaction.user.id
                    ) {
                        return buttonInteraction.reply({
                            content:
                                '❌ Only the person who used `/shop` can control these buttons.',
                            ephemeral: true
                        });
                    }

                    if (
                        buttonInteraction.customId ===
                        'shop_previous'
                    ) {
                        page--;
                    }

                    if (
                        buttonInteraction.customId ===
                        'shop_next'
                    ) {
                        page++;
                    }

                    await buttonInteraction.update({
                        embeds: [createPage(page)],
                        components: [createButtons(page)]
                    });
                }
            );

            collector.on('end', async () => {
                try {
                    await interaction.editReply({
                        components: [createButtons(page)]
                    });
                } catch (error) {
                    console.error(
                        'Shop collector ended:',
                        error
                    );
                }
            });

        } catch (error) {
            console.error(
                'Shop command error:',
                error
            );

            await interaction.editReply(
                '❌ Something went wrong while loading the Fortnite Item Shop.'
            );
        }
    }
};
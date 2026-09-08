const {
    SlashCommandBuilder
} = require('discord.js');

const {
    searchCosmetics
} = require('../services/fortniteApi');

const {
    createEmbed
} = require('../services/embedStyle');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cosmetic')
        .setDescription('Search for a Fortnite cosmetic')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Name of the cosmetic')
                .setRequired(true)
        ),

    async execute(interaction) {
        const name =
            interaction.options.getString('name');

        await interaction.deferReply();

        try {
            const cosmetic =
                await searchCosmetics(name);

            if (!cosmetic) {
                return interaction.editReply(
                    `❌ I couldn't find a cosmetic called **${name}**.`
                );
            }

            // ==========================================
            // BASIC INFO
            // ==========================================

            const type =
                cosmetic.type?.displayValue ||
                cosmetic.type?.value ||
                'Unknown';

            const rarity =
                cosmetic.rarity?.displayValue ||
                cosmetic.rarity?.value ||
                'Unknown';

            const set =
                cosmetic.set?.text ||
                cosmetic.set?.name ||
                cosmetic.set?.value ||
                null;

            const description =
                cosmetic.description ||
                null;

            // ==========================================
            // INTRODUCTION
            // ==========================================

            const chapter =
                cosmetic.introductionChapter ||
                null;

            const season =
                cosmetic.introductionSeason ||
                null;

            let introduction = null;

            if (chapter && season) {
                introduction =
                    `${chapter} • ${season}`;
            } else if (season) {
                introduction = season;
            } else if (chapter) {
                introduction = chapter;
            }

            // ==========================================
            // IMAGE
            // ==========================================

            const image =
                cosmetic.images?.featured ||
                cosmetic.images?.icon ||
                null;

            // ==========================================
            // BUILD EMBED
            // ==========================================

            const embed = createEmbed({
                title: `🎨 ${cosmetic.name || name}`,
                description:
                    description ||
                    'Fortnite cosmetic information',
                timestamp: true
            });

            embed.addFields(
                {
                    name: '🧥 TYPE',
                    value: `**${type}**`,
                    inline: true
                },
                {
                    name: '💎 RARITY',
                    value: `**${rarity}**`,
                    inline: true
                }
            );

            if (set) {
                embed.addFields({
                    name: '📦 SET',
                    value: `**${set}**`,
                    inline: true
                });
            }

            if (introduction) {
                embed.addFields({
                    name: '🗓️ INTRODUCED',
                    value: `**${introduction}**`,
                    inline: true
                });
            }

            if (image) {
                embed.setImage(image);
            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error(
                'Cosmetic command error:',
                error
            );

            await interaction.editReply(
                '❌ Something went wrong while searching for that cosmetic.'
            );
        }
    }
};
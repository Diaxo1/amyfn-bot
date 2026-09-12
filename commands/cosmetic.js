const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    searchCosmetics,
    searchCosmeticsAll
} = require('../services/fortniteApi');


// ==========================================
// COMMAND
// ==========================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('cosmetic')

        .setDescription(
            'Search for a Fortnite cosmetic'
        )

        .addStringOption(option =>
            option
                .setName('name')
                .setDescription(
                    'Name of the cosmetic'
                )
                .setAutocomplete(true)
                .setRequired(true)
        ),


    // ==========================================
    // AUTOCOMPLETE
    // ==========================================

    async autocomplete(interaction) {

        const focusedValue =
            interaction.options.getFocused()
                .trim();


        // Don't hammer the API with an empty search
        if (!focusedValue) {

            return interaction.respond([]);

        }


        try {

            const results =
                await searchCosmeticsAll(
                    focusedValue
                );


            if (
                !Array.isArray(results) ||
                results.length === 0
            ) {

                return interaction.respond([]);

            }


            // ==========================================
            // BUILD SUGGESTIONS
            // ==========================================

            const suggestions = [];

            const seen = new Set();


            for (const cosmetic of results) {

                if (
                    !cosmetic ||
                    !cosmetic.name
                ) {
                    continue;
                }


                const cosmeticName =
                    cosmetic.name.trim();


                if (!cosmeticName) {
                    continue;
                }


                const key =
                    cosmeticName.toLowerCase();


                // Prevent duplicate names
                if (seen.has(key)) {
                    continue;
                }


                seen.add(key);


                const type =
                    cosmetic.type?.displayValue ||
                    cosmetic.type?.value ||
                    'Cosmetic';


                suggestions.push({

                    name:
                        cosmeticName
                            .slice(0, 100),

                    value:
                        cosmeticName
                            .slice(0, 100),

                    // Discord choice descriptions
                    // are limited to 100 characters
                    description:
                        type
                            .slice(0, 100)

                });


                // Discord allows max 25 autocomplete choices
                if (suggestions.length >= 25) {
                    break;
                }

            }


            await interaction.respond(
                suggestions
            );


        } catch (error) {

            console.error(
                'Cosmetic autocomplete error:',
                error
            );


            try {

                await interaction.respond([]);

            } catch {
                // Interaction may already have expired
            }

        }

    },


    // ==========================================
    // EXECUTE
    // ==========================================

    async execute(interaction) {

        const name =
            interaction.options.getString(
                'name'
            );


        await interaction.deferReply({

            flags:
                MessageFlags.IsComponentsV2

        });


        try {

            // ==========================================
            // SEARCH COSMETIC
            // ==========================================

            const cosmetic =
                await searchCosmetics(name);


            if (!cosmetic) {

                return interaction.editReply({

                    components: [

                        new TextDisplayBuilder()
                            .setContent(

                                '## ❌ Cosmetic Not Found\n\n' +

                                `> I couldn't find a cosmetic called **${name}**.`

                            )

                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            }


            // ==========================================
            // BASIC DATA
            // ==========================================

            const cosmeticName =
                cosmetic.name ||
                name;


            const description =
                cosmetic.description ||
                null;


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


            const id =
                cosmetic.id ||
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


            let introduction =
                null;


            if (
                chapter &&
                season
            ) {

                introduction =
                    `${chapter}, ${season}`;

            } else if (chapter) {

                introduction =
                    chapter;

            } else if (season) {

                introduction =
                    season;

            }


            // ==========================================
            // IMAGES
            // ==========================================

            const featuredImage =
                cosmetic.images?.featured ||
                cosmetic.images?.icon ||
                null;


            const iconImage =
                cosmetic.images?.icon ||
                featuredImage ||
                null;


            // ==========================================
            // SEPARATOR
            // ==========================================

            const separator =
                () =>
                    new SeparatorBuilder()
                        .setDivider(true)
                        .setSpacing(
                            SeparatorSpacingSize.Small
                        );


            // ==========================================
            // HEADER
            // ==========================================

            const header =
                new SectionBuilder()

                    .addTextDisplayComponents(

                        new TextDisplayBuilder()
                            .setContent(

                                `# ${cosmeticName}`

                            ),

                        new TextDisplayBuilder()
                            .setContent(

                                description ||
                                'Fortnite cosmetic'

                            )

                    );


            // ==========================================
            // SMALL ICON
            // ==========================================

            if (iconImage) {

                header.setThumbnailAccessory(
                    thumbnail =>
                        thumbnail
                            .setURL(
                                iconImage
                            )
                            .setDescription(
                                cosmeticName
                            )
                );

            }


            // ==========================================
            // INFO
            // ==========================================

            let infoText = '';


            if (introduction) {

                infoText +=
                    `🗓️ **Introduced in ${introduction}.**\n`;

            }


            if (set) {

                infoText +=
                    `📦 **Part of the ${set} set.**\n`;

            }


            if (id) {

                infoText +=
                    `🆔 **ID:** \`${id}\``;

            }


            // If absolutely no extra information exists
            if (!infoText) {

                infoText =
                    `🧥 **${type}** • 💎 **${rarity}**`;

            }


            const info =
                new TextDisplayBuilder()
                    .setContent(
                        infoText
                    );


            // ==========================================
            // LARGE IMAGE
            // ==========================================

            let gallery =
                null;


            if (featuredImage) {

                gallery =
                    new MediaGalleryBuilder()
                        .addItems({

                            media: {
                                url:
                                    featuredImage
                            },

                            description:
                                cosmeticName

                        });

            }


            // ==========================================
            // FOOTER
            // ==========================================

            const footer =
                new TextDisplayBuilder()
                    .setContent(
                        '-# AMYFN • COSMETIC SEARCH'
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

                    // DIVIDER
                    .addSeparatorComponents(
                        separator()
                    )

                    // INFO
                    .addTextDisplayComponents(
                        info
                    );


            // ==========================================
            // LARGE IMAGE
            // ==========================================

            if (gallery) {

                container

                    .addSeparatorComponents(
                        separator()
                    )

                    .addMediaGalleryComponents(
                        gallery
                    );

            }


            // ==========================================
            // FOOTER
            // ==========================================

            container

                .addSeparatorComponents(
                    separator()
                )

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


        } catch (error) {

            console.error(
                'Cosmetic command error:',
                error
            );


            await interaction.editReply({

                components: [

                    new TextDisplayBuilder()
                        .setContent(

                            '## ❌ Cosmetic Search Error\n\n' +

                            '> Something went wrong while searching for that cosmetic. Please try again.'

                        )

                ],

                flags:
                    MessageFlags.IsComponentsV2

            });

        }

    }

};
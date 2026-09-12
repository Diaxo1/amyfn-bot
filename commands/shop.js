const {
    SlashCommandBuilder,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const { getShop } = require('../services/fortniteApi');


// ==========================================
// COMMAND
// ==========================================

module.exports = {

    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('View the current Fortnite Item Shop'),


    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.IsComponentsV2
        });


        try {

            // ==========================================
            // GET SHOP
            // ==========================================

            const shop = await getShop();


            if (
                !shop ||
                !shop.entries ||
                shop.entries.length === 0
            ) {

                return interaction.editReply({
                    components: [
                        new TextDisplayBuilder()
                            .setContent(
                                '## ❌ Fortnite Item Shop\n\n' +
                                '> The Fortnite Item Shop is currently unavailable.'
                            )
                    ],

                    flags: MessageFlags.IsComponentsV2
                });

            }


            // ==========================================
            // SHOP DATA
            // ==========================================

            const allEntries = shop.entries;


            // ==========================================
            // STATE
            // ==========================================

            let currentPage = 0;

            let currentFilter = 'all';

            let selectedItemIndex = null;


            const ITEMS_PER_PAGE = 6;


            // ==========================================
            // GET ITEM
            // ==========================================

            const getItem = entry => {

                return (
                    entry.brItems?.[0] ||
                    entry.items?.[0] ||
                    null
                );

            };


            // ==========================================
            // GET IMAGE
            // ==========================================

            const getImage = item => {

                return (
                    item?.images?.featured ||
                    item?.images?.icon ||
                    item?.images?.full_background ||
                    null
                );

            };


            // ==========================================
            // GET PRICE
            // ==========================================

            const getPrice = entry => {

                if (
                    entry.finalPrice !== undefined &&
                    entry.finalPrice !== null
                ) {

                    return `${entry.finalPrice.toLocaleString()} V-Bucks`;

                }

                return 'Price unavailable';

            };


            // ==========================================
            // GET TYPE
            // ==========================================

            const getType = item => {

                return (
                    item?.type?.displayValue ||
                    item?.type?.value ||
                    'Unknown'
                );

            };


            // ==========================================
            // FILTER SHOP
            // ==========================================

            const getFilteredEntries = () => {

                if (currentFilter === 'all') {
                    return allEntries;
                }


                return allEntries.filter(entry => {

                    const item = getItem(entry);

                    if (!item) {
                        return false;
                    }


                    const type =
                        getType(item)
                            .toLowerCase();


                    return type ===
                        currentFilter.toLowerCase();

                });

            };


            // ==========================================
            // FILTER OPTIONS
            // ==========================================

            const getFilterOptions = () => {

                const types = new Set();


                for (const entry of allEntries) {

                    const item = getItem(entry);

                    if (!item) {
                        continue;
                    }


                    const type =
                        getType(item);


                    if (
                        type &&
                        type !== 'Unknown'
                    ) {

                        types.add(type);

                    }

                }


                const options = [

                    {
                        label: 'All Items',
                        value: 'all',
                        emoji: '🛒',
                        description:
                            `Browse all ${allEntries.length} shop items`
                    }

                ];


                const sortedTypes =
                    [...types]
                        .sort()
                        .slice(0, 24);


                for (const type of sortedTypes) {

                    options.push({

                        label: type
                            .slice(0, 100),

                        value: type
                            .toLowerCase()
                            .slice(0, 100),

                        emoji: '📦',

                        description:
                            `Show ${type.toLowerCase()}s`

                    });

                }


                return options;

            };


            // ==========================================
            // SEPARATOR
            // ==========================================

            const separator = () =>
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    );


            // ==========================================
            // CREATE SHOP VIEW
            // ==========================================

            const createShopView = () => {

                selectedItemIndex = null;


                const filtered =
                    getFilteredEntries();


                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filtered.length /
                            ITEMS_PER_PAGE
                        )
                    );


                if (currentPage >= totalPages) {
                    currentPage =
                        totalPages - 1;
                }


                if (currentPage < 0) {
                    currentPage = 0;
                }


                const start =
                    currentPage *
                    ITEMS_PER_PAGE;


                const pageEntries =
                    filtered.slice(
                        start,
                        start + ITEMS_PER_PAGE
                    );


                // ==========================================
                // HEADER
                // ==========================================

                const logo =
                    interaction.client.user
                        .displayAvatarURL({
                            extension: 'png',
                            size: 256
                        });


                const header =
                    new SectionBuilder()

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()
                                .setContent(
                                    '# __🛒 Fortnite Item Shop__'
                                ),

                            new TextDisplayBuilder()
                                .setContent(

                                    `> **${filtered.length} items** available in today's shop.\n` +
                                    `> Browse the shop below and select an item for a closer look.`

                                )

                        )

                        .setThumbnailAccessory(
                            thumbnail =>
                                thumbnail
                                    .setURL(logo)
                                    .setDescription(
                                        'Amyfn logo'
                                    )
                        );


                // ==========================================
                // SHOP IMAGES
                // ==========================================

                const mediaItems = [];


                for (const entry of pageEntries) {

                    const item =
                        getItem(entry);


                    const image =
                        getImage(item);


                    if (!image) {
                        continue;
                    }


                    mediaItems.push({

                        media: {
                            url: image
                        },

                        description:
                            item?.name ||
                            'Fortnite cosmetic'

                    });

                }


                let gallery = null;


                if (mediaItems.length > 0) {

                    gallery =
                        new MediaGalleryBuilder()
                            .addItems(
                                ...mediaItems
                            );

                }


                // ==========================================
                // ITEM LIST
                // ==========================================

                let itemText =
                    '## 🛍️ Items\n\n';


                if (pageEntries.length === 0) {

                    itemText +=
                        '> No items found in this category.';

                } else {

                    pageEntries.forEach(
                        (entry, index) => {

                            const item =
                                getItem(entry);


                            if (!item) {
                                return;
                            }


                            const absoluteNumber =
                                start + index + 1;


                            itemText +=
                                `**${absoluteNumber}. ${item.name || 'Unknown Item'}**\n` +
                                `> ${getType(item)} • **${getPrice(entry)}**\n\n`;

                        }
                    );

                }


                itemText +=
                    `-# Showing ${pageEntries.length ? start + 1 : 0}–${Math.min(start + pageEntries.length, filtered.length)} of ${filtered.length} items • Page ${currentPage + 1}/${totalPages}`;


                const itemList =
                    new TextDisplayBuilder()
                        .setContent(itemText);


                // ==========================================
                // MAIN CONTAINER
                // ==========================================

                const container =
                    new ContainerBuilder()

                        .setAccentColor(
                            0x1493ff
                        )

                        .addSectionComponents(
                            header
                        )

                        .addSeparatorComponents(
                            separator()
                        );


                if (gallery) {

                    container.addMediaGalleryComponents(
                        gallery
                    );

                    container.addSeparatorComponents(
                        separator()
                    );

                }


                container.addTextDisplayComponents(
                    itemList
                );


                return {
                    container,
                    filtered,
                    pageEntries,
                    start,
                    totalPages
                };

            };


            // ==========================================
            // CREATE ITEM SELECT
            // ==========================================

            const createItemSelect = (
                pageEntries,
                start
            ) => {

                if (
                    !pageEntries ||
                    pageEntries.length === 0
                ) {
                    return null;
                }


                const options =
                    pageEntries.map(
                        (entry, index) => {

                            const item =
                                getItem(entry);


                            return {

                                label:
                                    (
                                        item?.name ||
                                        'Unknown Item'
                                    ).slice(0, 100),

                                value:
                                    String(index),

                                description:
                                    `${getType(item)} • ${getPrice(entry)}`
                                        .slice(0, 100),

                                emoji: '🛍️'

                            };

                        }
                    );


                const menu =
                    new StringSelectMenuBuilder()

                        .setCustomId(
                            'shop_item_select'
                        )

                        .setPlaceholder(
                            '🔎 Choose an item to view details...'
                        )

                        .addOptions(
                            options
                        );


                return new ActionRowBuilder()
                    .addComponents(
                        menu
                    );

            };


            // ==========================================
            // CREATE FILTER SELECT
            // ==========================================

            const createFilterSelect = () => {

                const menu =
                    new StringSelectMenuBuilder()

                        .setCustomId(
                            'shop_filter_select'
                        )

                        .setPlaceholder(
                            '📂 Browse shop categories...'
                        )

                        .addOptions(
                            getFilterOptions()
                        );


                return new ActionRowBuilder()
                    .addComponents(
                        menu
                    );

            };


            // ==========================================
            // CREATE NAVIGATION
            // ==========================================

            const createNavigation = (
                totalPages
            ) => {

                return new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()

                            .setCustomId(
                                'shop_previous'
                            )

                            .setLabel(
                                'Previous'
                            )

                            .setEmoji('◀️')

                            .setStyle(
                                ButtonStyle.Secondary
                            )

                            .setDisabled(
                                currentPage === 0
                            ),


                        new ButtonBuilder()

                            .setCustomId(
                                'shop_page'
                            )

                            .setLabel(
                                `Page ${currentPage + 1}/${totalPages}`
                            )

                            .setStyle(
                                ButtonStyle.Secondary
                            )

                            .setDisabled(true),


                        new ButtonBuilder()

                            .setCustomId(
                                'shop_next'
                            )

                            .setLabel(
                                'Next'
                            )

                            .setEmoji('▶️')

                            .setStyle(
                                ButtonStyle.Primary
                            )

                            .setDisabled(
                                currentPage >=
                                totalPages - 1
                            )

                    );

            };


            // ==========================================
            // CREATE DETAIL VIEW
            // ==========================================

            const createDetailView = (
                entry,
                item
            ) => {

                const image =
                    getImage(item);


                const type =
                    getType(item);


                const rarity =
                    item?.rarity?.displayValue ||
                    item?.rarity?.value ||
                    'Unknown';


                const price =
                    getPrice(entry);


                const logo =
                    interaction.client.user
                        .displayAvatarURL({
                            extension: 'png',
                            size: 256
                        });


                const header =
                    new SectionBuilder()

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()
                                .setContent(
                                    `# __${item?.name || 'Unknown Item'}__`
                                ),

                            new TextDisplayBuilder()
                                .setContent(

                                    `> **Type:** ${type}\n` +
                                    `> **Rarity:** ${rarity}\n` +
                                    `> **Price:** 💰 **${price}**`

                                )

                        );


                if (image) {

                    header.setThumbnailAccessory(
                        thumbnail =>
                            thumbnail
                                .setURL(image)
                                .setDescription(
                                    item?.name ||
                                    'Fortnite item'
                                )
                    );

                } else {

                    header.setThumbnailAccessory(
                        thumbnail =>
                            thumbnail
                                .setURL(logo)
                                .setDescription(
                                    'Amyfn logo'
                                )
                    );

                }


                const container =
                    new ContainerBuilder()

                        .setAccentColor(
                            0x1493ff
                        )

                        .addSectionComponents(
                            header
                        )

                        .addSeparatorComponents(
                            separator()
                        )

                        .addTextDisplayComponents(

                            new TextDisplayBuilder()
                                .setContent(

                                    '## 🛍️ Item Details\n\n' +

                                    `> **${item?.name || 'Unknown Item'}** is currently available in the Fortnite Item Shop.\n\n` +

                                    `-# Use the buttons below to continue browsing the shop.`

                                )

                        );


                return container;

            };


            // ==========================================
            // CREATE MESSAGE
            // ==========================================

            const createMessage = () => {

                const view =
                    createShopView();


                const components = [

                    view.container,

                    createItemSelect(
                        view.pageEntries,
                        view.start
                    ),

                    createFilterSelect(),

                    createNavigation(
                        view.totalPages
                    )

                ];


                return {
                    components:
                        components.filter(Boolean),

                    flags:
                        MessageFlags.IsComponentsV2
                };

            };


            // ==========================================
            // INITIAL MESSAGE
            // ==========================================

            await interaction.editReply(
                createMessage()
            );


            // ==========================================
            // COLLECTOR
            // ==========================================

            const message =
                await interaction.fetchReply();


            const collector =
                message.createMessageComponentCollector({

                    time:
                        5 * 60 * 1000

                });


            // ==========================================
            // INTERACTION HANDLER
            // ==========================================

            collector.on(
                'collect',
                async componentInteraction => {


                    // ==========================================
                    // USER CHECK
                    // ==========================================

                    if (
                        componentInteraction.user.id !==
                        interaction.user.id
                    ) {

                        return componentInteraction.reply({

                            content:
                                '❌ Only the person who used `/shop` can control this shop.',

                            ephemeral: true

                        });

                    }


                    // ==========================================
                    // ITEM SELECT
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_item_select'
                    ) {

                        const selected =
                            Number(
                                componentInteraction.values[0]
                            );


                        const filtered =
                            getFilteredEntries();


                        const start =
                            currentPage *
                            ITEMS_PER_PAGE;


                        const entry =
                            filtered[
                                start + selected
                            ];


                        if (!entry) {

                            return componentInteraction.reply({

                                content:
                                    '❌ That item is no longer available.',

                                ephemeral: true

                            });

                        }


                        const item =
                            getItem(entry);


                        if (!item) {

                            return componentInteraction.reply({

                                content:
                                    '❌ Could not read that item.',

                                ephemeral: true

                            });

                        }


                        selectedItemIndex =
                            start + selected;


                        await componentInteraction.update({

                            components: [

                                createDetailView(
                                    entry,
                                    item
                                ),

                                new ActionRowBuilder()
                                    .addComponents(

                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_back'
                                            )

                                            .setLabel(
                                                'Back to Shop'
                                            )

                                            .setEmoji('↩️')

                                            .setStyle(
                                                ButtonStyle.Secondary
                                            ),


                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_detail_previous'
                                            )

                                            .setLabel(
                                                'Previous'
                                            )

                                            .setEmoji('◀️')

                                            .setStyle(
                                                ButtonStyle.Secondary
                                            )

                                            .setDisabled(
                                                selectedItemIndex <= 0
                                            ),


                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_detail_next'
                                            )

                                            .setLabel(
                                                'Next'
                                            )

                                            .setEmoji('▶️')

                                            .setStyle(
                                                ButtonStyle.Primary
                                            )

                                            .setDisabled(
                                                selectedItemIndex >=
                                                filtered.length - 1
                                            )

                                    )

                            ],

                            flags:
                                MessageFlags.IsComponentsV2

                        });

                        return;

                    }


                    // ==========================================
                    // FILTER
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_filter_select'
                    ) {

                        currentFilter =
                            componentInteraction.values[0];

                        currentPage = 0;

                        selectedItemIndex = null;


                        await componentInteraction.update(
                            createMessage()
                        );

                        return;

                    }


                    // ==========================================
                    // BACK
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_back'
                    ) {

                        selectedItemIndex = null;


                        await componentInteraction.update(
                            createMessage()
                        );

                        return;

                    }


                    // ==========================================
                    // PREVIOUS PAGE
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_previous'
                    ) {

                        if (currentPage > 0) {
                            currentPage--;
                        }


                        await componentInteraction.update(
                            createMessage()
                        );

                        return;

                    }


                    // ==========================================
                    // NEXT PAGE
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_next'
                    ) {

                        const totalPages =
                            Math.ceil(
                                getFilteredEntries().length /
                                ITEMS_PER_PAGE
                            );


                        if (
                            currentPage <
                            totalPages - 1
                        ) {

                            currentPage++;

                        }


                        await componentInteraction.update(
                            createMessage()
                        );

                        return;

                    }


                    // ==========================================
                    // DETAIL PREVIOUS
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_detail_previous'
                    ) {

                        const filtered =
                            getFilteredEntries();


                        if (
                            selectedItemIndex >
                            0
                        ) {

                            selectedItemIndex--;

                        }


                        const entry =
                            filtered[
                                selectedItemIndex
                            ];


                        const item =
                            getItem(entry);


                        await componentInteraction.update({

                            components: [

                                createDetailView(
                                    entry,
                                    item
                                ),

                                new ActionRowBuilder()
                                    .addComponents(

                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_back'
                                            )

                                            .setLabel(
                                                'Back to Shop'
                                            )

                                            .setEmoji('↩️')

                                            .setStyle(
                                                ButtonStyle.Secondary
                                            ),


                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_detail_previous'
                                            )

                                            .setLabel(
                                                'Previous'
                                            )

                                            .setEmoji('◀️')

                                            .setStyle(
                                                ButtonStyle.Secondary
                                            )

                                            .setDisabled(
                                                selectedItemIndex <= 0
                                            ),


                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_detail_next'
                                            )

                                            .setLabel(
                                                'Next'
                                            )

                                            .setEmoji('▶️')

                                            .setStyle(
                                                ButtonStyle.Primary
                                            )

                                            .setDisabled(
                                                selectedItemIndex >=
                                                filtered.length - 1
                                            )

                                    )

                            ],

                            flags:
                                MessageFlags.IsComponentsV2

                        });

                        return;

                    }


                    // ==========================================
                    // DETAIL NEXT
                    // ==========================================

                    if (
                        componentInteraction.customId ===
                        'shop_detail_next'
                    ) {

                        const filtered =
                            getFilteredEntries();


                        if (
                            selectedItemIndex <
                            filtered.length - 1
                        ) {

                            selectedItemIndex++;

                        }


                        const entry =
                            filtered[
                                selectedItemIndex
                            ];


                        const item =
                            getItem(entry);


                        await componentInteraction.update({

                            components: [

                                createDetailView(
                                    entry,
                                    item
                                ),

                                new ActionRowBuilder()
                                    .addComponents(

                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_back'
                                            )

                                            .setLabel(
                                                'Back to Shop'
                                            )

                                            .setEmoji('↩️')

                                            .setStyle(
                                                ButtonStyle.Secondary
                                            ),


                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_detail_previous'
                                            )

                                            .setLabel(
                                                'Previous'
                                            )

                                            .setEmoji('◀️')

                                            .setStyle(
                                                ButtonStyle.Secondary
                                            )

                                            .setDisabled(
                                                selectedItemIndex <= 0
                                            ),


                                        new ButtonBuilder()

                                            .setCustomId(
                                                'shop_detail_next'
                                            )

                                            .setLabel(
                                                'Next'
                                            )

                                            .setEmoji('▶️')

                                            .setStyle(
                                                ButtonStyle.Primary
                                            )

                                            .setDisabled(
                                                selectedItemIndex >=
                                                filtered.length - 1
                                            )

                                    )

                            ],

                            flags:
                                MessageFlags.IsComponentsV2

                        });

                    }

                }
            );


            // ==========================================
            // DISABLE CONTROLS WHEN EXPIRED
            // ==========================================

            collector.on(
                'end',
                async () => {

                    try {

                        const view =
                            createShopView();


                        const disabledRows = [];


                        const itemSelect =
                            createItemSelect(
                                view.pageEntries,
                                view.start
                            );


                        if (itemSelect) {

                            itemSelect.components[0]
                                .setDisabled(true);

                            disabledRows.push(
                                itemSelect
                            );

                        }


                        const filterSelect =
                            createFilterSelect();


                        filterSelect.components[0]
                            .setDisabled(true);


                        disabledRows.push(
                            filterSelect
                        );


                        const navigation =
                            createNavigation(
                                view.totalPages
                            );


                        navigation.components
                            .forEach(
                                button =>
                                    button.setDisabled(true)
                            );


                        disabledRows.push(
                            navigation
                        );


                        await interaction.editReply({

                            components: [

                                view.container,

                                ...disabledRows

                            ],

                            flags:
                                MessageFlags.IsComponentsV2

                        });

                    } catch (error) {

                        console.error(
                            'Shop collector ended:',
                            error
                        );

                    }

                }
            );


        } catch (error) {

            console.error(
                'Shop command error:',
                error
            );


            await interaction.editReply({

                components: [

                    new TextDisplayBuilder()
                        .setContent(

                            '## ❌ Shop Error\n\n' +

                            '> Something went wrong while loading the Fortnite Item Shop. Please try again.'

                        )

                ],

                flags:
                    MessageFlags.IsComponentsV2

            });

        }

    }

};
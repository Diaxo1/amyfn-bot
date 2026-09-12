const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    AttachmentBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js')
const path = require('path');

const {
    createGiveaway,
    updateGiveaway,
    getActiveGiveawayForGuild,
    getLatestEndedGiveawayForGuild
} = require('../services/giveawayService');

// ==========================================
// GIVEAWAY BANNER
// ==========================================

const GIVEAWAY_BANNER = path.join(
    __dirname,
    '..',
    'assets',
    'giveaway-banner.png'
);

// ==========================================
// DURATION PARSER
// ==========================================

function parseDuration(duration) {

    const match = duration
        .toLowerCase()
        .trim()
        .match(/^(\d+)\s*(s|m|h|d)$/);

    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return amount * multipliers[unit];
}

// ==========================================
// FORMAT REMAINING
// ==========================================

function formatRemaining(endTime) {

    const remaining =
        endTime - Date.now();

    if (remaining <= 0) {
        return 'Ended';
    }

    const seconds =
        Math.floor(remaining / 1000);

    const days =
        Math.floor(seconds / 86400);

    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    const secs =
        seconds % 60;

    const parts = [];

    if (days) {
        parts.push(`${days}d`);
    }

    if (hours) {
        parts.push(`${hours}h`);
    }

    if (minutes) {
        parts.push(`${minutes}m`);
    }

    if (
        !days &&
        !hours &&
        secs
    ) {
        parts.push(`${secs}s`);
    }

    return (
        parts.join(' ') ||
        'Less than a minute'
    );
}

// ==========================================
// GIVEAWAY EMBED
// ==========================================

function createGiveawayContainer(giveaway, state = 'active', rerolled = false) {

    const endTimestamp =
        Math.floor(giveaway.endsAt / 1000);

    const container =
        new ContainerBuilder()
            .setAccentColor(
                state === 'active'
                    ? 0x1493ff
                    : state === 'cancelled'
                        ? 0x555555
                        : 0x00e5ff
            );

    // ==========================================
    // ACTIVE GIVEAWAY
    // ==========================================

    if (state === 'active') {

        container
            // Help Center-style header with the banner as a thumbnail.
            // SectionBuilder MUST have an accessory, so the ThumbnailBuilder
            // is intentionally attached here.
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '# 💙 __Amyfn Giveaway__\n' +
                                '**FORTNITE COMMUNITY GIVEAWAY**\n\n' +
                                `▌ **${giveaway.prize}**\n` +
                                '▌ Enter below for your chance to win. '
                            )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL(
                                'attachment://giveaway-banner.png'
                            )
                            .setDescription('Amyfn Fortnite Giveaway')
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '🎁 **Giveaway Details**\n\n' +
                        `▌ **Winners**\n` +
                        `▌ ${giveaway.winners}\n\n` +
                        `▌ **Entries**\n` +
                        `▌ ${giveaway.entries.length}\n\n` +
                        `▌ **Ends**\n` +
                        `▌ <t:${endTimestamp}:R>`
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '🎟️ **How To Enter**\n\n' +
                        '▌ Click **ENTER GIVEAWAY** below to join.\n\n' +
                        '-# AMYFN • FORTNITE COMMUNITY'
                    )
            );

        return container;
    }

    // ==========================================
    // ENDED / CANCELLED
    // ==========================================

    const winnerText =
        giveaway.winnerIds?.length
            ? giveaway.winnerIds
                .map(id => `<@${id}>`)
                .join(', ')
            : 'Nobody — not enough entries.';

    if (state === 'cancelled') {

        container
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(
                                '# 🛑 __Giveaway Cancelled__\n' +
                                '**FORTNITE COMMUNITY GIVEAWAY**\n\n' +
                                `▌ **${giveaway.prize}**\n` +
                                '▌ This giveaway has been cancelled by the server staff.'
                            )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL(
                                'attachment://giveaway-banner.png'
                            )
                            .setDescription('Amyfn Fortnite Giveaway')
                    )
            )

            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(
                        SeparatorSpacingSize.Small
                    )
            )

            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '-# AMYFN • FORTNITE COMMUNITY'
                    )
            );

        return container;
    }

    container
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            '# 🏆 __Fortnite Giveaway Ended__\n' +
                            '**FORTNITE COMMUNITY GIVEAWAY**\n\n' +
                            `▌ **${giveaway.prize}**\n` +
                            '▌ The giveaway has ended.'
                        )
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(
                            'attachment://giveaway-banner.png'
                        )
                        .setDescription('Amyfn Fortnite Giveaway')
                )
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(
                    SeparatorSpacingSize.Small
                )
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    '🏆 **Winners**\n\n' +
                    `▌ ${winnerText}\n\n` +
                    '👥 **Total Entries**\n\n' +
                    `▌ ${giveaway.entries.length}\n\n` +
                    (
                        rerolled
                            ? '🔄 **Winner Rerolled**\n\n' +
                              '▌ The winner has been rerolled.'
                            : '🎉 **Giveaway Complete**\n\n' +
                              '▌ Thanks everyone for participating in the AMYFN community.'
                    ) +
                    '\n\n-# AMYFN • FORTNITE COMMUNITY'
                )
        );

    return container;
}

// Backwards-compatible name for anything importing createGiveawayEmbed.
function createGiveawayEmbed(giveaway) {
    return createGiveawayContainer(giveaway, 'active');
}

// ==========================================
// GIVEAWAY BUTTON
// ==========================================

function createGiveawayButtons(giveaway) {

    const button =
        new ButtonBuilder()

            .setCustomId(
                `giveaway_enter_${giveaway.id}`
            )

            .setLabel(
                `ENTER GIVEAWAY • ${giveaway.entries.length}`
            )

            .setEmoji('🎁')

            .setStyle(
                ButtonStyle.Primary
            );

    return new ActionRowBuilder()
        .addComponents(button);
}

// ==========================================
// GIVEAWAY ATTACHMENT
// ==========================================

function createGiveawayAttachment() {

    return new AttachmentBuilder(
        GIVEAWAY_BANNER
    ).setName(
        'giveaway-banner.png'
    );
}

// ==========================================
// COMMAND
// ==========================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('giveaway')

        .setDescription(
            'Manage Fortnite giveaways'
        )

        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild.toString()
        )

        // ==========================================
        // START
        // ==========================================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('start')

                    .setDescription(
                        'Start a new Fortnite giveaway'
                    )

                    .addStringOption(
                        option =>
                            option

                                .setName('prize')

                                .setDescription(
                                    'What are you giving away?'
                                )

                                .setRequired(true)
                    )

                    .addStringOption(
                        option =>
                            option

                                .setName('duration')

                                .setDescription(
                                    'Example: 30m, 2h, 1d'
                                )

                                .setRequired(true)
                    )

                    .addIntegerOption(
                        option =>
                            option

                                .setName('winners')

                                .setDescription(
                                    'Number of winners'
                                )

                                .setMinValue(1)

                                .setMaxValue(20)

                                .setRequired(true)
                    )
        )

        // ==========================================
        // END
        // ==========================================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('end')

                    .setDescription(
                        'End the active giveaway'
                    )
        )

        // ==========================================
        // CANCEL
        // ==========================================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('cancel')

                    .setDescription(
                        'Cancel the active giveaway'
                    )
        )

        // ==========================================
        // REROLL
        // ==========================================

        .addSubcommand(
            subcommand =>
                subcommand

                    .setName('reroll')

                    .setDescription(
                        'Reroll the winners of a giveaway'
                    )
        ),

    // ==========================================
    // EXECUTE
    // ==========================================

    async execute(interaction) {

        // ==========================================
        // ACKNOWLEDGE INTERACTION IMMEDIATELY
        // ==========================================

        if (
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

        }

        const subcommand =
            interaction.options.getSubcommand();

        // ==========================================
        // START GIVEAWAY
        // ==========================================

        if (
            subcommand === 'start'
        ) {

            const prize =
                interaction.options.getString(
                    'prize'
                );

            const duration =
                interaction.options.getString(
                    'duration'
                );

            const winners =
                interaction.options.getInteger(
                    'winners'
                );

            // ==========================================
            // PARSE DURATION
            // ==========================================

            const durationMs =
                parseDuration(duration);

            if (
                !durationMs ||
                durationMs < 10000
            ) {

                return interaction.editReply({

                    content:
                        '❌ Invalid duration. Use something like `30m`, `2h`, or `1d`.'

                });

            }

            // ==========================================
            // CHECK EXISTING GIVEAWAY
            // ==========================================

            const existing =
                getActiveGiveawayForGuild(
                    interaction.guild.id
                );

            if (existing) {

                return interaction.editReply({

                    content:
                        '❌ There is already an active giveaway in this server.'

                });

            }

            // ==========================================
            // CREATE GIVEAWAY
            // ==========================================

            const now =
                Date.now();

            const giveaway = {

                id:
                    `${interaction.guild.id}-${now}`,

                guildId:
                    interaction.guild.id,

                channelId:
                    interaction.channel.id,

                messageId:
                    null,

                prize,

                winners,

                entries: [],

                hostId:
                    interaction.user.id,

                startedAt:
                    now,

                endsAt:
                    now + durationMs,

                status:
                    'active',

                winnerIds: []

            };

            createGiveaway(
                giveaway
            );

            // ==========================================
            // CREATE GIVEAWAY MESSAGE
            // ==========================================

            const container =
                createGiveawayContainer(
                    giveaway,
                    'active'
                );

            const row =
                createGiveawayButtons(
                    giveaway
                );

            const attachment =
                createGiveawayAttachment();

            const message =
                await interaction.channel.send({

                    components: [
                        container,
                        row
                    ],

                    files: [
                        attachment
                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            // ==========================================
            // SAVE MESSAGE ID
            // ==========================================

            updateGiveaway(

                giveaway.id,

                {
                    messageId:
                        message.id
                }

            );

            // ==========================================
            // CONFIRM
            // ==========================================

            await interaction.editReply({

                content:
                    `✅ Giveaway started! ${message}`

            });

            return;
        }

// ==========================================
// FIND GIVEAWAY
// ==========================================

let giveaway;

if (subcommand === 'reroll') {

    giveaway =
        getLatestEndedGiveawayForGuild(
            interaction.guild.id
        );

    if (!giveaway) {

        return interaction.editReply({

            content:
                '❌ There is no ended giveaway available to reroll.'

        });

    }

} else {

    giveaway =
        getActiveGiveawayForGuild(
            interaction.guild.id
        );

    if (!giveaway) {

        return interaction.editReply({

            content:
                '❌ There is no active giveaway in this server.'

        });

    }

}

        // ==========================================
        // END GIVEAWAY
        // ==========================================

        if (
            subcommand === 'end'
        ) {

            await finishGiveaway(
                interaction.client,
                giveaway
            );

            return interaction.editReply({

                content:
                    '🏆 Giveaway ended and winners selected!'

            });

        }

        // ==========================================
        // CANCEL GIVEAWAY
        // ==========================================

        if (
            subcommand === 'cancel'
        ) {

            updateGiveaway(

                giveaway.id,

                {
                    status:
                        'cancelled'
                }

            );

            try {

                const channel =
                    await interaction.client.channels.fetch(
                        giveaway.channelId
                    );

                const message =
                    await channel.messages.fetch(
                        giveaway.messageId
                    );

                const container =
                    createGiveawayContainer(
                        giveaway,
                        'cancelled'
                    );

                await message.edit({

                    components: [
                        container
                    ],

                    files: [
                        createGiveawayAttachment()
                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

            } catch (error) {

                console.error(
                    '❌ Failed to update cancelled giveaway:',
                    error
                );

            }

            return interaction.editReply({

                content:
                    '🛑 Giveaway cancelled.'

            });

        }

        // ==========================================
        // REROLL
        // ==========================================

        if (
            subcommand === 'reroll'
        ) {

            if (
                !giveaway.winnerIds?.length
            ) {

                return interaction.editReply({

                    content:
                        '❌ This giveaway has no winners to reroll.'

                });

            }

            const previousWinners =
                giveaway.winnerIds;

            const available =
                giveaway.entries.filter(

                    id =>
                        !previousWinners.includes(id)

                );

            if (
                !available.length
            ) {

                return interaction.editReply({

                    content:
                        '❌ There are no other eligible participants.'

                });

            }

            const newWinner =
                available[
                    Math.floor(
                        Math.random() *
                        available.length
                    )
                ];

            // Replace the last winner
            // while keeping the other winners
            const newWinnerIds = [
                ...previousWinners.slice(0, -1),
                newWinner
            ];

            updateGiveaway(

                giveaway.id,

                {
                    winnerIds:
                        newWinnerIds
                }

            );

            // ==========================================
            // UPDATE PUBLIC GIVEAWAY MESSAGE
            // ==========================================

            try {

                const channel =
                    await interaction.client.channels.fetch(
                        giveaway.channelId
                    );

                const message =
                    await channel.messages.fetch(
                        giveaway.messageId
                    );

                giveaway.winnerIds =
                    newWinnerIds;

                const container =
                    createGiveawayContainer(
                        giveaway,
                        'ended',
                        true
                    );

                await message.edit({

                    components: [
                        container
                    ],

                    files: [
                        createGiveawayAttachment()
                    ],

                    flags:
                        MessageFlags.IsComponentsV2

                });

                // ==========================================
                // ANNOUNCE NEW WINNER
                // ==========================================

                await channel.send(

                    `🔄 **GIVEAWAY REROLLED!**\n\n` +

                    `Congratulations <@${newWinner}>! 🎉\n\n` +

                    `You won **${giveaway.prize}**! 🏆`

                );

            } catch (error) {

                console.error(
                    '❌ Failed to update rerolled giveaway:',
                    error
                );

            }

            return interaction.editReply({

                content:
                    `🎉 New winner: <@${newWinner}>`

            });

        }

    },

    // ==========================================
    // EXPORTED FUNCTIONS
    // ==========================================

    createGiveawayEmbed,

    createGiveawayContainer,

    createGiveawayButtons,

    createGiveawayAttachment,

    finishGiveaway

};

// ==========================================
// FINISH GIVEAWAY
// ==========================================

async function finishGiveaway(
    client,
    giveaway
) {

    if (
        giveaway.status !== 'active'
    ) {

        return;

    }

    // ==========================================
    // SHUFFLE ENTRIES
    // ==========================================

    const shuffled =
        [...giveaway.entries];

    for (
        let i = shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            shuffled[i],
            shuffled[j]
        ] = [
            shuffled[j],
            shuffled[i]
        ];

    }

    // ==========================================
    // SELECT WINNERS
    // ==========================================

    const winners =
        shuffled.slice(

            0,

            Math.min(
                giveaway.winners,
                shuffled.length
            )

        );

    // ==========================================
    // SAVE RESULT
    // ==========================================

    updateGiveaway(

        giveaway.id,

        {

            status:
                'ended',

            winnerIds:
                winners,

            endedAt:
                Date.now()

        }

    );

    // ==========================================
    // UPDATE DISCORD MESSAGE
    // ==========================================

    try {

        const channel =
            await client.channels.fetch(
                giveaway.channelId
            );

        const message =
            await channel.messages.fetch(
                giveaway.messageId
            );

        giveaway.winnerIds =
            winners;

        const winnerText =
            winners.length
                ? winners
                    .map(id => `<@${id}>`)
                    .join(', ')
                : 'Nobody — not enough entries.';

        const container =
            createGiveawayContainer(
                giveaway,
                'ended'
            );

        await message.edit({

            components: [
                container
            ],

            files: [
                createGiveawayAttachment()
            ],

            flags:
                MessageFlags.IsComponentsV2

        });

        // ==========================================
        // WINNER ANNOUNCEMENT
        // ==========================================

        if (
            winners.length
        ) {

            await channel.send(

                `🎉 **GIVEAWAY WINNER${winners.length > 1 ? 'S' : ''}!**\n\n` +

                `Congratulations ${winnerText}!\n\n` +

                `You won **${giveaway.prize}**! 🏆`

            );

        }

    } catch (error) {

        console.error(
            '❌ Failed to finish giveaway:',
            error
        );

    }

}
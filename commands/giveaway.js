const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    AttachmentBuilder,
    MessageFlags
} = require('discord.js');

const path = require('path');

const {
    createGiveaway,
    getGiveaway,
    updateGiveaway,
    addEntry,
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

function createGiveawayEmbed(giveaway) {

    const endTimestamp =
        Math.floor(
            giveaway.endsAt / 1000
        );

    return new EmbedBuilder()

        // Fortnite blue
        .setColor(0x1493ff)

        .setTitle(
            '🎁 FORTNITE GIVEAWAY'
        )

        .setDescription(

            `# 🎮 ${giveaway.prize}\n\n` +

            `**DROP IN. ENTER. WIN.**\n\n` +

            `━━━━━━━━━━━━━━━━━━━━\n\n` +

            `🏆 **WINNERS**\n` +
            `${giveaway.winners}\n\n` +

            `👥 **ENTRIES**\n` +
            `${giveaway.entries.length}\n\n` +

            `⏳ **ENDS**\n` +
            `<t:${endTimestamp}:R>\n\n` +

            `━━━━━━━━━━━━━━━━━━━━\n\n` +

            `### 🔵 HOW TO ENTER\n` +

            `Click the button below to enter this giveaway.\n\n` +

            `**Good luck, Fortnite legends!** 💙`

        )

        .setImage(
            'attachment://giveaway-banner.png'
        )

        .setFooter({
            text:
                'AMYFN • Fortnite Community'
        })

        .setTimestamp();
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
            // CREATE EMBED
            // ==========================================

            const embed =
                createGiveawayEmbed(
                    giveaway
                );

            const row =
                createGiveawayButtons(
                    giveaway
                );

            const attachment =
                createGiveawayAttachment();

            // ==========================================
            // SEND GIVEAWAY MESSAGE
            // ==========================================

            const message =
                await interaction.channel.send({

                    embeds: [
                        embed
                    ],

                    components: [
                        row
                    ],

                    files: [
                        attachment
                    ]

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

                const embed =
                    new EmbedBuilder()

                        .setColor(
                            0x555555
                        )

                        .setTitle(
                            '🎁 GIVEAWAY CANCELLED'
                        )

                        .setDescription(

                            `# ${giveaway.prize}\n\n` +

                            `This giveaway has been cancelled by the server staff.`

                        )

                        .setFooter({

                            text:
                                'AMYFN • Fortnite Community'

                        });

                await message.edit({

                    embeds: [
                        embed
                    ],

                    components: []

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

                const winnerText =
                    newWinnerIds
                        .map(
                            id =>
                                `<@${id}>`
                        )
                        .join(', ');

                const embed =
                    new EmbedBuilder()

                        .setColor(
                            0x00e5ff
                        )

                        .setTitle(
                            '🏆 FORTNITE GIVEAWAY ENDED'
                        )

                        .setDescription(

                            `# 🎁 ${giveaway.prize}\n\n` +

                            `🏆 **WINNERS**\n` +
                            `${winnerText}\n\n` +

                            `👥 **TOTAL ENTRIES**\n` +
                            `${giveaway.entries.length}\n\n` +

                            `━━━━━━━━━━━━━━━━━━━━\n\n` +

                            `**A winner has been rerolled!** 🔄\n\n` +

                            `Congratulations to the new winner! 🎉\n\n` +

                            `Thanks everyone for participating in the AMYFN community. 💙`

                        )

                        .setImage(
                            'attachment://giveaway-banner.png'
                        )

                        .setFooter({

                            text:
                                'AMYFN • Fortnite Community'

                        })

                        .setTimestamp();

                await message.edit({

                    embeds: [
                        embed
                    ],

                    components: []

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

    createGiveawayButtons,

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

        const winnerText =
            winners.length

                ? winners
                    .map(
                        id =>
                            `<@${id}>`
                    )
                    .join(', ')

                : 'Nobody — not enough entries.';

        const embed =
            new EmbedBuilder()

                .setColor(
                    0x00e5ff
                )

                .setTitle(
                    '🏆 FORTNITE GIVEAWAY ENDED'
                )

                .setDescription(

                    `# 🎁 ${giveaway.prize}\n\n` +

                    `🏆 **WINNERS**\n` +
                    `${winnerText}\n\n` +

                    `👥 **TOTAL ENTRIES**\n` +
                    `${giveaway.entries.length}\n\n` +

                    `━━━━━━━━━━━━━━━━━━━━\n\n` +

                    `**Congratulations!** 🎉\n\n` +

                    `Thanks everyone for participating in the AMYFN community. 💙`

                )

                .setImage(
                    'attachment://giveaway-banner.png'
                )

                .setFooter({

                    text:
                        'AMYFN • Fortnite Community'

                })

                .setTimestamp();

        await message.edit({

            embeds: [
                embed
            ],

            components: []

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
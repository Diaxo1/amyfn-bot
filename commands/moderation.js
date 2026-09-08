const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const {
    sendLog
} = require('../services/logger');

// ==========================================
// WARNINGS STORAGE
// ==========================================

const warningsFile =
    path.join(
        __dirname,
        '../data/warnings.json'
    );

function loadWarnings() {

    try {

        if (!fs.existsSync(warningsFile)) {

            fs.writeFileSync(
                warningsFile,
                '{}'
            );

        }

        const data =
            fs.readFileSync(
                warningsFile,
                'utf8'
            );

        return JSON.parse(data || '{}');

    } catch (error) {

        console.error(
            '❌ Could not load warnings:',
            error
        );

        return {};

    }

}

function saveWarnings(data) {

    try {

        fs.writeFileSync(
            warningsFile,
            JSON.stringify(
                data,
                null,
                4
            )
        );

    } catch (error) {

        console.error(
            '❌ Could not save warnings:',
            error
        );

    }

}

// ==========================================
// MODERATION HELPERS
// ==========================================

function canModerate(
    interaction,
    target
) {

    const moderator =
        interaction.member;

    if (
        target.id === moderator.id
    ) {

        return {
            allowed: false,
            reason:
                '❌ You cannot moderate yourself.'
        };

    }

    if (
        target.id === interaction.guild.ownerId
    ) {

        return {
            allowed: false,
            reason:
                '❌ You cannot moderate the server owner.'
        };

    }

    if (
        target.roles.highest.position >=
        moderator.roles.highest.position &&
        interaction.user.id !==
        interaction.guild.ownerId
    ) {

        return {
            allowed: false,
            reason:
                '❌ You cannot moderate someone with an equal or higher role.'
        };

    }

    if (
        target.roles.highest.position >=
        interaction.guild.members.me.roles.highest.position
    ) {

        return {
            allowed: false,
            reason:
                '❌ My role is not high enough to moderate this member.'
        };

    }

    return {
        allowed: true
    };

}

function formatDuration(
    milliseconds
) {

    const totalSeconds =
        Math.floor(
            milliseconds / 1000
        );

    const days =
        Math.floor(
            totalSeconds / 86400
        );

    const hours =
        Math.floor(
            (totalSeconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;

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

    if (seconds) {
        parts.push(`${seconds}s`);
    }

    return parts.join(' ') || '0s';

}

// ==========================================
// COMMAND DATA
// ==========================================

const warnData =
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription(
            'Warn a server member'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The member to warn'
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for the warning'
                )
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        );

const warningsData =
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription(
            'View a member warning history'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The member to check'
                )
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        );

const banData =
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription(
            'Ban a server member'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The member to ban'
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for the ban'
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.BanMembers
        );

const kickData =
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription(
            'Kick a server member'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The member to kick'
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for the kick'
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.KickMembers
        );

const timeoutData =
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription(
            'Timeout a server member'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The member to timeout'
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription(
                    'Duration in minutes'
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for the timeout'
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        );

const untimeoutData =
    new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription(
            'Remove a member timeout'
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription(
                    'The member to untimeout'
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for removing the timeout'
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ModerateMembers
        );

const clearData =
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription(
            'Delete messages from a channel'
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription(
                    'Number of messages to delete'
                )
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageMessages
        );

const slowmodeData =
    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription(
            'Set channel slowmode'
        )
        .addIntegerOption(option =>
            option
                .setName('seconds')
                .setDescription(
                    'Slowmode duration in seconds'
                )
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(21600)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        );

const lockData =
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription(
            'Lock the current channel'
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for locking the channel'
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        );

const unlockData =
    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription(
            'Unlock the current channel'
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription(
                    'Reason for unlocking the channel'
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageChannels
        );

// ==========================================
// WARN
// ==========================================

async function executeWarn(
    interaction
) {

    const target =
        interaction.options.getMember(
            'user'
        );

    const reason =
        interaction.options.getString(
            'reason'
        );

    if (!target) {

        return interaction.reply({
            content:
                '❌ I could not find that member.',
            ephemeral: true
        });

    }

    const check =
        canModerate(
            interaction,
            target
        );

    if (!check.allowed) {

        return interaction.reply({
            content: check.reason,
            ephemeral: true
        });

    }

    const warnings =
        loadWarnings();

    if (!warnings[interaction.guild.id]) {

        warnings[interaction.guild.id] = {};

    }

    if (
        !warnings[interaction.guild.id][target.id]
    ) {

        warnings[interaction.guild.id][target.id] = [];

    }

    const warning = {

        id:
            Date.now().toString(),

        reason,

        moderatorId:
            interaction.user.id,

        moderatorTag:
            interaction.user.tag,

        timestamp:
            new Date().toISOString()

    };

    warnings[
        interaction.guild.id
    ][
        target.id
    ].push(
        warning
    );

    saveWarnings(
        warnings
    );

    const totalWarnings =
        warnings[
            interaction.guild.id
        ][
            target.id
        ].length;

    const embed =
        new EmbedBuilder()
            .setTitle(
                '⚠️ Member Warned'
            )
            .setColor(
                0xF1C40F
            )
            .addFields(

                {
                    name: 'Member',
                    value:
                        `${target.user.tag}\n<@${target.id}>`,
                    inline: true
                },

                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },

                {
                    name: 'Total Warnings',
                    value:
                        `${totalWarnings}`,
                    inline: true
                },

                {
                    name: 'Reason',
                    value: reason
                }

            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    try {

        await target.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(
                        '⚠️ You have been warned'
                    )
                    .setColor(
                        0xF1C40F
                    )
                    .setDescription(
                        `You received a warning in **${interaction.guild.name}**.`
                    )
                    .addFields(
                        {
                            name: 'Reason',
                            value: reason
                        },
                        {
                            name: 'Total Warnings',
                            value:
                                `${totalWarnings}`
                        }
                    )
                    .setTimestamp()
            ]
        });

    } catch {

        console.log(
            '⚠️ Could not DM warned member.'
        );

    }

    try {

        await sendLog(
            interaction.guild,
            embed
        );

    } catch (error) {

        console.error(
            '❌ Warning log error:',
            error
        );

    }

}

// ==========================================
// WARNINGS
// ==========================================

async function executeWarnings(
    interaction
) {

    const target =
        interaction.options.getMember(
            'user'
        );

    if (!target) {

        return interaction.reply({
            content:
                '❌ I could not find that member.',
            ephemeral: true
        });

    }

    const warnings =
        loadWarnings();

    const memberWarnings =
        warnings[
            interaction.guild.id
        ]?.[
            target.id
        ] || [];

    if (
        memberWarnings.length === 0
    ) {

        return interaction.reply({
            content:
                `📋 **${target.user.tag}** has no warnings.`,
            ephemeral: true
        });

    }

    const recentWarnings =
        memberWarnings
            .slice(-10)
            .reverse();

    const description =
        recentWarnings
            .map(
                (warning, index) =>
                    `**${index + 1}.** ${warning.reason}\n` +
                    `Moderator: <@${warning.moderatorId}>\n` +
                    `<t:${Math.floor(
                        new Date(
                            warning.timestamp
                        ).getTime() / 1000
                    )}:R>`
            )
            .join('\n\n');

    const embed =
        new EmbedBuilder()
            .setTitle(
                `📋 Warning History — ${target.user.tag}`
            )
            .setColor(
                0xF1C40F
            )
            .setDescription(
                description
            )
            .addFields({
                name: 'Total Warnings',
                value:
                    `${memberWarnings.length}`,
                inline: true
            })
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ],
        ephemeral: true
    });

}

// ==========================================
// BAN
// ==========================================

async function executeBan(
    interaction
) {

    const target =
        interaction.options.getMember(
            'user'
        );

    const reason =
        interaction.options.getString(
            'reason'
        ) ||
        'No reason provided';

    if (!target) {

        return interaction.reply({
            content:
                '❌ I could not find that member.',
            ephemeral: true
        });

    }

    const check =
        canModerate(
            interaction,
            target
        );

    if (!check.allowed) {

        return interaction.reply({
            content: check.reason,
            ephemeral: true
        });

    }

    try {

        await target.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(
                        '🔨 You have been banned'
                    )
                    .setColor(
                        0xE74C3C
                    )
                    .setDescription(
                        `You have been banned from **${interaction.guild.name}**.`
                    )
                    .addFields({
                        name: 'Reason',
                        value: reason
                    })
                    .setTimestamp()
            ]
        });

    } catch {

        console.log(
            '⚠️ Could not DM banned member.'
        );

    }

    await target.ban({
        reason
    });

    const embed =
        new EmbedBuilder()
            .setTitle(
                '🔨 Member Banned'
            )
            .setColor(
                0xE74C3C
            )
            .addFields(
                {
                    name: 'Member',
                    value:
                        `${target.user.tag}\n<@${target.id}>`,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// KICK
// ==========================================

async function executeKick(
    interaction
) {

    const target =
        interaction.options.getMember(
            'user'
        );

    const reason =
        interaction.options.getString(
            'reason'
        ) ||
        'No reason provided';

    if (!target) {

        return interaction.reply({
            content:
                '❌ I could not find that member.',
            ephemeral: true
        });

    }

    const check =
        canModerate(
            interaction,
            target
        );

    if (!check.allowed) {

        return interaction.reply({
            content: check.reason,
            ephemeral: true
        });

    }

    try {

        await target.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(
                        '👢 You have been kicked'
                    )
                    .setColor(
                        0xE67E22
                    )
                    .setDescription(
                        `You have been kicked from **${interaction.guild.name}**.`
                    )
                    .addFields({
                        name: 'Reason',
                        value: reason
                    })
                    .setTimestamp()
            ]
        });

    } catch {

        console.log(
            '⚠️ Could not DM kicked member.'
        );

    }

    await target.kick(
        reason
    );

    const embed =
        new EmbedBuilder()
            .setTitle(
                '👢 Member Kicked'
            )
            .setColor(
                0xE67E22
            )
            .addFields(
                {
                    name: 'Member',
                    value:
                        `${target.user.tag}\n<@${target.id}>`,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// TIMEOUT
// ==========================================

async function executeTimeout(
    interaction
) {

    const target =
        interaction.options.getMember(
            'user'
        );

    const duration =
        interaction.options.getInteger(
            'duration'
        );

    const reason =
        interaction.options.getString(
            'reason'
        ) ||
        'No reason provided';

    if (!target) {

        return interaction.reply({
            content:
                '❌ I could not find that member.',
            ephemeral: true
        });

    }

    const check =
        canModerate(
            interaction,
            target
        );

    if (!check.allowed) {

        return interaction.reply({
            content: check.reason,
            ephemeral: true
        });

    }

    const milliseconds =
        duration * 60 * 1000;

    await target.timeout(
        milliseconds,
        reason
    );

    const embed =
        new EmbedBuilder()
            .setTitle(
                '⏱️ Member Timed Out'
            )
            .setColor(
                0x9B59B6
            )
            .addFields(
                {
                    name: 'Member',
                    value:
                        `${target.user.tag}\n<@${target.id}>`,
                    inline: true
                },
                {
                    name: 'Duration',
                    value:
                        formatDuration(
                            milliseconds
                        ),
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    try {

        await target.send({
            embeds: [
                embed
            ]
        });

    } catch {

        console.log(
            '⚠️ Could not DM timed out member.'
        );

    }

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// UNTIMEOUT
// ==========================================

async function executeUntimeout(
    interaction
) {

    const target =
        interaction.options.getMember(
            'user'
        );

    const reason =
        interaction.options.getString(
            'reason'
        ) ||
        'No reason provided';

    if (!target) {

        return interaction.reply({
            content:
                '❌ I could not find that member.',
            ephemeral: true
        });

    }

    const check =
        canModerate(
            interaction,
            target
        );

    if (!check.allowed) {

        return interaction.reply({
            content: check.reason,
            ephemeral: true
        });

    }

    if (
        !target.communicationDisabledUntil
    ) {

        return interaction.reply({
            content:
                '❌ That member is not currently timed out.',
            ephemeral: true
        });

    }

    await target.timeout(
        null,
        reason
    );

    const embed =
        new EmbedBuilder()
            .setTitle(
                '✅ Timeout Removed'
            )
            .setColor(
                0x2ECC71
            )
            .addFields(
                {
                    name: 'Member',
                    value:
                        `${target.user.tag}\n<@${target.id}>`,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// CLEAR
// ==========================================

async function executeClear(
    interaction
) {

    const amount =
        interaction.options.getInteger(
            'amount'
        );

    if (
        !interaction.channel ||
        !interaction.channel.isTextBased()
    ) {

        return interaction.reply({
            content:
                '❌ This command can only be used in a text channel.',
            ephemeral: true
        });

    }

    await interaction.deferReply({
        ephemeral: true
    });

    try {

        const deleted =
            await interaction.channel.bulkDelete(
                amount,
                true
            );

        const embed =
            new EmbedBuilder()
                .setTitle(
                    '🧹 Messages Cleared'
                )
                .setColor(
                    0x3498DB
                )
                .addFields(
                    {
                        name: 'Messages Deleted',
                        value:
                            `${deleted.size}`,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value:
                            `<@${interaction.user.id}>`,
                        inline: true
                    }
                )
                .setTimestamp();

        await interaction.editReply({
            embeds: [
                embed
            ]
        });

        await sendLog(
            interaction.guild,
            embed
        );

    } catch (error) {

        console.error(
            '❌ Clear error:',
            error
        );

        await interaction.editReply({
            content:
                '❌ I could not delete those messages. Make sure I have **Manage Messages** permission.'
        });

    }

}

// ==========================================
// SLOWMODE
// ==========================================

async function executeSlowmode(
    interaction
) {

    const seconds =
        interaction.options.getInteger(
            'seconds'
        );

    const channel =
        interaction.channel;

    if (
        !channel ||
        !channel.isTextBased()
    ) {

        return interaction.reply({
            content:
                '❌ This command can only be used in a text channel.',
            ephemeral: true
        });

    }

    if (
        !('setRateLimitPerUser' in channel)
    ) {

        return interaction.reply({
            content:
                '❌ Slowmode cannot be configured in this channel.',
            ephemeral: true
        });

    }

    await channel.setRateLimitPerUser(
        seconds,
        `Changed by ${interaction.user.tag}`
    );

    const embed =
        new EmbedBuilder()
            .setTitle(
                '🐌 Slowmode Updated'
            )
            .setColor(
                0x3498DB
            )
            .addFields(
                {
                    name: 'Channel',
                    value:
                        `<#${channel.id}>`,
                    inline: true
                },
                {
                    name: 'Slowmode',
                    value:
                        seconds === 0
                            ? 'Disabled'
                            : `${seconds} seconds`,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// LOCK
// ==========================================

async function executeLock(
    interaction
) {

    const channel =
        interaction.channel;

    const reason =
        interaction.options.getString(
            'reason'
        ) ||
        'No reason provided';

    if (
        !channel ||
        channel.type !== ChannelType.GuildText
    ) {

        return interaction.reply({
            content:
                '❌ This command can only be used in a standard text channel.',
            ephemeral: true
        });

    }

    const everyoneRole =
        interaction.guild.roles.everyone;

    await channel.permissionOverwrites.edit(
        everyoneRole,
        {
            SendMessages: false
        }
    );

    const embed =
        new EmbedBuilder()
            .setTitle(
                '🔒 Channel Locked'
            )
            .setColor(
                0xE74C3C
            )
            .addFields(
                {
                    name: 'Channel',
                    value:
                        `<#${channel.id}>`,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// UNLOCK
// ==========================================

async function executeUnlock(
    interaction
) {

    const channel =
        interaction.channel;

    const reason =
        interaction.options.getString(
            'reason'
        ) ||
        'No reason provided';

    if (
        !channel ||
        channel.type !== ChannelType.GuildText
    ) {

        return interaction.reply({
            content:
                '❌ This command can only be used in a standard text channel.',
            ephemeral: true
        });

    }

    const everyoneRole =
        interaction.guild.roles.everyone;

    await channel.permissionOverwrites.edit(
        everyoneRole,
        {
            SendMessages: null
        }
    );

    const embed =
        new EmbedBuilder()
            .setTitle(
                '🔓 Channel Unlocked'
            )
            .setColor(
                0x2ECC71
            )
            .addFields(
                {
                    name: 'Channel',
                    value:
                        `<#${channel.id}>`,
                    inline: true
                },
                {
                    name: 'Moderator',
                    value:
                        `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: 'Reason',
                    value: reason
                }
            )
            .setTimestamp();

    await interaction.reply({
        embeds: [
            embed
        ]
    });

    await sendLog(
        interaction.guild,
        embed
    );

}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    warnData,
    warningsData,
    banData,
    kickData,
    timeoutData,
    untimeoutData,
    clearData,
    slowmodeData,
    lockData,
    unlockData,

    executeWarn,
    executeWarnings,
    executeBan,
    executeKick,
    executeTimeout,
    executeUntimeout,
    executeClear,
    executeSlowmode,
    executeLock,
    executeUnlock

};
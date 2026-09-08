const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const {
    sendLog
} = require('../services/logger');

const DATA_DIR =
    path.join(
        __dirname,
        '..',
        'data'
    );

const WARNINGS_FILE =
    path.join(
        DATA_DIR,
        'warnings.json'
    );

// =========================================================
// STORAGE
// =========================================================

function ensureStorage() {

    if (!fs.existsSync(DATA_DIR)) {

        fs.mkdirSync(
            DATA_DIR,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(WARNINGS_FILE)) {

        fs.writeFileSync(
            WARNINGS_FILE,
            '{}',
            'utf8'
        );

    }

}

function loadWarnings() {

    ensureStorage();

    try {

        const data =
            fs.readFileSync(
                WARNINGS_FILE,
                'utf8'
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            '❌ Failed to load warnings:',
            error.message
        );

        return {};

    }

}

function saveWarnings(data) {

    ensureStorage();

    fs.writeFileSync(
        WARNINGS_FILE,
        JSON.stringify(
            data,
            null,
            4
        ),
        'utf8'
    );

}

// =========================================================
// /WARN
// =========================================================

async function executeWarn(
    interaction
) {

    try {

        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    '❌ You need the **Moderate Members** permission to warn members.',
                ephemeral:
                    true
            });

        }

        const target =
            interaction.options.getMember(
                'user'
            );

        const reason =
            interaction.options.getString(
                'reason'
            ) ||
            'No reason provided.';

        if (!target) {

            return interaction.reply({
                content:
                    '❌ I could not find that member.',
                ephemeral:
                    true
            });

        }

        if (
            target.id ===
            interaction.user.id
        ) {

            return interaction.reply({
                content:
                    '❌ You cannot warn yourself.',
                ephemeral:
                    true
            });

        }

        if (
            target.user.bot
        ) {

            return interaction.reply({
                content:
                    '❌ You cannot warn a bot.',
                ephemeral:
                    true
            });

        }

        const moderator =
            interaction.member;

        if (
            target.roles.highest.position >=
            moderator.roles.highest.position &&
            interaction.guild.ownerId !==
            interaction.user.id
        ) {

            return interaction.reply({
                content:
                    '❌ You cannot warn someone with an equal or higher role than you.',
                ephemeral:
                    true
            });

        }

        const warnings =
            loadWarnings();

        if (
            !warnings[interaction.guild.id]
        ) {

            warnings[
                interaction.guild.id
            ] = {};

        }

        if (
            !warnings[
                interaction.guild.id
            ][target.id]
        ) {

            warnings[
                interaction.guild.id
            ][target.id] = [];

        }

        const warning = {

            id:
                Date.now().toString(),

            reason:
                reason,

            moderatorId:
                interaction.user.id,

            moderatorTag:
                interaction.user.tag,

            timestamp:
                Date.now()

        };

        warnings[
            interaction.guild.id
        ][target.id].push(
            warning
        );

        saveWarnings(
            warnings
        );

        const totalWarnings =
            warnings[
                interaction.guild.id
            ][target.id].length;

        const embed =
            new EmbedBuilder()
                .setColor(0x1493ff)
                .setTitle(
                    '⚠️ Member Warned'
                )
                .setDescription(
                    `${target} has received a warning.`
                )
                .addFields(

                    {
                        name:
                            '👤 Member',

                        value:
                            `${target.user.tag}\n\`${target.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🛡️ Moderator',

                        value:
                            `${interaction.user.tag}\n\`${interaction.user.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '📊 Total Warnings',

                        value:
                            `${totalWarnings}`,

                        inline:
                            true
                    },

                    {
                        name:
                            '📝 Reason',

                        value:
                            reason,

                        inline:
                            false
                    }

                )
                .setThumbnail(
                    target.user.displayAvatarURL()
                )
                .setTimestamp();

        await interaction.reply({
            embeds: [
                embed
            ]
        });

        // =================================================
        // LOG
        // =================================================

        await sendLog(
            interaction.guild,
            {

                title:
                    '⚠️ Member Warned',

                description:
                    `${target} was warned.`,

                fields: [

                    {
                        name:
                            '👤 Member',

                        value:
                            `${target.user.tag}\n\`${target.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🛡️ Moderator',

                        value:
                            `${interaction.user.tag}\n\`${interaction.user.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '📊 Total Warnings',

                        value:
                            `${totalWarnings}`,

                        inline:
                            true
                    },

                    {
                        name:
                            '📝 Reason',

                        value:
                            reason,

                        inline:
                            false
                    }

                ],

                thumbnail:
                    target.user.displayAvatarURL()

            }
        );

        // =================================================
        // DM MEMBER
        // =================================================

        try {

            await target.send({

                embeds: [

                    new EmbedBuilder()
                        .setColor(0x1493ff)
                        .setTitle(
                            `⚠️ You have been warned in ${interaction.guild.name}`
                        )
                        .setDescription(
                            `You received a warning from a moderator.`
                        )
                        .addFields({

                            name:
                                '📝 Reason',

                            value:
                                reason,

                            inline:
                                false

                        })
                        .setTimestamp()

                ]

            });

        } catch {

            console.log(
                `⚠️ Could not DM ${target.user.tag} about their warning.`
            );

        }

    } catch (error) {

        console.error(
            '❌ Warn command error:',
            error
        );

        if (
            interaction.replied ||
            interaction.deferred
        ) {

            return interaction.editReply({
                content:
                    '❌ Something went wrong while warning that member.',
                embeds: []
            });

        }

        return interaction.reply({
            content:
                '❌ Something went wrong while warning that member.',
            ephemeral:
                true
        });

    }

}

// =========================================================
// /WARNINGS
// =========================================================

async function executeWarnings(
    interaction
) {

    try {

        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.ModerateMembers
            )
        ) {

            return interaction.reply({
                content:
                    '❌ You need the **Moderate Members** permission to view warnings.',
                ephemeral:
                    true
            });

        }

        const target =
            interaction.options.getMember(
                'user'
            );

        if (!target) {

            return interaction.reply({
                content:
                    '❌ I could not find that member.',
                ephemeral:
                    true
            });

        }

        const warnings =
            loadWarnings();

        const guildWarnings =
            warnings[
                interaction.guild.id
            ] || {};

        const userWarnings =
            guildWarnings[
                target.id
            ] || [];

        if (
            userWarnings.length === 0
        ) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()
                        .setColor(0x1493ff)
                        .setTitle(
                            '📋 Warning History'
                        )
                        .setDescription(
                            `**${target.user.tag}** has no warnings.`
                        )
                        .setThumbnail(
                            target.user.displayAvatarURL()
                        )
                        .setTimestamp()

                ]

            });

        }

        const recentWarnings =
            userWarnings
                .slice(-10)
                .reverse();

        const description =
            recentWarnings
                .map(
                    (warning, index) => {

                        const date =
                            Math.floor(
                                warning.timestamp /
                                1000
                            );

                        return (
                            `**${index + 1}.** ${warning.reason}\n` +
                            `> 🛡️ ${warning.moderatorTag}\n` +
                            `> 🕒 <t:${date}:R>\n`
                        );

                    }
                )
                .join('\n');

        const embed =
            new EmbedBuilder()
                .setColor(0x1493ff)
                .setTitle(
                    '📋 Warning History'
                )
                .setDescription(
                    `### ${target.user.tag}\n\n` +
                    `**Total warnings:** ${userWarnings.length}\n\n` +
                    description
                )
                .setThumbnail(
                    target.user.displayAvatarURL()
                )
                .setFooter({
                    text:
                        userWarnings.length > 10
                            ? 'Showing the 10 most recent warnings'
                            : 'Amyfn • Moderation'
                })
                .setTimestamp();

        return interaction.reply({
            embeds: [
                embed
            ],
            ephemeral:
                true
        });

    } catch (error) {

        console.error(
            '❌ Warnings command error:',
            error
        );

        return interaction.reply({
            content:
                '❌ Something went wrong while loading the warning history.',
            ephemeral:
                true
        });

    }

}

// =========================================================
// COMMAND DEFINITIONS
// =========================================================

const warnCommand =
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription(
            'Warn a member'
        )
        .addUserOption(
            option =>
                option
                    .setName('user')
                    .setDescription(
                        'The member to warn'
                    )
                    .setRequired(true)
        )
        .addStringOption(
            option =>
                option
                    .setName('reason')
                    .setDescription(
                        'Why the member is being warned'
                    )
                    .setRequired(true)
                    .setMaxLength(500)
        );

const warningsCommand =
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription(
            'View a member\'s warning history'
        )
        .addUserOption(
            option =>
                option
                    .setName('user')
                    .setDescription(
                        'The member whose warnings you want to view'
                    )
                    .setRequired(true)
        );

module.exports = {

    warnData:
        warnCommand,

    warningsData:
        warningsCommand,

    executeWarn,

    executeWarnings

};
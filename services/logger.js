const {
    EmbedBuilder,
    AuditLogEvent,
    PermissionFlagsBits
} = require('discord.js');

const {
    getServerConfig
} = require('./serverConfig');

const {
    AMYFN_BLUE,
    AMYFN_FOOTER
} = require('./embedStyle');

// =========================================================
// GENERAL LOG SENDER
// =========================================================

async function sendLog(guild, options = {}) {

    try {

        if (!guild) {
            return;
        }

        const config =
            getServerConfig(guild.id);

        const logsChannelId =
            config?.logsChannelId;

        if (!logsChannelId) {
            return;
        }

        const channel =
            await guild.channels.fetch(
                logsChannelId
            );

        if (
            !channel ||
            !channel.isTextBased()
        ) {
            return;
        }

        const embed =
            new EmbedBuilder()
                .setColor(
                    options.color ||
                    AMYFN_BLUE
                )
                .setFooter({
                    text:
                        AMYFN_FOOTER
                })
                .setTimestamp();

        if (options.title) {

            embed.setTitle(
                options.title
            );

        }

        if (options.description) {

            embed.setDescription(
                options.description
            );

        }

        if (
            options.fields &&
            options.fields.length
        ) {

            embed.addFields(
                options.fields
            );

        }

        if (options.thumbnail) {

            embed.setThumbnail(
                options.thumbnail
            );

        }

        if (options.image) {

            embed.setImage(
                options.image
            );

        }

        await channel.send({
            embeds: [
                embed
            ]
        });

    } catch (error) {

        console.error(
            '❌ Logger error:',
            error.message
        );

    }

}

// =========================================================
// AUDIT LOG HELPER
// =========================================================

async function getRecentAuditEntry(
    guild,
    type,
    targetId
) {

    try {

        if (!guild) {
            return null;
        }

        const me =
            guild.members.me;

        if (!me) {
            return null;
        }

        if (
            !me.permissions.has(
                PermissionFlagsBits.ViewAuditLog
            )
        ) {

            return null;

        }

        const logs =
            await guild.fetchAuditLogs({

                type,

                limit: 10

            });

        const now =
            Date.now();

        const entry =
            logs.entries.find(
                entry => {

                    if (
                        targetId &&
                        entry.target?.id !== targetId
                    ) {

                        return false;

                    }

                    const age =
                        now -
                        entry.createdTimestamp;

                    return (
                        age >= 0 &&
                        age < 15000
                    );

                }
            );

        return entry || null;

    } catch (error) {

        console.error(
            '⚠️ Audit log lookup failed:',
            error.message
        );

        return null;

    }

}

// =========================================================
// MEMBER JOIN
// =========================================================

async function logMemberJoin(member) {

    if (!member?.guild) {
        return;
    }

    return sendLog(
        member.guild,
        {

            title:
                '👤 Member Joined',

            description:
                `${member} joined the server.`,

            fields: [

                {
                    name:
                        '👤 User',

                    value:
                        `${member.user.tag}\n\`${member.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '📅 Account Created',

                    value:
                        `<t:${Math.floor(
                            member.user.createdTimestamp /
                            1000
                        )}:F>`,

                    inline:
                        true
                }

            ],

            thumbnail:
                member.user.displayAvatarURL()

        }
    );

}

// =========================================================
// MEMBER LEAVE / KICK
// =========================================================

async function logMemberLeave(member) {

    if (!member?.guild) {
        return;
    }

    let kickEntry = null;

    try {

        kickEntry =
            await getRecentAuditEntry(
                member.guild,
                AuditLogEvent.MemberKick,
                member.id
            );

    } catch {
        kickEntry = null;
    }

    if (kickEntry) {

        return sendLog(
            member.guild,
            {

                title:
                    '🔨 Member Kicked',

                description:
                    `**${member.user.tag}** was kicked from the server.`,

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${member.user.tag}\n\`${member.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🛡️ Moderator',

                        value:
                            kickEntry.executor
                                ? `${kickEntry.executor}\n\`${kickEntry.executor.id}\``
                                : 'Unknown',

                        inline:
                            true
                    },

                    {
                        name:
                            '📝 Reason',

                        value:
                            kickEntry.reason ||
                            'No reason provided.',

                        inline:
                            false
                    }

                ],

                thumbnail:
                    member.user.displayAvatarURL()

            }
        );

    }

    return sendLog(
        member.guild,
        {

            title:
                '🚪 Member Left',

            description:
                `**${member.user.tag}** left the server.`,

            fields: [

                {
                    name:
                        '👤 User',

                    value:
                        `${member.user.tag}\n\`${member.id}\``,

                    inline:
                        true
                }

            ],

            thumbnail:
                member.user.displayAvatarURL()

        }
    );

}

// =========================================================
// MEMBER BAN
// =========================================================

async function logMemberBan(
    guild,
    user
) {

    if (!guild || !user) {
        return;
    }

    let entry = null;

    try {

        entry =
            await getRecentAuditEntry(
                guild,
                AuditLogEvent.MemberBanAdd,
                user.id
            );

    } catch {
        entry = null;
    }

    return sendLog(
        guild,
        {

            title:
                '🔨 Member Banned',

            description:
                `**${user.tag}** was banned from the server.`,

            fields: [

                {
                    name:
                        '👤 User',

                    value:
                        `${user.tag}\n\`${user.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Moderator',

                    value:
                        entry?.executor
                            ? `${entry.executor}\n\`${entry.executor.id}\``
                            : 'Unknown',

                    inline:
                        true
                },

                {
                    name:
                        '📝 Reason',

                    value:
                        entry?.reason ||
                        'No reason provided.',

                    inline:
                        false
                }

            ],

            thumbnail:
                user.displayAvatarURL()

        }
    );

}

// =========================================================
// MEMBER UNBAN
// =========================================================

async function logMemberUnban(
    guild,
    user
) {

    if (!guild || !user) {
        return;
    }

    let entry = null;

    try {

        entry =
            await getRecentAuditEntry(
                guild,
                AuditLogEvent.MemberBanRemove,
                user.id
            );

    } catch {
        entry = null;
    }

    return sendLog(
        guild,
        {

            title:
                '🔓 Member Unbanned',

            description:
                `**${user.tag}** was unbanned.`,

            fields: [

                {
                    name:
                        '👤 User',

                    value:
                        `${user.tag}\n\`${user.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Moderator',

                    value:
                        entry?.executor
                            ? `${entry.executor}\n\`${entry.executor.id}\``
                            : 'Unknown',

                    inline:
                        true
                },

                {
                    name:
                        '📝 Reason',

                    value:
                        entry?.reason ||
                        'No reason provided.',

                    inline:
                        false
                }

            ],

            thumbnail:
                user.displayAvatarURL()

        }
    );

}

// =========================================================
// TIMEOUT
// =========================================================

async function logMemberTimeout(
    member,
    oldTimeout,
    newTimeout
) {

    if (!member?.guild) {
        return;
    }

    // =====================================================
    // TIMEOUT ADDED
    // =====================================================

    if (
        !oldTimeout &&
        newTimeout
    ) {

        let moderator =
            'Unknown';

        let reason =
            'No reason provided.';

        try {

            const entry =
                await getRecentAuditEntry(
                    member.guild,
                    AuditLogEvent.MemberUpdate,
                    member.id
                );

            if (entry?.executor) {

                moderator =
                    `${entry.executor}\n\`${entry.executor.id}\``;

            }

            if (entry?.reason) {

                reason =
                    entry.reason;

            }

        } catch {
            // Audit log is optional.
        }

        return sendLog(
            member.guild,
            {

                title:
                    '⏱️ Member Timed Out',

                description:
                    `${member} was timed out.`,

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${member.user.tag}\n\`${member.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🛡️ Moderator',

                        value:
                            moderator,

                        inline:
                            true
                    },

                    {
                        name:
                            '⏰ Until',

                        value:
                            `<t:${Math.floor(
                                newTimeout.getTime() /
                                1000
                            )}:F>`,

                        inline:
                            false
                    },

                    {
                        name:
                            '⏳ Remaining',

                        value:
                            `<t:${Math.floor(
                                newTimeout.getTime() /
                                1000
                            )}:R>`,

                        inline:
                            false
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
                    member.user.displayAvatarURL()

            }
        );

    }

    // =====================================================
    // TIMEOUT REMOVED
    // =====================================================

    if (
        oldTimeout &&
        !newTimeout
    ) {

        return sendLog(
            member.guild,
            {

                title:
                    '✅ Timeout Removed',

                description:
                    `The timeout was removed from ${member}.`,

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${member.user.tag}\n\`${member.id}\``,

                        inline:
                            true
                    }

                ],

                thumbnail:
                    member.user.displayAvatarURL()

            }
        );

    }

}

// =========================================================
// NICKNAME CHANGE
// =========================================================

async function logNicknameChange(
    oldMember,
    newMember
) {

    if (!newMember?.guild) {
        return;
    }

    if (
        oldMember.nickname ===
        newMember.nickname
    ) {

        return;

    }

    let changedBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                newMember.guild,
                AuditLogEvent.MemberUpdate,
                newMember.id
            );

        if (entry?.executor) {

            changedBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        newMember.guild,
        {

            title:
                '✏️ Nickname Changed',

            fields: [

                {
                    name:
                        '👤 User',

                    value:
                        `${newMember.user.tag}\n\`${newMember.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Changed By',

                    value:
                        changedBy,

                    inline:
                        true
                },

                {
                    name:
                        'Before',

                    value:
                        oldMember.nickname ||
                        'None',

                    inline:
                        true
                },

                {
                    name:
                        'After',

                    value:
                        newMember.nickname ||
                        'None',

                    inline:
                        true
                }

            ],

            thumbnail:
                newMember.user.displayAvatarURL()

        }
    );

}

// =========================================================
// ROLE ADDED / REMOVED
// =========================================================

async function logRoleChanges(
    oldMember,
    newMember
) {

    if (!newMember?.guild) {
        return;
    }

    const oldRoles =
        new Set(
            oldMember.roles.cache.map(
                role => role.id
            )
        );

    const newRoles =
        new Set(
            newMember.roles.cache.map(
                role => role.id
            )
        );

    const added =
        newMember.roles.cache.filter(
            role =>
                !oldRoles.has(role.id)
        );

    const removed =
        oldMember.roles.cache.filter(
            role =>
                !newRoles.has(role.id)
        );

    if (
        added.size === 0 &&
        removed.size === 0
    ) {

        return;

    }

    let changedBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                newMember.guild,
                AuditLogEvent.MemberRoleUpdate,
                newMember.id
            );

        if (entry?.executor) {

            changedBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    for (
        const role of added.values()
    ) {

        await sendLog(
            newMember.guild,
            {

                title:
                    '🎭 Role Added',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${newMember.user.tag}\n\`${newMember.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🎭 Role',

                        value:
                            `${role}`,

                        inline:
                            true
                    },

                    {
                        name:
                            '🛡️ Changed By',

                        value:
                            changedBy,

                        inline:
                            true
                    }

                ]

            }
        );

    }

    for (
        const role of removed.values()
    ) {

        await sendLog(
            newMember.guild,
            {

                title:
                    '🎭 Role Removed',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${newMember.user.tag}\n\`${newMember.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🎭 Role',

                        value:
                            `${role.name}`,

                        inline:
                            true
                    },

                    {
                        name:
                            '🛡️ Changed By',

                        value:
                            changedBy,

                        inline:
                            true
                    }

                ]

            }
        );

    }

}

// =========================================================
// MESSAGE DELETED
// =========================================================

async function logMessageDelete(
    message
) {

    if (
        !message?.guild ||
        message.author?.bot
    ) {

        return;

    }

    let content =
        message.content ||
        'No text content';

    if (
        content.length > 1000
    ) {

        content =
            content.slice(0, 1000) +
            '...';

    }

    return sendLog(
        message.guild,
        {

            title:
                '🧹 Message Deleted',

            fields: [

                {
                    name:
                        '👤 Author',

                    value:
                        `${message.author?.tag || 'Unknown'}\n\`${message.author?.id || 'Unknown'}\``,

                    inline:
                        true
                },

                {
                    name:
                        '📍 Channel',

                    value:
                        `${message.channel}`,

                    inline:
                        true
                },

                {
                    name:
                        '💬 Content',

                    value:
                        content,

                    inline:
                        false
                }

            ]

        }
    );

}

// =========================================================
// MESSAGE EDITED
// =========================================================

async function logMessageEdit(
    oldMessage,
    newMessage
) {

    if (
        !oldMessage?.guild ||
        oldMessage.author?.bot
    ) {

        return;

    }

    if (
        oldMessage.content ===
        newMessage.content
    ) {

        return;

    }

    let oldContent =
        oldMessage.content ||
        'No text content';

    let newContent =
        newMessage.content ||
        'No text content';

    if (
        oldContent.length > 900
    ) {

        oldContent =
            oldContent.slice(0, 900) +
            '...';

    }

    if (
        newContent.length > 900
    ) {

        newContent =
            newContent.slice(0, 900) +
            '...';

    }

    return sendLog(
        oldMessage.guild,
        {

            title:
                '✏️ Message Edited',

            fields: [

                {
                    name:
                        '👤 Author',

                    value:
                        `${oldMessage.author?.tag || 'Unknown'}\n\`${oldMessage.author?.id || 'Unknown'}\``,

                    inline:
                        true
                },

                {
                    name:
                        '📍 Channel',

                    value:
                        `${oldMessage.channel}`,

                    inline:
                        true
                },

                {
                    name:
                        'Before',

                    value:
                        oldContent,

                    inline:
                        false
                },

                {
                    name:
                        'After',

                    value:
                        newContent,

                    inline:
                        false
                }

            ]

        }
    );

}

// =========================================================
// BULK MESSAGE DELETE
// =========================================================

async function logBulkMessageDelete(
    messages,
    channel
) {

    if (!channel?.guild) {
        return;
    }

    return sendLog(
        channel.guild,
        {

            title:
                '🧹 Bulk Messages Deleted',

            fields: [

                {
                    name:
                        '📍 Channel',

                    value:
                        `${channel}`,

                    inline:
                        true
                },

                {
                    name:
                        '🗑️ Messages',

                    value:
                        `${messages.size}`,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// CHANNEL CREATED
// =========================================================

async function logChannelCreate(
    channel
) {

    if (!channel?.guild) {
        return;
    }

    let createdBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                channel.guild,
                AuditLogEvent.ChannelCreate,
                channel.id
            );

        if (entry?.executor) {

            createdBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        channel.guild,
        {

            title:
                '📁 Channel Created',

            fields: [

                {
                    name:
                        '📁 Channel',

                    value:
                        `${channel}\n\`${channel.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Created By',

                    value:
                        createdBy,

                    inline:
                        true
                },

                {
                    name:
                        '📌 Type',

                    value:
                        `${channel.type}`,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// CHANNEL DELETED
// =========================================================

async function logChannelDelete(
    channel
) {

    if (!channel?.guild) {
        return;
    }

    let deletedBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                channel.guild,
                AuditLogEvent.ChannelDelete,
                channel.id
            );

        if (entry?.executor) {

            deletedBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        channel.guild,
        {

            title:
                '🗑️ Channel Deleted',

            fields: [

                {
                    name:
                        '📁 Channel',

                    value:
                        `#${channel.name}\n\`${channel.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Deleted By',

                    value:
                        deletedBy,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// CHANNEL UPDATED
// =========================================================

async function logChannelUpdate(
    oldChannel,
    newChannel
) {

    if (!newChannel?.guild) {
        return;
    }

    const changes = [];

    if (
        oldChannel.name !==
        newChannel.name
    ) {

        changes.push(
            `**Name:** \`${oldChannel.name}\` → \`${newChannel.name}\``
        );

    }

    if (
        oldChannel.parentId !==
        newChannel.parentId
    ) {

        changes.push(
            '**Category:** changed'
        );

    }

    if (
        oldChannel.topic !==
        newChannel.topic
    ) {

        changes.push(
            '**Topic:** changed'
        );

    }

    if (
        oldChannel.rateLimitPerUser !==
        newChannel.rateLimitPerUser
    ) {

        changes.push(
            '**Slowmode:** changed'
        );

    }

    if (
        changes.length === 0
    ) {

        return;

    }

    let changedBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                newChannel.guild,
                AuditLogEvent.ChannelUpdate,
                newChannel.id
            );

        if (entry?.executor) {

            changedBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        newChannel.guild,
        {

            title:
                '✏️ Channel Updated',

            description:
                changes.join('\n'),

            fields: [

                {
                    name:
                        '📁 Channel',

                    value:
                        `${newChannel}\n\`${newChannel.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Changed By',

                    value:
                        changedBy,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// ROLE CREATED
// =========================================================

async function logRoleCreate(
    role
) {

    if (!role?.guild) {
        return;
    }

    let createdBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                role.guild,
                AuditLogEvent.RoleCreate,
                role.id
            );

        if (entry?.executor) {

            createdBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        role.guild,
        {

            title:
                '🎭 Role Created',

            fields: [

                {
                    name:
                        '🎭 Role',

                    value:
                        `${role}\n\`${role.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Created By',

                    value:
                        createdBy,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// ROLE DELETED
// =========================================================

async function logRoleDelete(
    role
) {

    if (!role?.guild) {
        return;
    }

    let deletedBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                role.guild,
                AuditLogEvent.RoleDelete,
                role.id
            );

        if (entry?.executor) {

            deletedBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        role.guild,
        {

            title:
                '🗑️ Role Deleted',

            fields: [

                {
                    name:
                        '🎭 Role',

                    value:
                        `@${role.name}\n\`${role.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Deleted By',

                    value:
                        deletedBy,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// ROLE UPDATED
// =========================================================

async function logRoleUpdate(
    oldRole,
    newRole
) {

    if (!newRole?.guild) {
        return;
    }

    const changes = [];

    if (
        oldRole.name !==
        newRole.name
    ) {

        changes.push(
            `**Name:** \`${oldRole.name}\` → \`${newRole.name}\``
        );

    }

    if (
        oldRole.color !==
        newRole.color
    ) {

        changes.push(
            '**Color:** changed'
        );

    }

    if (
        oldRole.permissions.bitfield !==
        newRole.permissions.bitfield
    ) {

        changes.push(
            '**Permissions:** changed'
        );

    }

    if (
        oldRole.hoist !==
        newRole.hoist
    ) {

        changes.push(
            '**Displayed Separately:** changed'
        );

    }

    if (
        oldRole.mentionable !==
        newRole.mentionable
    ) {

        changes.push(
            '**Mentionable:** changed'
        );

    }

    if (
        changes.length === 0
    ) {

        return;

    }

    let changedBy =
        'Unknown';

    try {

        const entry =
            await getRecentAuditEntry(
                newRole.guild,
                AuditLogEvent.RoleUpdate,
                newRole.id
            );

        if (entry?.executor) {

            changedBy =
                `${entry.executor}`;

        }

    } catch {
        // Optional audit information.
    }

    return sendLog(
        newRole.guild,
        {

            title:
                '✏️ Role Updated',

            description:
                changes.join('\n'),

            fields: [

                {
                    name:
                        '🎭 Role',

                    value:
                        `${newRole}\n\`${newRole.id}\``,

                    inline:
                        true
                },

                {
                    name:
                        '🛡️ Changed By',

                    value:
                        changedBy,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// VOICE STATE
// =========================================================

async function logVoiceStateUpdate(
    oldState,
    newState
) {

    if (!oldState?.guild) {
        return;
    }

    // =====================================================
    // JOIN
    // =====================================================

    if (
        !oldState.channelId &&
        newState.channelId
    ) {

        return sendLog(
            oldState.guild,
            {

                title:
                    '🔊 Joined Voice Channel',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${newState.member.user.tag}\n\`${newState.member.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🔊 Channel',

                        value:
                            `${newState.channel}`,

                        inline:
                            true
                    }

                ]

            }
        );

    }

    // =====================================================
    // LEAVE
    // =====================================================

    if (
        oldState.channelId &&
        !newState.channelId
    ) {

        return sendLog(
            oldState.guild,
            {

                title:
                    '🚪 Left Voice Channel',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${oldState.member.user.tag}\n\`${oldState.member.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🔊 Channel',

                        value:
                            `${oldState.channel?.name || 'Unknown'}`,

                        inline:
                            true
                    }

                ]

            }
        );

    }

    // =====================================================
    // SWITCH
    // =====================================================

    if (
        oldState.channelId &&
        newState.channelId &&
        oldState.channelId !==
        newState.channelId
    ) {

        return sendLog(
            oldState.guild,
            {

                title:
                    '🔄 Voice Channel Switched',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${newState.member.user.tag}\n\`${newState.member.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            'From',

                        value:
                            `${oldState.channel?.name || 'Unknown'}`,

                        inline:
                            true
                    },

                    {
                        name:
                            'To',

                        value:
                            `${newState.channel?.name || 'Unknown'}`,

                        inline:
                            true
                    }

                ]

            }
        );

    }

    // =====================================================
    // SERVER MUTE
    // =====================================================

    if (
        oldState.serverMute !==
        newState.serverMute
    ) {

        return sendLog(
            oldState.guild,
            {

                title:
                    newState.serverMute
                        ? '🔇 Member Server Muted'
                        : '🔊 Member Server Unmuted',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${newState.member.user.tag}\n\`${newState.member.id}\``,

                        inline:
                            true
                    },

                    {
                        name:
                            '🔊 Channel',

                        value:
                            `${newState.channel || 'Unknown'}`,

                        inline:
                            true
                    }

                ]

            }
        );

    }

    // =====================================================
    // SERVER DEAF
    // =====================================================

    if (
        oldState.serverDeaf !==
        newState.serverDeaf
    ) {

        return sendLog(
            oldState.guild,
            {

                title:
                    newState.serverDeaf
                        ? '🔇 Member Server Deafened'
                        : '🔊 Member Server Undeafened',

                fields: [

                    {
                        name:
                            '👤 User',

                        value:
                            `${newState.member.user.tag}\n\`${newState.member.id}\``,

                        inline:
                            true
                    }

                ]

            }
        );

    }

}

// =========================================================
// SETUP
// =========================================================

async function logSetup(
    guild,
    user
) {

    if (!guild || !user) {
        return;
    }

    return sendLog(
        guild,
        {

            title:
                '⚙️ Server Setup Updated',

            description:
                `${user} updated Amyfn's server configuration.`,

            fields: [

                {
                    name:
                        '👤 Changed By',

                    value:
                        `${user.tag}\n\`${user.id}\``,

                    inline:
                        true
                }

            ]

        }
    );

}

// =========================================================
// GIVEAWAY
// =========================================================

async function logGiveaway(
    guild,
    options = {}
) {

    if (!guild) {
        return;
    }

    return sendLog(
        guild,
        {

            title:
                options.title ||
                '🎁 Giveaway Event',

            description:
                options.description ||
                'A giveaway event occurred.',

            fields:
                options.fields ||
                []

        }
    );

}

// =========================================================
// ERROR
// =========================================================

async function logError(
    guild,
    error,
    context = 'Unknown'
) {

    if (!guild) {
        return;
    }

    const errorText =
        String(
            error?.message ||
            error ||
            'Unknown error'
        ).slice(0, 1000);

    return sendLog(
        guild,
        {

            title:
                '❌ Amyfn Error',

            description:
                `An error occurred while processing **${context}**.`,

            fields: [

                {
                    name:
                        'Error',

                    value:
                        `\`\`\`${errorText}\`\`\``,

                    inline:
                        false
                }

            ]

        }
    );

}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {

    sendLog,

    getRecentAuditEntry,

    logMemberJoin,

    logMemberLeave,

    logMemberBan,

    logMemberUnban,

    logMemberTimeout,

    logNicknameChange,

    logRoleChanges,

    logMessageDelete,

    logMessageEdit,

    logBulkMessageDelete,

    logChannelCreate,

    logChannelDelete,

    logChannelUpdate,

    logRoleCreate,

    logRoleDelete,

    logRoleUpdate,

    logVoiceStateUpdate,

    logSetup,

    logGiveaway,

    logError

};
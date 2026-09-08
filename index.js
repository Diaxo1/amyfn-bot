require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events
} = require('discord.js');

// ==========================================
// COMMANDS
// ==========================================

const {
    execute: executeCosmetic
} = require('./commands/cosmetic');

const {
    execute: executeShop
} = require('./commands/shop');

const {
    execute: executeFeature
} = require('./commands/feature');

const {
    execute: executeDaily
} = require('./commands/daily');

const {
    execute: executeDailyImages
} = require('./commands/dailyimages');

const {
    execute: executeSetup
} = require('./commands/setup');

const {
    execute: executeHelp
} = require('./commands/help');

const {
    execute: executeNews
} = require('./commands/news');

const {
    execute: executeAmy
} = require('./commands/Amy');

const {
    execute: executeLeaks
} = require('./commands/leaks');

// ==========================================
// FORTNITE QUIZ
// ==========================================

const fortniteQuizCommand =
    require('./commands/fortnitequiz');

// ==========================================
// GIVEAWAY
// ==========================================

const {
    startGiveawayTracker
} = require('./services/giveawayTracker');

const giveawayCommand =
    require('./commands/giveaway');

const giveawayService =
    require('./services/giveawayService');

// ==========================================
// MODERATION
// ==========================================

const moderationCommand =
    require('./commands/moderation');

// ==========================================
// LOGGING
// ==========================================

const {
    logMemberJoin,
    logMemberLeave,
    logMemberBan,
    logMemberUnban,
    logMessageDelete,
    logMessageEdit,
    logBulkMessageDelete,
    logMemberTimeout,
    logNicknameChange,
    logRoleChanges,
    logChannelCreate,
    logChannelDelete,
    logChannelUpdate,
    logRoleCreate,
    logRoleDelete,
    logRoleUpdate,
    logVoiceStateUpdate
} = require('./services/logger');

// ==========================================
// AUTOMATIC TRACKERS
// ==========================================

const {
    startShopTracker
} = require('./services/dailyShopTracker');

const {
    startNewsTracker
} = require('./services/newstracker');

const {
    startLeakTracker
} = require('./services/leakTracker');

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==========================================
// BOT READY
// ==========================================

client.once(
    Events.ClientReady,
    (readyClient) => {

        console.log(
            'Logged in as ' +
            readyClient.user.tag
        );

        // ==========================================
        // BOT PRESENCE
        // ==========================================

        const activities = [

            {
                name: 'Fortnite Shop',
                type: 3
            },

            {
                name: 'Fortnite Cosmetics',
                type: 3
            },

            {
                name: 'the Item Shop 👀',
                type: 3
            },

            {
                name: 'Fortnite News 📰',
                type: 3
            },

            {
                name: 'Xaid & Amy ❤️',
                type: 3
            }

        ];

        let activityIndex = 0;

        function updateActivity() {

            const activity =
                activities[activityIndex];

            readyClient.user.setPresence({

                activities: [
                    activity
                ],

                status: 'online',

                afk: false

            });

            activityIndex =
                (activityIndex + 1) %
                activities.length;
        }

        updateActivity();

        setInterval(
            updateActivity,
            10000
        );

        // ==========================================
        // AUTOMATIC TRACKERS
        // ==========================================

        startShopTracker(client);

        startNewsTracker(client);

        startLeakTracker(client);

        startGiveawayTracker(client);

    }
);

// ==========================================
// SERVER LOGGING
// ==========================================

// MEMBER JOIN

client.on(
    Events.GuildMemberAdd,
    async (member) => {

        try {

            await logMemberJoin(member);

        } catch (error) {

            console.error(
                '❌ Member join logging error:',
                error
            );

        }

    }
);

// MEMBER LEAVE / KICK

client.on(
    Events.GuildMemberRemove,
    async (member) => {

        try {

            await logMemberLeave(member);

        } catch (error) {

            console.error(
                '❌ Member leave/kick logging error:',
                error
            );

        }

    }
);

// MEMBER BAN

client.on(
    Events.GuildBanAdd,
    async (ban) => {

        try {

            await logMemberBan(
                ban.guild,
                ban.user
            );

        } catch (error) {

            console.error(
                '❌ Ban logging error:',
                error
            );

        }

    }
);

// MEMBER UNBAN

client.on(
    Events.GuildBanRemove,
    async (ban) => {

        try {

            await logMemberUnban(
                ban.guild,
                ban.user
            );

        } catch (error) {

            console.error(
                '❌ Unban logging error:',
                error
            );

        }

    }
);

// MESSAGE DELETE

client.on(
    Events.MessageDelete,
    async (message) => {

        try {

            await logMessageDelete(message);

        } catch (error) {

            console.error(
                '❌ Message delete logging error:',
                error
            );

        }

    }
);

// MESSAGE EDIT

client.on(
    Events.MessageUpdate,
    async (
        oldMessage,
        newMessage
    ) => {

        try {

            await logMessageEdit(
                oldMessage,
                newMessage
            );

        } catch (error) {

            console.error(
                '❌ Message edit logging error:',
                error
            );

        }

    }
);

// BULK MESSAGE DELETE

client.on(
    Events.MessageBulkDelete,
    async (
        messages,
        channel
    ) => {

        try {

            await logBulkMessageDelete(
                messages,
                channel
            );

        } catch (error) {

            console.error(
                '❌ Bulk delete logging error:',
                error
            );

        }

    }
);

// MEMBER UPDATE
// Handles:
// - Timeouts
// - Nicknames
// - Roles

client.on(
    Events.GuildMemberUpdate,
    async (
        oldMember,
        newMember
    ) => {

        try {

            // ==========================================
            // TIMEOUT
            // ==========================================

            const oldTimeout =
                oldMember.communicationDisabledUntil;

            const newTimeout =
                newMember.communicationDisabledUntil;

            if (
                oldTimeout !== newTimeout
            ) {

                await logMemberTimeout(
                    newMember,
                    oldTimeout,
                    newTimeout
                );

            }

            // ==========================================
            // NICKNAME
            // ==========================================

            if (
                oldMember.nickname !==
                newMember.nickname
            ) {

                await logNicknameChange(
                    oldMember,
                    newMember
                );

            }

            // ==========================================
            // ROLES
            // ==========================================

            await logRoleChanges(
                oldMember,
                newMember
            );

        } catch (error) {

            console.error(
                '❌ Member update logging error:',
                error
            );

        }

    }
);

// CHANNEL CREATE

client.on(
    Events.ChannelCreate,
    async (channel) => {

        try {

            await logChannelCreate(channel);

        } catch (error) {

            console.error(
                '❌ Channel create logging error:',
                error
            );

        }

    }
);

// CHANNEL DELETE

client.on(
    Events.ChannelDelete,
    async (channel) => {

        try {

            await logChannelDelete(channel);

        } catch (error) {

            console.error(
                '❌ Channel delete logging error:',
                error
            );

        }

    }
);

// CHANNEL UPDATE

client.on(
    Events.ChannelUpdate,
    async (
        oldChannel,
        newChannel
    ) => {

        try {

            await logChannelUpdate(
                oldChannel,
                newChannel
            );

        } catch (error) {

            console.error(
                '❌ Channel update logging error:',
                error
            );

        }

    }
);

// ROLE CREATE

client.on(
    Events.RoleCreate,
    async (role) => {

        try {

            await logRoleCreate(role);

        } catch (error) {

            console.error(
                '❌ Role create logging error:',
                error
            );

        }

    }
);

// ROLE DELETE

client.on(
    Events.RoleDelete,
    async (role) => {

        try {

            await logRoleDelete(role);

        } catch (error) {

            console.error(
                '❌ Role delete logging error:',
                error
            );

        }

    }
);

// ROLE UPDATE

client.on(
    Events.RoleUpdate,
    async (
        oldRole,
        newRole
    ) => {

        try {

            await logRoleUpdate(
                oldRole,
                newRole
            );

        } catch (error) {

            console.error(
                '❌ Role update logging error:',
                error
            );

        }

    }
);

// VOICE STATE

client.on(
    Events.VoiceStateUpdate,
    async (
        oldState,
        newState
    ) => {

        try {

            await logVoiceStateUpdate(
                oldState,
                newState
            );

        } catch (error) {

            console.error(
                '❌ Voice logging error:',
                error
            );

        }

    }
);

// ==========================================
// INTERACTION HANDLER
// ==========================================

client.on(
    Events.InteractionCreate,
    async (interaction) => {

        // ==========================================
        // FORTNITE QUIZ BUTTONS
        // ==========================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith('quiz_')
        ) {

            return fortniteQuizCommand.handleButton(
                interaction
            );

        }

        // ==========================================
        // GIVEAWAY BUTTONS
        // ==========================================

        if (
            interaction.isButton()
        ) {

            if (
                interaction.customId.startsWith(
                    'giveaway_enter_'
                )
            ) {

                const giveawayId =
                    interaction.customId.replace(
                        'giveaway_enter_',
                        ''
                    );

                const giveaway =
                    giveawayService.getGiveaway(
                        giveawayId
                    );

                // Giveaway doesn't exist

                if (!giveaway) {

                    await interaction.reply({

                        content:
                            '❌ This giveaway no longer exists.',

                        ephemeral: true

                    });

                    return;

                }

                // Giveaway isn't active

                if (
                    giveaway.status !== 'active'
                ) {

                    await interaction.reply({

                        content:
                            '⏰ This giveaway has already ended.',

                        ephemeral: true

                    });

                    return;

                }

                // Giveaway expired

                if (
                    Date.now() >= giveaway.endsAt
                ) {

                    await interaction.reply({

                        content:
                            '⏰ This giveaway has ended.',

                        ephemeral: true

                    });

                    return;

                }

                // Already entered

                if (
                    giveaway.entries.includes(
                        interaction.user.id
                    )
                ) {

                    await interaction.reply({

                        content:
                            '⚠️ You are already entered in this giveaway!',

                        ephemeral: true

                    });

                    return;

                }

                // Add user

                const updatedGiveaway =
                    giveawayService.addEntry(
                        giveaway.id,
                        interaction.user.id
                    );

                // Rebuild interface

                const embed =
                    giveawayCommand.createGiveawayEmbed(
                        updatedGiveaway
                    );

                const row =
                    giveawayCommand.createGiveawayButtons(
                        updatedGiveaway
                    );

                try {

                    await interaction.message.edit({

                        embeds: [
                            embed
                        ],

                        components: [
                            row
                        ]

                    });

                    await interaction.reply({

                        content:
                            '🎉 You are officially entered! Good luck! 💙',

                        ephemeral: true

                    });

                } catch (error) {

                    console.error(
                        '❌ Giveaway button error:',
                        error
                    );

                    try {

                        if (
                            !interaction.replied &&
                            !interaction.deferred
                        ) {

                            await interaction.reply({

                                content:
                                    '❌ Something went wrong while entering the giveaway.',

                                ephemeral: true

                            });

                        }

                    } catch (replyError) {

                        console.error(
                            '❌ Could not send giveaway error:',
                            replyError
                        );

                    }

                }

                return;

            }

            // Ignore other buttons

            return;

        }

        // ==========================================
        // IGNORE NON-SLASH COMMAND INTERACTIONS
        // ==========================================

        if (
            !interaction.isChatInputCommand()
        ) {

            return;

        }

        console.log(
            'Received: /' +
            interaction.commandName
        );

        try {

            // ==========================================
            // PING
            // ==========================================

            if (
                interaction.commandName === 'ping'
            ) {

                await interaction.reply(
                    '🏓 Pong!'
                );

                return;

            }

            // ==========================================
            // COSMETIC
            // ==========================================

            if (
                interaction.commandName === 'cosmetic'
            ) {

                await executeCosmetic(
                    interaction
                );

                return;

            }

            // ==========================================
            // SHOP
            // ==========================================

            if (
                interaction.commandName === 'shop'
            ) {

                await executeShop(
                    interaction
                );

                return;

            }

            // ==========================================
            // FEATURE
            // ==========================================

            if (
                interaction.commandName === 'feature'
            ) {

                console.log(
                    '🔥 Calling FEATURE handler...'
                );

                const featureCommand =
                    require('./commands/feature');

                const executeFeature =
                    typeof featureCommand === 'function'
                        ? featureCommand
                        : featureCommand.execute;

                if (
                    typeof executeFeature !== 'function'
                ) {

                    throw new TypeError(
                        'Feature command does not export an execute function.'
                    );

                }

                await executeFeature(
                    interaction
                );

                return;

            }

            // ==========================================
            // DAILY
            // ==========================================

            if (
                interaction.commandName === 'daily'
            ) {

                await executeDaily(
                    interaction
                );

                return;

            }

            // ==========================================
            // DAILY IMAGES
            // ==========================================

            if (
                interaction.commandName === 'dailyimages'
            ) {

                console.log(
                    '🖼️ Calling DAILYIMAGES handler...'
                );

                await executeDailyImages(
                    interaction
                );

                return;

            }

            // ==========================================
            // HELP
            // ==========================================

            if (
                interaction.commandName === 'help'
            ) {

                console.log(
                    '📖 Calling HELP handler...'
                );

                await executeHelp(
                    interaction
                );

                return;

            }

            // ==========================================
            // NEWS
            // ==========================================

            if (
                interaction.commandName === 'news'
            ) {

                console.log(
                    '📰 Calling NEWS handler...'
                );

                await executeNews(
                    interaction
                );

                return;

            }

            // ==========================================
            // AMY EASTER EGG
            // ==========================================

            if (
                interaction.commandName === 'amy'
            ) {

                console.log(
                    '❤️ SECRET /AMY EASTER EGG ACTIVATED'
                );

                await executeAmy(
                    interaction
                );

                return;

            }

            // ==========================================
            // SETUP
            // ==========================================

            if (
                interaction.commandName === 'setup'
            ) {

                console.log(
                    '⚙️ Calling SETUP handler...'
                );

                await executeSetup(
                    interaction
                );

                return;

            }

            // ==========================================
            // ACCOUNT
            // ==========================================

            if (
                interaction.commandName === 'account'
            ) {

                console.log(
                    '👤 Calling ACCOUNT handler...'
                );

                await require(
                    './commands/account'
                ).execute(
                    interaction
                );

                return;

            }

            // ==========================================
            // LEAKS
            // ==========================================

            if (
                interaction.commandName === 'leaks'
            ) {

                console.log(
                    '🕵️ Calling LEAKS handler...'
                );

                await executeLeaks(
                    interaction,
                    client
                );

                return;

            }

            // ==========================================
            // FORTNITE QUIZ
            // ==========================================

            if (
                interaction.commandName === 'fortnitequiz'
            ) {

                console.log(
                    '🧠 Calling FORTNITE QUIZ handler...'
                );

                await fortniteQuizCommand.execute(
                    interaction
                );

                return;

            }

            // ==========================================
            // MODERATION
            // ==========================================

            if (
                interaction.commandName === 'warn'
            ) {

                console.log(
                    '⚠️ Calling WARN handler...'
                );

                await moderationCommand.executeWarn(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'warnings'
            ) {

                console.log(
                    '📋 Calling WARNINGS handler...'
                );

                await moderationCommand.executeWarnings(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'ban'
            ) {

                console.log(
                    '🔨 Calling BAN handler...'
                );

                await moderationCommand.executeBan(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'kick'
            ) {

                console.log(
                    '👢 Calling KICK handler...'
                );

                await moderationCommand.executeKick(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'timeout'
            ) {

                console.log(
                    '⏱️ Calling TIMEOUT handler...'
                );

                await moderationCommand.executeTimeout(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'untimeout'
            ) {

                console.log(
                    '✅ Calling UNTIMEOUT handler...'
                );

                await moderationCommand.executeUntimeout(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'clear'
            ) {

                console.log(
                    '🧹 Calling CLEAR handler...'
                );

                await moderationCommand.executeClear(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'slowmode'
            ) {

                console.log(
                    '🐌 Calling SLOWMODE handler...'
                );

                await moderationCommand.executeSlowmode(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'lock'
            ) {

                console.log(
                    '🔒 Calling LOCK handler...'
                );

                await moderationCommand.executeLock(
                    interaction
                );

                return;

            }

            if (
                interaction.commandName === 'unlock'
            ) {

                console.log(
                    '🔓 Calling UNLOCK handler...'
                );

                await moderationCommand.executeUnlock(
                    interaction
                );

                return;

            }

            // ==========================================
            // GIVEAWAY
            // ==========================================

            if (
                interaction.commandName === 'giveaway'
            ) {

                console.log(
                    '🎁 Calling GIVEAWAY handler...'
                );

                await giveawayCommand.execute(
                    interaction
                );

                return;

            }

        } catch (error) {

            console.error(
                '❌ Interaction error:',
                error
            );

            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply(
                        '❌ Something went wrong while processing the command.'
                    );

                } else {

                    await interaction.reply({

                        content:
                            '❌ Something went wrong while processing the command.',

                        ephemeral: true

                    });

                }

            } catch (replyError) {

                console.error(
                    '❌ Could not send error response:',
                    replyError
                );

            }

        }

    }
);

// ==========================================
// LOGIN
// ==========================================

client.login(
    process.env.DISCORD_TOKEN
);
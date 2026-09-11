const express = require('express');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require('discord.js');

dotenv.config({
    path: path.join(__dirname, '..', '.env')
});


const {
    getServerConfig,
    getAllServerConfigs,
    setServerConfig
} = require('../services/serverConfig');

const {
    getAllGiveaways,
    getGiveaway,
    updateGiveaway
} = require('../services/giveawayService');

const {
    finishGiveaway
} = require('../commands/giveaway');

const {
    getLatestDailyResult
} = require('../services/dailyShopTracker');


const {
    getLeakStatus,
    getCachedLeaks
} = require('../services/leakTracker');


const {
    searchCosmetics,
    getNewCosmetics
} = require('../services/fortniteApi');


const app = express();


const PORT =
    process.env.PORT ||
    process.env.DASHBOARD_PORT ||
    3000;


// ==========================================
// DATA PATHS
// ==========================================

const persistentDataFolder =
    '/data';


const localDataFolder =
    path.join(
        __dirname,
        '..',
        'data'
    );


const dataFolder =
    fs.existsSync(
        persistentDataFolder
    )
        ? persistentDataFolder
        : localDataFolder;

fs.mkdirSync(
    dataFolder,
    { recursive: true }
);


const shopSnapshotFile =
    path.join(
        dataFolder,
        'shopSnapshot.json'
    );

const moderationWarningsFile =
    path.join(
        dataFolder,
        'moderationWarnings.json'
    );

function loadModerationWarnings() {
    try {
        if (!fs.existsSync(moderationWarningsFile)) {
            return {};
        }

        const parsed =
            JSON.parse(
                fs.readFileSync(
                    moderationWarningsFile,
                    'utf8'
                )
            );

        return parsed && typeof parsed === 'object'
            ? parsed
            : {};
    } catch (error) {
        console.error(
            'Failed to load moderation warnings:',
            error
        );

        return {};
    }
}

function saveModerationWarnings(warnings) {
    fs.writeFileSync(
        moderationWarningsFile,
        JSON.stringify(
            warnings,
            null,
            2
        )
    );
}


// ==========================================
// DISCORD CLIENT
// ==========================================

const discordClient =
    new Client({

        intents: [
            GatewayIntentBits.Guilds
            ,
            GatewayIntentBits.GuildMembers,
        ]

    });


// ==========================================
// DASHBOARD AUTHENTICATION
// ==========================================

const dashboardUrl =
    (process.env.DASHBOARD_URL ||
        `http://localhost:${PORT}`)
        .replace(/\/$/, '');

const discordClientId =
    process.env.DISCORD_CLIENT_ID;

const discordClientSecret =
    process.env.DISCORD_CLIENT_SECRET;

const sessionCookieName =
    'amyfn_session';

const sessionLifetime =
    12 * 60 * 60 * 1000;

const sessions =
    new Map();

const oauthStates =
    new Map();

function getRedirectUri() {
    return `${dashboardUrl}/auth/discord/callback`;
}

function getSession(req) {
    const cookieHeader =
        req.headers.cookie || '';

    const match = cookieHeader
        .split(';')
        .map(cookie => cookie.trim())
        .find(cookie =>
            cookie.startsWith(`${sessionCookieName}=`)
        );

    if (!match) {
        return null;
    }

    const sessionId =
        decodeURIComponent(
            match.slice(sessionCookieName.length + 1)
        );

    const session =
        sessions.get(sessionId);

    if (!session) {
        return null;
    }

    if (session.expiresAt <= Date.now()) {
        sessions.delete(sessionId);
        return null;
    }

    return {
        sessionId,
        session
    };
}

function setSessionCookie(res, sessionId) {
    res.setHeader(
        'Set-Cookie',
        `${sessionCookieName}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionLifetime / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
}

function clearSessionCookie(res) {
    res.setHeader(
        'Set-Cookie',
        `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );
}

function requireAuth(req, res, next) {
    const auth = getSession(req);

    if (!auth) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required.',
            loginRequired: true
        });
    }

    req.dashboardSession = auth.session;
    req.dashboardSessionId = auth.sessionId;
    next();
}

function hasServerAccess(req, guildId) {
    return Boolean(
        req.dashboardSession?.guildIds?.includes(
            guildId
        )
    );
}

async function fetchDiscordJson(url, options = {}) {
    const response =
        await fetch(url, options);

    const data =
        await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            data?.message ||
            `Discord API returned ${response.status}`;

        throw new Error(message);
    }

    return data;
}

async function getDiscordUser(accessToken) {
    return fetchDiscordJson(
        'https://discord.com/api/users/@me',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );
}

async function getAuthorizedGuilds(accessToken) {
    const guilds =
        await fetchDiscordJson(
            'https://discord.com/api/users/@me/guilds',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

    const manageGuild = 0x20n;
    const administrator = 0x8n;

    return guilds.filter(guild => {
        const botIsInstalled =
            discordClient.guilds.cache.has(
                guild.id
            );

        if (!botIsInstalled) {
            return false;
        }

        if (guild.owner) {
            return true;
        }

        try {
            const permissions =
                BigInt(guild.permissions || '0');

            return Boolean(
                permissions & manageGuild ||
                permissions & administrator
            );
        } catch {
            return false;
        }
    });
}

// Start Discord OAuth login.
app.get('/auth/discord', (req, res) => {
    if (!discordClientId || !discordClientSecret) {
        return res.status(500).send(
            'Discord OAuth is not configured. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to .env.'
        );
    }

    const state =
        crypto.randomBytes(32).toString('hex');

    oauthStates.set(state, {
        expiresAt: Date.now() + 10 * 60 * 1000
    });

    const params =
        new URLSearchParams({
            client_id: discordClientId,
            response_type: 'code',
            redirect_uri: getRedirectUri(),
            scope: 'identify guilds',
            state
        });

    res.redirect(
        `https://discord.com/oauth2/authorize?${params.toString()}`
    );
});

// OAuth callback.
app.get('/auth/discord/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        const savedState =
            oauthStates.get(state);

        oauthStates.delete(state);

        if (
            !code ||
            !state ||
            !savedState ||
            savedState.expiresAt <= Date.now()
        ) {
            return res.status(400).send(
                'Invalid or expired Discord login request.'
            );
        }

        const tokenResponse =
            await fetch(
                'https://discord.com/api/oauth2/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        client_id: discordClientId,
                        client_secret: discordClientSecret,
                        grant_type: 'authorization_code',
                        code: String(code),
                        redirect_uri: getRedirectUri()
                    })
                }
            );

        const tokenData =
            await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(
                'Discord OAuth token exchange failed:',
                tokenData
            );

            return res.status(401).send(
                'Discord login failed. Please try again.'
            );
        }

        const accessToken =
            tokenData.access_token;

        const user =
            await getDiscordUser(accessToken);

        const authorizedGuilds =
            await getAuthorizedGuilds(accessToken);

        const sessionId =
            crypto.randomBytes(32).toString('hex');

        sessions.set(sessionId, {
            user: {
                id: user.id,
                username: user.username,
                globalName: user.global_name || user.username,
                avatar: user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
                    : null
            },
            guildIds: authorizedGuilds.map(
                guild => guild.id
            ),
            guilds: authorizedGuilds.map(
                guild => ({
                    id: guild.id,
                    name: guild.name
                })
            ),
            accessToken,
            expiresAt: Date.now() + sessionLifetime
        });

        setSessionCookie(
            res,
            sessionId
        );

        res.redirect('/');
    } catch (error) {
        console.error(
            'Discord OAuth callback failed:',
            error
        );

        res.status(500).send(
            'Discord login failed. Please try again.'
        );
    }
});

app.get('/auth/me', (req, res) => {
    const auth = getSession(req);

    if (!auth) {
        return res.json({
            authenticated: false
        });
    }

    res.json({
        authenticated: true,
        user: auth.session.user,
        servers: auth.session.guilds
    });
});

app.post('/auth/logout', (req, res) => {
    const auth = getSession(req);

    if (auth) {
        sessions.delete(auth.sessionId);
    }

    clearSessionCookie(res);

    res.json({
        success: true
    });
});

// Every dashboard API is private.
app.use('/api', requireAuth);

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
    express.json()
);


app.get('/', (req, res) => {
    if (!getSession(req)) {
        return res.redirect('/auth/discord');
    }

    res.sendFile(
        path.join(__dirname, 'public', 'index.html')
    );
});

app.get('/index.html', (req, res) => {
    if (!getSession(req)) {
        return res.redirect('/auth/discord');
    }

    res.sendFile(
        path.join(__dirname, 'public', 'index.html')
    );
});

app.use(
    express.static(
        path.join(
            __dirname,
            'public'
        )
    )
);


// ==========================================
// DISCORD READY
// ==========================================

discordClient.once(
    'clientReady',
    () => {

        console.log(
            `Dashboard connected to Discord as ${discordClient.user.tag}`
        );


        console.log(
            `Dashboard can see ${discordClient.guilds.cache.size} server(s)`
        );

    }
);


// ==========================================
// STATUS API
// ==========================================

app.get(
    '/api/status',
    (req, res) => {

        try {

            const dailyResult =
                getLatestDailyResult();


            const leakStatus =
                getLeakStatus();


            res.json({

                bot:
                    discordClient.user?.username ||
                    'Amyfn',


                status:
                    discordClient.isReady()
                        ? 'online'
                        : 'offline',


                environment:
                    process.env.NODE_ENV === 'production'
                        ? 'production'
                        : 'development',


                uptime:
                    process.uptime(),


                servers:
                    discordClient.guilds.cache.size,


                trackers: {

                    shop: {

                        active:
                            true,


                        lastReset:
                            dailyResult?.detectedAt ||
                            null

                    },


                    leaks: {

                        active:
                            leakStatus?.active ??
                            false,


                        lastCheck:
                            leakStatus?.lastCheck ||
                            null,


                        trackedPosts:
                            leakStatus?.trackedCount ??
                            0

                    },


                    news: {

                        active:
                            true

                    }

                }

            });


        } catch (error) {

            console.error(
                'Failed to load dashboard status:',
                error
            );


            res.status(500).json({

                success:
                    false,


                error:
                    'Failed to load dashboard status.'

            });

        }

    }
);

// ==========================================
// LEAKS API
// ==========================================

app.get(
    '/api/leaks',
    async (req, res) => {
        try {

            const leaks =
                getCachedLeaks();

            res.json({
                success: true,
                leaks: Array.isArray(leaks)
                    ? leaks
                    : []
            });

        } catch (error) {

            console.error(
                '❌ Failed to load leaks:',
                error
            );

            res.status(500).json({
                success: false,
                error:
                    'Failed to load Fortnite leaks.'
            });

        }
    }
);


// ==========================================
// GIVEAWAYS API
// ==========================================

app.get(
    '/api/giveaways',
    (req, res) => {
        try {

            const allGiveaways =
                getAllGiveaways();

            const giveaways =
                Object.values(allGiveaways)
                    .filter(giveaway =>
                        hasServerAccess(
                            req,
                            giveaway.guildId
                        )
                    )
                    .map(giveaway => ({
                        ...giveaway,
                        serverName:
                            discordClient.guilds.cache.get(
                                giveaway.guildId
                            )?.name ||
                            `Unknown Server (${giveaway.guildId})`
                    }))
                    .sort(
                        (a, b) =>
                            (b.startedAt || 0) -
                            (a.startedAt || 0)
                    );

            res.json({
                success: true,
                giveaways
            });

        } catch (error) {

            console.error(
                '❌ Failed to load giveaways:',
                error
            );

            res.status(500).json({
                success: false,
                error:
                    'Failed to load giveaways.'
            });

        }
    }
);

// ==========================================
// MODERATION - MEMBER SEARCH
// ==========================================

app.get('/api/moderation/:guildId/members', async (req, res) => {
    try {
        if (!hasServerAccess(req, req.params.guildId)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have access to this server.'
            });
        }

        if (!discordClient.isReady()) {
            return res.status(503).json({
                success: false,
                error: 'Discord client is not ready.'
            });
        }

        const { guildId } = req.params;
        const query = String(req.query.query || '').trim().toLowerCase();

        if (query.length < 2) {
            return res.json({
                success: true,
                members: []
            });
        }

        const guild = await discordClient.guilds
            .fetch(guildId)
            .catch(() => null);

        if (!guild) {
            return res.status(404).json({
                success: false,
                error: 'Server not found.'
            });
        }

        const members = await guild.members.fetch({
            query,
            limit: 25
        });

        const results = [...members.values()].map(member => ({
            id: member.id,

            username: member.user.username,

            displayName: member.displayName,

            avatar: member.user.displayAvatarURL({
                size: 128
            }),

            bot: member.user.bot,

            joinedAt: member.joinedAt
                ? member.joinedAt.toISOString()
                : null,

            roles: member.roles.cache
                .filter(role => role.id !== guild.id)
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor
                }))
        }));

        return res.json({
            success: true,
            members: results
        });

    } catch (error) {

        console.error(
            'Moderation member search failed:',
            error
        );

        return res.status(500).json({
            success: false,
            error: 'Failed to search server members.'
        });
    }
});

// ==========================================
// MODERATION ACTIONS
// ==========================================

async function getModerationGuild(guildId) {
    const guild =
        discordClient.guilds.cache.get(guildId) ||
        await discordClient.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
        throw new Error('Server not found.');
    }

    const botMember =
        guild.members.me ||
        await guild.members.fetch(discordClient.user.id).catch(() => null);

    if (!botMember) {
        throw new Error('Amyfn could not load its server member.');
    }

    return {
        guild,
        botMember
    };
}

async function getTargetMember(guild, memberId) {
    if (!memberId) {
        throw new Error('Select a member first.');
    }

    const member =
        await guild.members.fetch(memberId).catch(() => null);

    if (!member) {
        throw new Error('Member not found.');
    }

    if (member.id === guild.ownerId) {
        throw new Error('The server owner cannot be moderated.');
    }

    if (member.id === discordClient.user.id) {
        throw new Error('Amyfn cannot moderate itself.');
    }

    return member;
}

function ensureBotPermission(botMember, permission, label) {
    if (!botMember.permissions.has(permission)) {
        throw new Error(
            `Amyfn needs the "${label}" permission to do that.`
        );
    }
}

function ensureHierarchy(botMember, targetMember) {
    if (
        targetMember.roles.highest.position >=
        botMember.roles.highest.position
    ) {
        throw new Error(
            'Amyfn cannot moderate this member because their highest role is equal to or higher than Amyfn\'s highest role.'
        );
    }
}

app.post(
    '/api/moderation/:guildId/action',
    async (req, res) => {
        try {
            const { guildId } = req.params;

            if (!hasServerAccess(req, guildId)) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this server.'
                });
            }

            if (!discordClient.isReady()) {
                return res.status(503).json({
                    success: false,
                    error: 'Discord client is not ready.'
                });
            }

            const {
                action,
                memberId,
                channelId,
                reason,
                duration,
                amount
            } = req.body || {};

            const safeReason =
                String(reason || 'Dashboard moderation action')
                    .trim()
                    .slice(0, 500) ||
                'Dashboard moderation action';

            const { guild, botMember } =
                await getModerationGuild(guildId);

            // ------------------------------
            // MEMBER ACTIONS
            // ------------------------------

            if (
                ['warn', 'kick', 'ban', 'timeout']
                    .includes(action)
            ) {
                const target =
                    await getTargetMember(
                        guild,
                        memberId
                    );

                ensureHierarchy(
                    botMember,
                    target
                );

                if (target.user.bot) {
                    // Bot accounts are not forbidden, but hierarchy still applies.
                }

                if (action === 'warn') {
                    const warnings =
                        loadModerationWarnings();

                    const key =
                        `${guild.id}:${target.id}`;

                    if (!Array.isArray(warnings[key])) {
                        warnings[key] = [];
                    }

                    warnings[key].push({
                        id:
                            crypto.randomBytes(8)
                                .toString('hex'),
                        guildId: guild.id,
                        memberId: target.id,
                        memberName:
                            target.user.username,
                        moderatorId:
                            req.dashboardSession.user.id,
                        moderatorName:
                            req.dashboardSession.user.username,
                        reason: safeReason,
                        createdAt:
                            new Date().toISOString()
                    });

                    saveModerationWarnings(
                        warnings
                    );

                    try {
                        await target.send(
                            `You have received a warning in **${guild.name}**.\nReason: ${safeReason}`
                        );
                    } catch {
                        // DMs can be disabled. The warning is still recorded.
                    }

                    return res.json({
                        success: true,
                        action,
                        message:
                            `${target.user.username} was warned successfully.`,
                        warningCount:
                            warnings[key].length
                    });
                }

                if (action === 'kick') {
                    ensureBotPermission(
                        botMember,
                        'KickMembers',
                        'Kick Members'
                    );

                    await target.kick(
                        safeReason
                    );

                    return res.json({
                        success: true,
                        action,
                        message:
                            `${target.user.username} was kicked successfully.`
                    });
                }

                if (action === 'ban') {
                    ensureBotPermission(
                        botMember,
                        'BanMembers',
                        'Ban Members'
                    );

                    await target.ban({
                        deleteMessageSeconds: 0,
                        reason: safeReason
                    });

                    return res.json({
                        success: true,
                        action,
                        message:
                            `${target.user.username} was banned successfully.`
                    });
                }

                if (action === 'timeout') {
                    ensureBotPermission(
                        botMember,
                        'ModerateMembers',
                        'Moderate Members'
                    );

                    const seconds =
                        Number(duration);

                    const allowedDurations = [
                        60,
                        300,
                        600,
                        1800,
                        3600,
                        86400,
                        604800
                    ];

                    if (
                        !allowedDurations.includes(
                            seconds
                        )
                    ) {
                        throw new Error(
                            'Invalid timeout duration.'
                        );
                    }

                    await target.timeout(
                        seconds * 1000,
                        safeReason
                    );

                    return res.json({
                        success: true,
                        action,
                        message:
                            `${target.user.username} was timed out successfully.`
                    });
                }
            }

            // ------------------------------
            // CHANNEL ACTIONS
            // ------------------------------

            if (
                action === 'clear' ||
                action === 'lock'
            ) {
                if (!channelId) {
                    throw new Error(
                        'Select a channel first.'
                    );
                }

                const channel =
                    await guild.channels.fetch(
                        channelId
                    ).catch(() => null);

                if (
                    !channel ||
                    !channel.isTextBased() ||
                    channel.isThread()
                ) {
                    throw new Error(
                        'Invalid text channel.'
                    );
                }

                if (action === 'clear') {
                    ensureBotPermission(
                        botMember,
                        'ManageMessages',
                        'Manage Messages'
                    );

                    ensureBotPermission(
                        botMember,
                        'ReadMessageHistory',
                        'Read Message History'
                    );

                    const requestedAmount =
                        Number(amount);

                    if (
                        !Number.isInteger(
                            requestedAmount
                        ) ||
                        requestedAmount < 1 ||
                        requestedAmount > 100
                    ) {
                        throw new Error(
                            'Clear amount must be between 1 and 100.'
                        );
                    }

                    const deleted =
                        await channel.bulkDelete(
                            requestedAmount,
                            true
                        );

                    return res.json({
                        success: true,
                        action,
                        message:
                            `Deleted ${deleted.size} message${deleted.size === 1 ? '' : 's'} from #${channel.name}.`,
                        deleted:
                            deleted.size
                    });
                }

                if (action === 'lock') {
                    ensureBotPermission(
                        botMember,
                        'ManageChannels',
                        'Manage Channels'
                    );

                    await channel.permissionOverwrites.edit(
                        guild.roles.everyone,
                        {
                            SendMessages: false
                        },
                        {
                            reason: safeReason
                        }
                    );

                    return res.json({
                        success: true,
                        action,
                        message:
                            `#${channel.name} has been locked.`
                    });
                }
            }

            return res.status(400).json({
                success: false,
                error: 'Unknown moderation action.'
            });

        } catch (error) {
            console.error(
                '❌ Moderation action failed:',
                error
            );

            const status =
                /permission|cannot|invalid|select|not found|needs the/i
                    .test(error.message || '')
                    ? 400
                    : 500;

            return res.status(status).json({
                success: false,
                error:
                    error.message ||
                    'Moderation action failed.'
            });
        }
    }
);

// ==========================================
// MODERATION WARNINGS
// ==========================================

app.get(
    '/api/moderation/:guildId/warnings',
    (req, res) => {
        try {
            const { guildId } = req.params;

            if (!hasServerAccess(req, guildId)) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this server.'
                });
            }

            const warnings =
                loadModerationWarnings();

            const result = {};

            for (const [key, entries] of Object.entries(warnings)) {
                if (key.startsWith(`${guildId}:`)) {
                    const memberId =
                        key.slice(guildId.length + 1);

                    result[memberId] =
                        Array.isArray(entries)
                            ? entries
                            : [];
                }
            }

            res.json({
                success: true,
                warnings: result
            });

        } catch (error) {
            console.error(
                '❌ Failed to load moderation warnings:',
                error
            );

            res.status(500).json({
                success: false,
                error: 'Failed to load moderation warnings.'
            });
        }
    }
);


// ==========================================
// END GIVEAWAY FROM DASHBOARD
// ==========================================

app.post(
    '/api/giveaways/:id/end',
    async (req, res) => {
        try {

            const giveaway =
                getGiveaway(req.params.id);

            if (!giveaway || !hasServerAccess(req, giveaway.guildId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Giveaway not found.'
                });
            }

            if (!giveaway) {
                return res.status(404).json({
                    success: false,
                    error: 'Giveaway not found.'
                });
            }

            if (giveaway.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    error: 'Giveaway is no longer active.'
                });
            }

            await finishGiveaway(
                discordClient,
                giveaway
            );

            res.json({
                success: true,
                message: 'Giveaway ended successfully.',
                giveaway:
                    getGiveaway(giveaway.id)
            });

        } catch (error) {

            console.error(
                '❌ Failed to end giveaway:',
                error
            );

            res.status(500).json({
                success: false,
                error:
                    'Failed to end giveaway.'
            });

        }
    }
);


// ==========================================
// CANCEL GIVEAWAY FROM DASHBOARD
// ==========================================

app.post(
    '/api/giveaways/:id/cancel',
    async (req, res) => {
        try {

            const giveaway =
                getGiveaway(req.params.id);

            if (!giveaway || !hasServerAccess(req, giveaway.guildId)) {
                return res.status(404).json({
                    success: false,
                    error: 'Giveaway not found.'
                });
            }

            if (!giveaway) {
                return res.status(404).json({
                    success: false,
                    error: 'Giveaway not found.'
                });
            }

            if (giveaway.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    error: 'Giveaway is no longer active.'
                });
            }

            const updated =
                updateGiveaway(
                    giveaway.id,
                    {
                        status: 'cancelled'
                    }
                );

            try {

                const channel =
                    await discordClient.channels.fetch(
                        giveaway.channelId
                    );

                const message =
                    await channel.messages.fetch(
                        giveaway.messageId
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x747b8a)
                        .setTitle(
                            '🚫 FORTNITE GIVEAWAY CANCELLED'
                        )
                        .setDescription(
                            `# 🎁 ${giveaway.prize}\n\n` +
                            `This giveaway has been cancelled.\n\n` +
                            `👥 **TOTAL ENTRIES**\n` +
                            `${giveaway.entries.length}\n\n` +
                            `Thanks everyone for participating in the AMYFN community. 💙`
                        )
                        .setFooter({
                            text:
                                'AMYFN • Fortnite Community'
                        })
                        .setTimestamp();

                await message.edit({
                    embeds: [embed],
                    components: []
                });

            } catch (messageError) {

                console.error(
                    '⚠️ Failed to update cancelled giveaway message:',
                    messageError
                );

            }

            res.json({
                success: true,
                message: 'Giveaway cancelled successfully.',
                giveaway: updated
            });

        } catch (error) {

            console.error(
                '❌ Failed to cancel giveaway:',
                error
            );

            res.status(500).json({
                success: false,
                error:
                    'Failed to cancel giveaway.'
            });

        }
    }
);


// ==========================================
// SHOP SNAPSHOT LOADER
// ==========================================

function loadShopSnapshot() {

    if (
        !fs.existsSync(
            shopSnapshotFile
        )
    ) {

        return null;

    }


    try {

        return JSON.parse(
            fs.readFileSync(
                shopSnapshotFile,
                'utf8'
            )
        );


    } catch (error) {

        console.error(
            '❌ Failed to load shop snapshot:',
            error
        );


        return null;

    }

}


// ==========================================
// SHOP API
// ==========================================

app.get(
    '/api/shop',
    (req, res) => {

        try {

            const dailyResult =
                getLatestDailyResult();


            const snapshot =
                loadShopSnapshot();


            if (
                !snapshot &&
                !dailyResult
            ) {

                return res.json({

                    success:
                        true,


                    available:
                        false,


                    message:
                        'No Daily Shop data available yet.',


                    shop:
                        null

                });

            }


            const currentItems =
                Array.isArray(
                    snapshot?.currentItems
                )
                    ? snapshot.currentItems
                    : [];


            const releasedToday =
                Array.isArray(
                    dailyResult?.releasedToday
                )
                    ? dailyResult.releasedToday
                    : [];


            const removedToday =
                Array.isArray(
                    dailyResult?.removedToday
                )
                    ? dailyResult.removedToday
                    : [];


            const shopDate =
                snapshot?.shopDate ||
                dailyResult?.shopDate ||
                null;


            const detectedAt =
                dailyResult?.detectedAt ||
                snapshot?.updatedAt ||
                null;


            console.log(
                `📊 Dashboard shop: ${currentItems.length} current items, ${releasedToday.length} new, ${removedToday.length} removed`
            );


            res.json({

                success:
                    true,


                available:
                    true,


                shop: {

                    shopDate,


                    detectedAt,


                    totalItems:
                        currentItems.length,


                    currentItems,


                    releasedToday,


                    removedToday

                }

            });


        } catch (error) {

            console.error(
                'Failed to load shop data:',
                error
            );


            res.status(500).json({

                success:
                    false,


                error:
                    'Failed to load shop data.'

            });

        }

    }
);


// ==========================================
// COSMETICS API
// ==========================================

app.get(
    '/api/cosmetics',
    async (req, res) => {

        try {

            const search =
                String(
                    req.query.search || ''
                ).trim();


            if (
                search.length < 2
            ) {

                return res.json({

                    success:
                        true,


                    cosmetics:
                        []

                });

            }


            const results =
                await searchCosmetics(
                    search
                );


            const cosmetics =
                Array.isArray(results)
                    ? results
                    : results
                        ? [results]
                        : [];


            res.json({

                success:
                    true,


                cosmetics

            });


        } catch (error) {

            console.error(
                '❌ Cosmetics search failed:',
                error
            );


            res.status(500).json({

                success:
                    false,


                error:
                    'Failed to search cosmetics.'

            });

        }

    }
);

// ==========================================
// NEW COSMETICS API
// ==========================================

app.get(
    '/api/cosmetics/new',
    async (req, res) => {

        try {

            const results =
                await getNewCosmetics();

            const cosmetics =
    Array.isArray(
        results?.items?.br
    )
        ? results.items.br
        : [];

            console.log(
                `✨ Dashboard new cosmetics: ${cosmetics.length} items`
            );

            res.json({

                success:
                    true,

                cosmetics

            });

        } catch (error) {

            console.error(
                '❌ New cosmetics request failed:',
                error
            );

            res.status(500).json({

                success:
                    false,

                error:
                    'Failed to load new cosmetics.'

            });

        }

    }
);

// ==========================================
// SERVERS API
// ==========================================

app.get(
    '/api/servers',
    (req, res) => {

        try {

            const configs =
                getAllServerConfigs();

            const servers =
                req.dashboardSession.guildIds
                    .map(guildId =>
                        discordClient.guilds.cache.get(
                            guildId
                        )
                    )
                    .filter(Boolean)
                    .map(guild => ({
                        guildId: guild.id,
                        name: guild.name,
                        icon: guild.iconURL({
                            size: 128
                        }),
                        accessible: true,
                        config:
                            configs[guild.id] || null
                    }));

            res.json({
                success: true,
                servers
            });

        } catch (error) {

            console.error(
                'Failed to load authorized servers:',
                error
            );

            res.status(500).json({
                success: false,
                error: 'Failed to load servers.'
            });

        }

    }
);


// ==========================================
// SINGLE SERVER API
// ==========================================

app.get(
    '/api/servers/:guildId',
    async (req, res) => {

        try {

            if (!hasServerAccess(req, req.params.guildId)) {

                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this server.'
                });

            }

            const guild =
                discordClient.guilds.cache.get(
                    req.params.guildId
                );


            if (!guild) {

                return res.status(404).json({

                    success:
                        false,


                    error:
                        'Dashboard bot cannot access this server.'

                });

            }


            const config =
                getServerConfig(
                    guild.id
                ) || {};


            const channels =
                Array.from(
                    guild.channels.cache.values()
                )
                .filter(
                    channel =>
                        channel.isTextBased() &&
                        !channel.isThread()
                )
                .map(
                    channel => ({

                        id:
                            channel.id,


                        name:
                            channel.name,


                        type:
                            channel.type

                    })
                )
                .sort(
                    (a, b) =>
                        a.name.localeCompare(
                            b.name
                        )
                );


            const roles =
                Array.from(
                    guild.roles.cache.values()
                )
                .filter(
                    role =>
                        !role.managed &&
                        role.id !== guild.id
                )
                .map(
                    role => ({

                        id:
                            role.id,


                        name:
                            role.name,


                        position:
                            role.position

                    })
                )
                .sort(
                    (a, b) =>
                        b.position -
                        a.position
                );


            res.json({

                success:
                    true,


                name:
                    guild.name,


                icon:
                    guild.iconURL({
                        size: 128
                    }),


                config,


                channels,


                roles

            });


        } catch (error) {

            console.error(
                'Failed to load server:',
                error
            );


            res.status(500).json({

                success:
                    false,


                error:
                    'Failed to load server data.'

            });

        }

    }
);


// ==========================================
// SAVE SERVER CONFIG
// ==========================================

app.put(
    '/api/servers/:guildId',
    async (req, res) => {

        try {

            if (!hasServerAccess(req, req.params.guildId)) {

                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this server.'
                });

            }

            const guild =
                discordClient.guilds.cache.get(
                    req.params.guildId
                );


            if (!guild) {

                return res.status(404).json({

                    success:
                        false,


                    error:
                        'Dashboard bot cannot access this server.'

                });

            }


            const {

                channelId,
                roleId,
                updatesChannelId,
                updatesRoleId,
                logsChannelId

            } = req.body;


            const validateChannel =
                id => {

                    if (!id) {

                        return null;

                    }


                    const channel =
                        guild.channels.cache.get(
                            id
                        );


                    if (
                        !channel ||
                        !channel.isTextBased() ||
                        channel.isThread()
                    ) {

                        throw new Error(
                            `Invalid channel: ${id}`
                        );

                    }


                    return id;

                };


            const validateRole =
                id => {

                    if (!id) {

                        return null;

                    }


                    const role =
                        guild.roles.cache.get(
                            id
                        );


                    if (
                        !role ||
                        role.managed
                    ) {

                        throw new Error(
                            `Invalid role: ${id}`
                        );

                    }


                    return id;

                };


            const config = {

                channelId:
                    validateChannel(
                        channelId
                    ),


                roleId:
                    validateRole(
                        roleId
                    ),


                updatesChannelId:
                    validateChannel(
                        updatesChannelId
                    ),


                updatesRoleId:
                    validateRole(
                        updatesRoleId
                    ),


                logsChannelId:
                    validateChannel(
                        logsChannelId
                    )

            };


            setServerConfig(
                guild.id,
                config
            );


            res.json({

                success:
                    true,


                config:
                    getServerConfig(
                        guild.id
                    )

            });


        } catch (error) {

            console.error(
                'Failed to save server config:',
                error
            );


            res.status(400).json({

                success:
                    false,


                error:
                    error.message ||
                    'Failed to save configuration.'

            });

        }

    }
);



setInterval(() => {
    const now = Date.now();

    for (const [id, session] of sessions) {
        if (session.expiresAt <= now) {
            sessions.delete(id);
        }
    }

    for (const [state, savedState] of oauthStates) {
        if (savedState.expiresAt <= now) {
            oauthStates.delete(state);
        }
    }
}, 60 * 60 * 1000);

// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `Amyfn Dashboard running at http://localhost:${PORT}`
        );

    }
);


// ==========================================
// DISCORD LOGIN
// ==========================================

const token =
    process.env.DISCORD_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.TOKEN;


if (!token) {

    console.error(
        '❌ No Discord bot token found in .env'
    );

} else {

    discordClient
        .login(token)
        .catch(
            error => {

                console.error(
                    '❌ Dashboard Discord login failed:',
                    error
                );

            }
        );

}
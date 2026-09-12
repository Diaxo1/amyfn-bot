const {
    SlashCommandBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const crypto = require('crypto');

const {
    getPlayerSeasonStats,
    getPlayerLifetimeStats
} = require('../services/fortniteStats');

const {
    createAccountCard
} = require('../services/accountCard');

const {
    getAccountSkinImage
} = require('../services/fortniteCosmetics');

// Account card sessions live in memory. This keeps select-menu clicks fast
// without making another Fortnite API request for Season <-> Overall.
const accountSessions = new Map();
const SESSION_TTL = 15 * 60 * 1000;

function createSession(data) {
    const id = crypto.randomBytes(6).toString('hex');

    accountSessions.set(id, {
        ...data,
        expiresAt: Date.now() + SESSION_TTL
    });

    return id;
}

function getSession(id) {
    const session = accountSessions.get(id);

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
        accountSessions.delete(id);
        return null;
    }

    session.expiresAt = Date.now() + SESSION_TTL;
    return session;
}

function buildAccountComponents(sessionId, time = 'season') {
    const timeMenu = new StringSelectMenuBuilder()
        .setCustomId(`account_time_${sessionId}`)
        .setPlaceholder('Select time period')
        .addOptions([
            {
                label: 'This Season',
                description: 'Stats from the current season',
                value: 'season',
                default: time === 'season'
            },
            {
                label: 'Overall',
                description: 'Lifetime Battle Royale stats',
                value: 'overall',
                default: time === 'overall'
            }
        ]);

    return [
        new ActionRowBuilder().addComponents(timeMenu)
    ];
}

async function renderAccount(interaction, session, time) {
    const stats = time === 'season'
        ? session.seasonStats
        : session.lifetimeStats;

    const card = await createAccountCard({
        account: session.account,
        stats,
        battlePassLevel: session.battlePassLevel,
        skinImage: session.skinImage,
        time
    });

    const attachment = new AttachmentBuilder(card)
        .setName('amyfn-account.png');

    return interaction.editReply({
        content: '',
        files: [attachment],
        components: buildAccountComponents(session.id, time)
    });
}

async function handleAccountComponent(interaction) {
    if (!interaction.isStringSelectMenu()) return false;

    const isTimeMenu = interaction.customId.startsWith('account_time_');

    if (!isTimeMenu) return false;

    const sessionId = interaction.customId.replace(/^account_time_/, '');
    const session = getSession(sessionId);

    if (!session) {
        await interaction.reply({
            content: 'This account card has expired. Run `/account` again.',
            ephemeral: true
        });
        return true;
    }

    // Only the person who created the card can control its dropdown.
    if (interaction.user.id !== session.userId) {
        await interaction.reply({
            content: 'Only the person who used `/account` can change these stats.',
            ephemeral: true
        });
        return true;
    }

    const time = interaction.values[0];
    session.time = time;

    try {
        await interaction.deferUpdate();
        await renderAccount(interaction, session, time);
    } catch (error) {
        console.error('Account card select-menu error:', error);

        try {
            await interaction.editReply({
                content: 'Something went wrong while updating the account card.'
            });
        } catch (_) {
            // Interaction may already have expired.
        }
    }

    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('View a Fortnite player account overview')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription("The player's Epic Games display name")
                .setRequired(true)
        ),

    async execute(interaction) {
        const username = interaction.options.getString('username');

        await interaction.deferReply();

        try {
            // ==========================================
            // GET PLAYER DATA
            // ==========================================

            const [seasonData, lifetimeData] = await Promise.all([
                getPlayerSeasonStats(username),
                getPlayerLifetimeStats(username)
            ]);

            if (!seasonData || !lifetimeData) {
                return await interaction.editReply(
                    `I couldn't find Fortnite stats for **${username}**.`
                );
            }

            // ==========================================
            // ACCOUNT
            // ==========================================

            const account =
                seasonData.account ||
                lifetimeData.account ||
                {};

            // Keep the complete mode collections. The renderer needs Solo,
            // Duo, Squad and LTM instead of only the overall stats object.
            const seasonStats = seasonData.stats?.all || {};
            const lifetimeStats = lifetimeData.stats?.all || {};

            // ==========================================
            // BATTLE PASS
            // ==========================================

            const battlePass =
                seasonData.battlePass ||
                lifetimeData.battlePass ||
                {};

            const battlePassLevel =
                battlePass.level ??
                battlePass.currentLevel ??
                battlePass.current_level ??
                battlePass.progress?.level ??
                battlePass.tier ??
                'N/A';

            // ==========================================
            // PROFILE IMAGE
            // ==========================================

            const skinImage = await getAccountSkinImage(seasonData, lifetimeData);

            // ==========================================
            // ACCOUNT SESSION
            // ==========================================

            const sessionId = createSession({
                id: null,
                userId: interaction.user.id,
                account,
                seasonStats,
                lifetimeStats,
                battlePassLevel,
                skinImage,
                time: 'season'
            });

            const session = accountSessions.get(sessionId);
            session.id = sessionId;

            // ==========================================
            // GENERATE ACCOUNT CARD
            // ==========================================

            console.log(
                `Generating account card for ${account.name || username}`
            );

            const card = await createAccountCard({
                account,
                stats: seasonStats,
                battlePassLevel,
                skinImage,
                time: 'season'
            });

            const attachment = new AttachmentBuilder(card)
                .setName('amyfn-account.png');

            // ==========================================
            // SEND
            // ==========================================

            await interaction.editReply({
                files: [attachment],
                components: buildAccountComponents(sessionId, 'season')
            });

            console.log(
                `Account card generated for ${account.name || username}`
            );
        } catch (error) {
            console.error('Account lookup error:', error);

            if (error.status === 404) {
                return await interaction.editReply(
                    `I couldn't find Fortnite stats for **${username}**.`
                );
            }

            if (error.status === 401 || error.status === 403) {
                return await interaction.editReply(
                    'Fortnite API authentication failed. Check your API key.'
                );
            }

            if (error.status === 429) {
                return await interaction.editReply(
                    'The Fortnite API is being rate limited. Try again shortly.'
                );
            }

            await interaction.editReply(
                'Something went wrong while creating that Fortnite account card.'
            );
        }
    },

    handleAccountComponent
};

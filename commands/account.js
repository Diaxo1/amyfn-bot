const {
    SlashCommandBuilder,
    AttachmentBuilder
} = require('discord.js');

const {
    getPlayerSeasonStats,
    getPlayerLifetimeStats
} = require('../services/fortniteStats');

const {
    createAccountCard
} = require('../services/accountCard');

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
        const username =
            interaction.options.getString('username');

        await interaction.deferReply();

        try {

            // ==========================================
            // GET PLAYER DATA
            // ==========================================

            const [
                seasonData,
                lifetimeData
            ] = await Promise.all([
                getPlayerSeasonStats(username),
                getPlayerLifetimeStats(username)
            ]);

            if (!seasonData || !lifetimeData) {
                return await interaction.editReply(
                    `❌ I couldn't find Fortnite stats for **${username}**.`
                );
            }

            // ==========================================
            // ACCOUNT
            // ==========================================

            const account =
                seasonData.account ||
                lifetimeData.account ||
                {};

            // ==========================================
            // STATS
            // ==========================================

            const seasonStats =
                seasonData.stats?.all?.overall || {};

            const lifetimeStats =
                lifetimeData.stats?.all?.overall || {};

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

            const profileImage =
                seasonData.image ||
                lifetimeData.image ||
                null;

            // ==========================================
            // GENERATE ACCOUNT CARD
            // ==========================================

            console.log(
                `🎨 Generating account card for ${account.name || username}`
            );

            const card =
                await createAccountCard({
                    account,
                    seasonStats,
                    lifetimeStats,
                    battlePassLevel,
                    profileImage
                });

            const attachment =
                new AttachmentBuilder(card)
                    .setName('amyfn-account.png');

            // ==========================================
            // SEND
            // ==========================================

            await interaction.editReply({
                files: [attachment]
            });

            console.log(
                `✅ Account card generated for ${account.name || username}`
            );

        } catch (error) {

            console.error(
                '❌ Account lookup error:',
                error
            );

            // ==========================================
            // ERROR HANDLING
            // ==========================================

            if (error.status === 404) {
                return await interaction.editReply(
                    `❌ I couldn't find Fortnite stats for **${username}**.`
                );
            }

            if (
                error.status === 401 ||
                error.status === 403
            ) {
                return await interaction.editReply(
                    '❌ Fortnite API authentication failed. Check your API key.'
                );
            }

            if (error.status === 429) {
                return await interaction.editReply(
                    '⏳ The Fortnite API is being rate limited. Try again shortly.'
                );
            }

            await interaction.editReply(
                '❌ Something went wrong while creating that Fortnite account card.'
            );
        }
    }
};
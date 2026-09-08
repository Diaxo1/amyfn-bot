const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const {
    getPlayerSeasonStats,
    getPlayerLifetimeStats
} = require('../services/fortniteStats');

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
            const [seasonData, lifetimeData] = await Promise.all([
                getPlayerSeasonStats(username),
                getPlayerLifetimeStats(username)
            ]);

            if (!seasonData || !lifetimeData) {
                return await interaction.editReply(
                    `❌ I couldn't find Fortnite stats for **${username}**.`
                );
            }

            const account =
                seasonData.account ||
                lifetimeData.account ||
                {};

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
            // FORMATTING
            // ==========================================

            const formatNumber = value => {
                const number = Number(value || 0);
                return number.toLocaleString();
            };

            const formatStat = value => {
                return value === undefined ||
                    value === null ||
                    value === ''
                    ? 'N/A'
                    : value;
            };

            const getWinRate = stats => {
                if (
                    stats.winRate !== undefined &&
                    stats.winRate !== null
                ) {
                    return `${stats.winRate}%`;
                }

                const matches = Number(stats.matches || 0);
                const wins = Number(stats.wins || 0);

                if (!matches) {
                    return '0.00%';
                }

                return `${((wins / matches) * 100).toFixed(2)}%`;
            };

            // ==========================================
            // EMBED
            // ==========================================

            const embed = new EmbedBuilder()
                .setColor(0x1493ff)
                .setTitle('👤 Fortnite Account')
                .setDescription(
                    `### ${account.name || username}\n` +
                    `Fortnite Battle Royale account overview`
                )

                // ==========================================
                // THIS SEASON
                // ==========================================

                .addFields(
                    {
                        name: '🔥 THIS SEASON',
                        value:
                            `🏆 **Wins:** ${formatNumber(seasonStats.wins)}\n` +
                            `🎮 **Matches:** ${formatNumber(seasonStats.matches)}\n` +
                            `💀 **Kills:** ${formatNumber(seasonStats.kills)}\n` +
                            `🎯 **K/D:** ${formatStat(seasonStats['k/d'])}\n` +
                            `📈 **Win Rate:** ${getWinRate(seasonStats)}`,
                        inline: true
                    },

                    // ==========================================
                    // BATTLE PASS
                    // ==========================================

                    {
                        name: '🎟️ BATTLE PASS',
                        value:
                            `⭐ **Level:** ${battlePassLevel}`,
                        inline: true
                    },

                    // ==========================================
                    // OVERALL
                    // ==========================================

                    {
                        name: '📊 OVERALL',
                        value:
                            `🏆 **Wins:** ${formatNumber(lifetimeStats.wins)}\n` +
                            `🎮 **Matches:** ${formatNumber(lifetimeStats.matches)}\n` +
                            `💀 **Kills:** ${formatNumber(lifetimeStats.kills)}\n` +
                            `🎯 **K/D:** ${formatStat(lifetimeStats['k/d'])}\n` +
                            `📈 **Win Rate:** ${getWinRate(lifetimeStats)}`,
                        inline: true
                    }
                );

            // ==========================================
            // PROFILE IMAGE
            // ==========================================

            if (seasonData.image) {
                embed.setThumbnail(seasonData.image);
            } else if (lifetimeData.image) {
                embed.setThumbnail(lifetimeData.image);
            }

            // ==========================================
            // GAME MODES
            // ==========================================

            embed.addFields(
                {
                    name: '🥇 SOLO',
                    value:
                        `Wins: **${formatNumber(
                            seasonData.stats?.all?.solo?.wins
                        )}**\n` +
                        `Matches: **${formatNumber(
                            seasonData.stats?.all?.solo?.matches
                        )}**\n` +
                        `K/D: **${formatStat(
                            seasonData.stats?.all?.solo?.['k/d']
                        )}**`,
                    inline: true
                },

                {
                    name: '🥈 DUOS',
                    value:
                        `Wins: **${formatNumber(
                            seasonData.stats?.all?.duo?.wins
                        )}**\n` +
                        `Matches: **${formatNumber(
                            seasonData.stats?.all?.duo?.matches
                        )}**\n` +
                        `K/D: **${formatStat(
                            seasonData.stats?.all?.duo?.['k/d']
                        )}**`,
                    inline: true
                },

                {
                    name: '🏆 SQUADS',
                    value:
                        `Wins: **${formatNumber(
                            seasonData.stats?.all?.squad?.wins
                        )}**\n` +
                        `Matches: **${formatNumber(
                            seasonData.stats?.all?.squad?.matches
                        )}**\n` +
                        `K/D: **${formatStat(
                            seasonData.stats?.all?.squad?.['k/d']
                        )}**`,
                    inline: true
                }
            );

            // ==========================================
            // FOOTER
            // ==========================================

            embed
                .setFooter({
                    text: 'Amyfn • Fortnite Account'
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('❌ Account lookup error:', error);

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
                '❌ Something went wrong while looking up that Fortnite account.'
            );
        }
    }
};
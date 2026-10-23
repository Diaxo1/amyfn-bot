const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const OWNER_ID = process.env.AMY_OWNER_ID;

module.exports = {

    data: new SlashCommandBuilder()
        .setName('guilds')
        .setDescription('View the Discord servers AMY FN is currently in.'),

    async execute(interaction, client) {

        // Owner only
        if (
            !OWNER_ID ||
            interaction.user.id !== OWNER_ID
        ) {
            return interaction.reply({
                content: '❌ This command is owner-only.',
                ephemeral: true
            });
        }

        const guilds = [...client.guilds.cache.values()]
            .sort((a, b) => b.memberCount - a.memberCount);

        if (!guilds.length) {
            return interaction.reply({
                content: '❌ AMY FN is not currently connected to any servers.',
                ephemeral: true
            });
        }

        const lines = guilds.map((guild, index) => {
            return [
                `**${index + 1}. ${guild.name}**`,
                `👥 ${guild.memberCount.toLocaleString()} members`,
                `🆔 \`${guild.id}\``
            ].join('\n');
        });

        const description = lines.join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('🤖 AMY FN — Connected Servers')
            .setDescription(description.slice(0, 4096))
            .setColor(0x5865F2)
            .setFooter({
                text: `${guilds.length} server${guilds.length === 1 ? '' : 's'}`
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};
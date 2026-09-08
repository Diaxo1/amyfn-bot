const {
SlashCommandBuilder,
EmbedBuilder
} = require('discord.js');

module.exports = {
data: new SlashCommandBuilder()
.setName('amy')
.setDescription('...'),

async execute(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('❤️ Amyfn')
        .setDescription(
            'Some things are built for a purpose.\n' +
            'Some things are built for someone.\n\n' +
            'This one was built for **Amy**. ❤️\n\n' +
            '*Behind every command, every update, and every little detail... ' +
            'there\'s someone who inspired it all.*\n\n' +
            '— Xaid'
        )
        .setImage('https://i.pinimg.com/736x/bc/17/49/bc1749d8ed473c99b5d44a849f3e4e94.jpg')
        .setFooter({
            text: 'A little secret, just for her. ❤️'
        })
        .setTimestamp();

    await interaction.reply({
        embeds: [embed]
    });
}

};

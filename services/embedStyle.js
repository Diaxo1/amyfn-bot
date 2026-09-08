const { EmbedBuilder } = require('discord.js');

const AMYFN_BLUE = 0x1493ff;
const AMYFN_FOOTER = 'Amyfn • Fortnite Community';

function createEmbed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(AMYFN_BLUE)
        .setFooter({
            text: AMYFN_FOOTER
        });

    if (options.title) {
        embed.setTitle(options.title);
    }

    if (options.description) {
        embed.setDescription(options.description);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    if (options.fields) {
        embed.addFields(options.fields);
    }

    return embed;
}

module.exports = {
    AMYFN_BLUE,
    AMYFN_FOOTER,
    createEmbed
};
require('dotenv').config();

const {
    REST,
    Routes
} = require('discord.js');

const commands = [

    // ==========================================
    // BASIC
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('ping')
        .setDescription('Replies with Pong!')
        .toJSON(),

    // ==========================================
    // COSMETICS
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('cosmetic')
        .setDescription('Search for a Fortnite cosmetic')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Name of the cosmetic')
                .setRequired(true)
        )
        .toJSON(),

    // ==========================================
    // SHOP
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('shop')
        .setDescription('View the current Fortnite Item Shop')
        .toJSON(),

    // ==========================================
    // FEATURED COSMETICS
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('feature')
        .setDescription('View the newest Fortnite cosmetics')
        .toJSON(),

    // ==========================================
    // DAILY SHOP
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('daily')
        .setDescription(
            'Shows what was released and removed from the Fortnite Shop'
        )
        .toJSON(),

    // ==========================================
    // DAILY SHOP IMAGES
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('dailyimages')
        .setDescription(
            'Shows images of cosmetics released in the latest shop reset'
        )
        .toJSON(),

    // ==========================================
    // HELP
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('help')
        .setDescription('Shows all Amyfn commands and features')
        .toJSON(),

    // ==========================================
    // ABOUT
    // ==========================================

    require('./commands/about').data.toJSON(),

    // ==========================================
    // NEWS
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('news')
        .setDescription('Shows the latest Fortnite news')
        .toJSON(),

    // ==========================================
    // AMY EASTER EGG
    // ==========================================

    new (require('discord.js').SlashCommandBuilder)()
        .setName('amy')
        .setDescription('...')
        .toJSON(),

    // ==========================================
    // SERVER SETUP
    // ==========================================

    require('./commands/setup').data.toJSON(),

    // ==========================================
    // LEAK SYSTEM
    // ==========================================

    require('./commands/leaks').data.toJSON(),

    // ==========================================
    // GIVEAWAY SYSTEM
    // ==========================================

    require('./commands/giveaway').data.toJSON(),

    // ==========================================
    // FORTNITE QUIZ
    // ==========================================

    require('./commands/fortnitequiz').data.toJSON(),

    // ==========================================
    // FORTNITE ACCOUNT
    // ==========================================

    require('./commands/account').data.toJSON(),

    // ==========================================
    // MODERATION
    // ==========================================

    require('./commands/moderation').warnData.toJSON(),

    require('./commands/moderation').warningsData.toJSON(),

    require('./commands/moderation').banData.toJSON(),

    require('./commands/moderation').kickData.toJSON(),

    require('./commands/moderation').timeoutData.toJSON(),

    require('./commands/moderation').untimeoutData.toJSON(),

    require('./commands/moderation').clearData.toJSON(),

    require('./commands/moderation').slowmodeData.toJSON(),

    require('./commands/moderation').lockData.toJSON(),

    require('./commands/moderation').unlockData.toJSON()

];

const rest = new REST({
    version: '10'
}).setToken(
    process.env.DISCORD_TOKEN
);

(async () => {

    try {

        console.log(
            'Registering GLOBAL slash commands...'
        );

        console.log(
            'Total commands: ' +
            commands.length
        );

        console.log(
            'Commands: ' +
            commands
                .map(command => command.name)
                .join(', ')
        );

        console.log(
            'Client ID: ' +
            process.env.CLIENT_ID
        );

        // ==========================================
        // SETUP DEBUG
        // ==========================================

        const setupCommand =
            commands.find(
                command =>
                    command.name === 'setup'
            );

        if (
            setupCommand &&
            setupCommand.options
        ) {

            console.log(
                'SETUP OPTIONS:',
                setupCommand.options.map(
                    option => option.name
                )
            );

        }

        // ==========================================
        // REGISTER COMMANDS
        // ==========================================

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            'Successfully registered GLOBAL slash commands!'
        );

        console.log(
            'Commands are now available globally.'
        );

    } catch (error) {

        console.error(
            'Command registration failed:'
        );

        console.error(
            error
        );

    }

})();
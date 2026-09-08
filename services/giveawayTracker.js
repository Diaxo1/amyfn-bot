const {
    getExpiredGiveaways
} = require('./giveawayService');

const {
    finishGiveaway
} = require('../commands/giveaway');

let trackerStarted = false;

async function checkGiveaways(client) {

    try {

        const expiredGiveaways =
            getExpiredGiveaways();

        if (!expiredGiveaways.length) {
            return;
        }

        console.log(
            `🎁 Found ${expiredGiveaways.length} expired giveaway(s).`
        );

        for (
            const giveaway of expiredGiveaways
        ) {

            console.log(
                `🏆 Ending giveaway ${giveaway.id}...`
            );

            await finishGiveaway(
                client,
                giveaway
            );
        }

    } catch (error) {

        console.error(
            '❌ Giveaway tracker error:',
            error
        );
    }
}

function startGiveawayTracker(client) {

    if (trackerStarted) {
        console.log(
            '⚠️ Giveaway tracker already running.'
        );

        return;
    }

    trackerStarted = true;

    console.log(
        '🎁 Starting giveaway tracker...'
    );

    // Check immediately
    checkGiveaways(client);

    // Check every 10 seconds
    setInterval(
        () => checkGiveaways(client),
        10000
    );
}

module.exports = {
    startGiveawayTracker,
    checkGiveaways
};
const {
    getExpiredGiveaways
} = require('./giveawayService');

const {
    finishGiveaway
} = require('../commands/giveaway');

let trackerStarted = false;

const configuredInterval = Number(process.env.GIVEAWAY_CHECK_INTERVAL_MS);
const CHECK_INTERVAL = Number.isFinite(configuredInterval) && configuredInterval >= 10000
    ? Math.floor(configuredInterval)
    : 60000;

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

    // Expiry checks do not need to run every few seconds.
    setInterval(
        () => checkGiveaways(client),
        CHECK_INTERVAL
    );
}

module.exports = {
    startGiveawayTracker,
    checkGiveaways
};

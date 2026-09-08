require('dotenv').config();

const { getShop } = require('./services/fortniteApi');

async function test() {
    try {
        const shop = await getShop();

        console.log('SHOP API WORKS! 🔥');
        console.log('Shop date:', shop.date);
        console.log('Total entries:', shop.entries.length);

        const first = shop.entries[0];

        console.log('\nFIRST SHOP ENTRY:');
        console.dir(first, { depth: 6 });

    } catch (error) {
        console.error('SHOP API TEST FAILED ❌');
        console.error(error);
    }
}

test();
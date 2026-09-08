require('dotenv').config();

const { getCosmeticById } = require('./services/fortniteApi');

async function test() {
    try {
        const cosmetic = await getCosmeticById('CID_028_Athena_Commando_F');

        console.log('API WORKS! 🔥');
        console.log('Name:', cosmetic.name);
        console.log('Type:', cosmetic.type?.displayValue);
        console.log('Rarity:', cosmetic.rarity?.displayValue);
    } catch (error) {
        console.error('API TEST FAILED ❌');
        console.error(error);
    }
}

test();
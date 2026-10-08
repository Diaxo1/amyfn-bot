const fs = require('fs');

const path = require('path');

const crypto = require('crypto');



const {

    getNews

} = require('./fortniteApi');



const {

    getAllServerConfigs

} = require('./serverConfig');



const dataFolder =
    process.env.AMYFN_DATA_DIR ||
    (fs.existsSync('/data')
        ? '/data'
        : path.join(__dirname, '..', 'data'));



const snapshotFile = path.join(

    dataFolder,

    'newsSnapshot.json'

);



let checking = false;





/*

==================================================

DATA FOLDER

==================================================

*/



function ensureDataFolder() {



    if (!fs.existsSync(dataFolder)) {



        fs.mkdirSync(

            dataFolder,

            {

                recursive: true

            }

        );



    }



}





/*

==================================================

LOAD SNAPSHOT

==================================================

*/



function loadSnapshot() {



    ensureDataFolder();



    if (!fs.existsSync(snapshotFile)) {

        return null;

    }



    try {



        return JSON.parse(

            fs.readFileSync(

                snapshotFile,

                'utf8'

            )

        );



    } catch (error) {



        console.error(

            '❌ Failed to load news snapshot:',

            error

        );



        return null;



    }



}





/*

==================================================

CREATE ARTICLE FINGERPRINT

==================================================

*/



function createArticleFingerprint(item) {



    return JSON.stringify({



        id:

            item.id || null,



        title:

            item.title || null,



        body:

            item.body || null,



        image:

            item.image || null,



        sortingPriority:

            item.sortingPriority || 0,



        hidden:

            item.hidden || false



    });



}





/*

==================================================

CREATE NEWS FINGERPRINT

==================================================

*/



function createNewsFingerprint(currentNews) {



    const articles = currentNews.map(

        item => createArticleFingerprint(item)

    );



    return crypto

        .createHash('sha256')

        .update(

            JSON.stringify(articles)

        )

        .digest('hex');



}





/*

==================================================

SAVE SNAPSHOT

==================================================

*/



function saveSnapshot(

    newsData,

    currentNews,

    fingerprint

) {



    ensureDataFolder();



    const snapshot = {



        hash:

            newsData.br?.hash ||

            null,



        date:

            newsData.br?.date ||

            null,



        ids:

            currentNews.map(

                item => item.id

            ),



        fingerprint:

            fingerprint,



        articles:

            currentNews.map(

                item => ({

                    id:

                        item.id || null,



                    title:

                        item.title || null,



                    body:

                        item.body || null,



                    image:

                        item.image || null,



                    sortingPriority:

                        item.sortingPriority || 0,



                    hidden:

                        item.hidden || false

                })

            ),



        updatedAt:

            new Date().toISOString()



    };



    fs.writeFileSync(



        snapshotFile,



        JSON.stringify(

            snapshot,

            null,

            2

        ),



        'utf8'



    );



}





/*

==================================================

FIND WHAT CHANGED

==================================================

*/



function getChanges(

    previousSnapshot,

    currentNews

) {



    const previousArticles =

        Array.isArray(

            previousSnapshot?.articles

        )

            ? previousSnapshot.articles

            : [];



    const previousMap =

        new Map(

            previousArticles.map(

                item => [

                    item.id,

                    item

                ]

            )

        );



    const changes = [];



    for (

        const current of currentNews

    ) {



        const previous =

            previousMap.get(

                current.id

            );



        if (!previous) {



            changes.push({



                type: 'new',



                item: current



            });



            continue;



        }



        const changedFields = [];



        if (

            previous.title !==

            current.title

        ) {



            changedFields.push(

                'title'

            );



        }



        if (

            previous.body !==

            current.body

        ) {



            changedFields.push(

                'body'

            );



        }



        if (

            previous.image !==

            current.image

        ) {



            changedFields.push(

                'image'

            );



        }



        if (

            previous.sortingPriority !==

            current.sortingPriority

        ) {



            changedFields.push(

                'priority'

            );



        }



        if (

            previous.hidden !==

            current.hidden

        ) {



            changedFields.push(

                'visibility'

            );



        }



        if (

            changedFields.length > 0

        ) {



            changes.push({



                type: 'updated',



                item: current,



                fields: changedFields



            });



        }



    }



    return changes;



}





/*

==================================================

POST NEWS TO SERVER

==================================================

*/



async function postNewsToServer(



    client,



    guildId,



    config,



    newsItems,



    newsDate



) {



    try {



        if (

    !config ||

    !config.updatesChannelId

) {

    console.log(

        `ℹ️ No News & Leaks channel configured for server ${guildId}`

    );



    return;

}



const channel =

    await client.channels.fetch(

        config.updatesChannelId

    );



if (!channel) {

    console.log(

        `❌ News & Leaks channel not found for server ${guildId}`

    );



    return;

}



const roleId =

    config.updatesRoleId;



        for (

            const item of newsItems

        ) {



            const embed = {



                title:

                    `📰 ${item.title || 'Fortnite News'}`,



                description:

                    item.body ||

                    'No description available.',



                timestamp:

                    newsDate

                        ? new Date(

                            newsDate

                        ).toISOString()

                        : new Date().toISOString(),



                footer: {



                    text:

                        'Amyfn • Fortnite News'



                }



            };





            if (item.image) {



                embed.image = {



                    url:

                        item.image



                };



            }





            await channel.send({



                content:

                    roleId

                        ? `<@&${roleId}>`

                        : undefined,



                embeds: [

                    embed

                ],



                allowedMentions:



                    roleId



                        ? {



                            roles: [

                                roleId

                            ]



                        }



                        : {



                            parse: []



                        }



            });





            console.log(



                `✅ News posted to server ${guildId}: ${item.title}`



            );



        }



    } catch (error) {



        console.error(



            `❌ Failed posting news to server ${guildId}:`,



            error



        );



    }



}





/*

==================================================

ANNOUNCE TO ALL SERVERS

==================================================

*/



async function announceNews(



    client,



    newsItems,



    newsDate



) {



    const configs =

        getAllServerConfigs();





    const guildIds =

        Object.keys(configs);





    if (

        guildIds.length === 0

    ) {



        console.log(



            'ℹ️ No servers have configured /setup yet.'



        );



        return;



    }





    console.log(



        `📢 Sending ${newsItems.length} news update(s) to ${guildIds.length} configured server(s)...`



    );





    for (

        const guildId of guildIds

    ) {



        await postNewsToServer(



            client,



            guildId,



            configs[guildId],



            newsItems,



            newsDate



        );



    }



}





/*

==================================================

CHECK NEWS

==================================================

*/



async function checkNews(

    client

) {



    if (checking) {

        return;

    }



    checking = true;





    try {



        const newsData =

            await getNews();





        if (

            !newsData ||

            !newsData.br ||

            !Array.isArray(

                newsData.br.motds

            )

        ) {



            console.log(

                '⚠️ Fortnite news unavailable.'

            );



            return;



        }





        /*

        Only keep visible articles

        that have an ID.

        */



        const currentNews =



            newsData.br.motds



                .filter(



                    item =>

                        !item.hidden &&

                        item.id



                );





        if (

            currentNews.length === 0

        ) {



            console.log(

                '⚠️ No Fortnite news found.'

            );



            return;



        }





        const currentHash =

            newsData.br.hash ||

            null;





        const currentDate =

            newsData.br.date ||

            null;





        const currentFingerprint =

            createNewsFingerprint(

                currentNews

            );





        const previousSnapshot =

            loadSnapshot();





        /*

        ==========================================

        FIRST RUN

        ==========================================

        */



        if (

            !previousSnapshot

        ) {



            saveSnapshot(



                newsData,



                currentNews,



                currentFingerprint



            );





            console.log(



                `📰 Initial news snapshot saved (${currentNews.length} articles).`



            );





            console.log(



                `🕒 News date: ${currentDate || 'unknown'}`



            );





            console.log(



                `🔑 News hash: ${currentHash || 'unknown'}`



            );





            console.log(



                `🧬 News fingerprint: ${currentFingerprint}`



            );





            return;



        }





        /*

        ==========================================

        COMPARE SNAPSHOT

        ==========================================

        */



        const previousFingerprint =

            previousSnapshot.fingerprint ||

            null;





        const previousHash =

            previousSnapshot.hash ||

            null;





        const previousDate =

            previousSnapshot.date ||

            null;





        /*

        ==========================================

        OLD SNAPSHOT COMPATIBILITY

        ==========================================

        */



        if (

            !previousFingerprint

        ) {



            console.log(

                '🔄 Old news snapshot detected.'

            );



            console.log(

                '🧬 Creating new content fingerprint without announcing old news.'

            );



            saveSnapshot(



                newsData,



                currentNews,



                currentFingerprint



            );



            return;



        }





        const fingerprintChanged =

            currentFingerprint !==

            previousFingerprint;





        const hashChanged =

            Boolean(

                currentHash &&

                previousHash &&

                currentHash !==

                previousHash

            );





        const dateChanged =

            Boolean(

                currentDate &&

                previousDate &&

                currentDate !==

                previousDate

            );





        /*

        ==========================================

        NO CHANGE

        ==========================================

        */



        if (

            !fingerprintChanged &&

            !hashChanged &&

            !dateChanged

        ) {



            console.log(

                '📰 News unchanged.'

            );



            return;



        }





        /*

        ==========================================

        CHANGE DETECTED

        ==========================================

        */



        console.log(

            '🚨 NEWS UPDATE DETECTED!'

        );





        if (

            fingerprintChanged

        ) {



            console.log(

                '🧬 Article content fingerprint changed.'

            );



        }





        if (

            hashChanged

        ) {



            console.log(



                `🔑 Hash changed: ${previousHash} → ${currentHash}`



            );



        }





        if (

            dateChanged

        ) {



            console.log(



                `🕒 News date changed: ${previousDate} → ${currentDate}`



            );



        }





        /*

        ==========================================

        FIND EXACT CHANGES

        ==========================================

        */



        const changes =

            getChanges(



                previousSnapshot,



                currentNews



            );





        const newItems = changes
    .filter(change => change.type === 'new')
    .map(change => change.item);

        if (newItems.length === 0) {
            console.log(
                'ℹ️ News metadata changed, but there are no genuinely new articles.'
            );

            saveSnapshot(
                newsData,
                currentNews,
                currentFingerprint
            );

            return;
        }





        if (

            changes.length === 0

        ) {



            console.log(

                'ℹ️ News package changed, but no individual article field changed.'

            );



            /*

            This can happen if Epic changes the

            package metadata while the visible

            articles remain identical.

            */



            saveSnapshot(



                newsData,



                currentNews,



                currentFingerprint



            );



            return;



        }





        for (

            const change of changes

        ) {



            if (

                change.type === 'new'

            ) {



                console.log(



                    `🆕 New news article: ${change.item.title}`



                );



            }





            if (

                change.type === 'updated'

            ) {



                console.log(



                    `✏️ Updated news article: ${change.item.title}`



                );



                console.log(



                    `   Changed: ${change.fields.join(', ')}`



                );



            }



        }





        /*

        ==========================================

        SORT NEWS

        ==========================================

        */



        newItems.sort(



            (a, b) =>



                (

                    b.sortingPriority || 0

                )



                -



                (

                    a.sortingPriority || 0

                )



        );





        console.log(



            `📰 ${newItems.length} article(s) will be announced.`



        );





        /*

        ==========================================

        SAVE SNAPSHOT

        ==========================================

        */



        saveSnapshot(



            newsData,



            currentNews,



            currentFingerprint



        );





                /*
        ==========================================
        AUTOMATIC DISCORD ANNOUNCEMENT DISABLED
        ==========================================

        Official AmyFN announcements are now handled
        through /announcement.

        ==========================================
        */

        // Automatic news announcements disabled.
        // await announceNews(
        //     client,
        //     newItems,
        //     currentDate
        // );





    } catch (error) {



        console.error(



            '❌ News tracker error:',



            error



        );



    } finally {



        checking = false;



    }



}





/*

==================================================

START NEWS TRACKER

==================================================

*/



function startNewsTracker(

    client

) {



    console.log(

        '📰 Starting Fortnite news tracker...'

    );





    /*

    Check immediately.

    */



    checkNews(client);





    /*

    Check every 5 minutes.

    */



    setInterval(



        () => {



            checkNews(client);



        },



        5 * 60 * 1000



    );



}





/*

==================================================

EXPORT

==================================================

*/



module.exports = {

    startNewsTracker

};
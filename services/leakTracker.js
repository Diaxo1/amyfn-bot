const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const {
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    AttachmentBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const {
    getServerConfig,
    getAllServerConfigs
} = require('./serverConfig');

const BRIDGE_PATH = path.join(
    __dirname,
    '..',
    'leak_bridge.py'
);


// ==========================================
// PERSISTENT DATA STORAGE
// ==========================================

const persistentDataFolder = '/data';

const localDataFolder = path.join(
    __dirname,
    '..',
    'data'
);

const dataFolder = fs.existsSync(
    persistentDataFolder
)
    ? persistentDataFolder
    : localDataFolder;

const SNAPSHOT_PATH = path.join(
    dataFolder,
    'leakSnapshot.json'
);

const LEAK_CACHE_PATH = path.join(
    dataFolder,
    'leakCache.json'
);

const OLD_SNAPSHOT_PATH = path.join(
    localDataFolder,
    'leakSnapshot.json'
);

const CHECK_INTERVAL = 60 * 1000;

// Only one leak role ping every 10 minutes globally.
// Leak detection and posting continue normally during the cooldown.
const LEAK_PING_COOLDOWN = 10 * 60 * 1000;
let lastLeakPingAt = 0;


// ==========================================
// DATA FOLDER
// ==========================================

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


// ==========================================
// MIGRATE OLD SNAPSHOT
// ==========================================

function migrateSnapshot() {

    ensureDataFolder();

    if (
        dataFolder === persistentDataFolder &&
        !fs.existsSync(SNAPSHOT_PATH) &&
        fs.existsSync(OLD_SNAPSHOT_PATH)
    ) {

        try {

            fs.copyFileSync(
                OLD_SNAPSHOT_PATH,
                SNAPSHOT_PATH
            );

            console.log(
                '📦 Migrated leak snapshot to persistent storage.'
            );

        } catch (error) {

            console.error(
                '❌ Failed to migrate leak snapshot:',
                error
            );

        }

    }

}


// ==========================================
// LOAD SNAPSHOT
// ==========================================

function loadSnapshot() {

    migrateSnapshot();

    if (!fs.existsSync(SNAPSHOT_PATH)) {

        return {};

    }

    try {

        return JSON.parse(
            fs.readFileSync(
                SNAPSHOT_PATH,
                'utf8'
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to load leak snapshot:',
            error
        );

        return {};

    }

}


// ==========================================
// SAVE SNAPSHOT
// ==========================================

function saveSnapshot(snapshot) {

    ensureDataFolder();

    try {

        fs.writeFileSync(
            SNAPSHOT_PATH,
            JSON.stringify(
                snapshot,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to save leak snapshot:',
            error
        );

    }

}

// ==========================================
// SAVE LEAK CACHE
// ==========================================

function saveLeakCache(tweets) {

    ensureDataFolder();

    try {

        fs.writeFileSync(
            LEAK_CACHE_PATH,
            JSON.stringify(
                tweets,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            '❌ Failed to save leak cache:',
            error
        );

    }

}

// ==========================================
// GET CACHED LEAKS
// ==========================================

function getCachedLeaks() {

    if (!fs.existsSync(LEAK_CACHE_PATH)) {
        return [];
    }

    try {

        const leaks =
            JSON.parse(
                fs.readFileSync(
                    LEAK_CACHE_PATH,
                    'utf8'
                )
            );

        return Array.isArray(leaks)
            ? leaks
            : [];

    } catch (error) {

        console.error(
            '❌ Failed to load leak cache:',
            error
        );

        return [];

    }

}

// ==========================================
// PYTHON BRIDGE
// ==========================================

function runPythonBridge(manual = false) {

    return new Promise(
        (resolve, reject) => {

            const pythonCommand =
                process.platform === 'win32'
                    ? 'python'
                    : 'python3';

            const python =
                spawn(
                    pythonCommand,
                    [
    BRIDGE_PATH,
    ...(manual ? ['manual'] : [])
],
                    {
                        windowsHide: true
                    }
                );

            let stdout = '';
            let stderr = '';

            python.stdout.on(
                'data',
                data => {

                    stdout +=
                        data.toString();

                }
            );

            python.stderr.on(
                'data',
                data => {

                    stderr +=
                        data.toString();

                }
            );

            python.on(
                'error',
                error => {

                    reject(error);

                }
            );

            python.on(
                'close',
                code => {

                    if (stderr.trim()) {

                        console.log(
                            '🐍 Leak bridge stderr:',
                            stderr.trim()
                        );

                    }

                    if (code !== 0) {

                        reject(
                            new Error(
                                stderr ||
                                `Python exited with code ${code}`
                            )
                        );

                        return;

                    }

                    try {

                        const tweets =
                            JSON.parse(
                                stdout
                            );

                        resolve(tweets);

                    } catch (error) {

                        console.error(
                            '❌ Python bridge output:',
                            stdout
                        );

                        reject(error);

                    }

                }
            );

        }
    );

}


// ==========================================
// CREATE LEAK V2 CONTAINER
// ==========================================

function createLeakContainer(tweet, client, options = {}) {

    const logo =
        client?.user
            ? client.user.displayAvatarURL({
                extension: 'png',
                size: 256
            })
            : null;

    const separator = () =>
        new SeparatorBuilder()
            .setDivider(true)
            .setSpacing(
                SeparatorSpacingSize.Small
            );

    const author =
        tweet.displayName ||
        tweet.username ||
        'Unknown Leaker';

    const username =
        tweet.username
            ? `(@${tweet.username})`
            : '';

    const decodeText = text =>
        String(text || '*No tweet text*')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/gi, "'")
            .replace(/&nbsp;/g, ' ');

    const tweetText =
        decodeText(tweet.text);

    const tweetLink =
        tweet.url ||
        'https://x.com';

    const header =
        new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        '# __Fortnite Leak__'
                    ),

                new TextDisplayBuilder()
                    .setContent(
                        `**${author} ${username}**\n\n` +
                        tweetText
                    )
            );

    if (logo) {
        header.setThumbnailAccessory(
            thumbnail =>
                thumbnail
                    .setURL(logo)
                    .setDescription('Amyfn logo')
        );
    }

    const container =
        new ContainerBuilder()
            .setAccentColor(0x1493ff)
            .addSectionComponents(header);

    // Put the configured role mention INSIDE the V2 message.
    // Components V2 messages cannot use legacy `content`.
    if (options.roleMention) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(options.roleMention)
        );
    }

    // Tweet images are attached to the same Discord message and
    // rendered inside the V2 container using attachment:// URLs.
    const imageNames =
        Array.isArray(options.imageNames)
            ? options.imageNames.filter(Boolean)
            : [];

    if (imageNames.length) {

        container
            .addSeparatorComponents(separator());

        const gallery =
            new MediaGalleryBuilder();

        for (const filename of imageNames.slice(0, 10)) {

            gallery.addItems(
                new MediaGalleryItemBuilder()
                    .setURL(
                        `attachment://${filename}`
                    )
            );
        }

        container.addMediaGalleryComponents(
            gallery
        );
    }

    // If a video could not be uploaded, keep its X link inside the panel.
    if (options.videoFallbackUrl) {

        container
            .addSeparatorComponents(separator())
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `🎥 **[Watch Video on X](${options.videoFallbackUrl})**`
                    )
            );
    }

    container
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    `🔗 **[View Original Post](${tweetLink})**`
                )
        )
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    '-# AMYFN • FORTNITE LEAK TRACKER'
                )
        );

    return container;
}

// ==========================================
// LEGACY LEAK EMBED
// ==========================================
//
// Kept so existing code/imports do not break.
// New automatic leak posts use createLeakContainer().

function createLeakEmbed(tweet) {

    const {
        EmbedBuilder
    } = require('discord.js');

    const embed =
        new EmbedBuilder()
            .setColor(0x1493ff)
            .setAuthor({
                name:
                    `${tweet.displayName} (@${tweet.username})`,
                url:
                    tweet.url
            })
            .setTitle(
                'Fortnite Leak'
            )
            .setDescription(
                tweet.text ||
                '*No tweet text*'
            )
            .setURL(
                tweet.url
            )
            .setFooter({
                text:
                    'AMYFN • FORTNITE LEAK TRACKER'
            })
            .setTimestamp(
                new Date(
                    tweet.date
                )
            );

    if (
        tweet.images &&
        tweet.images.length > 0
    ) {
        embed.setImage(
            tweet.images[0]
        );
    }

    return embed;
}


// ==========================================
// DOWNLOAD VIDEO FOR DISCORD
// ==========================================
//
// X's video.twimg.com URLs are valid MP4 files, but Discord
// does not reliably render them as an inline video when they
// are posted as a plain URL.
//
// We download the MP4 and upload it as a Discord attachment.
// This gives Discord a real video attachment to render.
//
// Keep the limit below the common 10 MB upload limit.
// If a video is too large, we fall back to the direct X URL
// instead of crashing the leak tracker.
// ==========================================

const MAX_DISCORD_VIDEO_SIZE = 9.5 * 1024 * 1024;
const VIDEO_DOWNLOAD_TIMEOUT = 25 * 1000;

async function downloadVideoForDiscord(videoUrl) {

    if (!videoUrl) {
        return null;
    }

    if (typeof fetch !== 'function') {
        console.error(
            '❌ Global fetch is unavailable. Cannot download leak video.'
        );
        return null;
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, VIDEO_DOWNLOAD_TIMEOUT);

    try {

        console.log(
            '🎥 Downloading leak video for Discord...'
        );

        const response = await fetch(
            videoUrl,
            {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36'
                }
            }
        );

        if (!response.ok) {

            console.error(
                `❌ Video download failed: HTTP ${response.status}`
            );

            return null;
        }

        const contentType =
            String(
                response.headers.get('content-type') || ''
            ).toLowerCase();

        const contentLengthHeader =
            response.headers.get('content-length');

        const contentLength =
            contentLengthHeader
                ? Number(contentLengthHeader)
                : 0;

        if (
            contentLength &&
            contentLength > MAX_DISCORD_VIDEO_SIZE
        ) {

            console.log(
                `⚠️ Leak video is too large for Discord: ` +
                `${(contentLength / 1024 / 1024).toFixed(2)} MB`
            );

            return null;
        }

        if (!response.body) {

            console.error(
                '❌ Video response has no readable body.'
            );

            return null;
        }

        const chunks = [];
        let totalSize = 0;

        // Node.js fetch exposes a Web ReadableStream.
        // Reading it chunk-by-chunk keeps us from blindly
        // loading an oversized X video into memory.
        const reader = response.body.getReader();

        try {

            while (true) {

                const {
                    done,
                    value
                } = await reader.read();

                if (done) {
                    break;
                }

                if (!value) {
                    continue;
                }

                totalSize += value.byteLength;

                if (
                    totalSize >
                    MAX_DISCORD_VIDEO_SIZE
                ) {

                    console.log(
                        `⚠️ Leak video exceeded Discord size limit ` +
                        `(${(totalSize / 1024 / 1024).toFixed(2)} MB). ` +
                        'Falling back to X URL.'
                    );

                    try {
                        await reader.cancel();
                    } catch (_) {}

                    return null;
                }

                chunks.push(
                    Buffer.from(value)
                );
            }

        } finally {

            try {
                reader.releaseLock();
            } catch (_) {}

        }

        if (!chunks.length) {

            console.error(
                '❌ Downloaded leak video is empty.'
            );

            return null;
        }

        const buffer =
            Buffer.concat(chunks);

        const extension =
            contentType.includes('webm')
                ? 'webm'
                : 'mp4';

        console.log(
            `✅ Leak video downloaded: ` +
            `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
        );

        return {
            buffer,
            extension
        };

    } catch (error) {

        if (error && error.name === 'AbortError') {

            console.error(
                '⏱️ Leak video download timed out.'
            );

        } else {

            console.error(
                '❌ Leak video download error:',
                error
            );

        }

        return null;

    } finally {

        clearTimeout(timeout);

    }

}


// ==========================================
// SEND LEAK TO ONE GUILD
// ==========================================

async function sendLeakToGuild(
    client,
    guildId,
    tweet,
    pingRole = true
) {

    const config =
        getServerConfig(
            guildId
        );

    if (
        !config ||
        !config.updatesChannelId
    ) {
        return false;
    }

    try {

        const channel =
            await client.channels.fetch(
                config.updatesChannelId
            );

        if (
            !channel ||
            !channel.isTextBased()
        ) {
            return false;
        }

        // ==========================================
        // ROLE MENTION
        // ==========================================

        const roleMention =
            pingRole &&
            config.updatesRoleId
                ? `<@&${config.updatesRoleId}>`
                : undefined;

        // ==========================================
        // DOWNLOAD TWEET IMAGES
        // ==========================================

        const imageUrls =
            Array.isArray(tweet.images)
                ? tweet.images
                    .filter(Boolean)
                    .slice(0, 10)
                : [];

        const imageAttachments = [];
        const imageNames = [];

        for (
            let i = 0;
            i < imageUrls.length;
            i++
        ) {

            try {

                const imageResponse =
                    await fetch(
                        imageUrls[i],
                        {
                            method: 'GET',
                            redirect: 'follow',
                            headers: {
                                'User-Agent':
                                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36'
                            }
                        }
                    );

                if (!imageResponse.ok) {
                    throw new Error(
                        `HTTP ${imageResponse.status}`
                    );
                }

                const imageBuffer =
                    Buffer.from(
                        await imageResponse.arrayBuffer()
                    );

                if (!imageBuffer.length) {
                    throw new Error(
                        'Empty image response'
                    );
                }

                const filename =
                    `fortnite-leak-${tweet.id}-image-${i + 1}.jpg`;

                imageAttachments.push(
                    new AttachmentBuilder(
                        imageBuffer
                    ).setName(filename)
                );

                imageNames.push(filename);

            } catch (error) {

                console.error(
                    `⚠️ Failed to download leak image ${i + 1} for tweet ${tweet.id}:`,
                    error.message
                );

            }
        }

        // ==========================================
        // VIDEO
        // ==========================================

        const videoUrl =
            tweet.videos &&
            tweet.videos.length > 0
                ? tweet.videos[0]
                : undefined;

        let videoAttachment = null;

        if (videoUrl) {

            const downloadedVideo =
                await downloadVideoForDiscord(
                    videoUrl
                );

            if (downloadedVideo) {

                videoAttachment =
                    new AttachmentBuilder(
                        downloadedVideo.buffer,
                        {
                            name:
                                `fortnite-leak-${tweet.id}.${downloadedVideo.extension}`
                        }
                    );

                console.log(
                    `🎬 Prepared Discord video attachment ` +
                    `for tweet ${tweet.id}`
                );

            } else {

                console.log(
                    `🔗 Using X video URL fallback for tweet ${tweet.id}`
                );

            }
        }

        // ==========================================
        // CREATE V2 PANEL
        // ==========================================

        const container =
            createLeakContainer(
                tweet,
                client,
                {
                    roleMention,
                    imageNames,
                    videoFallbackUrl:
                        videoAttachment
                            ? undefined
                            : videoUrl
                }
            );

        // ==========================================
        // SEND LEAK
        // ==========================================

        const messagePayload = {
            components: [
                container
            ],

            flags:
                MessageFlags.IsComponentsV2,

            allowedMentions:
                config.updatesRoleId
                    ? {
                        roles: pingRole
                            ? [config.updatesRoleId]
                            : []
                    }
                    : {
                        roles: []
                    }
        };

        if (imageAttachments.length) {
            messagePayload.files =
                imageAttachments;
        }

        if (videoAttachment) {

            if (!messagePayload.files) {
                messagePayload.files = [];
            }

            messagePayload.files.push(
                videoAttachment
            );
        }

        await channel.send(
            messagePayload
        );

        return true;

    } catch (error) {

        console.error(
            `❌ Failed to send leak to guild ${guildId}:`,
            error
        );

        return false;
    }
}

// ==========================================
// ANNOUNCE LEAK TO ALL SERVERS
// ==========================================

async function announceLeak(
    client,
    tweet
) {

    const configs =
        getAllServerConfigs();

    // The scraper still detects and sends every leak.
    // This only controls whether the configured role gets pinged.
    const now = Date.now();
    const shouldPing = now - lastLeakPingAt >= LEAK_PING_COOLDOWN;

    if (shouldPing) {
        lastLeakPingAt = now;
    }

    for (
        const guildId of Object.keys(
            configs
        )
    ) {

        try {

            await sendLeakToGuild(
                client,
                guildId,
                tweet,
                shouldPing
            );

        } catch (error) {

            console.error(
                `❌ Leak send failed (${guildId}):`,
                error
            );

        }

    }

}


// ==========================================
// CHECK FOR LEAKS
// ==========================================

async function checkForLeaks(
    client
) {

    try {

        console.log(
            '🕵️ Checking Fortnite leaks...'
        );

        const tweets =
            await runPythonBridge();

        if (
            !Array.isArray(tweets)
        ) {

            console.error(
                '❌ Leak bridge did not return an array.'
            );

            return;

        }

        const snapshot =
            loadSnapshot();
        
        saveLeakCache(tweets);    

        console.log(
            '🧪 Leak debug latest tweets:',
            tweets.slice(0, 10).map(tweet => ({
                id: tweet.id,
                username: tweet.username,
                date: tweet.date,
                seen: !!snapshot[tweet.id]
            }))
        );

        // ==================================
        // FIRST RUN
        // ==================================

        if (
            !snapshot.initialized
        ) {

            tweets.forEach(
                tweet => {

                    snapshot[
                        tweet.id
                    ] = true;

                }
            );

            snapshot.initialized =
                true;

            saveSnapshot(
                snapshot
            );

            console.log(
                `📸 Leak baseline saved (${tweets.length} tweets).`
            );

            return;

        }

        // ==================================
        // FIND NEW LEAKS
        // ==================================

        const newTweets =
            tweets

                .filter(
                    tweet =>
                        !snapshot[
                            tweet.id
                        ]
                )

                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );

        if (
            newTweets.length === 0
        ) {

            console.log(
                '🕵️ No new leaks.'
            );

            return;

        }

        console.log(
            `🚨 Found ${newTweets.length} new leak(s)!`
        );

        // ==================================
        // SEND NEW LEAKS
        // ==================================

        for (
            const tweet of newTweets
        ) {

            await announceLeak(
                client,
                tweet
            );

            snapshot[
                tweet.id
            ] = true;

        }

        // ==================================
        // LIMIT SNAPSHOT
        // ==================================

        const ids =
            Object.keys(
                snapshot
            )

                .filter(
                    id =>
                        id !== 'initialized'
                )

                .slice(-500);

        const cleanedSnapshot = {
            initialized: true
        };

        ids.forEach(
            id => {

                cleanedSnapshot[
                    id
                ] = true;

            }
        );

        saveSnapshot(
            cleanedSnapshot
        );

    } catch (error) {

        console.error(
            '❌ Leak tracker error:',
            error
        );

    }

}


// ==========================================
// START LEAK TRACKER
// ==========================================

function startLeakTracker(
    client
) {

    console.log(
        '🕵️ Starting Fortnite leak tracker...'
    );

    checkForLeaks(
        client
    );

    setInterval(
        () =>
            checkForLeaks(
                client
            ),
        CHECK_INTERVAL
    );

}


// ==========================================
// GET LATEST LEAKS
// ==========================================

async function getLatestLeaks() {

    return await runPythonBridge(true);

}

// ==========================================
// GET LEAK TRACKER STATUS
// ==========================================

function getLeakStatus() {

    const snapshot =
        loadSnapshot();

    const tracked =
        Object.keys(
            snapshot
        )

            .filter(
                id =>
                    id !== 'initialized'
            )

            .length;

    return {

        active:
            true,

        interval:
            60,

        lastCheck:
            null,

        tracked

    };

}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

    startLeakTracker,

    getLatestLeaks,

    getCachedLeaks,

    getLeakStatus,

    createLeakContainer,
    createLeakEmbed,

    sendLeakToGuild

};
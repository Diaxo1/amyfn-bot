const sharp = require('sharp');

const WIDTH = 1600;
const HEIGHT = 900;

const BACKGROUND_PATH = require('path').join(
    __dirname,
    '../assets/account-background.jpg'
);

// ==========================================
// HELPERS
// ==========================================

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatNumber(value) {
    const number = Number(value || 0);
    return number.toLocaleString();
}

function formatStat(value) {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return 'N/A';
    }

    return value;
}

function getWinRate(stats) {
    if (
        stats.winRate !== undefined &&
        stats.winRate !== null
    ) {
        return `${stats.winRate}%`;
    }

    const matches = Number(stats.matches || 0);
    const wins = Number(stats.wins || 0);

    if (!matches) {
        return '0.00%';
    }

    return `${((wins / matches) * 100).toFixed(2)}%`;
}

// ==========================================
// DOWNLOAD PROFILE IMAGE
// ==========================================

async function downloadImage(url) {
    if (!url) {
        return null;
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return null;
        }

        const buffer = Buffer.from(
            await response.arrayBuffer()
        );

        return await sharp(buffer)
            .resize(190, 190, {
                fit: 'cover'
            })
            .png()
            .toBuffer();

    } catch (error) {
        console.error(
            '⚠️ Could not download Fortnite profile image:',
            error.message
        );

        return null;
    }
}

// ==========================================
// CREATE SVG
// ==========================================

function createSvg({
    account,
    seasonStats,
    lifetimeStats,
    battlePassLevel
}) {
    const name = escapeXml(
        account.name || 'Unknown Player'
    );

    const level = escapeXml(
        battlePassLevel ?? 'N/A'
    );

    return `
<svg
    width="${WIDTH}"
    height="${HEIGHT}"
    xmlns="http://www.w3.org/2000/svg"
>

    <defs>

        <linearGradient
            id="panel"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
        >
            <stop
                offset="0%"
                stop-color="#06152b"
                stop-opacity="0.94"
            />

            <stop
                offset="100%"
                stop-color="#020914"
                stop-opacity="0.90"
            />
        </linearGradient>

        <linearGradient
            id="blue"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
        >
            <stop
                offset="0%"
                stop-color="#24a9ff"
            />

            <stop
                offset="100%"
                stop-color="#54e6ff"
            />
        </linearGradient>

        <filter
            id="shadow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
        >
            <feDropShadow
                dx="0"
                dy="10"
                stdDeviation="18"
                flood-color="#000000"
                flood-opacity="0.55"
            />
        </filter>

    </defs>

    <!-- Dark overlay -->
    <rect
        x="0"
        y="0"
        width="${WIDTH}"
        height="${HEIGHT}"
        fill="#001126"
        opacity="0.18"
    />

    <!-- Main glass panel -->
    <rect
        x="105"
        y="70"
        width="1390"
        height="760"
        rx="34"
        fill="url(#panel)"
        stroke="#219cff"
        stroke-opacity="0.75"
        stroke-width="3"
        filter="url(#shadow)"
    />

    <!-- Accent line -->
    <rect
        x="105"
        y="70"
        width="8"
        height="760"
        rx="4"
        fill="url(#blue)"
    />

    <!-- Header -->
    <text
        x="170"
        y="145"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="25"
        font-weight="600"
        letter-spacing="5"
        fill="#79dfff"
    >
        AMYFN • FORTNITE ACCOUNT
    </text>

    <text
        x="170"
        y="215"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="58"
        font-weight="700"
        fill="#ffffff"
    >
        ${name}
    </text>

    <text
        x="170"
        y="255"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="23"
        letter-spacing="2"
        fill="#a9c6df"
    >
        PLAYER PROFILE
    </text>

    <!-- Level pill -->
    <rect
        x="1210"
        y="130"
        width="215"
        height="62"
        rx="31"
        fill="#0b5fa7"
        fill-opacity="0.75"
        stroke="#35baff"
        stroke-width="2"
    />

    <text
        x="1317"
        y="171"
        text-anchor="middle"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="24"
        font-weight="700"
        fill="#ffffff"
    >
        LEVEL ${level}
    </text>

    <!-- Divider -->
    <line
        x1="170"
        y1="290"
        x2="1430"
        y2="290"
        stroke="#55cfff"
        stroke-opacity="0.22"
        stroke-width="2"
    />

    <!-- THIS SEASON -->
    <rect
        x="170"
        y="330"
        width="590"
        height="300"
        rx="25"
        fill="#041426"
        fill-opacity="0.78"
        stroke="#168ed7"
        stroke-opacity="0.6"
        stroke-width="2"
    />

    <text
        x="205"
        y="375"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="25"
        font-weight="700"
        letter-spacing="2"
        fill="#ffffff"
    >
        THIS SEASON
    </text>

    <line
        x1="205"
        y1="395"
        x2="725"
        y2="395"
        stroke="#219cff"
        stroke-opacity="0.35"
    />

    <!-- Season stats -->
    <text
        x="210"
        y="455"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${formatNumber(seasonStats.wins)}
    </text>

    <text
        x="210"
        y="485"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        WINS
    </text>

    <text
        x="470"
        y="455"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${formatNumber(seasonStats.matches)}
    </text>

    <text
        x="470"
        y="485"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        MATCHES
    </text>

    <text
        x="210"
        y="555"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${formatStat(seasonStats['k/d'])}
    </text>

    <text
        x="210"
        y="585"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        K/D RATIO
    </text>

    <text
        x="470"
        y="555"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${getWinRate(seasonStats)}
    </text>

    <text
        x="470"
        y="585"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        WIN RATE
    </text>

    <!-- LIFETIME -->
    <rect
        x="800"
        y="330"
        width="590"
        height="300"
        rx="25"
        fill="#041426"
        fill-opacity="0.78"
        stroke="#168ed7"
        stroke-opacity="0.6"
        stroke-width="2"
    />

    <text
        x="835"
        y="375"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="25"
        font-weight="700"
        letter-spacing="2"
        fill="#ffffff"
    >
        LIFETIME STATS
    </text>

    <line
        x1="835"
        y1="395"
        x2="1355"
        y2="395"
        stroke="#219cff"
        stroke-opacity="0.35"
    />

    <text
        x="840"
        y="455"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${formatNumber(lifetimeStats.wins)}
    </text>

    <text
        x="840"
        y="485"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        WINS
    </text>

    <text
        x="1100"
        y="455"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${formatNumber(lifetimeStats.matches)}
    </text>

    <text
        x="1100"
        y="485"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        MATCHES
    </text>

    <text
        x="840"
        y="555"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${formatStat(lifetimeStats['k/d'])}
    </text>

    <text
        x="840"
        y="585"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        K/D RATIO
    </text>

    <text
        x="1100"
        y="555"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="40"
        font-weight="700"
        fill="#ffffff"
    >
        ${getWinRate(lifetimeStats)}
    </text>

    <text
        x="1100"
        y="585"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="18"
        fill="#91aac2"
    >
        WIN RATE
    </text>

    <!-- Battle Pass -->
    <rect
        x="170"
        y="665"
        width="1220"
        height="95"
        rx="22"
        fill="#061a30"
        fill-opacity="0.82"
        stroke="#168ed7"
        stroke-opacity="0.5"
        stroke-width="2"
    />

    <text
        x="205"
        y="710"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="21"
        font-weight="700"
        letter-spacing="2"
        fill="#7bdcff"
    >
        BATTLE PASS
    </text>

    <text
        x="205"
        y="742"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="24"
        font-weight="700"
        fill="#ffffff"
    >
        LEVEL ${level}
    </text>

    <text
        x="600"
        y="730"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="19"
        fill="#9db7ce"
    >
        Fortnite Battle Royale
    </text>

    <!-- Footer -->
    <text
        x="170"
        y="805"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="17"
        letter-spacing="3"
        fill="#79dfff"
    >
        SEARCH • TRACK • EXPLORE
    </text>

    <text
        x="1430"
        y="805"
        text-anchor="end"
        font-family="Arial, DejaVu Sans, sans-serif"
        font-size="17"
        letter-spacing="2"
        fill="#7895ad"
    >
        AMYFN
    </text>

</svg>
`;
}

// ==========================================
// CREATE ACCOUNT CARD
// ==========================================

async function createAccountCard({
    account,
    seasonStats,
    lifetimeStats,
    battlePassLevel,
    profileImage
}) {
    const svg = createSvg({
        account,
        seasonStats,
        lifetimeStats,
        battlePassLevel
    });

    const baseImage = await sharp(BACKGROUND_PATH)
        .resize(WIDTH, HEIGHT, {
            fit: 'cover'
        })
        .composite([
            {
                input: Buffer.from(svg),
                top: 0,
                left: 0
            }
        ]);

    const profileBuffer =
        await downloadImage(profileImage);

    if (profileBuffer) {
        return await baseImage
            .composite([
                {
                    input: profileBuffer,
                    top: 115,
                    left: 1010
                }
            ])
            .png()
            .toBuffer();
    }

    return await baseImage
        .png()
        .toBuffer();
}

module.exports = {
    createAccountCard
};
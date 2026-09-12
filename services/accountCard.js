const sharp = require('sharp');
const WIDTH = 1600;
const HEIGHT = 1100;


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
    return Number.isFinite(number) ? number.toLocaleString() : '0';
}

function getValue(stats, ...keys) {
    for (const key of keys) {
        if (
            stats?.[key] !== undefined &&
            stats?.[key] !== null &&
            stats?.[key] !== ''
        ) {
            return stats[key];
        }
    }

    return 0;
}

function getWinRate(stats) {
    const direct = getValue(stats, 'winRate', 'winrate');

    if (direct !== 0) {
        const number = Number(direct);

        return Number.isFinite(number)
            ? `${number.toFixed(2).replace(/\.00$/, '')}%`
            : `${escapeXml(direct)}%`;
    }

    const matches = Number(getValue(stats, 'matches')) || 0;
    const wins = Number(getValue(stats, 'wins')) || 0;

    if (!matches) return '0%';

    return `${((wins / matches) * 100).toFixed(2)}%`;
}

function getKd(stats) {
    const kd = getValue(stats, 'k/d', 'kd');

    if (kd !== 0) return escapeXml(kd);

    const kills = Number(getValue(stats, 'kills')) || 0;
    const deaths = Number(getValue(stats, 'deaths')) || 0;

    if (!deaths) return kills ? formatNumber(kills) : '0';

    return (kills / deaths).toFixed(2);
}

function getMode(stats, ...names) {
    for (const name of names) {
        if (stats?.[name]) return stats[name];
    }

    return {};
}

function getTopPlacement(stats, mode) {
    const candidates = {
        solo: ['top25', 'top25s'],
        duo: ['top12', 'top12s'],
        squad: ['top6', 'top6s'],
        ltm: ['top3', 'top5', 'top10', 'top25']
    }[mode] || [];

    for (const key of candidates) {
        if (stats?.[key] !== undefined && stats?.[key] !== null) {
            return formatNumber(stats[key]);
        }
    }

    return '0';
}

function formatPlaytime(stats) {
    const minutes =
        Number(getValue(stats, 'minutesPlayed', 'minutes', 'timePlayed')) || 0;

    if (!minutes) return '0 Min';

    const totalMinutes = Math.floor(minutes);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const mins = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;

    return `${mins}m`;
}

function formatUpdatedDate() {
    const now = new Date();

    return now.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function drawStatColumn({ x, y, label, value, valueSize = 30 }) {
    return `
        <text x="${x}" y="${y}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="16" font-weight="500" fill="#aeb8c8">
            ${escapeXml(label)}
        </text>
        <text x="${x}" y="${y + 38}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${valueSize}" font-weight="800" fill="#ffffff">
            ${escapeXml(value)}
        </text>
    `;
}

function drawModeCard({
    x,
    y,
    width,
    height,
    title,
    stats,
    mode,
    accent
}) {
    const innerX = x + 32;
    const colWidth = (width - 64) / 3;
    const row1 = y + 88;
    const row2 = y + 172;

    const values = [
        ['Matches', formatNumber(getValue(stats, 'matches'))],
        ['Wins', formatNumber(getValue(stats, 'wins'))],
        ['Win Rate', getWinRate(stats)],
        [`Top ${mode === 'solo' ? '25' : mode === 'duo' ? '12' : '6'}`, getTopPlacement(stats, mode)],
        ['Eliminations', formatNumber(getValue(stats, 'kills', 'eliminations'))],
        ['K/D', getKd(stats)]
    ];

    let svg = `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22"
            fill="#090e18" fill-opacity="0.86"
            stroke="#ffffff" stroke-opacity="0.10" stroke-width="2"/>

        <rect x="${x}" y="${y}" width="5" height="${height}" rx="2.5"
            fill="${accent}"/>

        <text x="${innerX}" y="${y + 46}"
            font-family="Arial Black, Arial, sans-serif"
            font-size="29" font-weight="900" letter-spacing="1"
            fill="#ffffff">
            ${escapeXml(title)}
        </text>

        <line x1="${innerX}" y1="${y + 61}"
            x2="${x + width - 32}" y2="${y + 61}"
            stroke="#ffffff" stroke-opacity="0.08"/>
    `;

    values.forEach(([label, value], index) => {
        const row = index < 3 ? row1 : row2;
        const column = index % 3;

        svg += drawStatColumn({
            x: innerX + column * colWidth,
            y: row,
            label,
            value
        });
    });

    return svg;
}

function drawSummaryCard({ x, y, width, height, overall, battlePassLevel, time }) {
    const title = time === 'overall' ? 'OVERALL STATS' : 'CURRENT SEASON';
    const subtitle = time === 'overall' ? 'LIFETIME' : 'SEASON';

    return `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22"
            fill="#17132a" fill-opacity="0.92"
            stroke="#b66cff" stroke-opacity="0.38" stroke-width="2"/>

        <text x="${x + 32}" y="${y + 49}"
            font-family="Arial Black, Arial, sans-serif"
            font-size="31" font-weight="900" letter-spacing="1"
            fill="#ffffff">
            ${title}
        </text>

        <text x="${x + width - 32}" y="${y + 45}" text-anchor="end"
            font-family="Arial, Helvetica, sans-serif"
            font-size="15" font-weight="800" letter-spacing="2"
            fill="#d36aff">
            ${subtitle}
        </text>

        ${drawStatColumn({
            x: x + 32,
            y: y + 91,
            label: 'Matches',
            value: formatNumber(getValue(overall, 'matches'))
        })}

        ${drawStatColumn({
            x: x + 205,
            y: y + 91,
            label: 'Wins',
            value: formatNumber(getValue(overall, 'wins'))
        })}

        ${drawStatColumn({
            x: x + 378,
            y: y + 91,
            label: 'Win Rate',
            value: getWinRate(overall)
        })}

        ${drawStatColumn({
            x: x + 32,
            y: y + 171,
            label: 'Eliminations',
            value: formatNumber(getValue(overall, 'kills', 'eliminations'))
        })}

        ${drawStatColumn({
            x: x + 205,
            y: y + 171,
            label: 'K/D',
            value: getKd(overall)
        })}

        ${drawStatColumn({
            x: x + 378,
            y: y + 171,
            label: 'Playtime',
            value: formatPlaytime(overall),
            valueSize: 24
        })}

        <line x1="${x + 32}" y1="${y + 238}"
            x2="${x + width - 32}" y2="${y + 238}"
            stroke="#ffffff" stroke-opacity="0.09"/>

        <text x="${x + 32}" y="${y + 270}"
            font-family="Arial, Helvetica, sans-serif"
            font-size="15" fill="#aeb8c8">
            Battle Pass
        </text>

        <text x="${x + 147}" y="${y + 270}"
            font-family="Arial Black, Arial, sans-serif"
            font-size="23" font-weight="900" fill="#ffffff">
            ${escapeXml(battlePassLevel)}
        </text>

        <rect x="${x + 205}" y="${y + 258}" width="${width - 237}" height="10" rx="5"
            fill="#ffffff" fill-opacity="0.12"/>

        <rect x="${x + 205}" y="${y + 258}" width="${Math.max(20, width - 300)}" height="10" rx="5"
            fill="url(#accent)"/>
    `;
}

function drawLtmCard({ x, y, width, height, stats }) {
    const innerX = x + 32;
    const colWidth = (width - 64) / 5;

    const fields = [
        ['Matches', formatNumber(getValue(stats, 'matches'))],
        ['Wins', formatNumber(getValue(stats, 'wins'))],
        ['Win Rate', getWinRate(stats)],
        ['Eliminations', formatNumber(getValue(stats, 'kills', 'eliminations'))],
        ['K/D', getKd(stats)]
    ];

    let svg = `
        <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22"
            fill="#090e18" fill-opacity="0.88"
            stroke="#ffffff" stroke-opacity="0.10" stroke-width="2"/>

        <rect x="${x}" y="${y}" width="5" height="${height}" rx="2.5"
            fill="#9b62ff"/>

        <text x="${innerX}" y="${y + 43}"
            font-family="Arial Black, Arial, sans-serif"
            font-size="27" font-weight="900" letter-spacing="1"
            fill="#ffffff">
            TRIO / LTM
        </text>
    `;

    fields.forEach(([label, value], index) => {
        const px = innerX + index * colWidth;

        svg += drawStatColumn({
            x: px,
            y: y + 88,
            label,
            value
        });
    });

    return svg;
}

// ==========================================
// CREATE SVG
// ==========================================

function createSvg({
    account,
    stats,
    battlePassLevel,
    time,
    profileImageData
}) {
    const name = escapeXml(account?.name || 'Unknown Player');

    const overall = getMode(stats, 'overall');
    const solo = getMode(stats, 'solo');
    const duo = getMode(stats, 'duo');
    const squad = getMode(stats, 'squad', 'squads');
    const ltm = getMode(stats, 'ltm', 'trio', 'trios');

    const profileMarkup = profileImageData
        ? `
            <defs>
                <clipPath id="profileClip">
                    <circle cx="117" cy="123" r="48"/>
                </clipPath>
            </defs>
            <circle cx="117" cy="123" r="52"
                fill="#0b1019" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"/>
            <image
                href="${profileImageData}"
                x="69" y="75" width="96" height="96"
                preserveAspectRatio="xMidYMid slice"
                clip-path="url(#profileClip)"/>
        `
        : `
            <circle cx="117" cy="123" r="48"
                fill="#101725" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
        `;

    return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink">

    <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0e1622" stop-opacity="0.94"/>
            <stop offset="100%" stop-color="#070a11" stop-opacity="0.96"/>
        </linearGradient>

        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#21b9ff"/>
            <stop offset="50%" stop-color="#7d6bff"/>
            <stop offset="100%" stop-color="#ef4b9b"/>
        </linearGradient>

        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="18"
                flood-color="#000000" flood-opacity="0.55"/>
        </filter>
    </defs>

    <rect x="42" y="38" width="1516" height="1024" rx="30"
        fill="url(#glass)"
        stroke="#ffffff" stroke-opacity="0.13" stroke-width="2"
        filter="url(#shadow)"/>

    <rect x="42" y="38" width="7" height="1024" rx="3.5"
        fill="url(#accent)"/>

    <!-- Header -->
    ${profileMarkup}

    <text x="180" y="117"
        font-family="Arial Black, Arial, sans-serif"
        font-size="51" font-weight="900"
        fill="#ffffff">
        ${name}
    </text>

    <text x="180" y="151"
        font-family="Arial, Helvetica, sans-serif"
        font-size="17" fill="#aeb8c8">
        Last updated ${formatUpdatedDate()}
    </text>

    <text x="180" y="190"
        font-family="Arial, Helvetica, sans-serif"
        font-size="14" font-weight="800"
        letter-spacing="4" fill="#55cfff">
        BATTLE ROYALE STATS
    </text>

    <!-- Summary -->
    ${drawSummaryCard({
        x: 875,
        y: 70,
        width: 625,
        height: 285,
        overall,
        battlePassLevel,
        time
    })}

    <!-- Mode cards: clean three-column grid -->
    ${drawModeCard({
        x: 86,
        y: 390,
        width: 450,
        height: 240,
        title: 'SOLO',
        stats: solo,
        mode: 'solo',
        accent: '#24b8ff'
    })}

    ${drawModeCard({
        x: 565,
        y: 390,
        width: 450,
        height: 240,
        title: 'DUO',
        stats: duo,
        mode: 'duo',
        accent: '#7d6bff'
    })}

    ${drawModeCard({
        x: 1044,
        y: 390,
        width: 456,
        height: 240,
        title: 'SQUAD',
        stats: squad,
        mode: 'squad',
        accent: '#ef4b9b'
    })}

    <!-- Lower information strip -->
    ${drawLtmCard({
        x: 86,
        y: 665,
        width: 1414,
        height: 150,
        stats: ltm
    })}

    <rect x="86" y="845" width="1414" height="120" rx="22"
        fill="#0b111b" fill-opacity="0.66"
        stroke="#ffffff" stroke-opacity="0.08"/>

    <text x="118" y="884"
        font-family="Arial Black, Arial, sans-serif"
        font-size="22" font-weight="900"
        letter-spacing="2" fill="#ffffff">
        PLAYER OVERVIEW
    </text>

    <text x="118" y="918"
        font-family="Arial, Helvetica, sans-serif"
        font-size="17" fill="#aeb8c8">
        ${time === 'overall'
            ? 'Lifetime Battle Royale performance across tracked modes.'
            : 'Current-season Battle Royale performance across tracked modes.'}
    </text>

    <text x="118" y="948"
        font-family="Arial, Helvetica, sans-serif"
        font-size="15" fill="#74849a">
        Use the menu below the card to switch between This Season and Overall.
    </text>

    <text x="1455" y="1018" text-anchor="end"
        font-family="Arial, Helvetica, sans-serif"
        font-size="14" font-weight="700"
        letter-spacing="3" fill="#65758a">
        AMYFN  /  FORTNITE STATS
    </text>
</svg>
`;
}

// ==========================================
// PROFILE IMAGE
// ==========================================

async function downloadImage(url) {
    if (!url) return null;

    try {
        const response = await fetch(url);

        if (!response.ok) return null;

        const buffer = Buffer.from(await response.arrayBuffer());

        // Cosmetic icons are usually full-body renders. Crop into the upper
        // portion first so the avatar shows the character's head/upper body
        // instead of shrinking the entire skin into the circle.
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width || 512;
        const height = metadata.height || 512;

        const cropWidth = Math.min(width, Math.round(height * 0.78));
        const cropHeight = Math.min(height, Math.round(height * 0.58));
        const left = Math.max(0, Math.round((width - cropWidth) / 2));

        return await image
            .extract({
                left,
                top: 0,
                width: cropWidth,
                height: cropHeight
            })
            .resize(86, 86, { fit: 'cover', position: 'centre' })
            .png()
            .toBuffer();
    } catch (error) {
        console.error('Could not download Fortnite profile image:', error.message);
        return null;
    }
}

// ==========================================
// CREATE ACCOUNT CARD
// ==========================================

async function createAccountCard({
    account,
    stats,
    seasonStats,
    lifetimeStats,
    battlePassLevel,
    profileImage,
    skinImage,
    time = 'season'
}) {
    const selectedStats = stats || seasonStats || lifetimeStats || {};

    const profileBuffer = await downloadImage(skinImage || profileImage);

    const profileImageData = profileBuffer
        ? `data:image/png;base64,${profileBuffer.toString('base64')}`
        : null;

    const svg = createSvg({
        account,
        stats: selectedStats,
        battlePassLevel,
        time,
        profileImageData
    });

    const baseImage = sharp({
        create: {
            width: WIDTH,
            height: HEIGHT,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    }).composite([
        {
            input: Buffer.from(svg),
            top: 0,
            left: 0
        }
    ]);

    return await baseImage.png().toBuffer();
}

module.exports = {
    createAccountCard
};

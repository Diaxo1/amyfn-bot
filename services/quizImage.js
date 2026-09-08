const sharp = require('sharp');
const path = require('path');

const BACKGROUND_PATH = path.join(
    __dirname,
    '..',
    'assets',
    'quiz',
    'quiz-background.png'
);

async function createQuizImage(question) {
    const width = 1600;
    const height = 900;

    // Wider question area
    const questionBoxX = 140;
    const questionBoxY = 225;
    const questionBoxWidth = 1320;
    const questionBoxHeight = 410;

    // Automatically split long questions into multiple lines
    const questionLines = wrapText(
        question,
        42
    );

    const maxLines = 4;
    const visibleLines =
        questionLines.slice(0, maxLines);

    // Adjust font size depending on question length
    let questionFontSize = 58;

    if (visibleLines.length === 2) {
        questionFontSize = 54;
    }

    if (visibleLines.length >= 3) {
        questionFontSize = 46;
    }

    const lineHeight =
        questionFontSize + 18;

    const totalTextHeight =
        visibleLines.length * lineHeight;

    const startY =
        questionBoxY +
        (questionBoxHeight - totalTextHeight) / 2 +
        questionFontSize;

    const questionSvg =
        visibleLines
            .map((line, index) => {
                return `
                    <text
                        x="800"
                        y="${startY + index * lineHeight}"
                        text-anchor="middle"
                        font-family="Arial, Helvetica, sans-serif"
                        font-size="${questionFontSize}"
                        font-weight="800"
                        fill="#ffffff"
                        filter="url(#shadow)"
                    >
                        ${escapeXml(line)}
                    </text>
                `;
            })
            .join('');

    const svg = `
        <svg
            width="${width}"
            height="${height}"
            viewBox="0 0 ${width} ${height}"
            xmlns="http://www.w3.org/2000/svg"
        >

            <defs>

                <linearGradient
                    id="overlay"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop
                        offset="0%"
                        stop-color="#061a33"
                        stop-opacity="0.88"
                    />

                    <stop
                        offset="100%"
                        stop-color="#061a33"
                        stop-opacity="0.48"
                    />
                </linearGradient>

                <filter id="shadow">
                    <feDropShadow
                        dx="0"
                        dy="8"
                        stdDeviation="8"
                        flood-color="#000000"
                        flood-opacity="0.75"
                    />
                </filter>

            </defs>

            <!-- Dark overlay -->

            <rect
                width="1600"
                height="900"
                fill="url(#overlay)"
            />

            <!-- Title -->

            <text
                x="800"
                y="135"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="64"
                font-weight="900"
                letter-spacing="8"
                fill="#ffffff"
                filter="url(#shadow)"
            >
                FORTNITE QUIZ
            </text>

            <!-- Wider question panel -->

            <rect
                x="${questionBoxX}"
                y="${questionBoxY}"
                width="${questionBoxWidth}"
                height="${questionBoxHeight}"
                rx="32"
                fill="#061a33"
                fill-opacity="0.84"
                stroke="#37b9ff"
                stroke-width="4"
            />

            <!-- Question label -->

            <text
                x="800"
                y="305"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="30"
                font-weight="700"
                letter-spacing="4"
                fill="#69c9ff"
            >
                QUESTION
            </text>

            <!-- Dynamic question -->

            ${questionSvg}

            <!-- Instruction -->

            <text
                x="800"
                y="710"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="28"
                font-weight="600"
                fill="#ccecff"
            >
                Choose the correct answer below
            </text>

            <!-- Branding -->

            <text
                x="800"
                y="820"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="26"
                font-weight="700"
                fill="#ffffff"
            >
                AMYFN • FORTNITE COMMUNITY
            </text>

        </svg>
    `;

    const outputPath = path.join(
        __dirname,
        '..',
        'data',
        'quiz-current.png'
    );

    await sharp(BACKGROUND_PATH)
        .resize(width, height, {
            fit: 'cover'
        })
        .composite([
            {
                input: Buffer.from(svg),
                top: 0,
                left: 0
            }
        ])
        .png()
        .toFile(outputPath);

    return outputPath;
}

function wrapText(text, maxCharacters) {
    const words = String(text).split(/\s+/);

    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine =
            currentLine.length === 0
                ? word
                : `${currentLine} ${word}`;

        if (
            testLine.length <=
            maxCharacters
        ) {
            currentLine = testLine;
        } else {
            if (currentLine.length > 0) {
                lines.push(currentLine);
            }

            currentLine = word;
        }
    }

    if (currentLine.length > 0) {
        lines.push(currentLine);
    }

    return lines;
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

module.exports = {
    createQuizImage
};
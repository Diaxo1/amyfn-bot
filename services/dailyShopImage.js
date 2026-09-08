const sharp = require('sharp');

const WIDTH = 1600;
const HEIGHT = 1600;

const COLUMNS = 3;
const ROWS = 3;

const GAP = 24;
const PADDING = 40;

const ITEMS_PER_PAGE = COLUMNS * ROWS;

const CELL_WIDTH =
    Math.floor(
        (WIDTH - PADDING * 2 - GAP * (COLUMNS - 1)) /
        COLUMNS
    );

const CELL_HEIGHT =
    Math.floor(
        (HEIGHT - PADDING * 2 - GAP * (ROWS - 1)) /
        ROWS
    );

// ==========================================
// DOWNLOAD IMAGE
// ==========================================

async function downloadImage(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to download image: ${response.status}`
        );
    }

    const arrayBuffer =
        await response.arrayBuffer();

    return Buffer.from(arrayBuffer);
}

// ==========================================
// CREATE GALLERY
// ==========================================

async function createDailyShopGallery(
    images,
    page = 1
) {
    if (
        !Array.isArray(images) ||
        images.length === 0
    ) {
        throw new Error(
            'No images provided for gallery.'
        );
    }

    const pageImages =
        images.slice(
            (page - 1) * ITEMS_PER_PAGE,
            page * ITEMS_PER_PAGE
        );

    const composites = [];

    for (
        let i = 0;
        i < pageImages.length;
        i++
    ) {
        try {
            const imageBuffer =
                await downloadImage(
                    pageImages[i]
                );

            const processedImage =
                await sharp(imageBuffer)
                    .resize(
                        CELL_WIDTH,
                        CELL_HEIGHT,
                        {
                            fit: 'contain',
                            background: {
                                r: 10,
                                g: 15,
                                b: 25,
                                alpha: 1
                            }
                        }
                    )
                    .png()
                    .toBuffer();

            const column =
                i % COLUMNS;

            const row =
                Math.floor(
                    i / COLUMNS
                );

            const left =
                PADDING +
                column *
                    (CELL_WIDTH + GAP);

            const top =
                PADDING +
                row *
                    (CELL_HEIGHT + GAP);

            composites.push({
                input: processedImage,
                left,
                top
            });

        } catch (error) {
            console.error(
                `⚠️ Failed to process gallery image ${i + 1}:`,
                error.message
            );
        }
    }

    if (composites.length === 0) {
        throw new Error(
            'None of the gallery images could be processed.'
        );
    }

    return await sharp({
        create: {
            width: WIDTH,
            height: HEIGHT,
            channels: 4,
            background: {
                r: 8,
                g: 12,
                b: 20,
                alpha: 1
            }
        }
    })
        .composite(composites)
        .png()
        .toBuffer();
}

// ==========================================
// GALLERY PAGE COUNT
// ==========================================

function getGalleryPageCount(images) {
    if (
        !Array.isArray(images) ||
        images.length === 0
    ) {
        return 0;
    }

    return Math.ceil(
        images.length / ITEMS_PER_PAGE
    );
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    createDailyShopGallery,
    getGalleryPageCount
};
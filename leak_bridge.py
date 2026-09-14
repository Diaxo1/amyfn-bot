import asyncio
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from twscrape import API


# ============================================================
# LEAKERS
# ============================================================

LEAKERS = {
    "HYPEX": 2210485170,
    "ShiinaBR": 1019980702119530497,
    "GhostyLeaks4": 1803432231710416898
}


# ============================================================
# TIMEOUTS
# ============================================================

REQUEST_TIMEOUT = 20
MANUAL_TIMEOUT = 300

MANUAL_MODE = (
    len(sys.argv) > 1
    and sys.argv[1].lower() == "manual"
)

CURRENT_TIMEOUT = (
    MANUAL_TIMEOUT
    if MANUAL_MODE
    else REQUEST_TIMEOUT
)


# ============================================================
# TWSCRAPE DATABASE
# ============================================================

LOCAL_DB = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "accounts.db"
)

RAILWAY_DB = "/data/accounts.db"
APP_DATA_DB = "/app/data/accounts.db"

DB_CANDIDATES = [
    RAILWAY_DB,
    APP_DATA_DB,
    LOCAL_DB
]

TWSCRAPE_DB = None

for db_path in DB_CANDIDATES:
    if os.path.isfile(db_path):
        TWSCRAPE_DB = db_path
        print(
            f"✅ Found twscrape database: {db_path}",
            file=sys.stderr,
            flush=True
        )
        break

if not TWSCRAPE_DB:
    print(
        "ERROR: twscrape database not found.",
        file=sys.stderr,
        flush=True
    )

    print(
        "Checked:",
        file=sys.stderr,
        flush=True
    )

    for db_path in DB_CANDIDATES:
        print(
            f"  - {db_path}",
            file=sys.stderr,
            flush=True
        )

    sys.exit(1)


# ============================================================
# URL CLEANER
# ============================================================

def clean_url(url):
    """
    Clean URLs that may arrive wrapped in markdown-like syntax.

    Examples:
        [https://example.com](https://example.com)
        [https://example.com]
    """

    if not url:
        return None

    url = str(url).strip()

    if not url:
        return None

    if "](" in url:
        url = url.split("](")[-1].rstrip(")")

    if url.startswith("[") and "]" in url:
        url = url.split("]")[0].lstrip("[")

    return url.strip()


# ============================================================
# GENERIC FIELD READER
# ============================================================

def get_field(obj, field, default=None):
    """
    Read a field from either an object or a dictionary.

    This makes the media extraction more tolerant of different
    twscrape/model representations.
    """

    if obj is None:
        return default

    if isinstance(obj, dict):
        return obj.get(field, default)

    return getattr(obj, field, default)


# ============================================================
# VIDEO URL EXTRACTOR
# ============================================================

def get_video_url(video):
    """
    Find the most useful playable MP4 URL from a twscrape video object.

    X can expose several video variants with different bitrates.
    We prefer a 720p-class MP4 to keep Railway bandwidth/storage
    and Discord upload sizes reasonable. 1080p is used only when
    a 720p variant is unavailable.

    Falls back to video.url when variants are unavailable.
    """

    # --------------------------------------------------------
    # 1. Direct URL
    # --------------------------------------------------------

    direct_url = clean_url(
        get_field(video, "url")
    )

    if direct_url:
        lower_url = direct_url.lower()

        # A normal Twitter/X MP4 URL is usually directly usable.
        if ".mp4" in lower_url:
            print(
                f"🎥 Direct MP4 found: {direct_url}",
                file=sys.stderr,
                flush=True
            )
            return direct_url


    # --------------------------------------------------------
    # 2. Look for variants
    # --------------------------------------------------------

    variants = (
        get_field(video, "variants")
        or get_field(video, "videoVariants")
        or []
    )

    # Some models may expose nested video_info.
    if not variants:
        video_info = get_field(video, "video_info")

        if video_info:
            variants = (
                get_field(video_info, "variants")
                or []
            )

    # Some representations may expose variants inside a dict.
    if not variants and isinstance(video, dict):
        video_info = video.get("video_info")

        if isinstance(video_info, dict):
            variants = (
                video_info.get("variants")
                or []
            )

    mp4_variants = []

    for variant in variants:
        variant_url = clean_url(
            get_field(variant, "url")
        )

        if not variant_url:
            continue

        content_type = str(
            get_field(variant, "content_type", "")
            or get_field(variant, "contentType", "")
            or ""
        ).lower()

        bitrate = (
            get_field(variant, "bitrate", 0)
            or get_field(variant, "bit_rate", 0)
            or 0
        )

        try:
            bitrate = int(bitrate)
        except (TypeError, ValueError):
            bitrate = 0

        is_mp4 = (
            content_type == "video/mp4"
            or ".mp4" in variant_url.lower()
        )

        if is_mp4:
            mp4_variants.append(
                (
                    bitrate,
                    variant_url
                )
            )

    # --------------------------------------------------------
    # 3. Pick efficient video quality
    #
    # Prefer 720p. If X does not provide 720p, use the closest
    # lower-quality variant. If no lower-quality variant exists,
    # fall back to 1080p rather than selecting 4K.
    # --------------------------------------------------------

    if mp4_variants:
        def resolution_score(url):
            lower = url.lower()

            if "1280x720" in lower:
                return 0
            if "640x360" in lower:
                return 1
            if "480x270" in lower:
                return 2
            if "1920x1080" in lower:
                return 3

            # Unknown resolution: keep it below known 720p/1080p
            # options and above very small variants.
            return 4

        preferred = sorted(
            mp4_variants,
            key=lambda item: (
                resolution_score(item[1]),
                item[0]
            )
        )

        selected_bitrate, selected_url = preferred[0]

        print(
            f"🎥 Selected efficient MP4 variant: "
            f"{selected_bitrate}bps -> {selected_url}",
            file=sys.stderr,
            flush=True
        )

        return selected_url


    # --------------------------------------------------------
    # 4. Last-resort direct URL fallback
    # --------------------------------------------------------

    if direct_url:
        print(
            f"⚠️ No MP4 variant found. Using direct video URL: "
            f"{direct_url}",
            file=sys.stderr,
            flush=True
        )

        return direct_url

    return None


# ============================================================
# MEDIA EXTRACTION
# ============================================================

def get_media(tweet):
    """
    Extract image and video URLs from a tweet.

    Images:
        tweet.media.photos

    Videos:
        tweet.media.videos

    Videos are passed through get_video_url() so that a
    720p-class MP4 is preferred when available, reducing
    unnecessary download size.
    """

    images = []
    videos = []

    media = getattr(tweet, "media", None)

    if not media:
        print(
            "ℹ️ Tweet has no media object.",
            file=sys.stderr,
            flush=True
        )
        return images, videos


    # --------------------------------------------------------
    # Photos
    # --------------------------------------------------------

    photos = (
        get_field(media, "photos", [])
        or []
    )

    for photo in photos:
        url = clean_url(
            get_field(photo, "url")
        )

        if url:
            images.append(url)


    # --------------------------------------------------------
    # Videos
    # --------------------------------------------------------

    video_list = (
        get_field(media, "videos", [])
        or []
    )

    print(
        f"🎬 Media detected: "
        f"{len(photos)} photo(s), "
        f"{len(video_list)} video(s)",
        file=sys.stderr,
        flush=True
    )

    for index, video in enumerate(video_list, start=1):

        # Useful diagnostic output. This stays on stderr, so
        # stdout remains clean JSON for Node.js.
        print(
            f"🎥 VIDEO OBJECT #{index}: {repr(video)}",
            file=sys.stderr,
            flush=True
        )

        url = get_video_url(video)

        if url:
            videos.append(url)


    return images, videos


# ============================================================
# FETCH ONE LEAKER
# ============================================================

async def fetch_leaker(api, username, user_id):
    print(
        f"🔎 Checking @{username}...",
        file=sys.stderr,
        flush=True
    )

    results = []

    try:

        async def collect():

            async for tweet in api.user_tweets(
                user_id,
                limit=1
            ):

                author = getattr(
                    tweet,
                    "user",
                    None
                )

                display_name = username

                if author:
                    display_name = (
                        getattr(
                            author,
                            "displayname",
                            None
                        )
                        or username
                    )


                images, videos = get_media(tweet)


                tweet_data = {
                    "id": str(tweet.id),

                    "username": username,

                    "displayName": display_name,

                    "text": getattr(
                        tweet,
                        "rawContent",
                        ""
                    ),

                    "date": tweet.date.isoformat(),

                    "url": (
                        f"https://x.com/"
                        f"{username}/status/"
                        f"{tweet.id}"
                    ),

                    "images": images,

                    "videos": videos
                }


                print(
                    f"📸 @{username}: "
                    f"{len(images)} image(s)",
                    file=sys.stderr,
                    flush=True
                )

                print(
                    f"🎥 @{username}: "
                    f"{len(videos)} video(s)",
                    file=sys.stderr,
                    flush=True
                )


                results.append(tweet_data)


        await asyncio.wait_for(
            collect(),
            timeout=CURRENT_TIMEOUT
        )


        print(
            f"✅ @{username}: "
            f"{len(results)} tweets",
            file=sys.stderr,
            flush=True
        )

        return results


    except asyncio.TimeoutError:

        print(
            f"⏱️ @{username}: "
            f"request timed out after "
            f"{CURRENT_TIMEOUT}s",
            file=sys.stderr,
            flush=True
        )

        return []


    except Exception as error:

        print(
            f"❌ @{username}: {error}",
            file=sys.stderr,
            flush=True
        )

        return []


# ============================================================
# MAIN
# ============================================================

async def main():

    try:

        print(
            f"🗄️ TWSCRAPE DB: {TWSCRAPE_DB}",
            file=sys.stderr,
            flush=True
        )

        print(
            "⏱️ Bridge mode: "
            f"{'MANUAL' if MANUAL_MODE else 'AUTOMATIC'} "
            f"({CURRENT_TIMEOUT}s timeout)",
            file=sys.stderr,
            flush=True
        )


        api = API(TWSCRAPE_DB)

        results = []


        # ----------------------------------------------------
        # Check all configured leakers
        # ----------------------------------------------------

        for username, user_id in LEAKERS.items():

            tweets = await fetch_leaker(
                api,
                username,
                user_id
            )

            results.extend(tweets)


        # ----------------------------------------------------
        # Sort newest first
        # ----------------------------------------------------

        results.sort(
            key=lambda tweet: tweet["date"],
            reverse=True
        )


        # ----------------------------------------------------
        # Remove duplicate tweet IDs
        # ----------------------------------------------------

        unique_results = []

        seen_ids = set()

        for tweet in results:

            tweet_id = tweet["id"]

            if tweet_id in seen_ids:
                continue

            seen_ids.add(tweet_id)

            unique_results.append(tweet)


        results = unique_results


        # ----------------------------------------------------
        # Final diagnostics
        # ----------------------------------------------------

        total_images = sum(
            len(tweet.get("images", []))
            for tweet in results
        )

        total_videos = sum(
            len(tweet.get("videos", []))
            for tweet in results
        )

        print(
            f"📦 Bridge returning "
            f"{len(results)} tweets | "
            f"{total_images} images | "
            f"{total_videos} videos",
            file=sys.stderr,
            flush=True
        )


        # ----------------------------------------------------
        # IMPORTANT:
        # stdout must contain ONLY valid JSON.
        # Node.js reads this output.
        # ----------------------------------------------------

        print(
            json.dumps(
                results,
                ensure_ascii=False
            ),
            flush=True
        )


    except Exception as error:

        print(
            f"ERROR: Leak bridge failed: {error}",
            file=sys.stderr,
            flush=True
        )

        sys.exit(1)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(main())

    except KeyboardInterrupt:

        sys.exit(0)

    except Exception as error:

        print(
            f"ERROR: Unexpected leak bridge failure: {error}",
            file=sys.stderr,
            flush=True
        )

        sys.exit(1)

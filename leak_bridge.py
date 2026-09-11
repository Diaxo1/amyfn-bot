import asyncio
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from twscrape import API


# ==========================================
# LEAK SOURCES
# ==========================================

LEAKERS = {
    "HYPEX": 2210485170,
    "ShiinaBR": 1019980702119530497,
    "GhostyLeaks4": 1803432231710416898
}


# ==========================================
# SETTINGS
# ==========================================

# Normal automatic tracker timeout
REQUEST_TIMEOUT = 20

# Manual /leaks latest timeout
# Allows twscrape enough time to wait for
# its account cooldown.
MANUAL_TIMEOUT = 300


# ==========================================
# DETERMINE MODE
# ==========================================

MANUAL_MODE = (
    len(sys.argv) > 1
    and sys.argv[1].lower() == "manual"
)

CURRENT_TIMEOUT = (
    MANUAL_TIMEOUT
    if MANUAL_MODE
    else REQUEST_TIMEOUT
)


# ==========================================
# TWSCRAPE DATABASE
# ==========================================

LOCAL_DB = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "accounts.db"
)

# Railway volume locations
RAILWAY_DB = "/data/accounts.db"
APP_DATA_DB = "/app/data/accounts.db"

# Check possible database locations
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


# ==========================================
# CLEAN URL
# ==========================================

def clean_url(url):

    if not url:
        return None

    url = str(url)

    if "](" in url:
        url = url.split("](")[-1].rstrip(")")

    if url.startswith("[") and "]" in url:
        url = url.split("]")[0].lstrip("[")

    return url


# ==========================================
# GET MEDIA
# ==========================================

def get_media(tweet):

    images = []
    videos = []

    media = getattr(
        tweet,
        "media",
        None
    )

    if not media:
        return images, videos

    photos = getattr(
        media,
        "photos",
        []
    ) or []

    for photo in photos:

        url = clean_url(
            getattr(
                photo,
                "url",
                None
            )
        )

        if url:
            images.append(url)

    video_list = getattr(
        media,
        "videos",
        []
    ) or []

    for video in video_list:

        url = clean_url(
            getattr(
                video,
                "url",
                None
            )
        )

        if url:
            videos.append(url)

    return images, videos


# ==========================================
# FETCH ONE LEAKER
# ==========================================

async def fetch_leaker(
    api,
    username,
    user_id
):

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

                images, videos = get_media(
                    tweet
                )

                results.append({

                    "id": str(
                        tweet.id
                    ),

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

                })

        await asyncio.wait_for(
            collect(),
            timeout=CURRENT_TIMEOUT
        )

        print(
            f"✅ @{username}: {len(results)} tweets",
            file=sys.stderr,
            flush=True
        )

        return results

    except asyncio.TimeoutError:

        print(
            f"⏱️ @{username}: request timed out after "
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


# ==========================================
# MAIN
# ==========================================

async def main():

    try:

        print(
            "🗄️ TWSCRAPE DB:",
            TWSCRAPE_DB,
            file=sys.stderr,
            flush=True
        )

        print(
            f"⏱️ Bridge mode: "
            f"{'MANUAL' if MANUAL_MODE else 'AUTOMATIC'} "
            f"({CURRENT_TIMEOUT}s timeout)",
            file=sys.stderr,
            flush=True
        )

        api = API(TWSCRAPE_DB)

        results = []

        # ==================================
        # CHECK ALL LEAK SOURCES
        # ==================================

        for username, user_id in LEAKERS.items():

            tweets = await fetch_leaker(
                api,
                username,
                user_id
            )

            results.extend(tweets)

        # ==================================
        # SORT NEWEST FIRST
        # ==================================

        results.sort(
            key=lambda tweet: tweet["date"],
            reverse=True
        )

        # ==================================
        # REMOVE DUPLICATES
        # ==================================

        unique_results = []
        seen_ids = set()

        for tweet in results:

            tweet_id = tweet["id"]

            if tweet_id in seen_ids:
                continue

            seen_ids.add(tweet_id)

            unique_results.append(tweet)

        results = unique_results

        # ==================================
        # FINAL DEBUG
        # ==================================

        print(
            f"📦 Bridge returning {len(results)} tweets",
            file=sys.stderr,
            flush=True
        )

        # ==================================
        # OUTPUT JSON
        # ==================================

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


# ==========================================
# ENTRY POINT
# ==========================================

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
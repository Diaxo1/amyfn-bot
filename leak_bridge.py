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
# TWSCRAPE DATABASE
# ==========================================
#
# Railway:
#   /data/accounts.db
#
# Local:
#   accounts.db beside leak_bridge.py
#
# We never print the contents of this database.
# ==========================================

LOCAL_DB = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "accounts.db"
)

RAILWAY_DB = "/data/accounts.db"


if os.path.isfile(RAILWAY_DB):
    TWSCRAPE_DB = RAILWAY_DB

elif os.path.isfile(LOCAL_DB):
    TWSCRAPE_DB = LOCAL_DB

else:
    print(
        "ERROR: twscrape database not found.",
        file=sys.stderr
    )
    print(
        "Expected Railway database at /data/accounts.db",
        file=sys.stderr
    )
    print(
        "Expected local database beside leak_bridge.py",
        file=sys.stderr
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

    media = getattr(tweet, "media", None)

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
# MAIN
# ==========================================

async def main():

    try:

        api = API(TWSCRAPE_DB)

        # ==================================
        # TWSCRAPE ACCOUNT DIAGNOSTICS
        # ==================================

        print(
            f"🗄️ TWSCRAPE DB: {TWSCRAPE_DB}",
            file=sys.stderr
        )

        try:

            accounts = await api.accounts_info()

            if not accounts:

                print(
                    "⚠️ No twscrape accounts found in database.",
                    file=sys.stderr
                )

            else:

                for account in accounts:

                    print(
                        f"👤 twscrape account: "
                        f"{account.username} | "
                        f"active={account.active}",
                        file=sys.stderr
                    )

        except Exception as error:

            print(
                f"❌ Failed to read twscrape accounts: {error}",
                file=sys.stderr
            )

        results = []

        # ==================================
        # CHECK LEAK SOURCES
        # ==================================

        for username, user_id in LEAKERS.items():

            try:

                async for tweet in api.user_tweets(
                    user_id,
                    limit=5
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

            except Exception as error:

                # Only log the leaker name and error.
                # Never expose database contents.

                print(
                    f"ERROR @{username}: {error}",
                    file=sys.stderr
                )

        # ==================================
        # SORT NEWEST FIRST
        # ==================================

        results.sort(
            key=lambda tweet: tweet["date"],
            reverse=True
        )

        # ==================================
        # OUTPUT JSON
        # ==================================

        print(
            json.dumps(
                results,
                ensure_ascii=False
            )
        )

    except Exception as error:

        print(
            f"ERROR: Leak bridge failed: {error}",
            file=sys.stderr
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
            file=sys.stderr
        )

        sys.exit(1)
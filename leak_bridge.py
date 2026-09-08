import asyncio
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from twscrape import API


LEAKERS = {
    "HYPEX": 2210485170,
    "ShiinaBR": 1019980702119530497,
    "GhostyLeaks4": 1803432231710416898
}

TWSCRAPE_DB = r"C:\Users\user\Desktop\accounts.db"


def clean_url(url):
    if not url:
        return None

    url = str(url)

    if "](" in url:
        url = url.split("](")[-1].rstrip(")")

    if url.startswith("[") and "]" in url:
        url = url.split("]")[0].lstrip("[")

    return url


def get_media(tweet):
    images = []
    videos = []

    media = getattr(tweet, "media", None)

    if not media:
        return images, videos

    photos = getattr(media, "photos", []) or []

    for photo in photos:
        url = clean_url(getattr(photo, "url", None))

        if url:
            images.append(url)

    video_list = getattr(media, "videos", []) or []

    for video in video_list:
        url = clean_url(getattr(video, "url", None))

        if url:
            videos.append(url)

    return images, videos


async def main():

    if not os.path.exists(TWSCRAPE_DB):
        print(
            f"ERROR: twscrape database not found: {TWSCRAPE_DB}",
            file=sys.stderr
        )
        sys.exit(1)

    api = API(TWSCRAPE_DB)

    results = []

    for username, user_id in LEAKERS.items():

        try:

            async for tweet in api.user_tweets(
                user_id,
                limit=5
            ):

                author = getattr(tweet, "user", None)

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

                results.append({
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
                })

        except Exception as error:

            print(
                f"ERROR @{username}: {error}",
                file=sys.stderr
            )

    results.sort(
        key=lambda tweet: tweet["date"],
        reverse=True
    )

    print(
        json.dumps(
            results,
            ensure_ascii=False
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
import asyncio
from twscrape import API

async def main():
    api = API()

    async for tweet in api.user_tweets(1019980702119530497, limit=3):
        print("ID:", tweet.id)
        print("DATE:", tweet.date)
        print("TEXT:", tweet.rawContent[:300])
        print("MEDIA:", tweet.media)
        print("AUTHOR:", tweet.user)
        print("-" * 50)

asyncio.run(main())
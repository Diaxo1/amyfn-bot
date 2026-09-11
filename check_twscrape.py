import asyncio
from twscrape import API

DB = r"C:\Users\user\OneDrive\Desktop\fn bot\accounts.db"


async def main():

    api = API(DB)

    print("Resetting locks...")
    await api.pool.reset_locks()

    print(
        "Next available:",
        await api.pool.next_available_at("UserTweets")
    )

    account = await api.pool.get_for_queue("UserTweets")

    if account:
        print(
            "Selected account:",
            account.username
        )
    else:
        print(
            "Selected account: NONE"
        )

    print(
        "Next available after selection:",
        await api.pool.next_available_at("UserTweets")
    )


asyncio.run(main())
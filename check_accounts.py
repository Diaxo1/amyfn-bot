import asyncio
from twscrape import API

DB = "accounts.db"

async def main():
    api = API(DB)

    print("Checking local twscrape database...")
    print("DB:", DB)

    try:
        accounts = await api.pool.get_all()

        print(f"\nAccounts found: {len(accounts)}")

        for account in accounts:
            print(
                f"\nUsername: {account.username}"
                f"\nActive: {account.active}"
                f"\nLogged in: {getattr(account, 'logged_in', 'unknown')}"
            )

    except Exception as error:
        print("ERROR:", error)

asyncio.run(main())
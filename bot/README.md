# GoBento support bot

Telegram bot behind GoBento's "Contact support" button. Customers write to the bot; the team gets
every message and answers by replying to it.

- The website links to `https://t.me/<bot>?start=err_<reference>` when an error page has a
  reference, so the customer is greeted with a short hello that already names the reference, and the
  team sees it on the first line.
- Every customer message is copied to each user in `ADMINS`, below a line naming the sender.
- An admin's reply to that copy (or to the line above it) is sent back to the customer.
- Which copy belongs to which customer is kept in a small SQLite file (`DATA_PATH`), so replies
  still reach the right person after a restart.
- On start the bot sets its commands and, only when they differ, its name and descriptions.

## Run locally

```sh
python -m venv venv && venv/bin/pip install -r bot/requirements.txt
cp example.env .env   # fill in TELEGRAM and ADMINS
cd bot && ../venv/bin/python main.py
../venv/bin/python -m pytest ../test
```

## Deploy

A long-running process (`python main.py` in `bot/`) with `.env` next to it (see `example.env`) and a
persistent `DATA_PATH`. After pulling new code, restart it: the code is only read at start-up.
Each admin has to press Start in the bot once, otherwise Telegram does not let the bot message them.

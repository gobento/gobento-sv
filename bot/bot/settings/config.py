from json import loads
from os import getenv
from typing import Final, List

from dotenv import load_dotenv

load_dotenv()

TOKEN: Final[str] = getenv("TELEGRAM", "")
CONTAINER: Final[bool] = str(getenv("CONTAINER", "False")).lower() == "true"
# Telegram user ids of the team: they receive every support message and answer by replying.
ADMINS: Final[List[int]] = loads(getenv("ADMINS", "[]"))
# SQLite file that remembers which forwarded message belongs to which customer.
DATA_PATH: Final[str] = getenv("DATA_PATH", "./data")
APP_URL: Final[str] = getenv("APP_URL", "https://gobento-sv.vercel.app").rstrip("/")

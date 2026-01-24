from prisma import Prisma

db = Prisma()
db_pool = None

async def connect_db():
    await db.connect()

async def disconnect_db():
    if db.is_connected():
        await db.disconnect()

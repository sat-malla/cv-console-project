import asyncio

from cameras import cap_holder

latest_frame = None


async def capture_loop():
    global latest_frame
    loop = asyncio.get_event_loop()
    while True:
        cap = cap_holder["cap"]
        if cap is None:
            latest_frame = None
            await asyncio.sleep(0.1)
            continue
        ret, frame = await loop.run_in_executor(None, cap.read)
        if ret:
            latest_frame = frame
        await asyncio.sleep(0.01)
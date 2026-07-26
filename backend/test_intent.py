import asyncio
from query_engine import parse_intent

TEST_QUESTIONS = [
    "What tripped the safety alarm around 2:14 PM?",
    "Show me when motion exceeded 80%",
    "Has anyone been detected in the last hour?",
    "What's the average edge density?",
    "Were there any flagged events today?",
    "What is happening right now?",
]

async def run_tests():
    for question in TEST_QUESTIONS:
        intent = await parse_intent(question)
        print(f"\nQuestion: {question}")
        print(f"Parsed intent: {intent}")

if __name__ == "__main__":
    asyncio.run(run_tests())
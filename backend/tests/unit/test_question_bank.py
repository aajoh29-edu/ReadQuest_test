# Save this file to: tests/unit/test_question_bank.py
import unittest
import random
from app.services.question_bank import Engine, Question, pick_next

class MockContentProvider:
    """Simulates database configurations inside memory pools for unit testing isolation."""
    def __init__(self):
        self.items = {
            "SHORT_A": [
                {"context": {"word": "cat"}, "template": "Find the short a: {word}", "correct": "cat", "distractors": ["bed", "pig"]},
                {"context": {"word": "hat"}, "template": "Tap the short a: {word}", "correct": "hat", "distractors": ["hen", "dog"]},
            ]
        }
    def get_items_for_skill(self, skill_code: str) -> list[dict]:
        return self.items.get(skill_code, [])
        
    def get_skill_difficulty(self, skill_code: str) -> int:
        return 2


class TestDynamicEngineBasics(unittest.TestCase):
    def setUp(self):
        self.provider = MockContentProvider()
        self.engine = Engine(self.provider)

    def test_well_formed_generation(self):
        questions = self.engine.generate_for_skill("SHORT_A", count=2, seed=123)
        self.assertEqual(len(questions), 2)
        for q in questions:
            self.assertEqual(len(q.choices), 3)
            self.assertEqual(len(set(q.choices)), 3)
            self.assertIn(q.correct_index, (0, 1, 2))
            self.assertEqual(q.choices[q.correct_index], q.correct_answer)

    def test_bounds_enforcement(self):
        with self.assertRaises(ValueError):
            self.engine.generate_for_skill("SHORT_A", count=5, seed=123)

    def test_pick_next_fallback(self):
        questions = self.engine.generate_for_skill("SHORT_A", count=2, seed=123)
        seen = [q.prompt for q in questions]
        nxt = pick_next(questions, seen, random.Random(42))
        self.assertIn(nxt, questions)

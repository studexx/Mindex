import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NODE = Path("/Users/parkjihun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node")


class KeynoteImporterTests(unittest.TestCase):
    def test_importer_self_test(self):
        result = subprocess.run(
            [str(NODE), str(ROOT / "scripts" / "import-keynote-deck.mjs"), "--self-test"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )
        payload = json.loads(result.stdout)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["slides"], 2)
        self.assertRegex(payload["fingerprint"], r"^[a-f0-9]{16}$")


if __name__ == "__main__":
    unittest.main()

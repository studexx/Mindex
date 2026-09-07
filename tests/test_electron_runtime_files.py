import json
import re
import unittest
from pathlib import Path


class ElectronRuntimeFilesTests(unittest.TestCase):
    def test_top_level_runtime_scripts_are_packaged(self):
        root = Path(__file__).resolve().parents[1]
        includes = json.loads((root / 'package.json').read_text())['build']['files']
        scripts = re.findall(r'<script src="\./([^?"/]+\.js)', (root / 'index.html').read_text())
        for script in scripts:
            with self.subTest(script=script):
                self.assertIn(script, includes)
                self.assertTrue((root / script).is_file())


if __name__ == '__main__':
    unittest.main()

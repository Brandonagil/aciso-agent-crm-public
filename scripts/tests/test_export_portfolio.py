import importlib.util
from pathlib import Path
import tempfile
import unittest


spec = importlib.util.spec_from_file_location(
    "export_portfolio", Path(__file__).resolve().parents[1] / "export_portfolio.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExportBoundaryTests(unittest.TestCase):
    def test_export_preserves_source_and_excludes_private_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "source"
            root.mkdir()
            fixtures = {
                "README.md": "A prototype.\n",
                "ai-agent-fe/.env.example": "TOKEN=placeholder\n",
                "ai-agent-fe/.env.local": "PRIVATE=yes\n",
                "Aciso-Agent_Final/archive/credentials.json": "private archive",
                "archive/members.xlsx": "private spreadsheet",
                ".git/config": "private history",
                "portfolio/index.html": "<h1>Fictional data</h1>",
            }
            for name, text in fixtures.items():
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text)
            destination = Path(directory) / "export"
            result = module.export(root, destination)
            self.assertEqual(
                {entry["path"] for entry in result["files"]},
                {"README.md", "ai-agent-fe/.env.example"},
            )
            for name, text in fixtures.items():
                self.assertEqual((root / name).read_text(), text)

    def test_secret_in_allowed_source_stops_before_output_is_created(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "source"
            root.mkdir()
            (root / "README.md").write_text("-----BEGIN " + "PRIVATE KEY-----\nprivate")
            destination = Path(directory) / "export"
            with self.assertRaisesRegex(ValueError, "Possible credential"):
                module.export(root, destination)
            self.assertFalse(destination.exists())

    def test_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "source"
            root.mkdir()
            secret = Path(directory) / "private.txt"
            secret.write_text("private")
            (root / "README.md").symlink_to(secret)
            with self.assertRaisesRegex(ValueError, "Symlinks"):
                module.export(root, Path(directory) / "export")

    def test_existing_destination_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "source"
            root.mkdir()
            (root / "README.md").write_text("source")
            target = Path(directory) / "export"
            target.mkdir()
            (target / "keep.txt").write_text("keep")
            with self.assertRaisesRegex(ValueError, "never overwritten"):
                module.export(root, target)
            self.assertEqual((target / "keep.txt").read_text(), "keep")

    def test_export_inside_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "README.md").write_text("source")
            with self.assertRaisesRegex(ValueError, "outside"):
                module.export(root, root / "nested-export")


if __name__ == "__main__":
    unittest.main()

"""Compatibility entry point for unified static-image acquisition checks."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("ui-unified-scanner-check.py")),run_name="__main__")

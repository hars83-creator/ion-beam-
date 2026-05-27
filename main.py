"""Application entry point for the Ion Beam Irradiation Simulator."""

from __future__ import annotations

import sys


MISSING_TK_MESSAGE = """
Tkinter is not available in this Python environment.

The simulator is a Tkinter desktop app, so the selected Python must include Tk.

macOS options:
  1. Use the Python installer from https://www.python.org/downloads/
  2. Or install Tk support for the same Homebrew Python version:
       brew search python-tk
       brew install python-tk@3.14

Then install dependencies in that same Python environment:
  python -m pip install -r requirements.txt

You can verify the environment with:
  python check_environment.py
""".strip()


MISSING_PACKAGE_MESSAGE = """
Required scientific packages are missing from this Python environment.

Install them with:
  python -m pip install -r requirements.txt

You can verify the environment with:
  python check_environment.py
""".strip()


def main() -> None:
    try:
        import tkinter as tk
        from tkinter import messagebox
    except ModuleNotFoundError as exc:
        if exc.name in {"_tkinter", "tkinter"}:
            print(MISSING_TK_MESSAGE, file=sys.stderr)
            raise SystemExit(1) from exc
        raise

    try:
        from ui_components import IonBeamSimulatorApp
    except ModuleNotFoundError as exc:
        if exc.name in {"numpy", "scipy", "matplotlib", "PIL"}:
            print(f"{MISSING_PACKAGE_MESSAGE}\n\nMissing package: {exc.name}", file=sys.stderr)
            raise SystemExit(1) from exc
        raise

    try:
        root = tk.Tk()
        IonBeamSimulatorApp(root)
        root.mainloop()
    except Exception as exc:
        try:
            messagebox.showerror("Ion Beam Irradiation Simulator", str(exc))
        except Exception:
            print(f"Ion Beam Irradiation Simulator failed to start: {exc}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()

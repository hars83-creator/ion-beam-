"""Check whether the active Python can run the simulator."""

from __future__ import annotations

import importlib
import sys


REQUIRED_MODULES = [
    ("numpy", "NumPy physics arrays"),
    ("scipy", "SciPy integration helpers"),
    ("matplotlib", "embedded graph dashboard"),
]


def check_import(module_name: str, label: str) -> bool:
    try:
        module = importlib.import_module(module_name)
    except Exception as exc:
        print(f"[FAIL] {label}: {exc}")
        return False
    version = getattr(module, "__version__", "available")
    print(f"[ OK ] {label}: {version}")
    return True


def check_tkinter(open_window: bool = False) -> bool:
    try:
        import tkinter as tk
    except Exception as exc:
        print(f"[FAIL] Tkinter GUI: {exc}")
        return False

    if open_window:
        try:
            root = tk.Tk()
            root.withdraw()
            root.update_idletasks()
            root.destroy()
        except Exception as exc:
            print(f"[FAIL] Tkinter GUI window test: {exc}")
            return False
        print("[ OK ] Tkinter GUI: window creation works")
        return True

    print("[ OK ] Tkinter GUI: module available")
    return True


def main() -> int:
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version.split()[0]}")
    print("")

    ok = check_tkinter(open_window="--gui" in sys.argv)
    for module_name, label in REQUIRED_MODULES:
        ok = check_import(module_name, label) and ok

    if ok:
        print("\nEnvironment looks ready. Run: python main.py")
        return 0

    print(
        "\nEnvironment is not ready.\n"
        "Install a Python build with Tkinter, then run:\n"
        "  python -m pip install -r requirements.txt\n"
        "\n"
        "On macOS, the python.org installer usually includes Tk. If you use Homebrew Python,\n"
        "install the matching Tk package too, for example:\n"
        "  brew search python-tk\n"
        "  brew install python-tk@3.14\n"
        "\n"
        "To also test that a Tk window can open, run: python check_environment.py --gui"
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Application entry point for the Ion Beam Irradiation Simulator."""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox

from ui_components import IonBeamSimulatorApp


def main() -> None:
    root = tk.Tk()
    try:
        IonBeamSimulatorApp(root)
        root.mainloop()
    except Exception as exc:
        messagebox.showerror("Ion Beam Irradiation Simulator", str(exc))
        raise


if __name__ == "__main__":
    main()


"""Matplotlib dashboards embedded in Tkinter."""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Optional

import numpy as np

try:
    import matplotlib

    matplotlib.use("TkAgg")
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
    from matplotlib.figure import Figure

    MATPLOTLIB_AVAILABLE = True
except Exception:
    Figure = None
    FigureCanvasTkAgg = None
    MATPLOTLIB_AVAILABLE = False

from physics_engine import SimulationResult


class GraphDashboard(ttk.Frame):
    def __init__(self, master: tk.Misc) -> None:
        super().__init__(master)
        self.figures = []
        self.canvases = []
        self.placeholder: Optional[ttk.Label] = None
        if MATPLOTLIB_AVAILABLE:
            self._build_figures()
        else:
            self.placeholder = ttk.Label(
                self,
                text="Install matplotlib to enable live graphs. The physics engine and exports still run.",
                anchor="center",
            )
            self.placeholder.pack(fill="both", expand=True)

    def _build_figures(self) -> None:
        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True)
        specs = [
            (
                "Depth Profiles",
                [
                    "Energy vs Depth",
                    "LET vs Depth",
                    "Electronic/Nuclear Stopping",
                    "Defect Density vs Depth",
                ],
            ),
            (
                "Beam and Damage",
                [
                    "Energy Loss vs Collision",
                    "Penetration Depth vs Energy",
                    "Temperature Rise vs Time",
                    "Beam Intensity vs Time",
                ],
            ),
        ]
        for tab_name, titles in specs:
            frame = ttk.Frame(notebook)
            notebook.add(frame, text=tab_name)
            figure = Figure(figsize=(7.8, 3.3), dpi=100, facecolor="#07111f")
            axes = figure.subplots(2, 2)
            for axis, title in zip(axes.flat, titles):
                axis.set_title(title, color="#dff8ff", fontsize=9)
                axis.set_facecolor("#0b1828")
                axis.tick_params(colors="#a9c5d8", labelsize=7)
                for spine in axis.spines.values():
                    spine.set_color("#2f4b63")
                axis.grid(color="#1d3448", linewidth=0.5)
            figure.tight_layout(pad=1.6)
            canvas = FigureCanvasTkAgg(figure, master=frame)
            canvas.get_tk_widget().pack(fill="both", expand=True)
            self.figures.append(figure)
            self.canvases.append(canvas)

    def update(self, result: SimulationResult, beam_intensity: float, irradiation_time_s: float) -> None:
        if not MATPLOTLIB_AVAILABLE or not self.figures:
            return
        profile = result.profile
        depth = profile.depth_nm

        fig1 = self.figures[0]
        axes = fig1.axes
        for axis in axes:
            axis.cla()
            self._style(axis)
        axes[0].plot(depth, profile.energy_kev, color="#4dd8ff", linewidth=2)
        axes[0].set_title("Energy vs Depth", color="#dff8ff", fontsize=9)
        axes[0].set_xlabel("Depth (nm)", color="#a9c5d8", fontsize=7)
        axes[0].set_ylabel("Energy (keV)", color="#a9c5d8", fontsize=7)

        axes[1].plot(depth, profile.let_kev_nm, color="#ffd166", linewidth=2)
        axes[1].set_title("LET vs Depth", color="#dff8ff", fontsize=9)
        axes[1].set_xlabel("Depth (nm)", color="#a9c5d8", fontsize=7)
        axes[1].set_ylabel("keV/nm", color="#a9c5d8", fontsize=7)

        axes[2].plot(depth, profile.electronic_stopping, color="#6ee7b7", label="Se")
        axes[2].plot(depth, profile.nuclear_stopping, color="#ff7aa2", label="Sn")
        axes[2].legend(facecolor="#0b1828", edgecolor="#2f4b63", labelcolor="#dff8ff", fontsize=7)
        axes[2].set_title("Electronic/Nuclear Stopping", color="#dff8ff", fontsize=9)
        axes[2].set_xlabel("Depth (nm)", color="#a9c5d8", fontsize=7)

        axes[3].plot(depth, profile.defect_density, color="#ff4d6d", linewidth=2)
        axes[3].set_title("Defect Density vs Depth", color="#dff8ff", fontsize=9)
        axes[3].set_xlabel("Depth (nm)", color="#a9c5d8", fontsize=7)
        axes[3].set_ylabel("cm^-3", color="#a9c5d8", fontsize=7)
        fig1.tight_layout(pad=1.6)
        self.canvases[0].draw_idle()

        fig2 = self.figures[1]
        axes2 = fig2.axes
        for axis in axes2:
            axis.cla()
            self._style(axis)
        collisions = np.maximum(profile.collision_density, 1.0)
        loss = result.initial_energy_kev - profile.energy_kev
        axes2[0].plot(collisions, loss, color="#ffd166", linewidth=1.8)
        axes2[0].set_title("Energy Loss vs Collision", color="#dff8ff", fontsize=9)
        axes2[0].set_xlabel("Collision density", color="#a9c5d8", fontsize=7)
        axes2[0].set_ylabel("Loss (keV)", color="#a9c5d8", fontsize=7)

        energies = np.linspace(max(result.initial_energy_kev * 0.08, 1), result.initial_energy_kev * 1.35, 80)
        ranges = result.penetration_depth_nm * (energies / max(result.initial_energy_kev, 1.0)) ** 1.5
        axes2[1].plot(energies, ranges, color="#4dd8ff", linewidth=1.8)
        axes2[1].scatter([result.initial_energy_kev], [result.penetration_depth_nm], color="#ff7aa2", s=18)
        axes2[1].set_title("Penetration Depth vs Energy", color="#dff8ff", fontsize=9)
        axes2[1].set_xlabel("Energy (keV)", color="#a9c5d8", fontsize=7)
        axes2[1].set_ylabel("Range (nm)", color="#a9c5d8", fontsize=7)

        t = np.linspace(0, max(irradiation_time_s, 1.0), 120)
        axes2[2].plot(t, result.temperature_rise_k * (1.0 - np.exp(-t / max(irradiation_time_s * 0.35, 1))), color="#ff9f43")
        axes2[2].set_title("Temperature Rise vs Time", color="#dff8ff", fontsize=9)
        axes2[2].set_xlabel("Time (s)", color="#a9c5d8", fontsize=7)
        axes2[2].set_ylabel("Delta T (K)", color="#a9c5d8", fontsize=7)

        modulation = 1.0 + 0.08 * np.sin(2 * np.pi * t / max(irradiation_time_s, 1.0))
        axes2[3].plot(t, beam_intensity * modulation, color="#6ee7b7")
        axes2[3].set_title("Beam Intensity vs Time", color="#dff8ff", fontsize=9)
        axes2[3].set_xlabel("Time (s)", color="#a9c5d8", fontsize=7)
        axes2[3].set_ylabel("relative", color="#a9c5d8", fontsize=7)
        fig2.tight_layout(pad=1.6)
        self.canvases[1].draw_idle()

    def save_active_figure(self, path: str) -> bool:
        if not MATPLOTLIB_AVAILABLE or not self.figures:
            return False
        self.figures[0].savefig(path, facecolor="#07111f", dpi=180)
        return True

    @staticmethod
    def _style(axis) -> None:
        axis.set_facecolor("#0b1828")
        axis.tick_params(colors="#a9c5d8", labelsize=7)
        for spine in axis.spines.values():
            spine.set_color("#2f4b63")
        axis.grid(color="#1d3448", linewidth=0.5)


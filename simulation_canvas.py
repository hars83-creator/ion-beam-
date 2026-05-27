"""Tkinter Canvas visualization for ion penetration and collision cascades."""

from __future__ import annotations

import math
import random
import tkinter as tk
from typing import Optional

import numpy as np

from animation_engine import AnimationEngine, Flash, Particle
from physics_engine import BeamParameters, SimulationResult


class SimulationCanvas(tk.Canvas):
    def __init__(self, master: tk.Misc, **kwargs: object) -> None:
        super().__init__(
            master,
            bg="#06111f",
            highlightthickness=1,
            highlightbackground="#20364f",
            **kwargs,
        )
        self.engine = AnimationEngine()
        self.parameters: Optional[BeamParameters] = None
        self.result: Optional[SimulationResult] = None
        self.running = False
        self.frame_delay_ms = 28
        self.random = random.Random(17)
        self.target_left = 90
        self.target_right = 800
        self.surface_y = 0
        self.bind("<Configure>", lambda _event: self.redraw())

    def set_simulation(self, parameters: BeamParameters, result: SimulationResult) -> None:
        self.parameters = parameters
        self.result = result
        self.engine.clear()
        self.redraw()

    def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._tick()

    def pause(self) -> None:
        self.running = False

    def reset(self) -> None:
        self.engine.clear()
        self.redraw()

    def _tick(self) -> None:
        if not self.running:
            return
        width = max(self.winfo_width(), 200)
        height = max(self.winfo_height(), 160)
        self._spawn_ions(width, height)
        self._update_collisions(width, height)
        self.engine.step(width, height)
        self.redraw()
        self.after(self.frame_delay_ms, self._tick)

    def _spawn_ions(self, width: int, height: int) -> None:
        if not self.parameters or not self.result:
            return
        base = 1 if self.parameters.mode == "Educational" else 2
        intensity = max(self.parameters.beam_intensity, 0.1)
        speed = max(self.parameters.simulation_speed, 0.2)
        count = min(6, base + int(intensity * speed / 3.0))
        for _ in range(count):
            if self.random.random() > 0.42:
                continue
            y = height * 0.20 + self.random.random() * height * 0.58
            angle = math.radians(self.parameters.beam_angle_deg + self.random.gauss(0.0, self.parameters.beam_spread_deg))
            vx = (4.5 + 1.2 * speed) * math.cos(angle)
            vy = (4.5 + 1.2 * speed) * math.sin(angle)
            color = self._ion_color()
            self.engine.add_particle(
                Particle(
                    x=15,
                    y=y,
                    vx=vx,
                    vy=vy,
                    radius=5.0 + min(self.parameters.ion.atomic_number, 80) / 40.0,
                    color=color,
                    ttl=260,
                    kind="ion",
                    energy=1.0,
                )
            )

    def _update_collisions(self, width: int, height: int) -> None:
        if not self.parameters or not self.result:
            return
        profile = self.result.profile
        max_let = float(np.max(profile.let_kev_nm)) if len(profile.let_kev_nm) else 1.0
        for particle in list(self.engine.particles):
            if particle.kind != "ion":
                continue
            old_x, old_y = particle.x, particle.y
            in_target = self.target_left <= particle.x <= self.target_right and 20 <= particle.y <= height - 18
            if not in_target:
                continue

            depth_fraction = (particle.x - self.target_left) / max(self.target_right - self.target_left, 1)
            depth_fraction = max(0.0, min(depth_fraction, 0.999))
            index = int(depth_fraction * (len(profile.let_kev_nm) - 1))
            local_let = float(profile.let_kev_nm[index])
            local_collision = float(profile.collision_density[index])
            brightness = 0.6 + 1.6 * local_let / max(max_let, 1.0e-9)
            self.engine.add_track(old_x, old_y, particle.x, particle.y, self._track_color(brightness), 2.0 + brightness)

            collision_probability = min(0.24, 0.015 + local_collision / max(self.result.collisions, 1) * 0.18)
            if self.random.random() < collision_probability:
                self._collision_event(particle, local_let)
                scatter = self.random.gauss(0.0, 0.18 + 0.02 * self.parameters.beam_spread_deg)
                speed = max(1.8, math.hypot(particle.vx, particle.vy) * 0.965)
                angle = math.atan2(particle.vy, particle.vx) + scatter
                particle.vx = speed * math.cos(angle)
                particle.vy = speed * math.sin(angle)

            if particle.x > self.target_right - 20 or particle.energy < 0.15:
                self._stopping_region_event(particle)
                particle.ttl = min(particle.ttl, 8)

    def _collision_event(self, ion: Particle, local_let: float) -> None:
        color = "#ffcc66" if local_let < 1.0 else "#ff5f7e"
        self.engine.add_flash(Flash(ion.x, ion.y, 4.0 + local_let * 2.0, color, 10, "collision"))

        for _ in range(2 + int(local_let > 1.5)):
            angle = self.random.uniform(0, 2 * math.pi)
            speed = self.random.uniform(1.2, 3.6)
            self.engine.add_particle(
                Particle(
                    x=ion.x,
                    y=ion.y,
                    vx=math.cos(angle) * speed,
                    vy=math.sin(angle) * speed,
                    radius=2.2,
                    color="#9be7ff",
                    ttl=65,
                    kind="electron",
                    energy=0.65,
                )
            )

        recoil_angle = self.random.uniform(-0.9, 0.9)
        self.engine.add_particle(
            Particle(
                x=ion.x,
                y=ion.y,
                vx=math.cos(recoil_angle) * self.random.uniform(0.7, 2.1),
                vy=math.sin(recoil_angle) * self.random.uniform(0.7, 2.1),
                radius=3.0,
                color="#ff9f43",
                ttl=55,
                kind="recoil",
                energy=0.8,
            )
        )

    def _stopping_region_event(self, particle: Particle) -> None:
        self.engine.add_flash(Flash(particle.x, particle.y, 12.0, "#ff4d6d", 18, "defect cluster"))
        if particle.x > self.target_right - 24 and self.random.random() < 0.35:
            self.engine.add_particle(
                Particle(
                    x=self.target_left + self.random.uniform(-8, 6),
                    y=particle.y + self.random.uniform(-16, 16),
                    vx=-self.random.uniform(1.5, 3.8),
                    vy=-self.random.uniform(0.8, 2.5),
                    radius=2.6,
                    color="#ffd166",
                    ttl=60,
                    kind="sputtered",
                    energy=0.5,
                )
            )

    def redraw(self) -> None:
        width = max(self.winfo_width(), 200)
        height = max(self.winfo_height(), 160)
        self.target_left = max(72, int(width * 0.10))
        self.target_right = width - 34
        self.delete("all")
        self._draw_static_scene(width, height)
        self._draw_tracks()
        self._draw_particles()
        self._draw_flashes()
        self._draw_overlay(width, height)

    def _draw_static_scene(self, width: int, height: int) -> None:
        self.create_rectangle(0, 0, width, height, fill="#06111f", outline="")
        self.create_line(0, 28, width, 28, fill="#12304d")
        title = "LIVE ION-MATTER INTERACTION"
        self.create_text(18, 15, text=title, fill="#d9f3ff", anchor="w", font=("Helvetica", 11, "bold"))

        self.create_rectangle(self.target_left, 40, self.target_right, height - 18, fill="#0b1d2d", outline="#31516d")
        self.create_line(self.target_left, 40, self.target_left, height - 18, fill="#78d7ff", width=2)
        self.create_text(self.target_left + 10, 52, text="target surface", anchor="w", fill="#78d7ff", font=("Helvetica", 9))

        self._draw_lattice(width, height)
        self._draw_beam_aperture(height)
        self._draw_depth_axis(width, height)

    def _draw_lattice(self, width: int, height: int) -> None:
        if not self.parameters:
            atom_color = "#42627c"
        else:
            colors = {
                "Metals": "#5d7fa2",
                "Semiconductors": "#5d8f7a",
                "Polymers": "#7c6ca8",
                "Insulators": "#6d8fb8",
            }
            atom_color = colors.get(self.parameters.target.material_class, "#5d7fa2")
        spacing = 28
        for x in range(self.target_left + 22, self.target_right - 12, spacing):
            for y in range(66, height - 34, spacing):
                jitter = ((x * 31 + y * 17) % 7) - 3
                self.create_oval(x - 3, y + jitter - 3, x + 3, y + jitter + 3, fill=atom_color, outline="#9ac9f5")

    def _draw_beam_aperture(self, height: int) -> None:
        center = height * 0.50
        self.create_rectangle(18, center - 76, 34, center + 76, fill="#14263a", outline="#4f789b")
        for offset in [-50, 0, 50]:
            self.create_line(34, center + offset, self.target_left - 4, center + offset, fill="#143d5b", dash=(4, 6))

    def _draw_depth_axis(self, width: int, height: int) -> None:
        axis_y = height - 10
        self.create_line(self.target_left, axis_y, self.target_right, axis_y, fill="#4c708f")
        if self.result:
            label = f"depth: 0 to {self.result.penetration_depth_nm:.0f} nm"
            self.create_text(self.target_right - 8, axis_y - 8, text=label, anchor="e", fill="#9cc9e6", font=("Helvetica", 9))

    def _draw_tracks(self) -> None:
        for x0, y0, x1, y1, color, ttl, width_value in self.engine.tracks:
            self.create_line(x0, y0, x1, y1, fill="#123f68", width=max(width_value + 5, 2), capstyle=tk.ROUND)
            self.create_line(x0, y0, x1, y1, fill=color, width=max(width_value, 1), capstyle=tk.ROUND)

    def _draw_particles(self) -> None:
        for particle in self.engine.particles:
            if len(particle.trail) > 1:
                points = []
                for x, y in particle.trail:
                    points.extend([x, y])
                self.create_line(points, fill="#1a4c6c", width=2, smooth=True)
            r = particle.radius
            self.create_oval(particle.x - r * 2.2, particle.y - r * 2.2, particle.x + r * 2.2, particle.y + r * 2.2, fill="#09233b", outline="")
            self.create_oval(particle.x - r, particle.y - r, particle.x + r, particle.y + r, fill=particle.color, outline="#e9fbff")
            if particle.kind == "ion" and self.parameters:
                self.create_text(particle.x, particle.y - r - 9, text=self.parameters.ion.symbol, fill="#dff8ff", font=("Helvetica", 8, "bold"))

    def _draw_flashes(self) -> None:
        for flash in self.engine.flashes:
            r = flash.radius
            self.create_oval(flash.x - r, flash.y - r, flash.x + r, flash.y + r, outline=flash.color, width=2)
            inner = max(2, r * 0.35)
            self.create_oval(flash.x - inner, flash.y - inner, flash.x + inner, flash.y + inner, fill=flash.color, outline="")

    def _draw_overlay(self, width: int, height: int) -> None:
        if not self.parameters or not self.result:
            self.create_text(width / 2, height / 2, text="Select ion and material, then start simulation", fill="#cfefff")
            return
        ion_label = f"{self.parameters.ion.symbol}{self.parameters.charge_state}+"
        lines = [
            f"Ion: {ion_label}   Energy: {self.parameters.energy_kev:.0f} keV",
            f"LET: {self.result.let_kev_nm:.3f} keV/nm   Range: {self.result.penetration_depth_nm:.0f} nm",
            f"Se/Sn: {self.result.electronic_stopping_kev_nm:.3f}/{self.result.nuclear_stopping_kev_nm:.3f} keV/nm",
        ]
        x = self.target_left + 14
        y = height - 68
        self.create_rectangle(x - 8, y - 10, x + 360, y + 54, fill="#071625", outline="#25435e")
        for index, line in enumerate(lines):
            self.create_text(x, y + index * 18, text=line, anchor="w", fill="#e7f8ff", font=("Helvetica", 9))

    def _ion_color(self) -> str:
        if not self.parameters:
            return "#66e0ff"
        z = self.parameters.ion.atomic_number
        if z <= 2:
            return "#78f3ff"
        if z < 18:
            return "#8cff9b"
        if z < 54:
            return "#ffd166"
        return "#ff7aa2"

    @staticmethod
    def _track_color(brightness: float) -> str:
        if brightness > 1.8:
            return "#ff6b8a"
        if brightness > 1.2:
            return "#ffd166"
        return "#4dd8ff"


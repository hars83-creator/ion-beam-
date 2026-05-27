"""Small deterministic particle system used by the Tkinter canvas."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    radius: float
    color: str
    ttl: int
    kind: str
    energy: float = 1.0
    trail: List[Tuple[float, float]] = field(default_factory=list)

    def step(self) -> None:
        self.trail.append((self.x, self.y))
        if len(self.trail) > 18:
            self.trail.pop(0)
        self.x += self.vx
        self.y += self.vy
        self.ttl -= 1
        self.energy *= 0.985
        self.radius = max(1.0, self.radius * 0.995)

    @property
    def alive(self) -> bool:
        return self.ttl > 0 and self.energy > 0.02


@dataclass
class Flash:
    x: float
    y: float
    radius: float
    color: str
    ttl: int
    label: str = ""

    def step(self) -> None:
        self.radius *= 1.12
        self.ttl -= 1

    @property
    def alive(self) -> bool:
        return self.ttl > 0


class AnimationEngine:
    """Stores particles, transient flashes, and track segments."""

    def __init__(self) -> None:
        self.particles: List[Particle] = []
        self.flashes: List[Flash] = []
        self.tracks: List[Tuple[float, float, float, float, str, int, float]] = []

    def clear(self) -> None:
        self.particles.clear()
        self.flashes.clear()
        self.tracks.clear()

    def add_particle(self, particle: Particle) -> None:
        self.particles.append(particle)

    def add_flash(self, flash: Flash) -> None:
        self.flashes.append(flash)

    def add_track(self, x0: float, y0: float, x1: float, y1: float, color: str, width: float) -> None:
        self.tracks.append((x0, y0, x1, y1, color, 34, width))

    def step(self, width: int, height: int) -> None:
        for particle in self.particles:
            particle.step()
        for flash in self.flashes:
            flash.step()

        self.particles = [
            p for p in self.particles if p.alive and -80 < p.x < width + 80 and -80 < p.y < height + 80
        ]
        self.flashes = [f for f in self.flashes if f.alive]

        aged = []
        for x0, y0, x1, y1, color, ttl, width_value in self.tracks:
            if ttl > 1:
                aged.append((x0, y0, x1, y1, color, ttl - 1, width_value * 0.965))
        self.tracks = aged[-220:]


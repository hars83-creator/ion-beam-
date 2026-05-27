# Ion Beam Irradiation Simulator

A virtual ion beam irradiation laboratory for understanding ion-matter interaction physics through live scientific visualization, material databases, and real-time calculations.

## What Is Included

- Python/Tkinter scientific dashboard with a dark laboratory interface.
- Tkinter Canvas animation of ion trajectories, electron excitation, recoil atoms, collision cascades, sputtering, thermal glow, lattice atoms, and defect regions.
- NumPy/SciPy-style physics engine using LET, electronic stopping, nuclear stopping, total stopping, ion velocity, beam current, range scaling, defect generation, and temperature rise approximations.
- Embedded matplotlib graph dashboard for energy, LET, stopping, collision, range, temperature, intensity, and defect profiles.
- Complete 118-element periodic table support for ion species.
- Structured material database covering metals, alloys, oxides, semiconductors, polymers, and insulators.
- CSV, graph, report, screenshot, save, and load actions.
- Static website preview in `website/`.

## Install

Use a Python build with Tk support. On many systems the system Python includes Tk; some Homebrew Python builds do not.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Run Desktop App

First verify that the active Python has Tkinter and scientific packages:

```bash
python check_environment.py
```

To also test whether Tk can actually open a window:

```bash
python check_environment.py --gui
```

```bash
python main.py
```

## Run Smoke Check

```bash
python tests/smoke_check.py
```

## Open Website

The website is static. Open `website/index.html` directly, or serve it locally:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/website/`.

## Module Map

- `main.py` - application entry point.
- `ui_components.py` - Tkinter layout, controls, panels, export actions.
- `simulation_canvas.py` - live Canvas scene.
- `animation_engine.py` - deterministic particle and flash model.
- `physics_engine.py` - semi-empirical ion-matter calculations.
- `periodic_table.py` - 118-element data and classifications.
- `materials_database.py` - structured target material database.
- `graphs.py` - embedded matplotlib dashboards.
- `utilities.py` - formatting, reports, CSV, save/load.

## Scientific Note

This simulator is designed for education and rapid exploration. It uses explainable semi-empirical formulas and material coefficients to show realistic trends. It should not be treated as a replacement for validated transport codes such as SRIM/TRIM, Geant4, or full binary collision approximation workflows.

## macOS Tkinter Note

If `python main.py` reports that `_tkinter` is missing, use a Python build that includes Tk. The installer from python.org usually includes Tk. With Homebrew Python, install Tk support in the same Python family:

```bash
brew search python-tk
brew install python-tk@3.14
```

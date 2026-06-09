# Ion Beam Irradiation Simulator

A virtual ion beam irradiation laboratory for understanding ion-matter interaction physics through live scientific visualization, material databases, and real-time calculations.

## What Is Included

- Python/Tkinter scientific dashboard with a dark laboratory interface.
- Tkinter Canvas animation of ion trajectories, electron excitation, recoil atoms, collision cascades, sputtering, thermal glow, lattice atoms, and defect regions.
- NumPy/SciPy-style physics engine using LET, electronic stopping, nuclear stopping, total stopping, ion velocity, beam current, range scaling, defect generation, and temperature rise approximations.
- Embedded matplotlib graph dashboard for energy, LET, stopping, collision, range, temperature, intensity, and defect profiles.
- Complete 118-element periodic table support for ion species.
- Structured material database covering metals, alloys, oxides, semiconductors, polymers, and insulators.
- JSON-backed research database with 118 elements, stable isotopes, common ion charge states, and 120+ materials.
- Browser research dashboard with twelve tabs, parameter sweeps, comparisons, experiment history, learning content, and exports.
- Advanced research modules for material exploration, crystal structures, Bragg peak comparison, multi-layer targets, time evolution, annealing recovery, radiation hardness ranking, AI-style recommendations, reverse beam recipes, device/polymer/surface response, uncertainty, SRIM comparison, and publication/notebook output.
- Final browser lab polish with global search, eV/keV/MeV/GeV energy conversion, quick energy presets up to 5 GeV, before/during/after property evolution, health and damage gauges, radar charts, heatmaps, correlation matrices, smart material finder, and multi-scale scene views.
- HTTP API endpoints for headless simulation and research summaries when served with `run_web.py`.
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

The browser laboratory is the recommended mode for GitHub Codespaces, containers, SSH sessions, and any environment without a graphical display:

```bash
python run_web.py
```

Then visit `http://localhost:8000/website/`.

In GitHub Codespaces, open the forwarded port `8000` and append `/website/`.

The browser laboratory includes:

- full periodic table and stable isotope selector
- JSON database explorer
- material and ion comparison
- research parameter sweeps
- experiment history
- learning levels
- live physics-driven interaction animation
- JSON, CSV, report, profile, history, and session exports
- advanced material explorer, crystal/Bragg lab, multilayer/time lab, radiation/AI lab, publication notebook, grand comparison matrix, accelerator facility presets, and SRIM/TRIM comparison
- final visualization tools for material integrity, damage class, property status, timeline evolution, radar/heatmap/correlation analysis, smart search, and dedicated interaction/crystal/electron/damage/thermal/track/polymer scene modes

## Scientific Databases

The `data/` directory is the runtime database source:

- `data/elements.json`
- `data/isotopes.json`
- `data/materials.json`
- `data/manifest.json`

New material records can be added to `data/materials.json` without changing Python code. Regenerate the curated database files after changing source records with:

```bash
python tools/generate_databases.py
```

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
- `database.py` - JSON scientific database loader, filters, search, and validation.
- `research_modules.py` - advanced research lab calculations and reporting helpers.
- `lab_server.py` - static web server request handler with `/api/simulate`, `/api/research`, and `/api/srim/compare`.
- `run_web.py` - Codespaces-friendly browser laboratory server.
- `tools/generate_databases.py` - reproducible JSON database generator.

## Scientific Note

This simulator is designed for education and rapid exploration. It uses explainable semi-empirical formulas and material coefficients to show realistic trends. It should not be treated as a replacement for validated transport codes such as SRIM/TRIM, Geant4, or full binary collision approximation workflows.

## macOS Tkinter Note

If `python main.py` reports that `_tkinter` is missing, use a Python build that includes Tk. The installer from python.org usually includes Tk. With Homebrew Python, install Tk support in the same Python family:

```bash
brew search python-tk
brew install python-tk@3.14
```

If `python main.py` reports `no display name and no $DISPLAY environment variable`, the environment is headless. Run:

```bash
python run_web.py
```

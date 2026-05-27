"""Export, formatting, and persistence helpers."""

from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Dict

from physics_engine import BeamParameters, SimulationResult, result_to_serializable


def format_number(value: float, precision: int = 3) -> str:
    abs_value = abs(value)
    if abs_value == 0:
        return "0"
    if abs_value >= 1.0e5 or abs_value < 1.0e-2:
        return f"{value:.{precision}e}"
    return f"{value:.{precision}f}"


def parameters_to_dict(parameters: BeamParameters) -> Dict[str, object]:
    return {
        "ion_symbol": parameters.ion.symbol,
        "target_name": parameters.target.name,
        "charge_state": parameters.charge_state,
        "energy_kev": parameters.energy_kev,
        "fluence_ions_cm2": parameters.fluence_ions_cm2,
        "irradiation_time_s": parameters.irradiation_time_s,
        "let_kev_nm": parameters.let_kev_nm,
        "beam_current_na": parameters.beam_current_na,
        "beam_angle_deg": parameters.beam_angle_deg,
        "beam_spread_deg": parameters.beam_spread_deg,
        "beam_intensity": parameters.beam_intensity,
        "simulation_speed": parameters.simulation_speed,
        "mode": parameters.mode,
    }


def export_profile_csv(path: str | Path, result: SimulationResult) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "depth_nm",
                "energy_kev",
                "let_kev_nm",
                "electronic_stopping_kev_nm",
                "nuclear_stopping_kev_nm",
                "temperature_rise_k",
                "defect_density_cm3",
                "collision_density",
            ]
        )
        profile = result.profile
        for row in zip(
            profile.depth_nm,
            profile.energy_kev,
            profile.let_kev_nm,
            profile.electronic_stopping,
            profile.nuclear_stopping,
            profile.temperature_rise_k,
            profile.defect_density,
            profile.collision_density,
        ):
            writer.writerow([f"{float(value):.8g}" for value in row])


def export_report(path: str | Path, parameters: BeamParameters, result: SimulationResult) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    outputs = result.scalar_outputs()
    lines = [
        "ION BEAM IRRADIATION SIMULATION REPORT",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "Ion",
        f"  Species: {parameters.ion.name} ({parameters.ion.symbol}{parameters.charge_state}+)",
        f"  Atomic number: {parameters.ion.atomic_number}",
        f"  Atomic mass: {parameters.ion.atomic_mass} amu",
        f"  Electron configuration: {parameters.ion.electron_configuration}",
        "",
        "Target",
        f"  Material: {parameters.target.name}",
        f"  Formula: {parameters.target.formula}",
        f"  Class: {parameters.target.material_class} / {parameters.target.subclass}",
        f"  Density: {parameters.target.density} g/cm^3",
        f"  Displacement energy: {parameters.target.displacement_energy} eV",
        "",
        "Beam Parameters",
    ]
    for key, value in parameters_to_dict(parameters).items():
        lines.append(f"  {key}: {value}")
    lines.extend(["", "Calculated Outputs"])
    for key, value in outputs.items():
        lines.append(f"  {key}: {format_number(value)}")
    lines.extend(["", "Explanation", result.explanation, ""])
    target.write_text("\n".join(lines), encoding="utf-8")


def save_experiment(path: str | Path, parameters: BeamParameters, result: SimulationResult) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "parameters": parameters_to_dict(parameters),
        "result": result_to_serializable(result),
    }
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def load_experiment(path: str | Path) -> Dict[str, object]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


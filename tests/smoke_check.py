"""Non-GUI smoke checks for the simulator core."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from materials_database import MATERIALS, get_material
from database import ScientificDatabase
from periodic_table import PERIODIC_TABLE, get_element
from physics_engine import BeamParameters, PhysicsEngine
from utilities import export_profile_csv, export_report


def main() -> None:
    assert len(PERIODIC_TABLE) == 118
    assert len(MATERIALS) >= 120
    database = ScientificDatabase()
    assert len(database.elements) == 118
    assert len(database.isotopes) >= 250
    assert database.validate() == {}

    parameters = BeamParameters(
        ion=get_element("Ar"),
        target=get_material("Iron"),
        charge_state=1,
        energy_kev=500.0,
        fluence_ions_cm2=1.0e13,
        irradiation_time_s=60.0,
        let_kev_nm=0.35,
        beam_current_na=100.0,
        beam_angle_deg=0.0,
        beam_spread_deg=4.0,
        beam_intensity=4.0,
        simulation_speed=1.0,
        mode="Educational",
    )
    result = PhysicsEngine().calculate(parameters)
    assert result.penetration_depth_nm > 0
    assert result.ion_velocity_m_s > 0
    assert result.collisions > 0
    assert result.vacancies_per_ion > 0
    assert result.secondary_electrons_per_ion > 0
    assert result.radiation_damage_dpa >= 0
    assert result.profile.depth_nm.shape == result.profile.energy_kev.shape
    assert len(PhysicsEngine().parameter_sweep(parameters, "energy_kev", [100, 200, 300])) == 3

    output_dir = Path("build/smoke")
    output_dir.mkdir(parents=True, exist_ok=True)
    export_profile_csv(output_dir / "profile.csv", result)
    export_report(output_dir / "report.txt", parameters, result)
    assert (output_dir / "profile.csv").exists()
    assert (output_dir / "report.txt").exists()
    print("smoke check passed")


if __name__ == "__main__":
    main()

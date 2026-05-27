"""Non-GUI smoke checks for the simulator core."""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from materials_database import MATERIALS, get_material
from periodic_table import PERIODIC_TABLE, get_element
from physics_engine import BeamParameters, PhysicsEngine
from utilities import export_profile_csv, export_report


def main() -> None:
    assert len(PERIODIC_TABLE) == 118
    assert len(MATERIALS) >= 90

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
    assert result.profile.depth_nm.shape == result.profile.energy_kev.shape

    output_dir = Path("build/smoke")
    output_dir.mkdir(parents=True, exist_ok=True)
    export_profile_csv(output_dir / "profile.csv", result)
    export_report(output_dir / "report.txt", parameters, result)
    assert (output_dir / "profile.csv").exists()
    assert (output_dir / "report.txt").exists()
    print("smoke check passed")


if __name__ == "__main__":
    main()

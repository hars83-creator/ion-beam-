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
from research_modules import Layer, ResearchSuite
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

    suite = ResearchSuite(database)
    assert suite.material_explorer("Silicon")
    assert suite.crystal_structure(get_material("Silicon"))["crystal_structure"] in {"Diamond Cubic", "FCC"}
    assert suite.bragg_peak(parameters)["peak_depth_nm"] >= 0
    multilayer = suite.multilayer_target(parameters, [Layer(get_material("PTFE (Teflon)"), 100.0), Layer(get_material("Silicon"), 200.0)])
    assert multilayer["layers"]
    assert suite.time_evolution(result, parameters.target)
    assert suite.annealing_recovery(result, 700.0, 3600.0)["recovery_fraction"] >= 0
    assert suite.ion_track(result, parameters.fluence_ions_cm2)["track_radius_nm"] > 0
    assert suite.semiconductor_device(result, get_material("Silicon"))["leakage_current_multiplier"] >= 1
    assert suite.polymer_irradiation(result, get_material("PTFE (Teflon)"))["molecular_weight_retention"] > 0
    assert suite.surface_engineering(result)["surface_roughness_nm"] > 0
    candidate_materials = [name for name in ["PTFE (Teflon)", "PEEK", "Silicon"] if name in MATERIALS]
    assert suite.recommend("Improve hardness", ["H", "Ar", "Xe"], candidate_materials)["recommended_ion"]["ion"] == "Xe"
    assert suite.reverse_engineer({"bandgap": 3.4})["best_ion"]
    assert suite.uncertainty(result)["range_nm"]["high"] >= result.penetration_depth_nm
    assert suite.grand_comparison(parameters, ["H", "Ar"], ["Silicon", "PTFE (Teflon)"])
    assert suite.digital_twin(result, parameters.target)["predicted_final_state"]
    assert suite.notebook_entry(parameters, result, "smoke")["notes"] == "smoke"
    assert "abstract" in suite.publication_report(parameters, result)
    srim_rows = suite.parse_srim_table("500 1.1 0.4 800\n1000 1.4 0.3 2100")
    assert suite.compare_srim(result, srim_rows)["nearest_srim"]

    output_dir = Path("build/smoke")
    output_dir.mkdir(parents=True, exist_ok=True)
    export_profile_csv(output_dir / "profile.csv", result)
    export_report(output_dir / "report.txt", parameters, result)
    assert (output_dir / "profile.csv").exists()
    assert (output_dir / "report.txt").exists()
    print("smoke check passed")


if __name__ == "__main__":
    main()

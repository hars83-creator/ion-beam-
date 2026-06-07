"""Generate research-scale JSON databases from curated Python records."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from materials_database import Material, all_materials, material, optical, stopping
from periodic_table import all_elements


STABLE_ISOTOPES: Dict[str, tuple[int, ...]] = {
    "H": (1, 2),
    "He": (3, 4),
    "Li": (6, 7),
    "Be": (9,),
    "B": (10, 11),
    "C": (12, 13),
    "N": (14, 15),
    "O": (16, 17, 18),
    "F": (19,),
    "Ne": (20, 21, 22),
    "Na": (23,),
    "Mg": (24, 25, 26),
    "Al": (27,),
    "Si": (28, 29, 30),
    "P": (31,),
    "S": (32, 33, 34, 36),
    "Cl": (35, 37),
    "Ar": (36, 38, 40),
    "K": (39, 41),
    "Ca": (40, 42, 43, 44, 46, 48),
    "Sc": (45,),
    "Ti": (46, 47, 48, 49, 50),
    "V": (51,),
    "Cr": (50, 52, 53, 54),
    "Mn": (55,),
    "Fe": (54, 56, 57, 58),
    "Co": (59,),
    "Ni": (58, 60, 61, 62, 64),
    "Cu": (63, 65),
    "Zn": (64, 66, 67, 68, 70),
    "Ga": (69, 71),
    "Ge": (70, 72, 73, 74, 76),
    "As": (75,),
    "Se": (74, 76, 77, 78, 80, 82),
    "Br": (79, 81),
    "Kr": (78, 80, 82, 83, 84, 86),
    "Rb": (85,),
    "Sr": (84, 86, 87, 88),
    "Y": (89,),
    "Zr": (90, 91, 92, 94, 96),
    "Nb": (93,),
    "Mo": (92, 94, 95, 96, 97, 98, 100),
    "Ru": (96, 98, 99, 100, 101, 102, 104),
    "Rh": (103,),
    "Pd": (102, 104, 105, 106, 108, 110),
    "Ag": (107, 109),
    "Cd": (106, 108, 110, 111, 112, 113, 114, 116),
    "In": (113,),
    "Sn": (112, 114, 115, 116, 117, 118, 119, 120, 122, 124),
    "Sb": (121, 123),
    "Te": (120, 122, 123, 124, 125, 126, 128, 130),
    "I": (127,),
    "Xe": (124, 126, 128, 129, 130, 131, 132, 134, 136),
    "Cs": (133,),
    "Ba": (130, 132, 134, 135, 136, 137, 138),
    "La": (139,),
    "Ce": (136, 138, 140, 142),
    "Pr": (141,),
    "Nd": (142, 143, 145, 146, 148, 150),
    "Sm": (144, 149, 150, 152, 154),
    "Eu": (151, 153),
    "Gd": (154, 155, 156, 157, 158, 160),
    "Tb": (159,),
    "Dy": (156, 158, 160, 161, 162, 163, 164),
    "Ho": (165,),
    "Er": (162, 164, 166, 167, 168, 170),
    "Tm": (169,),
    "Yb": (168, 170, 171, 172, 173, 174, 176),
    "Lu": (175,),
    "Hf": (174, 176, 177, 178, 179, 180),
    "Ta": (181,),
    "W": (180, 182, 183, 184, 186),
    "Re": (185,),
    "Os": (184, 186, 187, 188, 189, 190, 192),
    "Ir": (191, 193),
    "Pt": (190, 192, 194, 195, 196, 198),
    "Au": (197,),
    "Hg": (196, 198, 199, 200, 201, 202, 204),
    "Tl": (203, 205),
    "Pb": (204, 206, 207, 208),
}

ABUNDANCE_PERCENT = {
    ("H", 1): 99.9885,
    ("H", 2): 0.0115,
    ("He", 3): 0.000137,
    ("He", 4): 99.999863,
    ("C", 12): 98.93,
    ("C", 13): 1.07,
    ("N", 14): 99.636,
    ("N", 15): 0.364,
    ("O", 16): 99.757,
    ("O", 17): 0.038,
    ("O", 18): 0.205,
    ("Si", 28): 92.223,
    ("Si", 29): 4.685,
    ("Si", 30): 3.092,
    ("Fe", 54): 5.845,
    ("Fe", 56): 91.754,
    ("Fe", 57): 2.119,
    ("Fe", 58): 0.282,
    ("Cu", 63): 69.15,
    ("Cu", 65): 30.85,
}


def supplemental(
    name: str,
    formula: str,
    material_class: str,
    subclass: str,
    density: float,
    bandgap: Optional[float],
    radiation_tolerance: str,
    thermal_conductivity: float = 5.0,
    dielectric_constant: Optional[float] = 8.0,
    electrical_conductivity: float = 1.0e-8,
) -> Material:
    entry = material(
        name=name,
        formula=formula,
        material_class=material_class,
        subclass=subclass,
        density=density,
        melting_point=None,
        thermal_conductivity=thermal_conductivity,
        electrical_conductivity=electrical_conductivity,
        bandgap=bandgap,
        atomic_mass=80.0,
        dielectric_constant=dielectric_constant,
        displacement_energy=25.0,
        opt=optical(1.8, None if not bandgap else 1240 / bandgap, "material dependent"),
        stop=stopping(0.9, 0.6, 1.1, 0.15),
        notes="Supplemental research database record; validate coefficients for precision transport work.",
    )
    data = entry.to_dict()
    data["radiation_tolerance"] = radiation_tolerance
    data["radiation_hardness"] = radiation_tolerance
    return Material(
        optical_properties=entry.optical_properties,
        stopping_coefficients=entry.stopping_coefficients,
        **{key: value for key, value in data.items() if key not in {"optical_properties", "stopping_coefficients"}},
    )


def supplemental_materials() -> List[Material]:
    return [
        supplemental("InSb", "InSb", "Semiconductors", "III-V semiconductors", 5.78, 0.17, "low"),
        supplemental("InGaAs", "InGaAs", "Semiconductors", "III-V semiconductors", 5.67, 0.75, "moderate"),
        supplemental("InGaN", "InGaN", "Semiconductors", "III-V semiconductors", 6.1, 2.4, "high"),
        supplemental("AlGaN", "AlGaN", "Semiconductors", "III-V semiconductors", 4.2, 4.0, "high"),
        supplemental("HgCdTe", "HgCdTe", "Semiconductors", "II-VI semiconductors", 7.5, 0.2, "low"),
        supplemental("Beta-Ga2O3", "Ga2O3", "Semiconductors", "Wide bandgap semiconductors", 5.88, 4.8, "high"),
        supplemental("Rubrene", "C42H28", "Semiconductors", "Organic semiconductors", 1.26, 2.2, "low"),
        supplemental("Fullerene derivatives", "C60 derivatives", "Semiconductors", "Organic semiconductors", 1.65, 1.8, "moderate"),
        supplemental("LLDPE", "(C2H4)n", "Polymers", "Thermoplastic polymers", 0.93, 8.8, "low"),
        supplemental("TPU", "Thermoplastic polyurethane", "Polymers", "Thermoplastic polymers", 1.20, 4.0, "low"),
        supplemental("PES", "Polyethersulfone", "Polymers", "Engineering polymers", 1.37, 3.5, "moderate"),
        supplemental("Mullite", "3Al2O3-2SiO2", "Insulators", "Ceramic insulators", 3.16, 7.5, "high"),
        supplemental("Soda Lime Glass", "SiO2-Na2O-CaO", "Insulators", "Glass insulators", 2.52, 7.0, "moderate"),
        supplemental("Polypropylene Insulator", "(C3H6)n", "Insulators", "Polymer insulators", 0.90, 7.0, "low"),
        supplemental("Carbon Fiber Reinforced Polymer", "CFRP", "Composites", "Fiber composites", 1.60, None, "moderate", 6.0),
        supplemental("Glass Fiber Reinforced Polymer", "GFRP", "Composites", "Fiber composites", 1.90, None, "moderate", 0.4),
        supplemental("SiC/SiC Composite", "SiC-SiC", "Composites", "Ceramic matrix composites", 2.80, 3.2, "very high", 20.0),
        supplemental("Carbon-Carbon Composite", "C-C", "Composites", "Carbon composites", 1.75, None, "very high", 80.0),
        supplemental("ODS Ferritic Steel", "Fe-Cr-Y2O3", "Radiation-resistant materials", "Dispersion strengthened alloys", 7.8, 0.0, "very high", 25.0, None, 1.0e6),
        supplemental("RAFM Steel", "Fe-Cr-W-V-Ta", "Radiation-resistant materials", "Reduced activation alloys", 7.8, 0.0, "very high", 30.0, None, 1.0e6),
        supplemental("Nuclear-grade Graphite", "C", "Radiation-resistant materials", "Carbon materials", 1.80, 0.0, "very high", 120.0, None, 1.0e4),
        supplemental("Sapphire", "Al2O3", "Radiation-resistant materials", "Radiation-hard dielectrics", 3.98, 8.8, "very high", 35.0),
    ]


def isotope_records() -> List[Dict[str, object]]:
    elements = {element.symbol: element for element in all_elements()}
    records: List[Dict[str, object]] = []
    for symbol, mass_numbers in STABLE_ISOTOPES.items():
        element = elements[symbol]
        for mass_number in mass_numbers:
            records.append(
                {
                    "symbol": symbol,
                    "element": element.name,
                    "atomic_number": element.atomic_number,
                    "mass_number": mass_number,
                    "isotope_label": f"{symbol}-{mass_number}",
                    "stable": True,
                    "natural_abundance_percent": ABUNDANCE_PERCENT.get((symbol, mass_number)),
                    "data_quality": "curated mass number; abundance may require external reference",
                }
            )
    return records


def write_json(name: str, payload: object) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / name).write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def main() -> None:
    element_records = []
    for element in all_elements():
        record = element.to_dict()
        record["scientific_name"] = element.name
        record["stable_isotopes"] = list(STABLE_ISOTOPES.get(element.symbol, ()))
        element_records.append(record)

    combined: Dict[str, Material] = {entry.name: entry for entry in all_materials()}
    for entry in supplemental_materials():
        combined[entry.name] = entry
    material_records = [entry.to_dict() for entry in sorted(combined.values(), key=lambda item: (item.material_class, item.subclass, item.name))]

    write_json("elements.json", {"schema_version": 1, "elements": element_records})
    write_json("isotopes.json", {"schema_version": 1, "isotopes": isotope_records()})
    write_json("materials.json", {"schema_version": 1, "materials": material_records})
    material_libraries = {
        "metals": [record for record in material_records if record["material_class"] == "Metals"],
        "semiconductors": [record for record in material_records if record["material_class"] == "Semiconductors"],
        "polymers": [record for record in material_records if record["material_class"] == "Polymers"],
        "insulators": [record for record in material_records if record["material_class"] == "Insulators"],
        "alloys": [record for record in material_records if "alloy" in record["subclass"].lower()],
        "oxides": [
            record
            for record in material_records
            if "oxide" in record["subclass"].lower()
            or "oxide" in record["name"].lower()
            or record["formula"] in {"Fe2O3", "CuO", "Al2O3", "ZnO", "TiO2", "MgO", "SiO2", "HfO2", "ZrO2", "Ga2O3"}
        ],
        "ceramics": [record for record in material_records if "ceramic" in record["subclass"].lower()],
        "glasses": [record for record in material_records if "glass" in record["subclass"].lower()],
        "composites": [record for record in material_records if record["material_class"] == "Composites"],
        "radiation_resistant": [
            record
            for record in material_records
            if record["material_class"] == "Radiation-resistant materials"
            or "high" in str(record["radiation_tolerance"]).lower()
        ],
    }
    for library_name, records in material_libraries.items():
        write_json(f"materials_{library_name}.json", {"schema_version": 1, "materials": records})

    databases = {
        "elements": {"file": "elements.json", "records": len(element_records)},
        "isotopes": {"file": "isotopes.json", "records": len(isotope_records())},
        "materials": {"file": "materials.json", "records": len(material_records)},
    }
    databases.update(
        {
            f"materials_{library_name}": {"file": f"materials_{library_name}.json", "records": len(records)}
            for library_name, records in material_libraries.items()
        }
    )
    write_json(
        "manifest.json",
        {
            "schema_version": 1,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "databases": databases,
            "extension_note": "Add records to the JSON arrays; application code discovers them at runtime.",
        },
    )
    print(f"generated {len(element_records)} elements, {len(isotope_records())} isotopes, {len(material_records)} materials")


if __name__ == "__main__":
    main()

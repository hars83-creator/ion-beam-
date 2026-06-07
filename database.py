"""JSON-backed scientific database access.

New elements, isotopes, and materials can be added to files in ``data/`` without
changing application code. The desktop app merges ``materials.json`` at import
time, while the browser dashboard reads the same files directly.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional


DATA_DIR = Path(__file__).with_name("data")

REQUIRED_MATERIAL_FIELDS = {
    "name",
    "formula",
    "material_class",
    "subclass",
    "density",
    "thermal_conductivity",
    "electrical_conductivity",
    "bandgap",
    "dielectric_constant",
    "specific_heat",
    "atomic_mass",
    "crystal_structure",
    "displacement_energy",
    "optical_properties",
    "radiation_tolerance",
    "stopping_coefficients",
}


def load_json(name: str, data_dir: Path = DATA_DIR) -> object:
    path = data_dir / name
    if not path.exists():
        raise FileNotFoundError(f"Scientific database file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def validate_material_record(record: Dict[str, object]) -> List[str]:
    missing = sorted(REQUIRED_MATERIAL_FIELDS.difference(record))
    errors = [f"missing field: {field}" for field in missing]
    if record.get("density") is not None and float(record["density"]) <= 0:
        errors.append("density must be positive")
    return errors


class ScientificDatabase:
    def __init__(self, data_dir: Path = DATA_DIR) -> None:
        self.data_dir = data_dir
        self.manifest: Dict[str, object] = {}
        self.elements: List[Dict[str, object]] = []
        self.materials: List[Dict[str, object]] = []
        self.isotopes: List[Dict[str, object]] = []
        self.reload()

    def reload(self) -> None:
        self.manifest = dict(load_json("manifest.json", self.data_dir))
        self.elements = list(load_json("elements.json", self.data_dir)["elements"])
        self.materials = list(load_json("materials.json", self.data_dir)["materials"])
        self.isotopes = list(load_json("isotopes.json", self.data_dir)["isotopes"])

    def search_elements(
        self,
        query: str = "",
        group: Optional[int] = None,
        period: Optional[int] = None,
        category: Optional[str] = None,
    ) -> List[Dict[str, object]]:
        lowered = query.lower().strip()
        return [
            record
            for record in self.elements
            if (not lowered or lowered in f"{record['name']} {record['symbol']}".lower())
            and (group is None or record.get("group") == group)
            and (period is None or record.get("period") == period)
            and (category is None or record.get("category") == category)
        ]

    def search_materials(
        self,
        query: str = "",
        material_class: Optional[str] = None,
        subclass: Optional[str] = None,
    ) -> List[Dict[str, object]]:
        lowered = query.lower().strip()
        return [
            record
            for record in self.materials
            if (
                not lowered
                or lowered
                in f"{record['name']} {record['formula']} {record['material_class']} {record['subclass']}".lower()
            )
            and (material_class is None or record.get("material_class") == material_class)
            and (subclass is None or record.get("subclass") == subclass)
        ]

    def isotopes_for(self, symbol: str) -> List[Dict[str, object]]:
        return [record for record in self.isotopes if record.get("symbol") == symbol]

    def material_classes(self) -> List[str]:
        return sorted({str(record["material_class"]) for record in self.materials})

    def validate(self) -> Dict[str, List[str]]:
        errors: Dict[str, List[str]] = {}
        for record in self.materials:
            record_errors = validate_material_record(record)
            if record_errors:
                errors[str(record.get("name", "unnamed"))] = record_errors
        return errors

    def iter_radiation_resistant(self) -> Iterable[Dict[str, object]]:
        for record in self.materials:
            tolerance = str(record.get("radiation_tolerance", "")).lower()
            if "high" in tolerance or record.get("material_class") == "Radiation-resistant materials":
                yield record

"""Structured target material database for the simulator."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, Iterable, List, Optional


@dataclass(frozen=True)
class OpticalProperties:
    refractive_index: Optional[float]
    absorption_edge_nm: Optional[float]
    transparency: str


@dataclass(frozen=True)
class StoppingCoefficients:
    electronic: float
    nuclear: float
    range_factor: float
    sputter_yield: float


@dataclass(frozen=True)
class Material:
    name: str
    formula: str
    material_class: str
    subclass: str
    density: float
    melting_point: Optional[float]
    thermal_conductivity: float
    electrical_conductivity: float
    bandgap: Optional[float]
    atomic_mass: float
    dielectric_constant: Optional[float]
    displacement_energy: float
    optical_properties: OpticalProperties
    stopping_coefficients: StoppingCoefficients
    notes: str

    def to_dict(self) -> Dict[str, object]:
        data = asdict(self)
        return data


def optical(n: Optional[float], edge: Optional[float], transparency: str) -> OpticalProperties:
    return OpticalProperties(n, edge, transparency)


def stopping(electronic: float, nuclear: float, range_factor: float, sputter_yield: float) -> StoppingCoefficients:
    return StoppingCoefficients(electronic, nuclear, range_factor, sputter_yield)


def material(
    name: str,
    formula: str,
    material_class: str,
    subclass: str,
    density: float,
    melting_point: Optional[float],
    thermal_conductivity: float,
    electrical_conductivity: float,
    bandgap: Optional[float],
    atomic_mass: float,
    dielectric_constant: Optional[float],
    displacement_energy: float,
    opt: OpticalProperties,
    stop: StoppingCoefficients,
    notes: str,
) -> Material:
    return Material(
        name=name,
        formula=formula,
        material_class=material_class,
        subclass=subclass,
        density=density,
        melting_point=melting_point,
        thermal_conductivity=thermal_conductivity,
        electrical_conductivity=electrical_conductivity,
        bandgap=bandgap,
        atomic_mass=atomic_mass,
        dielectric_constant=dielectric_constant,
        displacement_energy=displacement_energy,
        optical_properties=opt,
        stopping_coefficients=stop,
        notes=notes,
    )


MATERIALS: Dict[str, Material] = {}


def add(entry: Material) -> None:
    MATERIALS[entry.name] = entry


def _build() -> None:
    # Metals: pure metals
    for name, formula, density, melt, k, sigma, mass, ed, es, ns, rf, sy in [
        ("Iron", "Fe", 7.87, 1811, 80.4, 1.0e7, 55.845, 40, 1.28, 0.74, 1.00, 1.1),
        ("Copper", "Cu", 8.96, 1358, 401, 5.96e7, 63.546, 30, 1.20, 0.68, 1.08, 1.4),
        ("Aluminium", "Al", 2.70, 933, 237, 3.77e7, 26.982, 25, 0.86, 0.48, 1.48, 0.8),
        ("Nickel", "Ni", 8.91, 1728, 90.9, 1.43e7, 58.693, 40, 1.24, 0.72, 1.02, 1.0),
        ("Titanium", "Ti", 4.51, 1941, 21.9, 2.38e6, 47.867, 40, 1.08, 0.65, 1.18, 0.7),
        ("Gold", "Au", 19.30, 1337, 318, 4.1e7, 196.97, 35, 1.68, 1.02, 0.72, 2.4),
        ("Silver", "Ag", 10.49, 1235, 429, 6.3e7, 107.87, 30, 1.30, 0.78, 0.96, 1.7),
        ("Platinum", "Pt", 21.45, 2041, 71.6, 9.4e6, 195.08, 35, 1.74, 1.08, 0.70, 2.1),
        ("Tungsten", "W", 19.25, 3695, 173, 1.89e7, 183.84, 90, 1.62, 1.20, 0.62, 0.4),
        ("Chromium", "Cr", 7.19, 2180, 93.9, 7.9e6, 51.996, 40, 1.22, 0.76, 1.03, 0.6),
        ("Zinc", "Zn", 7.14, 693, 116, 1.69e7, 65.38, 25, 1.05, 0.58, 1.12, 1.2),
        ("Lead", "Pb", 11.34, 601, 35.3, 4.55e6, 207.2, 25, 1.42, 0.96, 0.82, 2.7),
        ("Magnesium", "Mg", 1.74, 923, 156, 2.3e7, 24.305, 25, 0.78, 0.42, 1.70, 0.9),
        ("Molybdenum", "Mo", 10.28, 2896, 138, 1.87e7, 95.95, 60, 1.42, 0.92, 0.88, 0.5),
        ("Cobalt", "Co", 8.90, 1768, 100, 1.7e7, 58.933, 40, 1.25, 0.73, 1.02, 0.9),
    ]:
        add(
            material(
                name,
                formula,
                "Metals",
                "Pure metals",
                density,
                melt,
                k,
                sigma,
                0.0,
                mass,
                None,
                ed,
                optical(None, None, "opaque metallic reflector"),
                stopping(es, ns, rf, sy),
                "Pure metal target with strong electron gas screening.",
            )
        )

    # Metals: alloys and conductive oxides
    for entry in [
        ("Stainless steel", "Fe-Cr-Ni", "Alloys", 8.00, 1670, 16.2, 1.45e6, 56.0, 40, 1.30, 0.82, 0.94, 0.8),
        ("Brass", "Cu-Zn", "Alloys", 8.50, 1190, 109, 1.6e7, 64.5, 28, 1.18, 0.66, 1.05, 1.5),
        ("Bronze", "Cu-Sn", "Alloys", 8.80, 1180, 60, 7.4e6, 70.0, 30, 1.22, 0.70, 1.00, 1.3),
        ("Inconel", "Ni-Cr-Fe", "Alloys", 8.44, 1620, 11.4, 1.0e6, 58.7, 40, 1.35, 0.86, 0.92, 0.6),
        ("Nichrome", "Ni-Cr", "Alloys", 8.40, 1670, 11.3, 9.1e5, 55.0, 40, 1.34, 0.84, 0.92, 0.5),
        ("Titanium alloys", "Ti-Al-V", "Alloys", 4.43, 1878, 6.7, 5.8e5, 47.0, 40, 1.10, 0.66, 1.15, 0.5),
        ("Fe2O3", "Fe2O3", "Oxides", 5.24, 1838, 6.7, 1.0e-2, 159.69, 45, 1.10, 0.95, 0.86, 0.35),
        ("CuO", "CuO", "Oxides", 6.31, 1599, 20, 1.0e-4, 79.55, 35, 1.05, 0.86, 0.92, 0.45),
        ("Al2O3", "Al2O3", "Oxides", 3.95, 2327, 30, 1.0e-12, 101.96, 40, 0.88, 0.66, 1.16, 0.08),
        ("ZnO", "ZnO", "Oxides", 5.61, 2248, 50, 1.0e-6, 81.38, 35, 1.00, 0.76, 0.96, 0.18),
        ("TiO2", "TiO2", "Oxides", 4.23, 2116, 8.4, 1.0e-12, 79.87, 45, 0.98, 0.72, 1.05, 0.10),
        ("MgO", "MgO", "Oxides", 3.58, 3125, 45, 1.0e-13, 40.30, 45, 0.82, 0.60, 1.25, 0.07),
    ]:
        name, formula, subclass, density, melt, k, sigma, mass, ed, es, ns, rf, sy = entry
        add(
            material(
                name,
                formula,
                "Metals" if subclass != "Oxides" else "Insulators",
                subclass if subclass != "Oxides" else "Oxide insulators",
                density,
                melt,
                k,
                sigma,
                None if subclass != "Oxides" else 3.0,
                mass,
                None if subclass != "Oxides" else 9.0,
                ed,
                optical(1.7 if subclass == "Oxides" else None, 380 if subclass == "Oxides" else None, "opaque or translucent"),
                stopping(es, ns, rf, sy),
                "Composite target; coefficients represent an educational Bragg-like mixture rule.",
            )
        )

    # Semiconductors
    semiconductor_entries = [
        ("Silicon", "Si", "Elemental semiconductors", 2.329, 1687, 148, 1.0e-4, 1.12, 28.085, 11.7, 15, 0.90, 0.55, 1.35, 0.12),
        ("Germanium", "Ge", "Elemental semiconductors", 5.323, 1211, 60, 2.0, 0.66, 72.63, 16.0, 20, 1.02, 0.68, 1.00, 0.22),
        ("Selenium", "Se", "Elemental semiconductors", 4.81, 494, 0.52, 1.0e-8, 1.74, 78.97, 6.1, 25, 0.95, 0.62, 1.08, 0.20),
        ("GaAs", "GaAs", "III-V semiconductors", 5.32, 1511, 55, 1.0e-6, 1.42, 144.64, 12.9, 10, 1.00, 0.62, 1.02, 0.20),
        ("GaN", "GaN", "III-V semiconductors", 6.15, 2773, 130, 1.0e-8, 3.40, 83.73, 9.5, 25, 1.10, 0.72, 0.92, 0.10),
        ("InP", "InP", "III-V semiconductors", 4.81, 1335, 68, 1.0e-7, 1.34, 145.79, 12.5, 10, 0.98, 0.60, 1.08, 0.18),
        ("InAs", "InAs", "III-V semiconductors", 5.67, 1215, 27, 1.0e-4, 0.35, 189.74, 15.1, 10, 1.02, 0.66, 0.98, 0.25),
        ("AlGaAs", "AlGaAs", "III-V semiconductors", 4.80, 1700, 55, 1.0e-8, 1.9, 100.0, 12.0, 15, 0.98, 0.60, 1.10, 0.16),
        ("CdTe", "CdTe", "II-VI semiconductors", 5.85, 1365, 6.2, 1.0e-5, 1.50, 240.0, 10.2, 12, 1.05, 0.70, 0.95, 0.25),
        ("ZnSe", "ZnSe", "II-VI semiconductors", 5.27, 1790, 18, 1.0e-8, 2.70, 144.35, 8.9, 25, 0.98, 0.62, 1.05, 0.14),
        ("ZnS", "ZnS", "II-VI semiconductors", 4.09, 2123, 27, 1.0e-12, 3.60, 97.44, 8.3, 25, 0.90, 0.56, 1.22, 0.10),
        ("CdS", "CdS", "II-VI semiconductors", 4.82, 2023, 16, 1.0e-8, 2.42, 144.48, 8.9, 20, 0.96, 0.60, 1.08, 0.14),
        ("SiC", "SiC", "IV-IV semiconductors", 3.21, 3100, 120, 1.0e-7, 3.26, 40.10, 9.7, 35, 0.82, 0.58, 1.38, 0.06),
        ("SiGe", "SiGe", "IV-IV semiconductors", 3.80, 1450, 80, 1.0e-3, 0.95, 50.0, 13.0, 18, 0.95, 0.60, 1.18, 0.16),
        ("Diamond", "C", "Wide bandgap semiconductors", 3.51, 3915, 2200, 1.0e-13, 5.47, 12.011, 5.7, 43, 0.70, 0.50, 1.65, 0.02),
        ("AlN", "AlN", "Wide bandgap semiconductors", 3.26, 3000, 285, 1.0e-12, 6.20, 40.99, 8.5, 25, 0.80, 0.56, 1.42, 0.04),
        ("P3HT", "(C10H14S)n", "Organic semiconductors", 1.10, 510, 0.2, 1.0e-4, 1.9, 166.3, 3.0, 8, 0.52, 0.20, 2.35, 0.35),
        ("PEDOT:PSS", "PEDOT:PSS", "Organic semiconductors", 1.00, 520, 0.4, 1.0e3, 1.6, 150.0, 4.0, 8, 0.55, 0.22, 2.20, 0.40),
        ("Pentacene", "C22H14", "Organic semiconductors", 1.30, 573, 0.15, 1.0e-6, 2.2, 278.35, 3.5, 8, 0.56, 0.22, 2.10, 0.38),
    ]
    for name, formula, subclass, density, melt, k, sigma, gap, mass, eps, ed, es, ns, rf, sy in semiconductor_entries:
        add(
            material(
                name,
                formula,
                "Semiconductors",
                subclass,
                density,
                melt,
                k,
                sigma,
                gap,
                mass,
                eps,
                ed,
                optical(2.4, 1240 / gap if gap else None, "band-edge absorption"),
                stopping(es, ns, rf, sy),
                "Semiconductor target; carrier excitation and defect-assisted recombination are emphasized.",
            )
        )

    # Polymers
    polymer_entries = [
        ("Polyethylene (PE)", "(C2H4)n", "Thermoplastic polymers", 0.94, 410, 0.42, 1e-16, 8.8, 2.3, 4.0, 0.42, 0.12, 3.8, 0.55),
        ("High Density Polyethylene (HDPE)", "(C2H4)n", "Thermoplastic polymers", 0.96, 403, 0.50, 1e-16, 8.8, 2.3, 4.0, 0.43, 0.12, 3.75, 0.55),
        ("Low Density Polyethylene (LDPE)", "(C2H4)n", "Thermoplastic polymers", 0.92, 383, 0.33, 1e-16, 8.8, 2.3, 4.0, 0.40, 0.11, 3.95, 0.58),
        ("Polypropylene (PP)", "(C3H6)n", "Thermoplastic polymers", 0.90, 438, 0.22, 1e-16, 7.0, 2.2, 4.0, 0.42, 0.12, 3.9, 0.55),
        ("Polyvinyl Chloride (PVC)", "(C2H3Cl)n", "Thermoplastic polymers", 1.38, 485, 0.19, 1e-14, 5.2, 3.4, 8.0, 0.55, 0.18, 3.0, 0.45),
        ("Polystyrene (PS)", "(C8H8)n", "Thermoplastic polymers", 1.05, 513, 0.12, 1e-16, 4.5, 2.6, 6.0, 0.48, 0.15, 3.4, 0.50),
        ("Polyethylene Terephthalate (PET)", "(C10H8O4)n", "Thermoplastic polymers", 1.38, 533, 0.24, 1e-15, 4.0, 3.2, 8.0, 0.52, 0.17, 3.1, 0.43),
        ("PTFE (Teflon)", "(C2F4)n", "Thermoplastic polymers", 2.20, 600, 0.25, 1e-18, 5.8, 2.1, 12.0, 0.64, 0.26, 2.5, 0.32),
        ("Nylon", "(C12H22N2O2)n", "Thermoplastic polymers", 1.15, 533, 0.25, 1e-14, 4.0, 3.5, 8.0, 0.50, 0.16, 3.2, 0.45),
        ("ABS", "(C8H8-C4H6-C3H3N)n", "Thermoplastic polymers", 1.04, 490, 0.18, 1e-14, 3.8, 2.8, 7.0, 0.48, 0.15, 3.4, 0.48),
        ("PMMA", "(C5O2H8)n", "Thermoplastic polymers", 1.18, 433, 0.19, 1e-14, 5.6, 3.6, 8.0, 0.50, 0.16, 3.2, 0.45),
        ("Polycarbonate", "(C16H14O3)n", "Thermoplastic polymers", 1.20, 540, 0.20, 1e-15, 3.7, 3.0, 8.0, 0.51, 0.16, 3.15, 0.42),
        ("Polyoxymethylene", "(CH2O)n", "Thermoplastic polymers", 1.41, 448, 0.31, 1e-14, 5.0, 3.7, 8.0, 0.52, 0.17, 3.0, 0.42),
        ("Polyamide", "(CONH)n", "Thermoplastic polymers", 1.14, 535, 0.25, 1e-14, 4.0, 3.4, 8.0, 0.50, 0.16, 3.2, 0.45),
        ("EVA", "(C2H4-C4H6O2)n", "Thermoplastic polymers", 0.94, 360, 0.34, 1e-15, 4.0, 2.9, 6.0, 0.46, 0.14, 3.6, 0.52),
        ("Polyurethane", "(NHCOO)n", "Thermoplastic polymers", 1.20, 520, 0.03, 1e-13, 3.5, 4.5, 8.0, 0.50, 0.16, 3.2, 0.44),
        ("Epoxy Resin", "C21H25ClO5", "Thermosetting polymers", 1.20, 620, 0.20, 1e-14, 3.5, 3.6, 10.0, 0.50, 0.16, 3.2, 0.42),
        ("Bakelite", "Phenol-formaldehyde", "Thermosetting polymers", 1.30, 570, 0.20, 1e-14, 4.0, 4.8, 10.0, 0.52, 0.17, 3.0, 0.40),
        ("Melamine", "C3H6N6", "Thermosetting polymers", 1.57, 620, 0.35, 1e-14, 4.5, 5.0, 10.0, 0.55, 0.18, 2.8, 0.38),
        ("Urea Formaldehyde", "(CH4N2O-CH2O)n", "Thermosetting polymers", 1.50, 610, 0.30, 1e-14, 4.2, 4.7, 10.0, 0.54, 0.18, 2.9, 0.38),
        ("Polyester Resin", "Unsaturated polyester", "Thermosetting polymers", 1.25, 560, 0.17, 1e-14, 4.0, 3.8, 9.0, 0.50, 0.16, 3.1, 0.42),
        ("Polyimide", "(C22H10N2O5)n", "Thermosetting polymers", 1.42, 770, 0.12, 1e-15, 3.1, 3.5, 12.0, 0.55, 0.18, 2.9, 0.35),
        ("Natural Rubber", "(C5H8)n", "Elastomers", 0.92, 373, 0.13, 1e-15, 4.0, 2.4, 5.0, 0.42, 0.12, 3.8, 0.60),
        ("Neoprene", "(C4H5Cl)n", "Elastomers", 1.23, 480, 0.19, 1e-14, 4.0, 6.7, 8.0, 0.50, 0.16, 3.2, 0.48),
        ("Silicone Rubber", "(SiO(CH3)2)n", "Elastomers", 1.10, 570, 0.20, 1e-14, 5.0, 3.0, 8.0, 0.48, 0.15, 3.4, 0.48),
        ("Buna-N", "(C4H6-C3H3N)n", "Elastomers", 1.00, 460, 0.25, 1e-14, 4.0, 4.5, 6.0, 0.47, 0.14, 3.5, 0.52),
        ("Butyl Rubber", "(C4H8-C5H8)n", "Elastomers", 0.92, 440, 0.09, 1e-15, 4.0, 2.3, 5.0, 0.42, 0.12, 3.8, 0.60),
        ("EPDM", "(C2H4-C3H6-C5H8)n", "Elastomers", 0.86, 450, 0.25, 1e-15, 4.0, 2.5, 5.0, 0.40, 0.11, 4.0, 0.60),
        ("Polyaniline", "(C6H5N)n", "Conducting polymers", 1.32, 590, 0.20, 1e2, 2.8, 5.0, 8.0, 0.56, 0.18, 2.9, 0.42),
        ("Polypyrrole", "(C4H3N)n", "Conducting polymers", 1.48, 590, 0.20, 1e3, 2.5, 4.5, 8.0, 0.58, 0.19, 2.8, 0.42),
        ("PEDOT", "(C6H4O2S)n", "Conducting polymers", 1.00, 560, 0.40, 1e3, 1.6, 4.0, 8.0, 0.55, 0.18, 3.0, 0.42),
        ("Polyacetylene", "(C2H2)n", "Conducting polymers", 0.90, 520, 0.30, 1e5, 1.5, 3.0, 6.0, 0.48, 0.15, 3.5, 0.50),
        ("Polythiophene", "(C4H2S)n", "Conducting polymers", 1.25, 560, 0.20, 1e2, 2.0, 3.5, 8.0, 0.54, 0.17, 3.0, 0.44),
        ("Cellulose", "(C6H10O5)n", "Biopolymers", 1.50, 533, 0.20, 1e-14, 5.5, 6.0, 8.0, 0.55, 0.18, 2.9, 0.40),
        ("Chitosan", "(C6H11NO4)n", "Biopolymers", 1.43, 570, 0.25, 1e-12, 4.5, 5.0, 8.0, 0.54, 0.18, 3.0, 0.40),
        ("PLA", "(C3H4O2)n", "Biopolymers", 1.25, 443, 0.13, 1e-14, 4.7, 3.1, 8.0, 0.50, 0.16, 3.2, 0.44),
        ("Starch", "(C6H10O5)n", "Biopolymers", 1.50, 530, 0.17, 1e-14, 5.0, 4.0, 8.0, 0.55, 0.18, 2.9, 0.42),
        ("Proteins", "Amino-acid polymer", "Biopolymers", 1.35, 520, 0.20, 1e-10, 4.0, 6.5, 10.0, 0.54, 0.18, 3.0, 0.40),
        ("PEEK", "(C19H12O3)n", "High performance polymers", 1.32, 616, 0.25, 1e-15, 4.0, 3.2, 12.0, 0.54, 0.17, 3.0, 0.36),
        ("PPS", "(C6H4S)n", "High performance polymers", 1.35, 558, 0.30, 1e-14, 3.5, 3.0, 10.0, 0.55, 0.18, 2.9, 0.36),
        ("PEI", "(C37H24O6N2)n", "High performance polymers", 1.27, 620, 0.22, 1e-14, 3.2, 3.2, 12.0, 0.52, 0.17, 3.1, 0.36),
        ("PSU", "(C27H22O4S)n", "High performance polymers", 1.24, 610, 0.26, 1e-14, 3.6, 3.1, 12.0, 0.52, 0.17, 3.1, 0.36),
        ("LCP", "Liquid crystal polymer", "High performance polymers", 1.40, 610, 0.40, 1e-14, 3.8, 3.5, 10.0, 0.56, 0.18, 2.8, 0.35),
    ]
    for name, formula, subclass, density, melt, k, sigma, gap, eps, ed, es, ns, rf, sy in polymer_entries:
        add(
            material(
                name,
                formula,
                "Polymers",
                subclass,
                density,
                melt,
                k,
                sigma,
                gap,
                12.0,
                eps,
                ed,
                optical(1.45, 320, "transparent to translucent; radiation darkening possible"),
                stopping(es, ns, rf, sy),
                "Polymer target; chain scission, cross-linking, and gas release can occur.",
            )
        )

    # Insulators
    insulator_entries = [
        ("Alumina", "Al2O3", "Ceramic insulators", 3.95, 2327, 30, 1e-12, 8.8, 101.96, 9.8, 40, 0.88, 0.66, 1.16, 0.08),
        ("Zirconia", "ZrO2", "Ceramic insulators", 5.68, 2988, 2.2, 1e-12, 5.8, 123.22, 25, 45, 1.05, 0.78, 0.96, 0.05),
        ("Silicon Nitride", "Si3N4", "Ceramic insulators", 3.17, 2173, 30, 1e-12, 5.3, 140.28, 7.5, 35, 0.84, 0.58, 1.34, 0.05),
        ("Boron Nitride", "BN", "Ceramic insulators", 2.10, 3273, 60, 1e-13, 5.9, 24.82, 4.0, 30, 0.70, 0.48, 1.60, 0.04),
        ("Quartz", "SiO2", "Glass insulators", 2.65, 1986, 7.7, 1e-16, 8.9, 60.08, 3.8, 35, 0.76, 0.52, 1.50, 0.04),
        ("Silica Glass", "SiO2", "Glass insulators", 2.20, 1986, 1.4, 1e-16, 8.9, 60.08, 3.8, 35, 0.72, 0.50, 1.65, 0.04),
        ("Borosilicate Glass", "SiO2-B2O3", "Glass insulators", 2.23, 1650, 1.1, 1e-15, 8.0, 65.0, 4.6, 30, 0.74, 0.50, 1.58, 0.05),
        ("SiO2", "SiO2", "Oxide insulators", 2.20, 1986, 1.4, 1e-16, 8.9, 60.08, 3.9, 35, 0.72, 0.50, 1.65, 0.04),
        ("HfO2", "HfO2", "Oxide insulators", 9.68, 3058, 0.5, 1e-14, 5.8, 210.49, 25.0, 45, 1.25, 0.88, 0.72, 0.04),
        ("Kapton", "(C22H10N2O5)n", "Polymer insulators", 1.42, 770, 0.12, 1e-15, 3.1, 382.33, 3.5, 12, 0.55, 0.18, 2.9, 0.35),
    ]
    for name, formula, subclass, density, melt, k, sigma, gap, mass, eps, ed, es, ns, rf, sy in insulator_entries:
        if name in MATERIALS:
            continue
        add(
            material(
                name,
                formula,
                "Insulators",
                subclass,
                density,
                melt,
                k,
                sigma,
                gap,
                mass,
                eps,
                ed,
                optical(1.52, 1240 / gap if gap else 180, "transparent unless color centers accumulate"),
                stopping(es, ns, rf, sy),
                "Electrical insulator; trapped charge and color-center formation are important.",
            )
        )


_build()


def get_material(name: str) -> Material:
    if name not in MATERIALS:
        raise KeyError(f"Unknown material: {name}")
    return MATERIALS[name]


def all_materials() -> List[Material]:
    return sorted(MATERIALS.values(), key=lambda entry: (entry.material_class, entry.subclass, entry.name))


def materials_by_class() -> Dict[str, List[Material]]:
    grouped: Dict[str, List[Material]] = {}
    for entry in all_materials():
        grouped.setdefault(entry.material_class, []).append(entry)
    return grouped


def materials_by_subclass() -> Dict[str, List[Material]]:
    grouped: Dict[str, List[Material]] = {}
    for entry in all_materials():
        grouped.setdefault(entry.subclass, []).append(entry)
    return grouped


def classes() -> List[str]:
    return sorted({entry.material_class for entry in MATERIALS.values()})


def subclasses(material_class: Optional[str] = None) -> List[str]:
    values = {
        entry.subclass
        for entry in MATERIALS.values()
        if material_class is None or entry.material_class == material_class
    }
    return sorted(values)


def names_for_class(material_class: Optional[str] = None) -> List[str]:
    return [
        entry.name
        for entry in all_materials()
        if material_class is None or entry.material_class == material_class
    ]


def search_materials(query: str) -> Iterable[Material]:
    lowered = query.lower()
    for entry in all_materials():
        haystack = f"{entry.name} {entry.formula} {entry.material_class} {entry.subclass}".lower()
        if lowered in haystack:
            yield entry


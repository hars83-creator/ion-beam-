"""Periodic table data and helpers for the ion beam simulator.

The table intentionally keeps every element available as a possible ion species.
For elements where classroom-grade values are not consistently tabulated or the
element is synthetic, the module supplies conservative estimates and marks the
record with ``data_quality="estimated"``. Common ion/material elements include
empirical overrides.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, Iterable, List, Optional


@dataclass(frozen=True)
class Element:
    name: str
    symbol: str
    atomic_number: int
    atomic_mass: float
    electron_configuration: str
    period: int
    group: Optional[int]
    category: str
    ionization_energy: float
    density: float
    atomic_radius: float
    melting_point: float
    boiling_point: float
    electronegativity: Optional[float]
    stable: bool
    radioactive_note: str
    data_quality: str = "estimated"

    def to_dict(self) -> Dict[str, object]:
        return asdict(self)


ELEMENT_CORES = [
    ("H", "Hydrogen", 1.008),
    ("He", "Helium", 4.0026),
    ("Li", "Lithium", 6.94),
    ("Be", "Beryllium", 9.0122),
    ("B", "Boron", 10.81),
    ("C", "Carbon", 12.011),
    ("N", "Nitrogen", 14.007),
    ("O", "Oxygen", 15.999),
    ("F", "Fluorine", 18.998),
    ("Ne", "Neon", 20.180),
    ("Na", "Sodium", 22.990),
    ("Mg", "Magnesium", 24.305),
    ("Al", "Aluminium", 26.982),
    ("Si", "Silicon", 28.085),
    ("P", "Phosphorus", 30.974),
    ("S", "Sulfur", 32.06),
    ("Cl", "Chlorine", 35.45),
    ("Ar", "Argon", 39.948),
    ("K", "Potassium", 39.098),
    ("Ca", "Calcium", 40.078),
    ("Sc", "Scandium", 44.956),
    ("Ti", "Titanium", 47.867),
    ("V", "Vanadium", 50.942),
    ("Cr", "Chromium", 51.996),
    ("Mn", "Manganese", 54.938),
    ("Fe", "Iron", 55.845),
    ("Co", "Cobalt", 58.933),
    ("Ni", "Nickel", 58.693),
    ("Cu", "Copper", 63.546),
    ("Zn", "Zinc", 65.38),
    ("Ga", "Gallium", 69.723),
    ("Ge", "Germanium", 72.630),
    ("As", "Arsenic", 74.922),
    ("Se", "Selenium", 78.971),
    ("Br", "Bromine", 79.904),
    ("Kr", "Krypton", 83.798),
    ("Rb", "Rubidium", 85.468),
    ("Sr", "Strontium", 87.62),
    ("Y", "Yttrium", 88.906),
    ("Zr", "Zirconium", 91.224),
    ("Nb", "Niobium", 92.906),
    ("Mo", "Molybdenum", 95.95),
    ("Tc", "Technetium", 98.0),
    ("Ru", "Ruthenium", 101.07),
    ("Rh", "Rhodium", 102.91),
    ("Pd", "Palladium", 106.42),
    ("Ag", "Silver", 107.87),
    ("Cd", "Cadmium", 112.41),
    ("In", "Indium", 114.82),
    ("Sn", "Tin", 118.71),
    ("Sb", "Antimony", 121.76),
    ("Te", "Tellurium", 127.60),
    ("I", "Iodine", 126.90),
    ("Xe", "Xenon", 131.29),
    ("Cs", "Cesium", 132.91),
    ("Ba", "Barium", 137.33),
    ("La", "Lanthanum", 138.91),
    ("Ce", "Cerium", 140.12),
    ("Pr", "Praseodymium", 140.91),
    ("Nd", "Neodymium", 144.24),
    ("Pm", "Promethium", 145.0),
    ("Sm", "Samarium", 150.36),
    ("Eu", "Europium", 151.96),
    ("Gd", "Gadolinium", 157.25),
    ("Tb", "Terbium", 158.93),
    ("Dy", "Dysprosium", 162.50),
    ("Ho", "Holmium", 164.93),
    ("Er", "Erbium", 167.26),
    ("Tm", "Thulium", 168.93),
    ("Yb", "Ytterbium", 173.05),
    ("Lu", "Lutetium", 174.97),
    ("Hf", "Hafnium", 178.49),
    ("Ta", "Tantalum", 180.95),
    ("W", "Tungsten", 183.84),
    ("Re", "Rhenium", 186.21),
    ("Os", "Osmium", 190.23),
    ("Ir", "Iridium", 192.22),
    ("Pt", "Platinum", 195.08),
    ("Au", "Gold", 196.97),
    ("Hg", "Mercury", 200.59),
    ("Tl", "Thallium", 204.38),
    ("Pb", "Lead", 207.2),
    ("Bi", "Bismuth", 208.98),
    ("Po", "Polonium", 209.0),
    ("At", "Astatine", 210.0),
    ("Rn", "Radon", 222.0),
    ("Fr", "Francium", 223.0),
    ("Ra", "Radium", 226.0),
    ("Ac", "Actinium", 227.0),
    ("Th", "Thorium", 232.04),
    ("Pa", "Protactinium", 231.04),
    ("U", "Uranium", 238.03),
    ("Np", "Neptunium", 237.0),
    ("Pu", "Plutonium", 244.0),
    ("Am", "Americium", 243.0),
    ("Cm", "Curium", 247.0),
    ("Bk", "Berkelium", 247.0),
    ("Cf", "Californium", 251.0),
    ("Es", "Einsteinium", 252.0),
    ("Fm", "Fermium", 257.0),
    ("Md", "Mendelevium", 258.0),
    ("No", "Nobelium", 259.0),
    ("Lr", "Lawrencium", 266.0),
    ("Rf", "Rutherfordium", 267.0),
    ("Db", "Dubnium", 268.0),
    ("Sg", "Seaborgium", 269.0),
    ("Bh", "Bohrium", 270.0),
    ("Hs", "Hassium", 277.0),
    ("Mt", "Meitnerium", 278.0),
    ("Ds", "Darmstadtium", 281.0),
    ("Rg", "Roentgenium", 282.0),
    ("Cn", "Copernicium", 285.0),
    ("Nh", "Nihonium", 286.0),
    ("Fl", "Flerovium", 289.0),
    ("Mc", "Moscovium", 290.0),
    ("Lv", "Livermorium", 293.0),
    ("Ts", "Tennessine", 294.0),
    ("Og", "Oganesson", 294.0),
]


PERIOD_ROWS = [
    ["H", None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, "He"],
    ["Li", "Be", None, None, None, None, None, None, None, None, None, None, "B", "C", "N", "O", "F", "Ne"],
    ["Na", "Mg", None, None, None, None, None, None, None, None, None, None, "Al", "Si", "P", "S", "Cl", "Ar"],
    ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
    ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
    ["Cs", "Ba", "La", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
    ["Fr", "Ra", "Ac", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
]

LANTHANIDES = ["Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"]
ACTINIDES = ["Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"]


CATEGORY_SETS = {
    "Alkali metals": {"Li", "Na", "K", "Rb", "Cs", "Fr"},
    "Alkaline earth metals": {"Be", "Mg", "Ca", "Sr", "Ba", "Ra"},
    "Transition metals": {
        "Sc",
        "Ti",
        "V",
        "Cr",
        "Mn",
        "Fe",
        "Co",
        "Ni",
        "Cu",
        "Zn",
        "Y",
        "Zr",
        "Nb",
        "Mo",
        "Tc",
        "Ru",
        "Rh",
        "Pd",
        "Ag",
        "Cd",
        "Hf",
        "Ta",
        "W",
        "Re",
        "Os",
        "Ir",
        "Pt",
        "Au",
        "Hg",
        "Rf",
        "Db",
        "Sg",
        "Bh",
        "Hs",
        "Mt",
        "Ds",
        "Rg",
        "Cn",
    },
    "Post-transition metals": {"Al", "Ga", "In", "Sn", "Tl", "Pb", "Bi", "Nh", "Fl", "Mc", "Lv"},
    "Metalloids": {"B", "Si", "Ge", "As", "Sb", "Te", "Po"},
    "Nonmetals": {"H", "C", "N", "O", "P", "S", "Se"},
    "Halogens": {"F", "Cl", "Br", "I", "At", "Ts"},
    "Noble gases": {"He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"},
    "Lanthanides": {"La", *LANTHANIDES},
    "Actinides": {"Ac", *ACTINIDES},
}

RADIOACTIVE_SYMBOLS = {
    "Tc",
    "Pm",
    "Po",
    "At",
    "Rn",
    "Fr",
    "Ra",
    "Ac",
    "Th",
    "Pa",
    "U",
    "Np",
    "Pu",
    "Am",
    "Cm",
    "Bk",
    "Cf",
    "Es",
    "Fm",
    "Md",
    "No",
    "Lr",
    "Rf",
    "Db",
    "Sg",
    "Bh",
    "Hs",
    "Mt",
    "Ds",
    "Rg",
    "Cn",
    "Nh",
    "Fl",
    "Mc",
    "Lv",
    "Ts",
    "Og",
}

SUBSHELL_ORDER = [
    ("1s", 2),
    ("2s", 2),
    ("2p", 6),
    ("3s", 2),
    ("3p", 6),
    ("4s", 2),
    ("3d", 10),
    ("4p", 6),
    ("5s", 2),
    ("4d", 10),
    ("5p", 6),
    ("6s", 2),
    ("4f", 14),
    ("5d", 10),
    ("6p", 6),
    ("7s", 2),
    ("5f", 14),
    ("6d", 10),
    ("7p", 6),
]

ELECTRON_EXCEPTIONS = {
    24: "1s2 2s2 2p6 3s2 3p6 4s1 3d5",
    29: "1s2 2s2 2p6 3s2 3p6 4s1 3d10",
    41: "[Kr] 5s1 4d4",
    42: "[Kr] 5s1 4d5",
    44: "[Kr] 5s1 4d7",
    45: "[Kr] 5s1 4d8",
    46: "[Kr] 4d10",
    47: "[Kr] 5s1 4d10",
    57: "[Xe] 6s2 5d1",
    58: "[Xe] 6s2 4f1 5d1",
    64: "[Xe] 6s2 4f7 5d1",
    78: "[Xe] 6s1 4f14 5d9",
    79: "[Xe] 6s1 4f14 5d10",
    89: "[Rn] 7s2 6d1",
    90: "[Rn] 7s2 6d2",
    91: "[Rn] 7s2 5f2 6d1",
    92: "[Rn] 7s2 5f3 6d1",
    93: "[Rn] 7s2 5f4 6d1",
    96: "[Rn] 7s2 5f7 6d1",
}

DEFAULTS_BY_CATEGORY = {
    "Alkali metals": (4.3, 1.2, 230.0, 365.0, 1150.0, 0.9),
    "Alkaline earth metals": (6.4, 2.0, 190.0, 1020.0, 1650.0, 1.2),
    "Transition metals": (7.8, 8.2, 145.0, 1800.0, 3300.0, 1.7),
    "Post-transition metals": (6.2, 6.5, 160.0, 760.0, 1900.0, 1.8),
    "Metalloids": (8.3, 3.1, 120.0, 1100.0, 2600.0, 2.0),
    "Nonmetals": (11.0, 1.8, 75.0, 250.0, 500.0, 2.6),
    "Halogens": (11.2, 2.9, 85.0, 180.0, 430.0, 3.1),
    "Noble gases": (15.2, 0.004, 85.0, 50.0, 90.0, None),
    "Lanthanides": (5.8, 6.7, 180.0, 1100.0, 3300.0, 1.2),
    "Actinides": (6.0, 13.0, 175.0, 1200.0, 3500.0, 1.3),
    "Unknown": (7.0, 5.0, 140.0, 900.0, 2000.0, None),
}

# ionization eV, density g/cm^3, atomic radius pm, melting K, boiling K, electronegativity
EMPIRICAL_OVERRIDES = {
    "H": (13.598, 0.0000899, 53.0, 14.01, 20.28, 2.20),
    "He": (24.587, 0.0001785, 31.0, 0.95, 4.22, None),
    "Li": (5.392, 0.534, 167.0, 453.65, 1603.0, 0.98),
    "Be": (9.323, 1.85, 112.0, 1560.0, 2742.0, 1.57),
    "B": (8.298, 2.34, 87.0, 2349.0, 4200.0, 2.04),
    "C": (11.260, 2.267, 67.0, 3915.0, 3915.0, 2.55),
    "N": (14.534, 0.001251, 56.0, 63.15, 77.36, 3.04),
    "O": (13.618, 0.001429, 48.0, 54.36, 90.20, 3.44),
    "F": (17.423, 0.001696, 42.0, 53.48, 85.03, 3.98),
    "Ne": (21.565, 0.0009002, 38.0, 24.56, 27.07, None),
    "Na": (5.139, 0.971, 190.0, 370.94, 1156.0, 0.93),
    "Mg": (7.646, 1.738, 145.0, 923.0, 1363.0, 1.31),
    "Al": (5.986, 2.70, 118.0, 933.47, 2792.0, 1.61),
    "Si": (8.152, 2.329, 111.0, 1687.0, 3538.0, 1.90),
    "P": (10.487, 1.823, 98.0, 317.3, 553.7, 2.19),
    "S": (10.360, 2.07, 88.0, 388.36, 717.8, 2.58),
    "Cl": (12.968, 0.0032, 79.0, 171.6, 239.1, 3.16),
    "Ar": (15.760, 0.001784, 71.0, 83.8, 87.3, None),
    "Ti": (6.828, 4.506, 176.0, 1941.0, 3560.0, 1.54),
    "Cr": (6.767, 7.19, 166.0, 2180.0, 2944.0, 1.66),
    "Fe": (7.902, 7.874, 156.0, 1811.0, 3134.0, 1.83),
    "Co": (7.881, 8.90, 152.0, 1768.0, 3200.0, 1.88),
    "Ni": (7.640, 8.908, 149.0, 1728.0, 3186.0, 1.91),
    "Cu": (7.726, 8.96, 145.0, 1357.77, 2835.0, 1.90),
    "Zn": (9.394, 7.14, 142.0, 692.68, 1180.0, 1.65),
    "Ge": (7.900, 5.323, 125.0, 1211.4, 3106.0, 2.01),
    "Se": (9.752, 4.81, 103.0, 494.0, 958.0, 2.55),
    "Kr": (14.000, 0.00375, 88.0, 115.8, 119.9, 3.00),
    "Mo": (7.092, 10.28, 154.0, 2896.0, 4912.0, 2.16),
    "Ag": (7.576, 10.49, 165.0, 1234.93, 2435.0, 1.93),
    "Sn": (7.344, 7.287, 145.0, 505.08, 2875.0, 1.96),
    "I": (10.451, 4.93, 115.0, 386.85, 457.4, 2.66),
    "Xe": (12.130, 0.00589, 108.0, 161.4, 165.0, 2.60),
    "Pt": (8.959, 21.45, 177.0, 2041.4, 4098.0, 2.28),
    "Au": (9.226, 19.30, 174.0, 1337.33, 3129.0, 2.54),
    "Pb": (7.417, 11.34, 180.0, 600.61, 2022.0, 2.33),
    "W": (7.864, 19.25, 193.0, 3695.0, 6203.0, 2.36),
    "U": (6.194, 19.10, 186.0, 1405.3, 4404.0, 1.38),
}


def electron_configuration(atomic_number: int) -> str:
    if atomic_number in ELECTRON_EXCEPTIONS:
        return ELECTRON_EXCEPTIONS[atomic_number]

    remaining = atomic_number
    parts = []
    for shell, capacity in SUBSHELL_ORDER:
        if remaining <= 0:
            break
        used = min(capacity, remaining)
        parts.append(f"{shell}{used}")
        remaining -= used
    return " ".join(parts)


def _position_maps() -> Dict[str, tuple[int, Optional[int]]]:
    positions: Dict[str, tuple[int, Optional[int]]] = {}
    for period, row in enumerate(PERIOD_ROWS, start=1):
        for group, symbol in enumerate(row, start=1):
            if symbol:
                positions[symbol] = (period, group)
    for symbol in LANTHANIDES:
        positions[symbol] = (6, 3)
    for symbol in ACTINIDES:
        positions[symbol] = (7, 3)
    return positions


POSITIONS = _position_maps()


def classify_element(symbol: str) -> str:
    for category, symbols in CATEGORY_SETS.items():
        if symbol in symbols:
            return category
    return "Unknown"


def _estimated_values(symbol: str, period: int, category: str) -> tuple[float, float, float, float, float, Optional[float]]:
    ionization, density, radius, melting, boiling, electronegativity = DEFAULTS_BY_CATEGORY[category]
    period_factor = max(period, 1)
    if category not in {"Noble gases", "Nonmetals", "Halogens"}:
        density *= 0.75 + 0.18 * period_factor
        radius *= 0.78 + 0.06 * period_factor
        melting *= 0.80 + 0.04 * period_factor
        boiling *= 0.82 + 0.04 * period_factor
    return (
        round(ionization, 3),
        round(density, 6),
        round(radius, 2),
        round(melting, 2),
        round(boiling, 2),
        None if electronegativity is None else round(electronegativity, 2),
    )


def build_periodic_table() -> Dict[str, Element]:
    table: Dict[str, Element] = {}
    for atomic_number, (symbol, name, atomic_mass) in enumerate(ELEMENT_CORES, start=1):
        period, group = POSITIONS[symbol]
        category = classify_element(symbol)
        stable = symbol not in RADIOACTIVE_SYMBOLS
        radioactive_note = "" if stable else "radioactive or synthetic; disable for basic classroom runs"
        quality = "empirical" if symbol in EMPIRICAL_OVERRIDES else "estimated"
        ionization, density, radius, melting, boiling, electronegativity = EMPIRICAL_OVERRIDES.get(
            symbol, _estimated_values(symbol, period, category)
        )
        table[symbol] = Element(
            name=name,
            symbol=symbol,
            atomic_number=atomic_number,
            atomic_mass=atomic_mass,
            electron_configuration=electron_configuration(atomic_number),
            period=period,
            group=group,
            category=category,
            ionization_energy=ionization,
            density=density,
            atomic_radius=radius,
            melting_point=melting,
            boiling_point=boiling,
            electronegativity=electronegativity,
            stable=stable,
            radioactive_note=radioactive_note,
            data_quality=quality,
        )
    return table


PERIODIC_TABLE = build_periodic_table()


def get_element(symbol: str) -> Element:
    normalized = symbol.strip()
    if normalized not in PERIODIC_TABLE:
        raise KeyError(f"Unknown element symbol: {symbol}")
    return PERIODIC_TABLE[normalized]


def all_elements(include_radioactive: bool = True) -> List[Element]:
    values = list(PERIODIC_TABLE.values())
    if include_radioactive:
        return values
    return [element for element in values if element.stable]


def element_symbols(include_radioactive: bool = True) -> List[str]:
    return [element.symbol for element in all_elements(include_radioactive)]


def elements_by_category() -> Dict[str, List[Element]]:
    grouped: Dict[str, List[Element]] = {}
    for element in PERIODIC_TABLE.values():
        grouped.setdefault(element.category, []).append(element)
    return grouped


def search_elements(query: str) -> Iterable[Element]:
    lowered = query.lower()
    for element in PERIODIC_TABLE.values():
        if lowered in element.name.lower() or lowered in element.symbol.lower():
            yield element


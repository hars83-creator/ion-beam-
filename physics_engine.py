"""Physics engine for educational ion-matter interaction simulations."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import pi, sqrt
from typing import Dict, Optional

import numpy as np

try:
    from scipy.integrate import cumulative_trapezoid as scipy_cumulative_trapezoid
except Exception:  # pragma: no cover - fallback keeps the app usable before requirements are installed.
    scipy_cumulative_trapezoid = None

from materials_database import Material
from periodic_table import Element


AMU_KG = 1.66053906660e-27
EV_J = 1.602176634e-19
ELEMENTARY_CHARGE = 1.602176634e-19
BOLTZMANN = 1.380649e-23


@dataclass(frozen=True)
class BeamParameters:
    ion: Element
    target: Material
    charge_state: int
    energy_kev: float
    fluence_ions_cm2: float
    irradiation_time_s: float
    let_kev_nm: float
    beam_current_na: float
    beam_angle_deg: float
    beam_spread_deg: float
    beam_intensity: float
    simulation_speed: float
    mode: str = "Educational"


@dataclass(frozen=True)
class DepthProfile:
    depth_nm: np.ndarray
    energy_kev: np.ndarray
    let_kev_nm: np.ndarray
    electronic_stopping: np.ndarray
    nuclear_stopping: np.ndarray
    temperature_rise_k: np.ndarray
    defect_density: np.ndarray
    collision_density: np.ndarray


@dataclass(frozen=True)
class SimulationResult:
    initial_energy_kev: float
    final_energy_kev: float
    let_kev_nm: float
    stopping_power_kev_nm: float
    penetration_depth_nm: float
    energy_deposited_kev: float
    ion_velocity_m_s: float
    collisions: int
    defect_density_cm3: float
    sputtering_yield_atoms_ion: float
    temperature_rise_k: float
    electronic_stopping_kev_nm: float
    nuclear_stopping_kev_nm: float
    beam_current_na: float
    beam_flux_ions_cm2_s: float
    profile: DepthProfile
    explanation: str

    def scalar_outputs(self) -> Dict[str, float]:
        return {
            "Initial energy (keV)": self.initial_energy_kev,
            "Final energy (keV)": self.final_energy_kev,
            "LET (keV/nm)": self.let_kev_nm,
            "Stopping power (keV/nm)": self.stopping_power_kev_nm,
            "Penetration depth (nm)": self.penetration_depth_nm,
            "Energy deposited (keV)": self.energy_deposited_kev,
            "Ion velocity (m/s)": self.ion_velocity_m_s,
            "Collisions": float(self.collisions),
            "Defect density (cm^-3)": self.defect_density_cm3,
            "Sputtering yield (atoms/ion)": self.sputtering_yield_atoms_ion,
            "Temperature rise (K)": self.temperature_rise_k,
            "Electronic stopping (keV/nm)": self.electronic_stopping_kev_nm,
            "Nuclear stopping (keV/nm)": self.nuclear_stopping_kev_nm,
            "Beam flux (ions/cm^2/s)": self.beam_flux_ions_cm2_s,
        }


def _cumulative_trapezoid(y: np.ndarray, x: np.ndarray) -> np.ndarray:
    if scipy_cumulative_trapezoid is not None:
        return scipy_cumulative_trapezoid(y, x, initial=0)
    dx = np.diff(x)
    avg = 0.5 * (y[1:] + y[:-1])
    return np.concatenate([[0.0], np.cumsum(avg * dx)])


def ion_velocity_m_s(energy_kev: float, atomic_mass_amu: float) -> float:
    energy_j = max(energy_kev, 0.0) * 1.0e3 * EV_J
    mass_kg = max(atomic_mass_amu, 1.0) * AMU_KG
    return sqrt(2.0 * energy_j / mass_kg)


def beam_flux(fluence_ions_cm2: float, irradiation_time_s: float) -> float:
    return fluence_ions_cm2 / max(irradiation_time_s, 1.0e-12)


def current_from_flux(charge_state: int, fluence_ions_cm2: float, irradiation_time_s: float, area_cm2: float = 1.0) -> float:
    ions_per_second = beam_flux(fluence_ions_cm2, irradiation_time_s) * area_cm2
    return charge_state * ELEMENTARY_CHARGE * ions_per_second * 1.0e9


def electronic_stopping_kev_nm(ion: Element, target: Material, energy_kev: float, charge_state: int) -> float:
    z_eff = max(charge_state, 1) * (1.0 - np.exp(-max(ion.atomic_number, 1) / 35.0))
    velocity_scale = sqrt(max(energy_kev, 1.0) / max(ion.atomic_mass, 1.0))
    density_scale = sqrt(max(target.density, 0.05))
    bandgap_factor = 1.0 if not target.bandgap else 1.0 / (1.0 + 0.08 * target.bandgap)
    return float(target.stopping_coefficients.electronic * density_scale * z_eff**1.35 * bandgap_factor / (0.8 + velocity_scale))


def nuclear_stopping_kev_nm(ion: Element, target: Material, energy_kev: float) -> float:
    reduced_mass = ion.atomic_mass * target.atomic_mass / max(ion.atomic_mass + target.atomic_mass, 1.0)
    z_factor = sqrt(max(ion.atomic_number, 1) * max(target.atomic_mass, 1.0) / 55.0)
    energy_factor = 1.0 / sqrt(max(energy_kev, 1.0) / 100.0 + 0.25)
    return float(target.stopping_coefficients.nuclear * target.density**0.72 * reduced_mass**0.18 * z_factor * energy_factor * 0.12)


def penetration_range_nm(ion: Element, target: Material, energy_kev: float, angle_deg: float) -> float:
    density_term = max(target.density, 0.1) ** 0.72
    mass_term = sqrt(max(ion.atomic_mass, 1.0) / max(target.atomic_mass, 1.0))
    angle_term = max(np.cos(np.deg2rad(angle_deg)), 0.12)
    range_factor = target.stopping_coefficients.range_factor
    return float(0.55 * range_factor * max(energy_kev, 0.1) ** 1.5 / (density_term * (1.0 + mass_term)) * angle_term)


def collision_loss_fraction(ion: Element, target: Material, energy_kev: float) -> float:
    mass_ratio = 4.0 * ion.atomic_mass * target.atomic_mass / (ion.atomic_mass + target.atomic_mass) ** 2
    energy_quench = 1.0 / (1.0 + max(energy_kev, 1.0) / 800.0)
    return float(np.clip(0.03 + 0.45 * mass_ratio * energy_quench, 0.02, 0.75))


def defect_generation(energy_deposited_kev: float, displacement_energy_ev: float, fluence_ions_cm2: float, range_nm: float) -> float:
    norgett_robinson_torrens = 0.8 * (energy_deposited_kev * 1000.0) / max(2.0 * displacement_energy_ev, 1.0)
    affected_volume_cm3 = max(range_nm, 1.0) * 1.0e-7
    return float(norgett_robinson_torrens * fluence_ions_cm2 / affected_volume_cm3)


def temperature_rise(energy_deposited_kev: float, fluence_ions_cm2: float, target: Material, range_nm: float) -> float:
    energy_j_cm2 = energy_deposited_kev * 1.0e3 * EV_J * fluence_ions_cm2
    thickness_cm = max(range_nm, 1.0) * 1.0e-7
    mass_g_cm2 = max(target.density, 0.1) * thickness_cm
    heat_capacity_j_g_k = 0.75 if target.material_class != "Metals" else 0.45
    return float(energy_j_cm2 / max(mass_g_cm2 * heat_capacity_j_g_k, 1.0e-20))


class PhysicsEngine:
    """Semi-empirical, deterministic physics model for interactive education.

    The model combines textbook relationships (LET, electronic/nuclear stopping,
    current, velocity, NRT-like defect production, and E^1.5 range scaling) with
    material coefficients from the database. It is intentionally explainable and
    fast enough for real-time GUI updates; it is not a replacement for SRIM/TRIM.
    """

    def calculate(self, parameters: BeamParameters) -> SimulationResult:
        ion = parameters.ion
        target = parameters.target
        energy = max(parameters.energy_kev, 0.1)
        range_nm = penetration_range_nm(ion, target, energy, parameters.beam_angle_deg)
        depth = np.linspace(0.0, range_nm, 220)
        normalized_depth = depth / max(range_nm, 1.0)

        se0 = electronic_stopping_kev_nm(ion, target, energy, parameters.charge_state)
        sn0 = nuclear_stopping_kev_nm(ion, target, energy)
        bragg_peak = 0.35 + 1.65 * np.exp(-((normalized_depth - 0.82) / 0.19) ** 2)
        electronic = se0 * (1.0 - 0.28 * normalized_depth) * bragg_peak
        nuclear = sn0 * (0.55 + 1.25 * normalized_depth**2.2)
        total_stopping = np.clip(electronic + nuclear + max(parameters.let_kev_nm, 0.0) * 0.05, 0.0, None)

        energy_loss = _cumulative_trapezoid(total_stopping, depth)
        energy_profile = np.clip(energy - energy_loss, 0.0, energy)
        final_energy = float(energy_profile[-1])
        deposited = float(energy - final_energy)
        mean_let = float(np.trapezoid(total_stopping, depth) / max(range_nm, 1.0))
        if parameters.let_kev_nm > 0.0:
            mean_let = 0.65 * mean_let + 0.35 * parameters.let_kev_nm

        loss_fraction = collision_loss_fraction(ion, target, energy)
        expected_collisions = int(max(1.0, deposited * 1000.0 * loss_fraction / max(target.displacement_energy, 1.0)))
        defect_density = defect_generation(deposited * loss_fraction, target.displacement_energy, parameters.fluence_ions_cm2, range_nm)
        temp = temperature_rise(deposited, parameters.fluence_ions_cm2, target, range_nm)
        sputter = float(target.stopping_coefficients.sputter_yield * loss_fraction * (1.0 + 0.015 * parameters.beam_angle_deg))
        flux = beam_flux(parameters.fluence_ions_cm2, parameters.irradiation_time_s)
        current_na = parameters.beam_current_na or current_from_flux(
            parameters.charge_state, parameters.fluence_ions_cm2, parameters.irradiation_time_s
        )

        defect_profile = defect_density * np.exp(-((normalized_depth - 0.78) / 0.24) ** 2)
        collision_profile = expected_collisions * np.exp(-((normalized_depth - 0.72) / 0.22) ** 2)
        temperature_profile = temp * np.clip(_cumulative_trapezoid(total_stopping, depth) / max(deposited, 1.0e-9), 0, 1)

        profile = DepthProfile(
            depth_nm=depth,
            energy_kev=energy_profile,
            let_kev_nm=total_stopping,
            electronic_stopping=electronic,
            nuclear_stopping=nuclear,
            temperature_rise_k=temperature_profile,
            defect_density=defect_profile,
            collision_density=collision_profile,
        )

        explanation = self.explain(parameters, range_nm, mean_let, se0, sn0, expected_collisions, temp)

        return SimulationResult(
            initial_energy_kev=energy,
            final_energy_kev=final_energy,
            let_kev_nm=mean_let,
            stopping_power_kev_nm=float(np.mean(total_stopping)),
            penetration_depth_nm=range_nm,
            energy_deposited_kev=deposited,
            ion_velocity_m_s=ion_velocity_m_s(energy, ion.atomic_mass),
            collisions=expected_collisions,
            defect_density_cm3=defect_density,
            sputtering_yield_atoms_ion=sputter,
            temperature_rise_k=temp,
            electronic_stopping_kev_nm=se0,
            nuclear_stopping_kev_nm=sn0,
            beam_current_na=current_na,
            beam_flux_ions_cm2_s=flux,
            profile=profile,
            explanation=explanation,
        )

    def explain(
        self,
        parameters: BeamParameters,
        range_nm: float,
        mean_let: float,
        se0: float,
        sn0: float,
        collisions: int,
        temp: float,
    ) -> str:
        ion_label = f"{parameters.ion.symbol}{parameters.charge_state}+"
        target = parameters.target
        if se0 > sn0 * 1.4:
            dominant = "electronic stopping dominates, so electron excitation and secondary electrons carry much of the energy."
        elif sn0 > se0 * 1.4:
            dominant = "nuclear stopping dominates, so elastic recoil atoms and displacement cascades are prominent."
        else:
            dominant = "electronic and nuclear stopping are comparable, producing both dense ionization and recoil cascades."

        mode_detail = (
            "Educational mode slows the visual sequence and emphasizes the main physical cause."
            if parameters.mode == "Educational"
            else "Research mode exposes denser numerical outputs and sharper depth-profile updates."
        )

        return (
            f"{ion_label} ions enter {target.name} at {parameters.energy_kev:.1f} keV and travel about "
            f"{range_nm:.0f} nm before most kinetic energy is deposited. The mean LET is "
            f"{mean_let:.3f} keV/nm; {dominant} Around the stopping region the collision density rises, "
            f"generating roughly {collisions:,} displacement events per ion track in this approximation. "
            f"The deposited dose produces an instantaneous local temperature rise estimate of {temp:.2e} K "
            f"for the selected fluence and affected depth. {mode_detail}"
        )


def result_to_serializable(result: SimulationResult) -> Dict[str, object]:
    data = asdict(result)
    profile = data["profile"]
    for key, value in profile.items():
        profile[key] = np.asarray(value).tolist()
    return data

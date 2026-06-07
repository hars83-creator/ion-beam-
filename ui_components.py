"""Tkinter user interface components for the virtual ion beam laboratory."""

from __future__ import annotations

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from typing import Callable, Dict, Optional

from graphs import GraphDashboard
from materials_database import MATERIALS, Material, classes, get_material, names_for_class
from periodic_table import PERIODIC_TABLE, Element, get_element
from physics_engine import BeamParameters, PhysicsEngine, SimulationResult
from simulation_canvas import SimulationCanvas
from utilities import export_profile_csv, export_report, format_number, load_experiment, save_experiment


PANEL_BG = "#091523"
PANEL_BG_2 = "#0d1d2d"
TEXT_BG = "#07111f"
TEXT_FG = "#e7f8ff"
MUTED_FG = "#9fb9ca"


class ScrollableFrame(ttk.Frame):
    def __init__(self, master: tk.Misc) -> None:
        super().__init__(master)
        self.canvas = tk.Canvas(self, bg=PANEL_BG, highlightthickness=0)
        self.scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.content = ttk.Frame(self.canvas)
        self.content.bind("<Configure>", self._on_content_configure)
        self.canvas_window = self.canvas.create_window((0, 0), window=self.content, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        self.canvas.bind("<Configure>", self._on_canvas_configure)
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")

    def _on_content_configure(self, _event: tk.Event) -> None:
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _on_canvas_configure(self, event: tk.Event) -> None:
        self.canvas.itemconfigure(self.canvas_window, width=event.width)


class PeriodicTableWidget(ttk.Frame):
    COLORS = {
        "Alkali metals": "#335c67",
        "Alkaline earth metals": "#44633f",
        "Transition metals": "#4d5d7a",
        "Post-transition metals": "#5f5673",
        "Metalloids": "#6b6a35",
        "Nonmetals": "#316b5b",
        "Halogens": "#6d4c67",
        "Noble gases": "#355c7d",
        "Lanthanides": "#604f7a",
        "Actinides": "#704050",
        "Unknown": "#404b5a",
    }

    def __init__(self, master: tk.Misc, on_select: Callable[[str], None]) -> None:
        super().__init__(master)
        self.on_select = on_select
        self.buttons: Dict[str, tk.Button] = {}
        self.base_styles: Dict[str, tuple[str, str]] = {}
        self.selected_symbol = "Ar"
        self._build()

    def _build(self) -> None:
        grid = tk.Frame(self, bg=PANEL_BG)
        grid.pack(fill="x")
        for column in range(18):
            grid.grid_columnconfigure(column, weight=1, uniform="pt")

        rows = [
            ["H", None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, "He"],
            ["Li", "Be", None, None, None, None, None, None, None, None, None, None, "B", "C", "N", "O", "F", "Ne"],
            ["Na", "Mg", None, None, None, None, None, None, None, None, None, None, "Al", "Si", "P", "S", "Cl", "Ar"],
            ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
            ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
            ["Cs", "Ba", "La", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
            ["Fr", "Ra", "Ac", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
            [None] * 18,
            [None, None, "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu", None, None],
            [None, None, "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr", None, None],
        ]
        for row_index, row in enumerate(rows):
            for column_index, symbol in enumerate(row):
                if not symbol:
                    spacer = tk.Label(grid, text="", bg=PANEL_BG, width=3, height=1)
                    spacer.grid(row=row_index, column=column_index, padx=1, pady=1, sticky="nsew")
                    continue
                element = PERIODIC_TABLE[symbol]
                self._make_button(grid, element, row_index, column_index)
        self.set_selected(self.selected_symbol)

    def _make_button(self, parent: tk.Frame, element: Element, row: int, column: int) -> None:
        bg = self.COLORS.get(element.category, "#404b5a")
        if not element.stable:
            bg = "#54313b"
        button = tk.Button(
            parent,
            text=element.symbol,
            width=3,
            height=1,
            bg=bg,
            fg="#f4fbff",
            activebackground="#82d8ff",
            activeforeground="#06111f",
            relief="flat",
            bd=1,
            font=("Helvetica", 8, "bold"),
            command=lambda symbol=element.symbol: self.on_select(symbol),
        )
        button.grid(row=row, column=column, padx=1, pady=1, sticky="nsew")
        self.buttons[element.symbol] = button
        self.base_styles[element.symbol] = (bg, "#f4fbff")

    def set_selected(self, symbol: str) -> None:
        if self.selected_symbol in self.buttons:
            bg, fg = self.base_styles[self.selected_symbol]
            self.buttons[self.selected_symbol].configure(relief="flat", bd=1, bg=bg, fg=fg)
        self.selected_symbol = symbol
        if symbol in self.buttons:
            self.buttons[symbol].configure(relief="sunken", bd=3, bg="#d7f7ff", fg="#06111f")


class IonBeamSimulatorApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Ion Beam Irradiation Simulator")
        self.root.geometry("1540x940")
        self.root.minsize(1180, 760)
        self.root.configure(bg="#050d17")

        self.physics = PhysicsEngine()
        self.current_parameters: Optional[BeamParameters] = None
        self.current_result: Optional[SimulationResult] = None
        self._refresh_job: Optional[str] = None

        self._build_variables()
        self._setup_styles()
        self._build_layout()
        self._bind_variables()
        self.refresh_simulation()

    def _build_variables(self) -> None:
        self.ion_var = tk.StringVar(value="Ar")
        self.charge_var = tk.IntVar(value=1)
        self.material_class_var = tk.StringVar(value="Metals")
        self.material_var = tk.StringVar(value="Iron")
        self.energy_var = tk.DoubleVar(value=500.0)
        self.fluence_exp_var = tk.DoubleVar(value=13.0)
        self.time_var = tk.DoubleVar(value=60.0)
        self.let_var = tk.DoubleVar(value=0.35)
        self.current_var = tk.DoubleVar(value=100.0)
        self.angle_var = tk.DoubleVar(value=0.0)
        self.spread_var = tk.DoubleVar(value=4.0)
        self.intensity_var = tk.DoubleVar(value=4.0)
        self.speed_var = tk.DoubleVar(value=1.0)
        self.mode_var = tk.StringVar(value="Educational")

    def _setup_styles(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(".", background=PANEL_BG, foreground=TEXT_FG, fieldbackground=PANEL_BG_2, bordercolor="#294158")
        style.configure("TFrame", background=PANEL_BG)
        style.configure("TLabel", background=PANEL_BG, foreground=TEXT_FG)
        style.configure("Muted.TLabel", background=PANEL_BG, foreground=MUTED_FG)
        style.configure("Title.TLabel", background=PANEL_BG, foreground="#dff8ff", font=("Helvetica", 13, "bold"))
        style.configure("Metric.TLabel", background="#0a1828", foreground="#e7f8ff", padding=4)
        style.configure("TLabelFrame", background=PANEL_BG, foreground="#dff8ff", bordercolor="#294158")
        style.configure("TLabelFrame.Label", background=PANEL_BG, foreground="#dff8ff", font=("Helvetica", 10, "bold"))
        style.configure("TButton", background="#12324d", foreground="#f4fbff", borderwidth=1, focusthickness=0)
        style.map("TButton", background=[("active", "#1a527a")])
        style.configure("Accent.TButton", background="#1f6f8b", foreground="#ffffff", font=("Helvetica", 10, "bold"))
        style.configure("TCombobox", fieldbackground="#102033", background="#102033", foreground="#e7f8ff")
        style.configure("TNotebook", background=PANEL_BG, borderwidth=0)
        style.configure("TNotebook.Tab", background="#102033", foreground="#dff8ff", padding=(10, 4))
        style.map("TNotebook.Tab", background=[("selected", "#183a56")])

    def _build_layout(self) -> None:
        self.root.grid_rowconfigure(0, weight=4)
        self.root.grid_rowconfigure(1, weight=2)
        self.root.grid_columnconfigure(0, weight=1)

        main = ttk.Frame(self.root)
        main.grid(row=0, column=0, sticky="nsew", padx=8, pady=(8, 4))
        main.grid_columnconfigure(0, minsize=340, weight=0)
        main.grid_columnconfigure(1, weight=1)
        main.grid_columnconfigure(2, minsize=360, weight=0)
        main.grid_rowconfigure(0, weight=1)

        self.left_panel = ScrollableFrame(main)
        self.left_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 8))
        self._build_left_panel(self.left_panel.content)

        center = ttk.Frame(main)
        center.grid(row=0, column=1, sticky="nsew")
        center.grid_rowconfigure(1, weight=1)
        center.grid_columnconfigure(0, weight=1)
        header = ttk.Frame(center)
        header.grid(row=0, column=0, sticky="ew", pady=(0, 6))
        ttk.Label(header, text="Physics-Based Ion-Matter Interaction Laboratory", style="Title.TLabel").pack(side="left")
        self.status_label = ttk.Label(header, text="Ready", style="Muted.TLabel")
        self.status_label.pack(side="right")
        self.canvas = SimulationCanvas(center)
        self.canvas.grid(row=1, column=0, sticky="nsew")

        right = ttk.Frame(main)
        right.grid(row=0, column=2, sticky="nsew", padx=(8, 0))
        right.grid_rowconfigure(0, weight=1)
        right.grid_columnconfigure(0, weight=1)
        self._build_right_panel(right)

        bottom = ttk.Frame(self.root)
        bottom.grid(row=1, column=0, sticky="nsew", padx=8, pady=(4, 8))
        bottom.grid_columnconfigure(0, weight=4)
        bottom.grid_columnconfigure(1, weight=1)
        bottom.grid_rowconfigure(0, weight=1)

        self.graphs = GraphDashboard(bottom)
        self.graphs.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        log_frame = ttk.LabelFrame(bottom, text="Simulation Log")
        log_frame.grid(row=0, column=1, sticky="nsew")
        log_frame.grid_rowconfigure(0, weight=1)
        log_frame.grid_columnconfigure(0, weight=1)
        self.log_text = tk.Text(log_frame, height=8, bg=TEXT_BG, fg=TEXT_FG, insertbackground=TEXT_FG, relief="flat")
        self.log_text.grid(row=0, column=0, sticky="nsew", padx=6, pady=6)

    def _build_left_panel(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="Periodic Table Ion Source", style="Title.TLabel").pack(anchor="w", padx=8, pady=(8, 4))
        self.periodic_table = PeriodicTableWidget(parent, self.on_periodic_select)
        self.periodic_table.pack(fill="x", padx=8, pady=(0, 10))

        source = ttk.LabelFrame(parent, text="Ion Species")
        source.pack(fill="x", padx=8, pady=6)
        self._combo_row(source, "Ion", self.ion_var, list(PERIODIC_TABLE.keys()), self.on_ion_changed)
        self._spin_row(source, "Charge state", self.charge_var, 1, 8)
        mode_box = ttk.Combobox(source, textvariable=self.mode_var, values=["Educational", "Research"], state="readonly")
        self._labeled_widget(source, "Mode", mode_box)

        material_frame = ttk.LabelFrame(parent, text="Target Material")
        material_frame.pack(fill="x", padx=8, pady=6)
        self._combo_row(material_frame, "Class", self.material_class_var, classes(), self.on_material_class_changed)
        self.material_combo = ttk.Combobox(material_frame, textvariable=self.material_var, values=names_for_class("Metals"), state="readonly")
        self.material_combo.bind("<<ComboboxSelected>>", lambda _event: self.schedule_refresh())
        self._labeled_widget(material_frame, "Material", self.material_combo)

        beam = ttk.LabelFrame(parent, text="Beam and Irradiation Controls")
        beam.pack(fill="x", padx=8, pady=6)
        self.value_labels: Dict[str, ttk.Label] = {}
        self._slider(beam, "Ion energy", self.energy_var, 1, 5000, "keV")
        self._slider(beam, "Ion fluence", self.fluence_exp_var, 8, 17, "log10 ions/cm^2", value_formatter=lambda value: f"1e{value:.1f}")
        self._slider(beam, "Irradiation time", self.time_var, 1, 3600, "s")
        self._slider(beam, "LET input", self.let_var, 0.0, 5.0, "keV/nm")
        self._slider(beam, "Beam current", self.current_var, 0, 2000, "nA")
        self._slider(beam, "Beam angle", self.angle_var, 0, 75, "deg")
        self._slider(beam, "Beam spread", self.spread_var, 0, 25, "deg")
        self._slider(beam, "Beam intensity", self.intensity_var, 0.1, 10, "relative")
        self._slider(beam, "Simulation speed", self.speed_var, 0.2, 3, "x")

        actions = ttk.LabelFrame(parent, text="Experiment")
        actions.pack(fill="x", padx=8, pady=(6, 12))
        for index, (text, command, style) in enumerate(
            [
                ("Start", self.start_simulation, "Accent.TButton"),
                ("Pause", self.canvas.pause, "TButton"),
                ("Reset", self.reset_simulation, "TButton"),
                ("Export CSV", self.export_csv, "TButton"),
                ("Export Report", self.export_report_file, "TButton"),
                ("Export Graph", self.export_graph, "TButton"),
                ("Screenshot", self.export_screenshot, "TButton"),
                ("Save", self.save_file, "TButton"),
                ("Load", self.load_file, "TButton"),
            ]
        ):
            button = ttk.Button(actions, text=text, command=command, style=style)
            button.grid(row=index // 3, column=index % 3, sticky="ew", padx=4, pady=4)
        for column in range(3):
            actions.grid_columnconfigure(column, weight=1)

    def _build_right_panel(self, parent: ttk.Frame) -> None:
        notebook = ttk.Notebook(parent)
        notebook.grid(row=0, column=0, sticky="nsew")

        outputs = ttk.Frame(notebook)
        notebook.add(outputs, text="Outputs")
        outputs.grid_columnconfigure(0, weight=1)
        self.output_labels: Dict[str, ttk.Label] = {}
        for row, key in enumerate(
            [
                "Initial energy (keV)",
                "Final energy (keV)",
                "LET (keV/nm)",
                "Stopping power (keV/nm)",
                "Penetration depth (nm)",
                "Energy deposited (keV)",
                "Ion velocity (m/s)",
                "Collisions",
                "Defect density (cm^-3)",
                "Sputtering yield (atoms/ion)",
                "Temperature rise (K)",
                "Electronic stopping (keV/nm)",
                "Nuclear stopping (keV/nm)",
                "Electronic energy deposited (keV)",
                "Nuclear energy deposited (keV)",
                "Secondary electrons (per ion)",
                "Vacancies (per ion)",
                "Interstitials (per ion)",
                "Radiation damage (DPA)",
                "Thermal spike peak (K)",
                "Beam flux (ions/cm^2/s)",
            ]
        ):
            label = ttk.Label(outputs, text=key, style="Muted.TLabel")
            label.grid(row=row, column=0, sticky="w", padx=8, pady=(5, 0))
            value = ttk.Label(outputs, text="-", style="Metric.TLabel")
            value.grid(row=row, column=1, sticky="ew", padx=8, pady=(5, 0))
            self.output_labels[key] = value

        props = ttk.Frame(notebook)
        notebook.add(props, text="Properties")
        props.grid_rowconfigure(0, weight=1)
        props.grid_columnconfigure(0, weight=1)
        self.properties_text = tk.Text(props, bg=TEXT_BG, fg=TEXT_FG, relief="flat", wrap="word", height=24)
        self.properties_text.grid(row=0, column=0, sticky="nsew", padx=6, pady=6)

        explanation = ttk.Frame(notebook)
        notebook.add(explanation, text="Explanation")
        explanation.grid_rowconfigure(0, weight=1)
        explanation.grid_columnconfigure(0, weight=1)
        self.explanation_text = tk.Text(explanation, bg=TEXT_BG, fg=TEXT_FG, relief="flat", wrap="word", height=24)
        self.explanation_text.grid(row=0, column=0, sticky="nsew", padx=6, pady=6)

    def _labeled_widget(self, parent: ttk.Frame, label: str, widget: tk.Widget) -> None:
        row = len(parent.grid_slaves()) // 2
        ttk.Label(parent, text=label, style="Muted.TLabel").grid(row=row, column=0, sticky="w", padx=8, pady=5)
        widget.grid(row=row, column=1, sticky="ew", padx=8, pady=5)
        parent.grid_columnconfigure(1, weight=1)

    def _combo_row(
        self,
        parent: ttk.Frame,
        label: str,
        variable: tk.StringVar,
        values: list[str],
        callback: Callable[..., None],
    ) -> None:
        combo = ttk.Combobox(parent, textvariable=variable, values=values, state="readonly")
        combo.bind("<<ComboboxSelected>>", callback)
        self._labeled_widget(parent, label, combo)

    def _spin_row(self, parent: ttk.Frame, label: str, variable: tk.IntVar, start: int, end: int) -> None:
        spin = ttk.Spinbox(parent, from_=start, to=end, textvariable=variable, width=6, command=self.schedule_refresh)
        self._labeled_widget(parent, label, spin)

    def _slider(
        self,
        parent: ttk.Frame,
        label: str,
        variable: tk.DoubleVar,
        start: float,
        end: float,
        unit: str,
        value_formatter: Optional[Callable[[float], str]] = None,
    ) -> None:
        row = len(parent.grid_slaves()) // 3
        ttk.Label(parent, text=label, style="Muted.TLabel").grid(row=row, column=0, sticky="w", padx=8, pady=(6, 0))
        scale = ttk.Scale(parent, from_=start, to=end, variable=variable, command=lambda _value: self.on_slider_changed())
        scale.grid(row=row, column=1, sticky="ew", padx=8, pady=(6, 0))
        formatted = value_formatter(variable.get()) if value_formatter else f"{variable.get():.2f} {unit}"
        value = ttk.Label(parent, text=formatted, style="Muted.TLabel", width=17, anchor="e")
        value.grid(row=row, column=2, sticky="e", padx=8, pady=(6, 0))
        parent.grid_columnconfigure(1, weight=1)
        self.value_labels[label] = value
        value.formatter = value_formatter  # type: ignore[attr-defined]
        value.unit = unit  # type: ignore[attr-defined]
        value.variable = variable  # type: ignore[attr-defined]

    def _bind_variables(self) -> None:
        for variable in [
            self.ion_var,
            self.charge_var,
            self.material_var,
            self.mode_var,
            self.energy_var,
            self.fluence_exp_var,
            self.time_var,
            self.let_var,
            self.current_var,
            self.angle_var,
            self.spread_var,
            self.intensity_var,
            self.speed_var,
        ]:
            variable.trace_add("write", lambda *_args: self.schedule_refresh())

    def on_periodic_select(self, symbol: str) -> None:
        self.ion_var.set(symbol)
        self.periodic_table.set_selected(symbol)

    def on_ion_changed(self, _event: Optional[tk.Event] = None) -> None:
        self.periodic_table.set_selected(self.ion_var.get())
        self.schedule_refresh()

    def on_material_class_changed(self, _event: Optional[tk.Event] = None) -> None:
        material_class = self.material_class_var.get()
        values = names_for_class(material_class)
        self.material_combo.configure(values=values)
        if values and self.material_var.get() not in values:
            self.material_var.set(values[0])
        self.schedule_refresh()

    def on_slider_changed(self) -> None:
        for label in self.value_labels.values():
            variable = label.variable  # type: ignore[attr-defined]
            formatter = label.formatter  # type: ignore[attr-defined]
            unit = label.unit  # type: ignore[attr-defined]
            value = variable.get()
            label.configure(text=formatter(value) if formatter else f"{value:.2f} {unit}")
        self.schedule_refresh()

    def schedule_refresh(self) -> None:
        if self._refresh_job is not None:
            self.root.after_cancel(self._refresh_job)
        self._refresh_job = self.root.after(120, self.refresh_simulation)

    def build_parameters(self) -> BeamParameters:
        ion = get_element(self.ion_var.get())
        target = get_material(self.material_var.get())
        return BeamParameters(
            ion=ion,
            target=target,
            charge_state=max(1, int(self.charge_var.get())),
            energy_kev=max(0.1, float(self.energy_var.get())),
            fluence_ions_cm2=10 ** float(self.fluence_exp_var.get()),
            irradiation_time_s=max(1.0, float(self.time_var.get())),
            let_kev_nm=max(0.0, float(self.let_var.get())),
            beam_current_na=max(0.0, float(self.current_var.get())),
            beam_angle_deg=float(self.angle_var.get()),
            beam_spread_deg=float(self.spread_var.get()),
            beam_intensity=float(self.intensity_var.get()),
            simulation_speed=float(self.speed_var.get()),
            mode=self.mode_var.get(),
        )

    def refresh_simulation(self) -> None:
        self._refresh_job = None
        try:
            parameters = self.build_parameters()
            result = self.physics.calculate(parameters)
        except Exception as exc:
            self.status_label.configure(text=f"Input error: {exc}")
            return
        self.current_parameters = parameters
        self.current_result = result
        self.canvas.set_simulation(parameters, result)
        self.graphs.update(result, parameters.beam_intensity, parameters.irradiation_time_s)
        self.update_outputs(result)
        self.update_properties(parameters)
        self.update_explanation(result)
        self.status_label.configure(text=f"{parameters.ion.symbol}{parameters.charge_state}+ -> {parameters.target.name}")

    def update_outputs(self, result: SimulationResult) -> None:
        outputs = result.scalar_outputs()
        for key, label in self.output_labels.items():
            value = outputs.get(key)
            label.configure(text="-" if value is None else format_number(float(value)))

    def update_properties(self, parameters: BeamParameters) -> None:
        ion = parameters.ion
        target = parameters.target
        lines = [
            "ION PROPERTIES",
            f"Name: {ion.name}",
            f"Symbol: {ion.symbol}",
            f"Atomic number: {ion.atomic_number}",
            f"Atomic mass: {ion.atomic_mass} amu",
            f"Electron configuration: {ion.electron_configuration}",
            f"Period / group: {ion.period} / {ion.group}",
            f"Category: {ion.category}",
            f"Ionization energy: {ion.ionization_energy} eV",
            f"Density: {ion.density} g/cm^3",
            f"Atomic radius: {ion.atomic_radius} pm",
            f"Melting point: {ion.melting_point} K",
            f"Boiling point: {ion.boiling_point} K",
            f"Electronegativity: {ion.electronegativity}",
            f"Stable: {ion.stable}",
            f"Data quality: {ion.data_quality}",
            "",
            "TARGET MATERIAL",
            f"Name: {target.name}",
            f"Formula: {target.formula}",
            f"Class: {target.material_class}",
            f"Subclass: {target.subclass}",
            f"Density: {target.density} g/cm^3",
            f"Melting point: {target.melting_point} K",
            f"Thermal conductivity: {target.thermal_conductivity} W/mK",
            f"Electrical conductivity: {target.electrical_conductivity:.3e} S/m",
            f"Bandgap: {target.bandgap} eV",
            f"Atomic/molecular mass: {target.atomic_mass} amu",
            f"Dielectric constant: {target.dielectric_constant}",
            f"Specific heat: {target.specific_heat} J/gK",
            f"Crystal structure: {target.crystal_structure}",
            f"Displacement energy: {target.displacement_energy} eV",
            f"Radiation tolerance: {target.radiation_tolerance}",
            f"Radiation hardness: {target.radiation_hardness}",
            f"Carrier mobility: {target.carrier_mobility_cm2_v_s} cm^2/Vs",
            f"Breakdown field: {target.breakdown_field_mv_cm} MV/cm",
            f"Optical: n={target.optical_properties.refractive_index}, edge={target.optical_properties.absorption_edge_nm} nm",
            f"Stopping coefficients: Se={target.stopping_coefficients.electronic}, Sn={target.stopping_coefficients.nuclear}",
            f"Notes: {target.notes}",
        ]
        self._set_text(self.properties_text, "\n".join(lines))

    def update_explanation(self, result: SimulationResult) -> None:
        self._set_text(self.explanation_text, result.explanation)

    def start_simulation(self) -> None:
        self.refresh_simulation()
        self.canvas.start()
        self.log("Simulation started.")

    def reset_simulation(self) -> None:
        self.canvas.pause()
        self.canvas.reset()
        self.log("Simulation reset.")

    def export_csv(self) -> None:
        if not self.current_result:
            return
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV", "*.csv")])
        if path:
            export_profile_csv(path, self.current_result)
            self.log(f"CSV exported: {path}")

    def export_report_file(self) -> None:
        if not self.current_parameters or not self.current_result:
            return
        path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text report", "*.txt")])
        if path:
            export_report(path, self.current_parameters, self.current_result)
            self.log(f"Report exported: {path}")

    def export_graph(self) -> None:
        path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG", "*.png")])
        if path:
            if self.graphs.save_active_figure(path):
                self.log(f"Graph exported: {path}")
            else:
                messagebox.showinfo("Graph export", "matplotlib is not available in this Python environment.")

    def export_screenshot(self) -> None:
        path = filedialog.asksaveasfilename(defaultextension=".eps", filetypes=[("Encapsulated PostScript", "*.eps")])
        if path:
            self.canvas.postscript(file=path, colormode="color")
            self.log(f"Canvas screenshot exported: {path}")

    def save_file(self) -> None:
        if not self.current_parameters or not self.current_result:
            return
        path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("Experiment JSON", "*.json")])
        if path:
            save_experiment(path, self.current_parameters, self.current_result)
            self.log(f"Experiment saved: {path}")

    def load_file(self) -> None:
        path = filedialog.askopenfilename(filetypes=[("Experiment JSON", "*.json")])
        if not path:
            return
        payload = load_experiment(path)
        params = payload.get("parameters", {})
        if not isinstance(params, dict):
            messagebox.showerror("Load experiment", "The selected file does not contain simulator parameters.")
            return
        self.ion_var.set(str(params.get("ion_symbol", "Ar")))
        self.charge_var.set(int(params.get("charge_state", 1)))
        target_name = str(params.get("target_name", "Iron"))
        if target_name in MATERIALS:
            self.material_class_var.set(MATERIALS[target_name].material_class)
            self.on_material_class_changed()
            self.material_var.set(target_name)
        self.energy_var.set(float(params.get("energy_kev", 500.0)))
        self.fluence_exp_var.set(self._safe_log10(float(params.get("fluence_ions_cm2", 1e13))))
        self.time_var.set(float(params.get("irradiation_time_s", 60.0)))
        self.let_var.set(float(params.get("let_kev_nm", 0.35)))
        self.current_var.set(float(params.get("beam_current_na", 100.0)))
        self.angle_var.set(float(params.get("beam_angle_deg", 0.0)))
        self.spread_var.set(float(params.get("beam_spread_deg", 4.0)))
        self.intensity_var.set(float(params.get("beam_intensity", 4.0)))
        self.speed_var.set(float(params.get("simulation_speed", 1.0)))
        self.mode_var.set(str(params.get("mode", "Educational")))
        self.on_slider_changed()
        self.refresh_simulation()
        self.log(f"Experiment loaded: {path}")

    def log(self, message: str) -> None:
        self.log_text.insert("end", f"{message}\n")
        self.log_text.see("end")

    @staticmethod
    def _safe_log10(value: float) -> float:
        import math

        return math.log10(max(value, 1.0))

    @staticmethod
    def _set_text(widget: tk.Text, content: str) -> None:
        widget.configure(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", content)
        widget.configure(state="disabled")

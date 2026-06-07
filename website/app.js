const db = { elements: [], materials: [], isotopes: [] };
const elementBySymbol = new Map();
const materialByName = new Map();
const isotopesBySymbol = new Map();

const controls = Object.fromEntries(
  ["ion", "isotope", "charge", "energy", "materialClass", "material", "fluence", "time", "let", "angle", "spread", "intensity"]
    .map((id) => [id, document.querySelector(`#${id}`)]),
);

const outputs = Object.fromEntries(
  ["energy", "fluence", "time", "let", "angle", "spread", "intensity"].map((id) => [id, document.querySelector(`#${id}Out`)]),
);

const scene = document.querySelector("#scene");
const sceneContext = scene.getContext("2d");
let mode = "Educational";
let running = false;
let frame = 0;
let particles = [];
let flashes = [];
let currentResult = null;
let experimentHistory = loadHistory();

const fallbackElements = [
  { name: "Hydrogen", scientific_name: "Hydrogen", symbol: "H", atomic_number: 1, atomic_mass: 1.008, period: 1, group: 1, block: "s", category: "Nonmetals", density: 0.0000899, electron_configuration: "1s1", common_charge_states: [1], stable_isotopes: [1, 2] },
  { name: "Helium", scientific_name: "Helium", symbol: "He", atomic_number: 2, atomic_mass: 4.0026, period: 1, group: 18, block: "s", category: "Noble gases", density: 0.0001785, electron_configuration: "1s2", common_charge_states: [1], stable_isotopes: [3, 4] },
  { name: "Argon", scientific_name: "Argon", symbol: "Ar", atomic_number: 18, atomic_mass: 39.948, period: 3, group: 18, block: "p", category: "Noble gases", density: 0.001784, electron_configuration: "[Ne] 3s2 3p6", common_charge_states: [1, 2], stable_isotopes: [36, 38, 40] },
  { name: "Iron", scientific_name: "Iron", symbol: "Fe", atomic_number: 26, atomic_mass: 55.845, period: 4, group: 8, block: "d", category: "Transition metals", density: 7.874, electron_configuration: "[Ar] 4s2 3d6", common_charge_states: [2, 3], stable_isotopes: [54, 56, 57, 58] },
  { name: "Xenon", scientific_name: "Xenon", symbol: "Xe", atomic_number: 54, atomic_mass: 131.29, period: 5, group: 18, block: "p", category: "Noble gases", density: 0.00589, electron_configuration: "[Kr] 5s2 4d10 5p6", common_charge_states: [1, 2], stable_isotopes: [124, 126, 128, 129, 130, 131, 132, 134, 136] },
  { name: "Gold", scientific_name: "Gold", symbol: "Au", atomic_number: 79, atomic_mass: 196.97, period: 6, group: 11, block: "d", category: "Transition metals", density: 19.3, electron_configuration: "[Xe] 6s1 4f14 5d10", common_charge_states: [1, 3], stable_isotopes: [197] },
];

const fallbackMaterials = [
  fallbackMaterial("Iron", "Fe", "Metals", "Pure metals", 7.87, 55.845, 0, 40, 1.28, 0.74, 1.0, 1.1, 0.45),
  fallbackMaterial("Silicon", "Si", "Semiconductors", "Elemental semiconductors", 2.329, 28.085, 1.12, 15, 0.9, 0.55, 1.35, 0.12, 0.7),
  fallbackMaterial("Alumina", "Al2O3", "Insulators", "Ceramic insulators", 3.95, 101.96, 8.8, 40, 0.88, 0.66, 1.16, 0.08, 0.8),
  fallbackMaterial("PTFE (Teflon)", "(C2F4)n", "Polymers", "Thermoplastic polymers", 2.2, 12, 5.8, 12, 0.64, 0.26, 2.5, 0.32, 1.5),
  fallbackMaterial("Gold", "Au", "Metals", "Pure metals", 19.3, 196.97, 0, 35, 1.68, 1.02, 0.72, 2.4, 0.45),
  fallbackMaterial("Diamond", "C", "Semiconductors", "Wide bandgap semiconductors", 3.51, 12.011, 5.47, 43, 0.7, 0.5, 1.65, 0.02, 0.5),
];

function fallbackMaterial(name, formula, materialClass, subclass, density, atomicMass, bandgap, displacement, se, sn, range, sputter, specificHeat) {
  return {
    name,
    formula,
    material_class: materialClass,
    subclass,
    density,
    atomic_mass: atomicMass,
    bandgap,
    displacement_energy: displacement,
    thermal_conductivity: materialClass === "Metals" ? 80 : 5,
    electrical_conductivity: materialClass === "Metals" ? 1e7 : 1e-10,
    dielectric_constant: materialClass === "Metals" ? null : 8,
    specific_heat: specificHeat,
    crystal_structure: "reference structure",
    radiation_tolerance: "moderate",
    stopping_coefficients: { electronic: se, nuclear: sn, range_factor: range, sputter_yield: sputter },
    optical_properties: { refractive_index: null, absorption_edge_nm: null, transparency: "material dependent" },
  };
}

async function loadDatabases() {
  try {
    const [elementsPayload, materialsPayload, isotopesPayload] = await Promise.all([
      fetch("../data/elements.json").then(requireOk).then((response) => response.json()),
      fetch("../data/materials.json").then(requireOk).then((response) => response.json()),
      fetch("../data/isotopes.json").then(requireOk).then((response) => response.json()),
    ]);
    db.elements = elementsPayload.elements;
    db.materials = materialsPayload.materials;
    db.isotopes = isotopesPayload.isotopes;
    document.querySelector("#databaseStatus").textContent =
      `${db.elements.length} elements, ${db.isotopes.length} stable isotope records, ${db.materials.length} materials loaded.`;
  } catch (error) {
    db.elements = fallbackElements;
    db.materials = fallbackMaterials;
    db.isotopes = fallbackElements.flatMap((element) =>
      (element.stable_isotopes || []).map((mass) => ({ symbol: element.symbol, element: element.name, mass_number: mass, isotope_label: `${element.symbol}-${mass}`, stable: true })),
    );
    document.querySelector("#databaseStatus").textContent =
      "Fallback database active. Serve the repository over HTTP to load the full JSON research database.";
    addLog(`Database fallback: ${error.message}`);
  }

  db.elements.sort((a, b) => a.atomic_number - b.atomic_number);
  db.materials.sort((a, b) => a.name.localeCompare(b.name));
  for (const element of db.elements) elementBySymbol.set(element.symbol, element);
  for (const entry of db.materials) materialByName.set(entry.name, entry);
  for (const isotope of db.isotopes) {
    if (!isotopesBySymbol.has(isotope.symbol)) isotopesBySymbol.set(isotope.symbol, []);
    isotopesBySymbol.get(isotope.symbol).push(isotope);
  }
}

function requireOk(response) {
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response;
}

function populateControls() {
  controls.ion.innerHTML = db.elements.map((element) => `<option value="${element.symbol}">${element.symbol} - ${element.name}</option>`).join("");
  controls.ion.value = elementBySymbol.has("Ar") ? "Ar" : db.elements[0].symbol;

  const classes = [...new Set(db.materials.map((entry) => entry.material_class))].sort();
  controls.materialClass.innerHTML = classes.map((value) => `<option>${value}</option>`).join("");
  controls.materialClass.value = classes.includes("Metals") ? "Metals" : classes[0];
  populateMaterialSelect("Iron");
  populateIonDependentControls();

  populateOptions("#compareMaterialA", db.materials, "name", "name", "Iron");
  populateOptions("#compareMaterialB", db.materials, "name", "name", materialByName.has("Silicon") ? "Silicon" : db.materials[1]?.name);
  populateOptions("#compareIonA", db.elements, "symbol", "symbol", "Ar");
  populateOptions("#compareIonB", db.elements, "symbol", "symbol", elementBySymbol.has("Xe") ? "Xe" : db.elements[1]?.symbol);

  const categories = [...new Set(db.elements.map((entry) => entry.category))].sort();
  document.querySelector("#elementCategory").innerHTML = `<option value="">All categories</option>${categories.map((value) => `<option>${value}</option>`).join("")}`;
  document.querySelector("#elementGroup").innerHTML = `<option value="">All groups</option>${Array.from({ length: 18 }, (_value, index) => `<option value="${index + 1}">Group ${index + 1}</option>`).join("")}`;
  document.querySelector("#elementPeriod").innerHTML = `<option value="">All periods</option>${Array.from({ length: 7 }, (_value, index) => `<option value="${index + 1}">Period ${index + 1}</option>`).join("")}`;
}

function populateOptions(selector, records, valueKey, labelKey, selectedValue) {
  const select = document.querySelector(selector);
  select.innerHTML = records.map((record) => `<option value="${record[valueKey]}">${record[labelKey]}</option>`).join("");
  if (selectedValue) select.value = selectedValue;
}

function populateMaterialSelect(preferred) {
  const selectedClass = controls.materialClass.value;
  const records = db.materials.filter((entry) => entry.material_class === selectedClass);
  controls.material.innerHTML = records.map((entry) => `<option>${entry.name}</option>`).join("");
  controls.material.value = records.some((entry) => entry.name === preferred) ? preferred : records[0]?.name || "";
}

function populateIonDependentControls() {
  const element = elementBySymbol.get(controls.ion.value);
  const isotopeRecords = isotopesBySymbol.get(element.symbol) || [];
  controls.isotope.innerHTML = `<option value="${element.atomic_mass}">Natural (${element.atomic_mass} amu)</option>` +
    isotopeRecords.map((entry) => `<option value="${entry.mass_number}">${entry.isotope_label}</option>`).join("");
  const states = (element.common_charge_states || [1]).filter((value) => value > 0);
  controls.charge.innerHTML = states.map((value) => `<option value="${value}">${value}+</option>`).join("");
  if (!states.length) controls.charge.innerHTML = `<option value="1">1+</option>`;
}

function readInputs(overrides = {}) {
  const element = overrides.element || elementBySymbol.get(controls.ion.value);
  const material = overrides.material || materialByName.get(controls.material.value);
  return {
    element,
    material,
    mass: overrides.mass ?? Number(controls.isotope.value || element.atomic_mass),
    charge: overrides.charge ?? Number(controls.charge.value || 1),
    energy: overrides.energy ?? Number(controls.energy.value),
    fluence: overrides.fluence ?? 10 ** Number(controls.fluence.value),
    time: overrides.time ?? Number(controls.time.value),
    letInput: overrides.letInput ?? Number(controls.let.value),
    angle: overrides.angle ?? Number(controls.angle.value),
    spread: overrides.spread ?? Number(controls.spread.value),
    intensity: overrides.intensity ?? Number(controls.intensity.value),
  };
}

function calculate(overrides = {}) {
  const state = readInputs(overrides);
  const { element, material, energy, charge } = state;
  const stop = material.stopping_coefficients || { electronic: 0.9, nuclear: 0.6, range_factor: 1, sputter_yield: 0.1 };
  const density = Math.max(material.density || 1, 0.05);
  const atomicMass = Math.max(material.atomic_mass || 50, 1);
  const bandgapFactor = material.bandgap ? 1 / (1 + 0.08 * material.bandgap) : 1;
  const zEffective = Math.max(charge, 1) * (1 - Math.exp(-element.atomic_number / 35));
  const velocityScale = Math.sqrt(Math.max(energy, 1) / Math.max(state.mass, 1));
  const se = stop.electronic * Math.sqrt(density) * zEffective ** 1.35 * bandgapFactor / (0.8 + velocityScale);
  const reducedMass = state.mass * atomicMass / Math.max(state.mass + atomicMass, 1);
  const zFactor = Math.sqrt(Math.max(element.atomic_number * atomicMass / 55, 0.01));
  const sn = stop.nuclear * density ** 0.72 * reducedMass ** 0.18 * zFactor / Math.sqrt(Math.max(energy, 1) / 100 + 0.25) * 0.12;
  const angleFactor = Math.max(Math.cos((state.angle * Math.PI) / 180), 0.12);
  const range = 0.55 * stop.range_factor * Math.max(energy, 0.1) ** 1.5 /
    (density ** 0.72 * (1 + Math.sqrt(state.mass / atomicMass))) * angleFactor;
  const letValue = se + sn + state.letInput * 0.05;
  const deposited = Math.min(energy, letValue * range * 0.75);
  const electronicDeposited = deposited * se / Math.max(se + sn, 1e-12);
  const nuclearDeposited = deposited - electronicDeposited;
  const displacement = Math.max(material.displacement_energy || 25, 1);
  const vacancies = 0.8 * nuclearDeposited * 1000 / (2 * displacement);
  const interstitials = vacancies * 0.92;
  const secondaryElectrons = electronicDeposited * 1000 / Math.max(12, (material.bandgap || 3) * 2.8);
  const defectDensity = vacancies * state.fluence / (Math.max(range, 1) * 1e-7);
  const atomicDensity = density / atomicMass * 6.02214076e23;
  const dpa = defectDensity / Math.max(atomicDensity, 1);
  const heatCapacity = material.specific_heat || (material.material_class === "Metals" ? 0.45 : 0.75);
  const energyJcm2 = deposited * 1000 * 1.602176634e-19 * state.fluence;
  const massGcm2 = density * Math.max(range, 1) * 1e-7;
  const temperature = energyJcm2 / Math.max(massGcm2 * heatCapacity, 1e-20);
  const thermalSpike = temperature * (1 + 0.8 * nuclearDeposited / Math.max(deposited, 1e-12));
  const sputter = stop.sputter_yield * (0.03 + 0.45 * (4 * state.mass * atomicMass / (state.mass + atomicMass) ** 2) / (1 + energy / 800)) *
    (1 + 0.015 * state.angle);
  const velocity = Math.sqrt(2 * energy * 1000 * 1.602176634e-19 / (state.mass * 1.6605390666e-27));

  const profile = [];
  for (let index = 0; index < 160; index += 1) {
    const x = index / 159;
    const bragg = 0.35 + 1.65 * Math.exp(-(((x - 0.82) / 0.19) ** 2));
    const localSe = se * (1 - 0.28 * x) * bragg;
    const localSn = sn * (0.55 + 1.25 * x ** 2.2);
    const localLet = Math.max(0, localSe + localSn + state.letInput * 0.05);
    profile.push({
      fraction: x,
      depth: x * range,
      energy: Math.max(0, energy * (1 - x ** 1.28)),
      let: localLet,
      se: localSe,
      sn: localSn,
      defect: defectDensity * Math.exp(-(((x - 0.78) / 0.24) ** 2)),
      vacancy: defectDensity * 0.52 * Math.exp(-(((x - 0.78) / 0.24) ** 2)),
      interstitial: defectDensity * 0.48 * Math.exp(-(((x - 0.75) / 0.25) ** 2)),
      thermalSpike: thermalSpike * Math.exp(-(((x - 0.82) / 0.16) ** 2)),
    });
  }

  return {
    ...state,
    se,
    sn,
    range,
    letValue,
    deposited,
    electronicDeposited,
    nuclearDeposited,
    vacancies,
    interstitials,
    secondaryElectrons,
    defectDensity,
    dpa,
    temperature,
    thermalSpike,
    sputter,
    velocity,
    profile,
  };
}

function syncAll() {
  currentResult = calculate();
  outputs.energy.value = `${currentResult.energy.toFixed(0)} keV`;
  outputs.fluence.value = `${currentResult.fluence.toExponential(1)} ions/cm^2`;
  outputs.time.value = `${currentResult.time.toFixed(0)} s`;
  outputs.let.value = `${currentResult.letInput.toFixed(2)} keV/nm`;
  outputs.angle.value = `${currentResult.angle.toFixed(0)} deg`;
  outputs.spread.value = `${currentResult.spread.toFixed(0)} deg`;
  outputs.intensity.value = `${currentResult.intensity.toFixed(1)} relative`;
  renderMetrics();
  renderLiveReadout();
  renderExplanation();
  renderIonProperties(currentResult.element);
  renderMaterialProperties(currentResult.material);
  renderCharts();
}

function renderMetrics() {
  const metrics = [
    ["Range", `${currentResult.range.toFixed(0)} nm`],
    ["LET", `${currentResult.letValue.toFixed(3)} keV/nm`],
    ["Electronic loss", `${currentResult.electronicDeposited.toFixed(2)} keV`],
    ["Nuclear loss", `${currentResult.nuclearDeposited.toFixed(2)} keV`],
    ["Vacancies", currentResult.vacancies.toExponential(2)],
    ["Damage", `${currentResult.dpa.toExponential(2)} DPA`],
    ["Thermal spike", `${currentResult.thermalSpike.toExponential(2)} K`],
  ];
  document.querySelector("#metrics").innerHTML = metrics.map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderLiveReadout() {
  renderDl(document.querySelector("#liveReadout"), {
    Ion: `${currentResult.element.symbol}${currentResult.charge}+`,
    Isotope: `${currentResult.mass} amu`,
    Material: currentResult.material.name,
    "Beam flux": `${(currentResult.fluence / currentResult.time).toExponential(2)} cm^-2 s^-1`,
    "Secondary electrons": currentResult.secondaryElectrons.toExponential(2),
    Interstitials: currentResult.interstitials.toExponential(2),
    "Sputter yield": currentResult.sputter.toFixed(3),
    Velocity: `${currentResult.velocity.toExponential(3)} m/s`,
  });
}

function renderExplanation() {
  let dominant = "Electronic and nuclear stopping are comparable.";
  if (currentResult.se > currentResult.sn * 1.4) dominant = "Electronic stopping dominates, generating ionization and secondary electrons along the track.";
  if (currentResult.sn > currentResult.se * 1.4) dominant = "Nuclear stopping dominates, producing recoil atoms, vacancies, and interstitials.";
  document.querySelector("#explanation").textContent =
    `${currentResult.element.symbol}${currentResult.charge}+ ions enter ${currentResult.material.name} at ${currentResult.energy.toFixed(0)} keV. ` +
    `${dominant} Energy decreases continuously and the local LET rises toward a stopping-region peak near ${(currentResult.range * 0.82).toFixed(0)} nm. ` +
    `The selected fluence produces an estimated ${currentResult.dpa.toExponential(2)} DPA and a localized thermal-spike peak of ${currentResult.thermalSpike.toExponential(2)} K.`;
}

function renderIonProperties(element) {
  renderDl(document.querySelector("#ionProperties"), {
    Name: element.scientific_name || element.name,
    Symbol: element.symbol,
    "Atomic number": element.atomic_number,
    "Atomic mass": `${element.atomic_mass} amu`,
    "Period / group": `${element.period} / ${element.group ?? "-"}`,
    Block: element.block || "-",
    Category: element.category,
    Configuration: element.electron_configuration || "-",
    Density: `${element.density ?? "-"} g/cm^3`,
    "Ionization energy": `${element.ionization_energy ?? "-"} eV`,
    "Electron affinity": `${element.electron_affinity ?? "-"} eV`,
    "Atomic radius": `${element.atomic_radius ?? "-"} pm`,
    "Covalent radius": `${element.covalent_radius ?? "-"} pm`,
    "Oxidation states": (element.oxidation_states || []).join(", "),
    "Crystal structure": element.crystal_structure || "-",
    Discovery: element.discovery_information || "-",
  });
  const isotopes = isotopesBySymbol.get(element.symbol) || [];
  renderTable(document.querySelector("#isotopeTable"), ["Isotope", "Mass number", "Abundance %", "Quality"], isotopes.map((entry) => [
    entry.isotope_label,
    entry.mass_number,
    entry.natural_abundance_percent ?? "reference needed",
    entry.data_quality || "stable",
  ]));
}

function renderMaterialProperties(material) {
  const fields = {
    Name: material.name,
    Formula: material.formula,
    Class: material.material_class,
    Subclass: material.subclass,
    Density: `${material.density} g/cm^3`,
    "Thermal conductivity": `${material.thermal_conductivity} W/mK`,
    "Electrical conductivity": `${Number(material.electrical_conductivity).toExponential(2)} S/m`,
    Bandgap: `${material.bandgap ?? "-"} eV`,
    "Dielectric constant": material.dielectric_constant ?? "-",
    "Specific heat": `${material.specific_heat ?? "-"} J/gK`,
    "Atomic/molecular mass": `${material.atomic_mass} amu`,
    "Crystal structure": material.crystal_structure || "-",
    "Displacement energy": `${material.displacement_energy} eV`,
    "Radiation tolerance": material.radiation_tolerance || "-",
    "Radiation hardness": material.radiation_hardness || "-",
    "Carrier mobility": material.carrier_mobility_cm2_v_s ? `${material.carrier_mobility_cm2_v_s} cm^2/Vs` : "-",
    "Breakdown field": material.breakdown_field_mv_cm ? `${material.breakdown_field_mv_cm} MV/cm` : "-",
    "Cross-linking tendency": material.cross_linking_tendency || "-",
    "Chain scission tendency": material.chain_scission_tendency || "-",
    "Optical response": material.optical_properties?.transparency || "-",
  };
  document.querySelector("#materialProperties").innerHTML = Object.entries(fields)
    .map(([label, value]) => `<div class="property-item"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderDl(target, values) {
  target.innerHTML = Object.entries(values).map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`).join("");
}

function renderTable(target, headers, rows) {
  target.innerHTML = `<thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>` +
    `<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? "-"}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function buildPeriodicTable() {
  const target = document.querySelector("#periodicTable");
  target.innerHTML = "";
  const lanthanides = db.elements.filter((entry) => entry.category === "Lanthanides" && entry.symbol !== "La");
  const actinides = db.elements.filter((entry) => entry.category === "Actinides" && entry.symbol !== "Ac");
  for (const element of db.elements) {
    const button = document.createElement("button");
    button.className = "element-cell";
    button.dataset.symbol = element.symbol;
    button.dataset.category = element.category;
    button.textContent = element.symbol;
    let row = element.period;
    let column = element.group || 3;
    if (lanthanides.includes(element)) {
      row = 8;
      column = lanthanides.indexOf(element) + 3;
    }
    if (actinides.includes(element)) {
      row = 9;
      column = actinides.indexOf(element) + 3;
    }
    button.style.gridRow = row;
    button.style.gridColumn = column;
    button.title = `${element.atomic_number} ${element.name} | ${element.category}`;
    button.addEventListener("mouseenter", () => renderIonProperties(element));
    button.addEventListener("mouseleave", () => renderIonProperties(elementBySymbol.get(controls.ion.value)));
    button.addEventListener("click", () => {
      controls.ion.value = element.symbol;
      populateIonDependentControls();
      syncAll();
      updatePeriodicSelection();
      addLog(`Ion selected: ${element.symbol}`);
    });
    target.append(button);
  }
  updatePeriodicSelection();
}

function updatePeriodicSelection() {
  document.querySelectorAll(".element-cell").forEach((button) => button.classList.toggle("selected", button.dataset.symbol === controls.ion.value));
}

function filterPeriodicTable() {
  const query = document.querySelector("#elementSearch").value.toLowerCase();
  const category = document.querySelector("#elementCategory").value;
  const group = Number(document.querySelector("#elementGroup").value || 0);
  const period = Number(document.querySelector("#elementPeriod").value || 0);
  document.querySelectorAll(".element-cell").forEach((button) => {
    const element = elementBySymbol.get(button.dataset.symbol);
    const visible = (!query || `${element.name} ${element.symbol}`.toLowerCase().includes(query)) &&
      (!category || element.category === category) && (!group || element.group === group) && (!period || element.period === period);
    button.classList.toggle("filtered-out", !visible);
  });
}

function renderCharts() {
  const active = document.querySelector(".tab-view.active")?.id;
  if (active !== "graphs") return;
  drawLineChart(document.querySelector("#energyChart"), "Energy vs Depth", [{ label: "Energy", color: "#4dd8ff", values: currentResult.profile.map((point) => ({ x: point.depth, y: point.energy })) }], "keV");
  drawLineChart(document.querySelector("#letChart"), "LET vs Depth", [{ label: "LET", color: "#ffd166", values: currentResult.profile.map((point) => ({ x: point.depth, y: point.let })) }], "keV/nm");
  drawLineChart(document.querySelector("#stoppingChart"), "Electronic and Nuclear Stopping", [
    { label: "Se", color: "#6ee7b7", values: currentResult.profile.map((point) => ({ x: point.depth, y: point.se })) },
    { label: "Sn", color: "#ff5f7e", values: currentResult.profile.map((point) => ({ x: point.depth, y: point.sn })) },
  ], "keV/nm");
  drawLineChart(document.querySelector("#damageChart"), "Defect Density vs Depth", [
    { label: "Vacancy", color: "#ff5f7e", values: currentResult.profile.map((point) => ({ x: point.depth, y: point.vacancy })) },
    { label: "Interstitial", color: "#4dd8ff", values: currentResult.profile.map((point) => ({ x: point.depth, y: point.interstitial })) },
  ], "cm^-3");
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return null;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function drawLineChart(canvas, title, series, yLabel) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#263f56";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText(title, 14, 20);
  const allPoints = series.flatMap((item) => item.values);
  const maxX = Math.max(...allPoints.map((point) => point.x), 1e-9);
  const maxY = Math.max(...allPoints.map((point) => point.y), 1e-9);
  const pad = 36;
  context.strokeStyle = "#1d3448";
  for (let index = 0; index < 4; index += 1) {
    const y = pad + ((height - pad * 1.7) * index) / 3;
    context.beginPath();
    context.moveTo(pad, y);
    context.lineTo(width - 12, y);
    context.stroke();
  }
  for (const item of series) {
    context.strokeStyle = item.color;
    context.lineWidth = 2;
    context.beginPath();
    item.values.forEach((point, index) => {
      const x = pad + (point.x / maxX) * (width - pad - 14);
      const y = height - pad - (point.y / maxY) * (height - pad * 1.8);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  }
  context.fillStyle = "#9db6c8";
  context.font = "11px Inter, sans-serif";
  context.fillText(yLabel, 12, height - 10);
  series.forEach((item, index) => {
    context.fillStyle = item.color;
    context.fillText(item.label, width - 80, 18 + index * 14);
  });
}

function drawBarChart(canvas, title, records, metrics) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText(title, 14, 20);
  const colors = ["#4dd8ff", "#ffd166", "#ff5f7e", "#6ee7b7"];
  const groupWidth = (width - 60) / metrics.length;
  metrics.forEach((metric, metricIndex) => {
    const maxValue = Math.max(...records.map((record) => record[metric.key]), 1e-12);
    records.forEach((record, recordIndex) => {
      const barWidth = Math.min(34, groupWidth / (records.length + 1));
      const x = 38 + metricIndex * groupWidth + recordIndex * (barWidth + 5);
      const barHeight = (record[metric.key] / maxValue) * (height - 90);
      context.fillStyle = colors[recordIndex % colors.length];
      context.fillRect(x, height - 42 - barHeight, barWidth, barHeight);
    });
    context.fillStyle = "#9db6c8";
    context.font = "10px Inter, sans-serif";
    context.fillText(metric.label, 38 + metricIndex * groupWidth, height - 22);
  });
  records.forEach((record, index) => {
    context.fillStyle = colors[index % colors.length];
    context.fillText(record.label, width - 150, 18 + index * 14);
  });
}

function runMaterialComparison() {
  const names = [document.querySelector("#compareMaterialA").value, document.querySelector("#compareMaterialB").value];
  const records = names.map((name) => ({ label: name, ...calculate({ material: materialByName.get(name) }) }));
  drawBarChart(document.querySelector("#materialComparisonChart"), "Material Comparison", records, [
    { key: "range", label: "Range" }, { key: "letValue", label: "LET" }, { key: "vacancies", label: "Vacancies" }, { key: "dpa", label: "DPA" },
  ]);
  renderComparisonTable("#materialComparisonTable", records);
}

function runIonComparison() {
  const symbols = [document.querySelector("#compareIonA").value, document.querySelector("#compareIonB").value];
  const records = symbols.map((symbol) => ({ label: symbol, ...calculate({ element: elementBySymbol.get(symbol), mass: elementBySymbol.get(symbol).atomic_mass }) }));
  drawBarChart(document.querySelector("#ionComparisonChart"), "Ion Comparison", records, [
    { key: "range", label: "Range" }, { key: "letValue", label: "LET" }, { key: "vacancies", label: "Vacancies" }, { key: "sputter", label: "Sputter" },
  ]);
  renderComparisonTable("#ionComparisonTable", records);
}

function renderComparisonTable(selector, records) {
  renderTable(document.querySelector(selector), ["Case", "Range nm", "LET keV/nm", "Electronic keV", "Nuclear keV", "Vacancies", "DPA", "Thermal spike K"], records.map((record) => [
    record.label, record.range.toFixed(2), record.letValue.toFixed(4), record.electronicDeposited.toFixed(3), record.nuclearDeposited.toFixed(3),
    record.vacancies.toExponential(3), record.dpa.toExponential(3), record.thermalSpike.toExponential(3),
  ]));
}

function recordCurrentRun() {
  const record = {
    time: new Date().toISOString(),
    ion: currentResult.element.symbol,
    charge: currentResult.charge,
    material: currentResult.material.name,
    energy: currentResult.energy,
    fluence: currentResult.fluence,
    range: currentResult.range,
    let: currentResult.letValue,
    vacancies: currentResult.vacancies,
    dpa: currentResult.dpa,
    thermalSpike: currentResult.thermalSpike,
  };
  experimentHistory.unshift(record);
  experimentHistory = experimentHistory.slice(0, 100);
  persistHistory();
  renderHistory();
  addLog(`Run recorded: ${record.ion} -> ${record.material}`);
}

function renderHistory() {
  renderTable(document.querySelector("#historyTable"), ["Time", "Ion", "Material", "Energy keV", "Fluence", "Range nm", "LET", "DPA"], experimentHistory.map((record) => [
    record.time, `${record.ion}${record.charge}+`, record.material, record.energy, Number(record.fluence).toExponential(2),
    Number(record.range).toFixed(2), Number(record.let).toFixed(4), Number(record.dpa).toExponential(3),
  ]));
}

function persistHistory() {
  try {
    localStorage.setItem("ionLabHistory", JSON.stringify(experimentHistory));
  } catch (_error) {
    // Browser privacy modes may disable storage; in-memory history still works.
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("ionLabHistory") || "[]");
  } catch (_error) {
    return [];
  }
}

function renderLearning() {
  const level = document.querySelector("#learningLevel").value;
  const content = {
    Beginner: [
      ["Ion beam irradiation", "Energetic charged atoms enter a target and transfer energy to electrons and nuclei."],
      ["LET", "Linear energy transfer is the energy lost by the ion per unit distance."],
      ["Fluence", "Fluence counts how many ions arrive per square centimeter."],
      ["Defects", "A sufficiently energetic collision can displace a lattice atom and leave a vacancy."],
    ],
    Intermediate: [
      ["Electronic stopping", "Inelastic interactions excite and ionize target electrons. It often dominates at high velocity."],
      ["Nuclear stopping", "Elastic ion-nucleus collisions transfer momentum and create recoil cascades."],
      ["Secondary electrons", "Ionization events release energetic electrons that spread energy away from the track."],
      ["Sputtering", "Near-surface collision cascades can eject atoms from the material."],
    ],
    Advanced: [
      ["NRT displacement model", "The simulator estimates Frenkel-pair production from nuclear deposited energy and displacement threshold."],
      ["Damage accumulation", "DPA compares vacancy production with target atomic density and selected fluence."],
      ["Thermal spike", "Dense local energy deposition creates a transient non-equilibrium hot region near the stopping peak."],
      ["Model limits", "These fast semi-empirical models reveal trends but do not replace validated BCA or Monte Carlo transport."],
    ],
  };
  document.querySelector("#learningContent").innerHTML = content[level].map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join("");
}

function runSweep() {
  const parameter = document.querySelector("#sweepParameter").value;
  const minimum = Number(document.querySelector("#sweepMin").value);
  const maximum = Number(document.querySelector("#sweepMax").value);
  const steps = Math.max(3, Math.min(40, Number(document.querySelector("#sweepSteps").value)));
  const records = [];
  for (let index = 0; index < steps; index += 1) {
    const value = minimum + (maximum - minimum) * index / (steps - 1);
    const overrides = parameter === "energy" ? { energy: value } : parameter === "angle" ? { angle: value } : { fluence: 10 ** value };
    records.push({ value, ...calculate(overrides) });
  }
  drawLineChart(document.querySelector("#sweepChart"), `Parameter Sweep: ${parameter}`, [
    { label: "Range", color: "#4dd8ff", values: records.map((record) => ({ x: record.value, y: record.range })) },
    { label: "LET", color: "#ffd166", values: records.map((record) => ({ x: record.value, y: record.letValue })) },
    { label: "DPA", color: "#ff5f7e", values: records.map((record) => ({ x: record.value, y: record.dpa })) },
  ], "normalized comparison");
  renderTable(document.querySelector("#sweepTable"), [parameter, "Range nm", "LET", "Vacancies", "DPA", "Sputter"], records.map((record) => [
    record.value.toPrecision(5), record.range.toFixed(3), record.letValue.toFixed(5), record.vacancies.toExponential(3), record.dpa.toExponential(3), record.sputter.toFixed(4),
  ]));
  addLog(`Research sweep completed: ${parameter}, ${steps} points`);
}

function populateDatabaseFilter() {
  const type = document.querySelector("#databaseType").value;
  const filter = document.querySelector("#databaseFilter");
  let values = [];
  if (type === "elements") values = [...new Set(db.elements.map((record) => record.category))].sort();
  if (type === "materials") values = [...new Set(db.materials.map((record) => record.material_class))].sort();
  if (type === "isotopes") values = [...new Set(db.isotopes.map((record) => record.symbol))].sort((a, b) => (elementBySymbol.get(a)?.atomic_number || 0) - (elementBySymbol.get(b)?.atomic_number || 0));
  filter.innerHTML = `<option value="">All</option>${values.map((value) => `<option>${value}</option>`).join("")}`;
  renderDatabaseExplorer();
}

function renderDatabaseExplorer() {
  const type = document.querySelector("#databaseType").value;
  const query = document.querySelector("#databaseSearch").value.toLowerCase();
  const filter = document.querySelector("#databaseFilter").value;
  let records;
  let headers;
  let rows;
  if (type === "elements") {
    records = db.elements.filter((record) => (!query || `${record.name} ${record.symbol}`.toLowerCase().includes(query)) && (!filter || record.category === filter));
    headers = ["Z", "Symbol", "Name", "Category", "Period", "Group", "Block", "Mass", "Stable"];
    rows = records.map((record) => [record.atomic_number, record.symbol, record.name, record.category, record.period, record.group, record.block, record.atomic_mass, record.stable]);
  } else if (type === "materials") {
    records = db.materials.filter((record) => (!query || `${record.name} ${record.formula} ${record.subclass}`.toLowerCase().includes(query)) && (!filter || record.material_class === filter));
    headers = ["Name", "Formula", "Class", "Subclass", "Density", "Bandgap", "Radiation tolerance"];
    rows = records.map((record) => [record.name, record.formula, record.material_class, record.subclass, record.density, record.bandgap, record.radiation_tolerance]);
  } else {
    records = db.isotopes.filter((record) => (!query || `${record.element} ${record.isotope_label}`.toLowerCase().includes(query)) && (!filter || record.symbol === filter));
    headers = ["Isotope", "Element", "Z", "Mass number", "Abundance %", "Stable"];
    rows = records.map((record) => [record.isotope_label, record.element, record.atomic_number, record.mass_number, record.natural_abundance_percent ?? "-", record.stable]);
  }
  document.querySelector("#databaseCount").textContent = `${records.length} records`;
  renderTable(document.querySelector("#databaseTable"), headers, rows.slice(0, 300));
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCurrentJson() {
  downloadFile("ion-beam-result.json", JSON.stringify(serializableResult(currentResult), null, 2), "application/json");
}

function exportProfileCsv() {
  const headers = ["depth_nm", "energy_kev", "let_kev_nm", "electronic_stopping", "nuclear_stopping", "defect_density", "vacancy_density", "interstitial_density", "thermal_spike_k"];
  const rows = currentResult.profile.map((point) => [point.depth, point.energy, point.let, point.se, point.sn, point.defect, point.vacancy, point.interstitial, point.thermalSpike]);
  downloadFile("ion-beam-depth-profile.csv", [headers.join(","), ...rows.map((row) => row.join(","))].join("\n"), "text/csv");
}

function exportHistoryCsv() {
  const headers = ["time", "ion", "charge", "material", "energy_kev", "fluence", "range_nm", "let_kev_nm", "vacancies", "dpa", "thermal_spike_k"];
  downloadFile("ion-beam-history.csv", [headers.join(","), ...experimentHistory.map((record) => headers.map((header) => record[header.replace("_kev", "").replace("_nm", "").replace("_k", "")] ?? record[header] ?? "").join(","))].join("\n"), "text/csv");
}

function exportReport() {
  const result = currentResult;
  const lines = [
    "ION BEAM IRRADIATION LABORATORY REPORT",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Ion: ${result.element.name} (${result.element.symbol}${result.charge}+)`,
    `Target: ${result.material.name} (${result.material.formula})`,
    `Energy: ${result.energy} keV`,
    `Fluence: ${result.fluence.toExponential(4)} ions/cm^2`,
    `Range: ${result.range.toFixed(4)} nm`,
    `LET: ${result.letValue.toFixed(6)} keV/nm`,
    `Electronic deposited energy: ${result.electronicDeposited.toFixed(6)} keV`,
    `Nuclear deposited energy: ${result.nuclearDeposited.toFixed(6)} keV`,
    `Vacancies per ion: ${result.vacancies.toExponential(6)}`,
    `Interstitials per ion: ${result.interstitials.toExponential(6)}`,
    `Secondary electrons per ion: ${result.secondaryElectrons.toExponential(6)}`,
    `Damage: ${result.dpa.toExponential(6)} DPA`,
    `Thermal spike: ${result.thermalSpike.toExponential(6)} K`,
    "",
    document.querySelector("#explanation").textContent,
  ];
  downloadFile("ion-beam-report.txt", lines.join("\n"));
}

function serializableResult(result) {
  return {
    ion: result.element,
    material: result.material,
    parameters: { charge: result.charge, mass: result.mass, energy: result.energy, fluence: result.fluence, time: result.time, letInput: result.letInput, angle: result.angle, spread: result.spread, intensity: result.intensity },
    outputs: { range: result.range, let: result.letValue, se: result.se, sn: result.sn, electronicDeposited: result.electronicDeposited, nuclearDeposited: result.nuclearDeposited, vacancies: result.vacancies, interstitials: result.interstitials, secondaryElectrons: result.secondaryElectrons, defectDensity: result.defectDensity, dpa: result.dpa, temperature: result.temperature, thermalSpike: result.thermalSpike, sputter: result.sputter, velocity: result.velocity },
    profile: result.profile,
  };
}

function saveSession() {
  const values = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));
  downloadFile("ion-beam-session.json", JSON.stringify({ version: 1, controls: values, mode, history: experimentHistory }, null, 2), "application/json");
}

async function loadSessionFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const payload = JSON.parse(await file.text());
  if (payload.controls?.materialClass) controls.materialClass.value = payload.controls.materialClass;
  populateMaterialSelect(payload.controls?.material);
  for (const [key, value] of Object.entries(payload.controls || {})) {
    if (controls[key]) controls[key].value = value;
  }
  populateIonDependentControls();
  experimentHistory = Array.isArray(payload.history) ? payload.history : experimentHistory;
  mode = payload.mode || mode;
  renderHistory();
  syncAll();
  addLog("Session loaded");
}

function drawScene() {
  if (!currentResult) return;
  const sized = resizeCanvas(scene);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#06111f";
  context.fillRect(0, 0, width, height);
  const targetLeft = width * 0.11;
  const targetRight = width - 25;
  context.fillStyle = "#0b1d2d";
  context.strokeStyle = "#31516d";
  context.fillRect(targetLeft, 30, targetRight - targetLeft, height - 50);
  context.strokeRect(targetLeft, 30, targetRight - targetLeft, height - 50);
  context.strokeStyle = "#78d7ff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(targetLeft, 30);
  context.lineTo(targetLeft, height - 20);
  context.stroke();

  const heatX = targetLeft + (targetRight - targetLeft) * 0.82;
  const heat = context.createRadialGradient(heatX, height / 2, 2, heatX, height / 2, Math.min(150, width * 0.2));
  heat.addColorStop(0, "#ff5f7e55");
  heat.addColorStop(0.5, "#ffd16622");
  heat.addColorStop(1, "#06111f00");
  context.fillStyle = heat;
  context.fillRect(targetLeft, 30, targetRight - targetLeft, height - 50);

  const latticeColor = currentResult.material.material_class === "Metals" ? "#5d7fa2" :
    currentResult.material.material_class === "Polymers" ? "#7c6ca8" :
      currentResult.material.material_class === "Semiconductors" ? "#5d8f7a" : "#6d8fb8";
  for (let x = targetLeft + 22; x < targetRight - 10; x += 27) {
    for (let y = 56; y < height - 32; y += 27) {
      context.fillStyle = latticeColor;
      context.beginPath();
      context.arc(x, y + ((x + y) % 7) - 3, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.fillStyle = "#14263a";
  context.strokeStyle = "#4f789b";
  context.fillRect(14, height * 0.28, 22, height * 0.44);
  context.strokeRect(14, height * 0.28, 22, height * 0.44);

  const spawnInterval = Math.max(2, Math.round(16 / currentResult.intensity)) * (mode === "Educational" ? 2 : 1);
  if (running && frame % spawnInterval === 0) {
    const beamCenter = height / 2;
    const beamWidth = height * Math.min(0.35, 0.08 + currentResult.spread / 80);
    const y = beamCenter + (Math.random() - 0.5) * beamWidth;
    const angle = ((currentResult.angle + (Math.random() - 0.5) * currentResult.spread) * Math.PI) / 180;
    particles.push({ x: 36, y, vx: Math.cos(angle) * 5.4, vy: Math.sin(angle) * 5.4, kind: "ion", ttl: 280, color: ionColor(currentResult.element.atomic_number) });
  }

  for (const particle of particles) {
    if (particle.kind === "ion" && particle.x > targetLeft && particle.x < targetRight) {
      const depthFraction = (particle.x - targetLeft) / (targetRight - targetLeft);
      const bragg = Math.exp(-(((depthFraction - 0.82) / 0.2) ** 2));
      context.strokeStyle = bragg > 0.5 ? "#ff5f7e" : "#4dd8ff";
      context.lineWidth = 2 + bragg * 4;
      context.beginPath();
      context.moveTo(particle.x - particle.vx * 2.2, particle.y - particle.vy * 2.2);
      context.lineTo(particle.x, particle.y);
      context.stroke();
      const collisionProbability = 0.012 + bragg * Math.min(0.20, currentResult.sn / Math.max(currentResult.se + currentResult.sn, 1e-9) * 0.25);
      if (Math.random() < collisionProbability) {
        flashes.push({ x: particle.x, y: particle.y, radius: 4 + bragg * 12, ttl: 15, color: bragg > 0.5 ? "#ff5f7e" : "#ffd166" });
        particles.push({ x: particle.x, y: particle.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, kind: "electron", ttl: 55, color: "#9be7ff" });
        particles.push({ x: particle.x, y: particle.y, vx: Math.random() * 2, vy: (Math.random() - 0.5) * 3, kind: "recoil", ttl: 55, color: "#ff9f43" });
      }
    }
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = particle.kind === "ion" ? 14 : 7;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.kind === "ion" ? 5 : 2.5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.ttl -= 1;
  }
  for (const flash of flashes) {
    context.strokeStyle = flash.color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
    context.stroke();
    flash.radius *= 1.09;
    flash.ttl -= 1;
  }
  particles = particles.filter((particle) => particle.ttl > 0 && particle.x < width + 40 && particle.y > -30 && particle.y < height + 30);
  flashes = flashes.filter((flash) => flash.ttl > 0);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText(`${currentResult.element.symbol}${currentResult.charge}+ | ${currentResult.energy.toFixed(0)} keV | range ${currentResult.range.toFixed(0)} nm | DPA ${currentResult.dpa.toExponential(2)}`, targetLeft + 10, height - 27);
}

function ionColor(atomicNumber) {
  if (atomicNumber <= 2) return "#78f3ff";
  if (atomicNumber < 18) return "#8cff9b";
  if (atomicNumber < 54) return "#ffd166";
  return "#ff7aa2";
}

function tick() {
  drawScene();
  frame += 1;
  requestAnimationFrame(tick);
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = `${new Date().toLocaleTimeString()} ${message}`;
  document.querySelector("#log").prepend(item);
  while (document.querySelector("#log").children.length > 10) document.querySelector("#log").lastChild.remove();
}

function bindEvents() {
  Object.values(controls).forEach((control) => control.addEventListener("input", () => {
    if (control === controls.ion) {
      populateIonDependentControls();
      updatePeriodicSelection();
    }
    if (control === controls.materialClass) populateMaterialSelect();
    syncAll();
  }));

  document.querySelectorAll(".tab-bar button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".tab-bar button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".tab-view").forEach((view) => view.classList.toggle("active", view.id === button.dataset.tab));
    if (button.dataset.tab === "graphs") renderCharts();
    if (button.dataset.tab === "history") renderHistory();
    if (button.dataset.tab === "database-explorer") renderDatabaseExplorer();
  }));

  document.querySelector("#run").addEventListener("click", () => {
    running = !running;
    document.querySelector("#run").textContent = running ? "Pause" : "Start";
    addLog(running ? "Beam on" : "Beam paused");
  });
  document.querySelector("#reset").addEventListener("click", () => {
    particles = [];
    flashes = [];
    addLog("Interaction scene reset");
  });
  document.querySelector("#record").addEventListener("click", recordCurrentRun);
  document.querySelector("#educational").addEventListener("click", () => setMode("Educational"));
  document.querySelector("#research").addEventListener("click", () => setMode("Research"));
  document.querySelector("#elementSearch").addEventListener("input", filterPeriodicTable);
  document.querySelector("#elementCategory").addEventListener("input", filterPeriodicTable);
  document.querySelector("#elementGroup").addEventListener("input", filterPeriodicTable);
  document.querySelector("#elementPeriod").addEventListener("input", filterPeriodicTable);
  document.querySelector("#runMaterialComparison").addEventListener("click", runMaterialComparison);
  document.querySelector("#runIonComparison").addEventListener("click", runIonComparison);
  document.querySelector("#learningLevel").addEventListener("input", renderLearning);
  document.querySelector("#runSweep").addEventListener("click", runSweep);
  document.querySelector("#clearHistory").addEventListener("click", () => {
    experimentHistory = [];
    persistHistory();
    renderHistory();
  });
  document.querySelector("#databaseType").addEventListener("input", populateDatabaseFilter);
  document.querySelector("#databaseSearch").addEventListener("input", renderDatabaseExplorer);
  document.querySelector("#databaseFilter").addEventListener("input", renderDatabaseExplorer);
  document.querySelector("#exportJson").addEventListener("click", exportCurrentJson);
  document.querySelector("#exportCsv").addEventListener("click", exportProfileCsv);
  document.querySelector("#exportHistory").addEventListener("click", exportHistoryCsv);
  document.querySelector("#exportReport").addEventListener("click", exportReport);
  document.querySelector("#saveSession").addEventListener("click", saveSession);
  document.querySelector("#loadSession").addEventListener("change", loadSessionFile);
  window.addEventListener("resize", () => {
    renderCharts();
    particles = particles.slice(-30);
  });
}

function setMode(value) {
  mode = value;
  document.querySelector("#educational").classList.toggle("active", value === "Educational");
  document.querySelector("#research").classList.toggle("active", value === "Research");
  addLog(`${value} mode`);
}

async function init() {
  await loadDatabases();
  populateControls();
  buildPeriodicTable();
  bindEvents();
  renderLearning();
  renderHistory();
  populateDatabaseFilter();
  syncAll();
  addLog("Virtual ion irradiation laboratory ready");
  tick();
}

init();

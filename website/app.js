const db = { elements: [], materials: [], isotopes: [], facilities: [] };
const elementBySymbol = new Map();
const materialByName = new Map();
const isotopesBySymbol = new Map();
const timelineSeconds = [0, 10, 30, 60, 600, 1800, 3600, 21600, 86400, 604800, 2592000];
const braggComparisonIons = ["H", "He", "Ar", "Kr", "Xe", "Au"];
const chartColors = ["#4dd8ff", "#ffd166", "#ff5f7e", "#6ee7b7", "#b48cff", "#ff9f43", "#8cff9b", "#f472b6"];
const energyUnits = { eV: 0.001, keV: 1, MeV: 1000, GeV: 1000000 };
const energyPresets = [
  ["10 keV", 10], ["50 keV", 50], ["100 keV", 100], ["500 keV", 500],
  ["1 MeV", 1000], ["5 MeV", 5000], ["10 MeV", 10000], ["50 MeV", 50000],
  ["100 MeV", 100000], ["500 MeV", 500000], ["1000 MeV", 1000000], ["5000 MeV", 5000000],
];

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
let notebookEntries = loadNotebook();
let activeSceneView = "interaction";

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

const fallbackFacilities = [
  { name: "IUAC Pelletron", type: "Tandem accelerator", maximum_energy_mev: 200, energy_range_mev: [0.5, 200], available_ions: ["H", "He", "C", "O", "Si", "Ar", "Fe", "Ni", "Au"], current_limits_na: [0.01, 1000] },
  { name: "Cyclotron", type: "Cyclotron", maximum_energy_mev: 70, energy_range_mev: [5, 70], available_ions: ["H", "D", "He", "C", "O"], current_limits_na: [1, 100000] },
  { name: "Synchrotron", type: "Synchrotron", maximum_energy_mev: 100000, energy_range_mev: [100, 100000], available_ions: ["H", "C", "O", "Ar", "Kr", "Xe", "U"], current_limits_na: [0.001, 100] },
  { name: "Heavy Ion Facility", type: "Heavy-ion beamline", maximum_energy_mev: 1000, energy_range_mev: [1, 1000], available_ions: ["Ar", "Kr", "Xe", "Au", "Pb", "U"], current_limits_na: [0.001, 10000] },
  { name: "Medical Beamline", type: "Therapy and radiobiology", maximum_energy_mev: 430, energy_range_mev: [20, 430], available_ions: ["H", "He", "C", "O"], current_limits_na: [0.1, 1000] },
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
    const [elementsPayload, materialsPayload, isotopesPayload, facilitiesPayload] = await Promise.all([
      fetch("../data/elements.json").then(requireOk).then((response) => response.json()),
      fetch("../data/materials.json").then(requireOk).then((response) => response.json()),
      fetch("../data/isotopes.json").then(requireOk).then((response) => response.json()),
      fetch("../data/facilities.json").then(requireOk).then((response) => response.json()),
    ]);
    db.elements = elementsPayload.elements;
    db.materials = materialsPayload.materials;
    db.isotopes = isotopesPayload.isotopes;
    db.facilities = facilitiesPayload.facilities;
    document.querySelector("#databaseStatus").textContent =
      `${db.elements.length} elements, ${db.isotopes.length} stable isotope records, ${db.materials.length} materials, ${db.facilities.length} facilities loaded.`;
  } catch (error) {
    db.elements = fallbackElements;
    db.materials = fallbackMaterials;
    db.isotopes = fallbackElements.flatMap((element) =>
      (element.stable_isotopes || []).map((mass) => ({ symbol: element.symbol, element: element.name, mass_number: mass, isotope_label: `${element.symbol}-${mass}`, stable: true })),
    );
    db.facilities = fallbackFacilities;
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
  controls.energy.min = "1";
  controls.energy.max = "5000000";
  controls.energy.value = "500";
  document.querySelector("#energyValue").value = "500";

  const classes = [...new Set(db.materials.map((entry) => entry.material_class))].sort();
  controls.materialClass.innerHTML = classes.map((value) => `<option>${value}</option>`).join("");
  controls.materialClass.value = classes.includes("Metals") ? "Metals" : classes[0];
  populateMaterialSelect("Iron");
  populateIonDependentControls();

  populateOptions("#compareMaterialA", db.materials, "name", "name", "Iron");
  populateOptions("#compareMaterialB", db.materials, "name", "name", materialByName.has("Silicon") ? "Silicon" : db.materials[1]?.name);
  populateOptions("#compareIonA", db.elements, "symbol", "symbol", "Ar");
  populateOptions("#compareIonB", db.elements, "symbol", "symbol", elementBySymbol.has("Xe") ? "Xe" : db.elements[1]?.symbol);
  document.querySelector("#materialExplorerClass").innerHTML = `<option value="">All classes</option>${classes.map((value) => `<option>${value}</option>`).join("")}`;
  populateOptions("#facilitySelect", db.facilities, "name", "name", db.facilities[0]?.name);

  const categories = [...new Set(db.elements.map((entry) => entry.category))].sort();
  document.querySelector("#elementCategory").innerHTML = `<option value="">All categories</option>${categories.map((value) => `<option>${value}</option>`).join("")}`;
  document.querySelector("#elementGroup").innerHTML = `<option value="">All groups</option>${Array.from({ length: 18 }, (_value, index) => `<option value="${index + 1}">Group ${index + 1}</option>`).join("")}`;
  document.querySelector("#elementPeriod").innerHTML = `<option value="">All periods</option>${Array.from({ length: 7 }, (_value, index) => `<option value="${index + 1}">Period ${index + 1}</option>`).join("")}`;
  document.querySelector("#timelinePoint").innerHTML = timelineSeconds.map((seconds) => `<option value="${seconds}">${timeLabel(seconds)}</option>`).join("");
  document.querySelector("#energyPresets").innerHTML = energyPresets.map(([label, kev]) => `<button type="button" data-kev="${kev}">${label}</button>`).join("");
  populateGlobalSearchOptions();
}

function populateOptions(selector, records, valueKey, labelKey, selectedValue) {
  const select = document.querySelector(selector);
  if (!select) return;
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

function energyInputToKev() {
  const unit = document.querySelector("#energyUnit").value;
  const value = Number(String(document.querySelector("#energyValue").value).replace(/,/g, ""));
  return clamp((Number.isFinite(value) ? value : 500) * energyUnits[unit], 1, 5000000);
}

function setEnergyKev(kev, source = "program") {
  const value = clamp(Number(kev) || 1, 1, 5000000);
  controls.energy.value = value;
  if (source !== "slider") {
    const unit = document.querySelector("#energyUnit").value;
    document.querySelector("#energyValue").value = formatEnergyInUnit(value, unit);
  }
}

function formatEnergyInUnit(kev, unit = "keV") {
  const value = kev / energyUnits[unit];
  if (value >= 1000 || value < 0.01) return value.toExponential(3);
  return Number(value.toFixed(value >= 10 ? 2 : 4)).toString();
}

function formatEnergy(kev) {
  if (kev >= 1000000) return `${formatEnergyInUnit(kev, "GeV")} GeV`;
  if (kev >= 1000) return `${formatEnergyInUnit(kev, "MeV")} MeV`;
  if (kev < 1) return `${formatEnergyInUnit(kev, "eV")} eV`;
  return `${formatEnergyInUnit(kev, "keV")} keV`;
}

function populateGlobalSearchOptions() {
  const options = [
    ...db.elements.map((element) => `${element.symbol} ${element.name}`),
    ...db.materials.map((material) => `${material.name} ${material.formula}`),
    ...db.isotopes.slice(0, 200).map((isotope) => isotope.isotope_label),
  ];
  document.querySelector("#globalSearchOptions").innerHTML = options.map((value) => `<option value="${value}"></option>`).join("");
}

function globalSearchRecords(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const elements = db.elements
    .filter((element) => `${element.symbol} ${element.name} ${element.category}`.toLowerCase().includes(q))
    .slice(0, 8)
    .map((element) => ({ type: "Ion", label: `${element.symbol} - ${element.name}`, detail: element.category, value: element.symbol }));
  const materials = db.materials
    .filter((material) => `${material.name} ${material.formula} ${material.material_class} ${material.subclass} ${material.radiation_tolerance}`.toLowerCase().includes(q))
    .slice(0, 10)
    .map((material) => ({ type: "Material", label: material.name, detail: `${material.material_class} | ${material.formula}`, value: material.name }));
  const isotopes = db.isotopes
    .filter((isotope) => `${isotope.isotope_label} ${isotope.element} ${isotope.symbol}`.toLowerCase().includes(q))
    .slice(0, 6)
    .map((isotope) => ({ type: "Isotope", label: isotope.isotope_label, detail: isotope.element, value: isotope.symbol, mass: isotope.mass_number }));
  return [...elements, ...materials, ...isotopes].slice(0, 18);
}

function renderGlobalSearch() {
  const target = document.querySelector("#globalSearchResults");
  const records = globalSearchRecords(document.querySelector("#globalSearch").value);
  target.classList.toggle("open", records.length > 0);
  target.innerHTML = records.map((record, index) =>
    `<button type="button" class="search-result" data-index="${index}"><span>${record.type}</span><strong>${record.label}</strong><span>${record.detail}</span></button>`,
  ).join("");
  target.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => applyGlobalSearch(records[Number(button.dataset.index)])));
}

function applyGlobalSearch(record) {
  if (!record) return;
  if (record.type === "Ion" || record.type === "Isotope") {
    controls.ion.value = record.value;
    populateIonDependentControls();
    if (record.mass) controls.isotope.value = String(record.mass);
    updatePeriodicSelection();
  }
  if (record.type === "Material") {
    const material = materialByName.get(record.value);
    controls.materialClass.value = material.material_class;
    populateMaterialSelect(material.name);
  }
  document.querySelector("#globalSearch").value = record.label;
  document.querySelector("#globalSearchResults").classList.remove("open");
  syncAll();
  addLog(`Search selected: ${record.label}`);
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
  const beamCurrentNa = charge * 1.602176634e-19 * state.fluence / Math.max(state.time, 1e-9) * 1e9;

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
    beamCurrentNa,
    profile,
  };
}

function syncAll() {
  currentResult = calculate();
  outputs.energy.value = formatEnergy(currentResult.energy);
  document.querySelector("#energyValue").value = formatEnergyInUnit(currentResult.energy, document.querySelector("#energyUnit").value);
  outputs.fluence.value = `${currentResult.fluence.toExponential(1)} ions/cm^2`;
  outputs.time.value = `${currentResult.time.toFixed(0)} s`;
  outputs.let.value = `${currentResult.letInput.toFixed(2)} keV/nm`;
  outputs.angle.value = `${currentResult.angle.toFixed(0)} deg`;
  outputs.spread.value = `${currentResult.spread.toFixed(0)} deg`;
  outputs.intensity.value = `${currentResult.intensity.toFixed(1)} relative`;
  renderMetrics();
  renderHealthDashboard();
  renderLiveReadout();
  renderExplanation();
  renderIonProperties(currentResult.element);
  renderMaterialProperties(currentResult.material);
  renderCharts();
  renderActiveTab(document.querySelector(".tab-view.active")?.id);
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
    "Beam current": `${currentResult.beamCurrentNa.toExponential(2)} nA/cm^2`,
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

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatNumber(value, digits = 3) {
  const numeric = safeNumber(value);
  if (Math.abs(numeric) >= 1e5 || (Math.abs(numeric) > 0 && Math.abs(numeric) < 1e-2)) return numeric.toExponential(digits);
  return numeric.toFixed(digits);
}

function radiationHardnessScore(material) {
  const density = safeNumber(material.density, 1);
  const displacement = safeNumber(material.displacement_energy, 25);
  const thermal = safeNumber(material.thermal_conductivity, 1);
  const bandgap = safeNumber(material.bandgap, 0);
  const tolerance = String(material.radiation_tolerance || material.radiation_hardness || "").toLowerCase();
  let score = 18 * Math.log10(thermal + 1) + 0.45 * displacement + 4 * bandgap + 2 * density;
  if (tolerance.includes("very high")) score += 25;
  else if (tolerance.includes("high")) score += 15;
  else if (tolerance.includes("low")) score -= 12;
  return clamp(score, 0, 100);
}

function radiationCategory(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 35) return "Moderate";
  return "Poor";
}

function materialDamageScore(result) {
  return clamp(40 * result.dpa + 10 * result.sputter + result.temperature / 1000, 0, 100);
}

function damageClass(score) {
  if (score < 20) return "Minimal";
  if (score < 45) return "Moderate";
  if (score < 75) return "Heavy";
  return "Critical";
}

function statusFromDamage(score) {
  if (score < 20) return "safe";
  if (score < 45) return "moderate";
  if (score < 75) return "damaged";
  return "severe";
}

function propertyStatus(percentChange, lowerIsBetter = false) {
  const value = lowerIsBetter ? -percentChange : percentChange;
  if (value > 5) return "Improved";
  if (value > -5) return "Stable";
  if (value > -25) return "Degraded";
  return "Severely Damaged";
}

function materialHealth(result = currentResult) {
  const damage = materialDamageScore(result);
  const resistance = radiationHardnessScore(result.material);
  const integrity = clamp(100 - damage * 0.82 + resistance * 0.12, 0, 100);
  const lifetime = clamp(integrity * (0.74 + resistance / 380), 0, 100);
  return {
    integrity,
    damage,
    resistance,
    lifetime,
    status: statusFromDamage(damage),
    className: damageClass(damage),
  };
}

function stageProperties(result = currentResult) {
  const material = result.material;
  const damage = materialDamageScore(result);
  const duringFactor = clamp(damage / 100, 0, 1);
  const afterFactor = clamp(damage / 125 + result.dpa * 4, 0, 1);
  const conductivity = safeNumber(material.electrical_conductivity, 1e-12);
  const bandgap = safeNumber(material.bandgap, 0);
  const roughnessBase = material.material_class === "Metals" ? 1.2 : material.material_class === "Polymers" ? 8 : 2.4;
  const hardnessBase = radiationHardnessScore(material);
  const dielectricBase = safeNumber(material.dielectric_constant, material.material_class === "Metals" ? 1 : 4);
  const polymer = polymerResponse(result, material);
  const track = ionTrackResponse(result);
  const surface = surfaceResponse(result);
  return [
    { property: "Structural integrity", before: 100, during: 100 - damage * 0.55, after: materialHealth(result).integrity, unit: "%", lowerIsBetter: false, group: "Structural" },
    { property: "Chemical stability", before: 100, during: 100 - polymer["Radical fraction"] * 35, after: 100 - polymer["Carbonization"] * 24 - polymer["Chain scission"] * 16, unit: "%", lowerIsBetter: false, group: "Chemical" },
    { property: "Surface roughness", before: roughnessBase, during: roughnessBase + surface["Roughness nm"] * 0.55, after: surface["Roughness nm"], unit: "nm", lowerIsBetter: true, group: "Surface" },
    { property: "Morphology distortion", before: 0, during: damage * 0.72, after: damage * 0.55, unit: "%", lowerIsBetter: true, group: "Morphological" },
    { property: "Hardness index", before: hardnessBase, during: hardnessBase * (1 + duringFactor * 0.18), after: hardnessBase * (1 + afterFactor * 0.28), unit: "score", lowerIsBetter: false, group: "Mechanical" },
    { property: "Electrical conductivity", before: conductivity, during: conductivity * Math.max(0.04, 1 - duringFactor * 0.36), after: conductivity * Math.max(0.02, 1 - afterFactor * 0.52), unit: "S/m", lowerIsBetter: false, group: "Electrical" },
    { property: "Bandgap", before: bandgap, during: bandgap + duringFactor * 0.08, after: bandgap + afterFactor * 0.18, unit: "eV", lowerIsBetter: false, group: "Optical" },
    { property: "Temperature", before: 300, during: 300 + result.temperature, after: 300 + result.temperature * 0.04, unit: "K", lowerIsBetter: true, group: "Thermal" },
    { property: "Magnetic order", before: material.material_class === "Metals" ? 80 : 15, during: (material.material_class === "Metals" ? 80 : 15) * (1 - duringFactor * 0.12), after: (material.material_class === "Metals" ? 80 : 15) * (1 - afterFactor * 0.18), unit: "%", lowerIsBetter: false, group: "Magnetic" },
    { property: "Dielectric constant", before: dielectricBase, during: dielectricBase * (1 + duringFactor * 0.05), after: dielectricBase * (1 + afterFactor * 0.09), unit: "relative", lowerIsBetter: false, group: "Dielectric" },
    { property: "Defect density", before: 0, during: result.defectDensity, after: result.defectDensity * 0.66, unit: "cm^-3", lowerIsBetter: true, group: "Radiation Damage" },
    { property: "Carrier mobility", before: safeNumber(material.carrier_mobility_cm2_v_s, material.material_class === "Semiconductors" ? 850 : 1), during: safeNumber(material.carrier_mobility_cm2_v_s, material.material_class === "Semiconductors" ? 850 : 1) * (1 - duringFactor * 0.28), after: safeNumber(material.carrier_mobility_cm2_v_s, material.material_class === "Semiconductors" ? 850 : 1) * (1 - afterFactor * 0.45), unit: "cm2/Vs", lowerIsBetter: false, group: "Semiconductor" },
    { property: "Crosslink density", before: 0, during: polymer["Crosslink density"] * 100, after: polymer["Crosslink density"] * 72, unit: "%", lowerIsBetter: false, group: "Polymer" },
    { property: "Track density", before: 0, during: track["Track density cm^-2"], after: track["Track density cm^-2"] * (1 - Math.min(0.35, afterFactor * 0.2)), unit: "cm^-2", lowerIsBetter: true, group: "Radiation Damage" },
  ].map((entry) => {
    const baseline = Math.max(Math.abs(entry.before), 1e-9);
    const percentChange = ((entry.after - entry.before) / baseline) * 100;
    return { ...entry, percentChange, status: propertyStatus(percentChange, entry.lowerIsBetter) };
  });
}

function propertyTimeline(records = timeEvolutionRecords()) {
  const track = ionTrackResponse(currentResult);
  const polymer = polymerResponse(currentResult, currentResult.material);
  return records.map((record) => ({
    label: record.label,
    seconds: record.seconds,
    conductivity: record.conductivity,
    bandgap: record.bandgap,
    hardness: record.hardness,
    defectDensity: record.defectDensity,
    temperature: record.temperature,
    crosslink: polymer["Crosslink density"] * (1 - Math.exp(-record.seconds / 1800)),
    trackDensity: track["Track density cm^-2"] * (1 - Math.exp(-Math.max(record.seconds, 1) / 30)),
  }));
}

function gaugeMarkup(label, value, invert = false) {
  const shown = clamp(value, 0, 100);
  const status = invert ? statusFromDamage(shown) : shown > 70 ? "safe" : shown > 45 ? "moderate" : shown > 20 ? "damaged" : "severe";
  const fillClass = status === "safe" ? "" : status;
  return `<div class="gauge-card" data-status="${status}"><span>${label}</span><strong>${shown.toFixed(1)}%</strong><div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${shown}%"></div></div></div>`;
}

function renderHealthDashboard() {
  const health = materialHealth();
  document.querySelector("#healthDashboard").innerHTML = [
    ["Material Integrity", health.integrity, false],
    ["Material Damage", health.damage, true],
    ["Radiation Resistance", health.resistance, false],
    ["Remaining Lifetime", health.lifetime, false],
  ].map(([label, value, invert]) => gaugeMarkup(label, value, invert).replace("gauge-card", "health-tile")).join("");
}

function renderPropertyEvolution() {
  const stages = stageProperties();
  const selectedSeconds = Number(document.querySelector("#timelinePoint").value || 0);
  const timeline = propertyTimeline();
  const nearest = timeline.reduce((best, entry) => Math.abs(entry.seconds - selectedSeconds) < Math.abs(best.seconds - selectedSeconds) ? entry : best, timeline[0]);
  document.querySelector("#propertyChangePanel").innerHTML = stages.slice(0, 12).map((entry) => {
    const statusClass = entry.status === "Improved" ? "improved" : entry.status === "Stable" ? "stable" : entry.status === "Degraded" ? "degraded" : "severe";
    const sign = entry.percentChange > 0 ? "+" : "";
    return `<div class="status-card" data-status="${statusClass}"><span>${entry.group}</span><strong>${entry.property}: ${sign}${entry.percentChange.toFixed(1)}%</strong><small>${entry.status} | after ${formatNumber(entry.after, 3)} ${entry.unit}</small></div>`;
  }).join("");
  renderTable(document.querySelector("#evolutionTable"), ["Property", "Before", "During", "After", "Status"], stages.map((entry) => [
    entry.property,
    `${formatNumber(entry.before, 3)} ${entry.unit}`,
    `${formatNumber(entry.during, 3)} ${entry.unit}`,
    `${formatNumber(entry.after, 3)} ${entry.unit}`,
    entry.status,
  ]));
  const health = materialHealth();
  document.querySelector("#healthGauges").innerHTML = [
    gaugeMarkup("Integrity", health.integrity),
    gaugeMarkup("Damage", health.damage, true),
    gaugeMarkup("Resistance", health.resistance),
    gaugeMarkup("Lifetime", health.lifetime),
  ].join("");
  renderTable(document.querySelector("#damageIndexTable"), ["Damage metric", "Value"], [
    ["Damage score", `${health.damage.toFixed(2)} / 100`],
    ["Damage class", health.className],
    ["Vacancy density", currentResult.profile.at(-1).vacancy.toExponential(3)],
    ["Interstitial density", currentResult.profile.at(-1).interstitial.toExponential(3)],
    ["Frenkel pair density", (currentResult.profile.at(-1).vacancy + currentResult.profile.at(-1).interstitial).toExponential(3)],
    ["Defect density", currentResult.defectDensity.toExponential(3)],
    ["DPA", currentResult.dpa.toExponential(4)],
    ["Sputtering loss", currentResult.sputter.toFixed(4)],
    ["Timeline point", `${nearest.label} | temperature ${formatNumber(nearest.temperature, 2)} K`],
  ]);
  drawEvolutionGraph(document.querySelector("#evolutionCanvas"), timeline);
  drawRadarChart(document.querySelector("#radarCanvas"), stages);
  drawPropertyHeatmap(document.querySelector("#propertyHeatmapCanvas"), stages);
  drawCorrelationMatrix(document.querySelector("#correlationCanvas"), timeline);
  runSmartFinder();
  runPropertyCompare();
}

function defaultLayerStack() {
  return [
    { material: materialByName.get("PTFE (Teflon)") || materialByName.get("Kapton") || currentResult.material, thickness: 120 },
    { material: materialByName.get("SiO2") || materialByName.get("Silica Glass") || currentResult.material, thickness: 80 },
    { material: materialByName.get("Silicon") || currentResult.material, thickness: 300 },
    { material: materialByName.get("Copper") || materialByName.get("Iron") || currentResult.material, thickness: 100 },
  ].filter((layer) => layer.material);
}

function timeLabel(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(0)}h`;
  if (seconds < 604800) return `${(seconds / 86400).toFixed(0)}d`;
  return `${(seconds / 604800).toFixed(1)}w`;
}

function parseNameList(text, availableMap) {
  return text.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => availableMap.has(value))
    .slice(0, 10);
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

function renderMaterialExplorer() {
  const query = document.querySelector("#materialExplorerQuery").value.toLowerCase();
  const classFilter = document.querySelector("#materialExplorerClass").value;
  const sortKey = document.querySelector("#materialExplorerSort").value;
  const resistantOnly = document.querySelector("#materialExplorerRadiation").checked;
  const records = db.materials
    .map((material) => ({ ...material, radiationScore: radiationHardnessScore(material) }))
    .filter((material) => {
      const haystack = `${material.name} ${material.formula} ${material.material_class} ${material.subclass} ${material.radiation_tolerance}`.toLowerCase();
      const resistant = String(material.radiation_tolerance || "").toLowerCase().includes("high");
      return (!query || haystack.includes(query)) && (!classFilter || material.material_class === classFilter) && (!resistantOnly || resistant);
    })
    .sort((a, b) => safeNumber(b[sortKey], -Infinity) - safeNumber(a[sortKey], -Infinity));
  document.querySelector("#materialExplorerCount").textContent = `${records.length} matching materials`;
  renderTable(document.querySelector("#materialExplorerTable"), [
    "Material", "Formula", "Class", "Subclass", "Density", "Bandgap", "Conductivity", "Displacement eV", "Radiation score", "Tolerance",
  ], records.slice(0, 300).map((material) => [
    material.name,
    material.formula,
    material.material_class,
    material.subclass,
    formatNumber(material.density, 3),
    material.bandgap ?? "-",
    formatNumber(material.electrical_conductivity, 2),
    formatNumber(material.displacement_energy, 2),
    `${material.radiationScore.toFixed(1)} (${radiationCategory(material.radiationScore)})`,
    material.radiation_tolerance,
  ]));
}

function crystalTemplate(material) {
  const text = `${material.name} ${material.subclass} ${material.crystal_structure}`.toLowerCase();
  let name = "FCC";
  let unitCell = "cubic";
  let symmetry = "Fm-3m";
  let positions = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
  if (["Iron", "Tungsten", "Chromium"].includes(material.name) || text.includes("bcc")) {
    name = "BCC";
    symmetry = "Im-3m";
    positions = [[0, 0, 0], [0.5, 0.5, 0.5]];
  } else if (["Titanium", "Cobalt", "Magnesium"].includes(material.name) || text.includes("hcp")) {
    name = "HCP";
    unitCell = "hexagonal";
    symmetry = "P63/mmc";
    positions = [[0, 0, 0], [0.67, 0.33, 0.5]];
  } else if (["Silicon", "Germanium", "Diamond"].includes(material.name) || text.includes("diamond")) {
    name = "Diamond Cubic";
    symmetry = "Fd-3m";
    positions = [[0, 0, 0], [0.25, 0.25, 0.25], [0.5, 0.5, 0], [0.75, 0.75, 0.25]];
  } else if (["GaAs", "InP", "ZnSe", "CdTe"].includes(material.name) || text.includes("zinc")) {
    name = "Zinc Blende";
    symmetry = "F-43m";
    positions = [[0, 0, 0], [0.25, 0.25, 0.25]];
  } else if (["GaN", "AlN", "ZnO"].includes(material.name) || text.includes("wurtzite")) {
    name = "Wurtzite";
    unitCell = "hexagonal";
    symmetry = "P63mc";
    positions = [[0, 0, 0], [0.33, 0.67, 0.5]];
  } else if (text.includes("perovskite")) {
    name = "Perovskite";
    symmetry = "Pm-3m";
    positions = [[0, 0, 0], [0.5, 0.5, 0.5], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
  } else if (text.includes("amorphous") || text.includes("glass") || material.material_class === "Polymers") {
    name = "Amorphous";
    unitCell = "non-periodic";
    symmetry = "none";
    positions = [];
  }
  const lattice = clamp(0.18 * (safeNumber(material.atomic_mass, 50) / Math.max(safeNumber(material.density, 1), 0.1)) ** (1 / 3), 0.18, 1.2);
  return { name, unitCell, symmetry, positions, lattice };
}

function drawCrystal(canvas, template, state) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#263f56";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText(`${currentResult.material.name} | ${template.name} | ${state}`, 14, 22);
  const left = 42;
  const top = 54;
  const cell = Math.min((width - 90) / 5, (height - 95) / 4);
  const defectStrength = state === "before" ? 0 : state === "during" ? clamp(currentResult.letValue / 6, 0.08, 0.45) : clamp(currentResult.dpa * 100 + currentResult.sputter, 0.04, 0.35);

  if (template.name === "Amorphous") {
    for (let index = 0; index < 120; index += 1) {
      const x = left + ((Math.sin(index * 12.9898) + 1) / 2) * (width - 90);
      const y = top + ((Math.sin(index * 78.233) + 1) / 2) * (height - 105);
      const damaged = Math.sin(index * 3.17 + defectStrength * 10) > 1 - defectStrength;
      context.fillStyle = damaged ? "#ff5f7e" : "#5d8fba";
      context.beginPath();
      context.arc(x, y, damaged ? 4.4 : 3.2, 0, Math.PI * 2);
      context.fill();
    }
  } else {
    for (let ix = 0; ix < 5; ix += 1) {
      for (let iy = 0; iy < 4; iy += 1) {
        const x0 = left + ix * cell;
        const y0 = top + iy * cell;
        context.strokeStyle = "#234058";
        context.strokeRect(x0, y0, cell, cell);
        for (const [px, py, pz] of template.positions) {
          const index = ix * 17 + iy * 13 + Math.round(px * 10) + Math.round(py * 10);
          const distorted = state !== "before" ? Math.sin(index * 1.73) * defectStrength * 12 : 0;
          const x = x0 + 8 + px * (cell - 16) + pz * 10 + distorted;
          const y = y0 + 8 + py * (cell - 16) - pz * 8 - distorted * 0.4;
          const vacancy = state === "after" && Math.sin(index * 4.2) > 1 - defectStrength;
          const interstitial = state !== "before" && Math.cos(index * 2.7) > 1 - defectStrength * 0.8;
          context.strokeStyle = vacancy ? "#ff5f7e" : "#5d8fba";
          context.fillStyle = vacancy ? "#07111f" : "#78d7ff";
          context.beginPath();
          context.arc(x, y, vacancy ? 5 : 4, 0, Math.PI * 2);
          vacancy ? context.stroke() : context.fill();
          if (interstitial) {
            context.fillStyle = "#ffd166";
            context.beginPath();
            context.arc(x + 9, y - 9, 2.5, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
  }
  if (state === "during") {
    const heatX = width * 0.72;
    const heatY = height * 0.52;
    const heat = context.createRadialGradient(heatX, heatY, 2, heatX, heatY, Math.min(width, height) * 0.35);
    heat.addColorStop(0, "#ff5f7e55");
    heat.addColorStop(0.45, "#ffd16622");
    heat.addColorStop(1, "#07111f00");
    context.fillStyle = heat;
    context.fillRect(0, 0, width, height);
  }
}

function renderCrystalBragg() {
  const template = crystalTemplate(currentResult.material);
  const state = document.querySelector("#crystalState").value;
  drawCrystal(document.querySelector("#crystalCanvas"), template, state);
  renderTable(document.querySelector("#crystalTable"), ["Field", "Value"], [
    ["Structure", template.name],
    ["Unit cell", template.unitCell],
    ["Symmetry", template.symmetry],
    ["Lattice constant estimate", `${template.lattice.toFixed(3)} nm`],
    ["Current state", state],
    ["Dominant defects", state === "before" ? "reference lattice" : state === "during" ? "thermal spike, recoil atoms, electron cloud" : "vacancies, interstitials, clusters, distortion"],
  ]);

  const records = braggComparisonIons
    .filter((symbol) => elementBySymbol.has(symbol))
    .map((symbol) => {
      const result = calculate({ element: elementBySymbol.get(symbol), mass: elementBySymbol.get(symbol).atomic_mass });
      const peak = result.profile.reduce((best, point) => (point.let > best.let ? point : best), result.profile[0]);
      return { symbol, result, peak };
    });
  drawLineChart(document.querySelector("#braggChart"), "Bragg Peak LET Comparison", records.map((record, index) => ({
    label: record.symbol,
    color: chartColors[index % chartColors.length],
    values: record.result.profile.map((point) => ({ x: point.depth, y: point.let })),
  })), "keV/nm");
  renderTable(document.querySelector("#braggTable"), ["Ion", "Range nm", "Peak depth nm", "Peak LET", "Vacancies", "DPA"], records.map((record) => [
    record.symbol,
    formatNumber(record.result.range, 2),
    formatNumber(record.peak.depth, 2),
    formatNumber(record.peak.let, 4),
    record.result.vacancies.toExponential(3),
    record.result.dpa.toExponential(3),
  ]));
}

function runMultilayerStack() {
  let remainingEnergy = currentResult.energy;
  const rows = [];
  for (const [index, layer] of defaultLayerStack().entries()) {
    const result = calculate({ material: layer.material, energy: Math.max(remainingEnergy, 1) });
    const fraction = Math.min(layer.thickness / Math.max(result.range, 1), 1);
    const energyLoss = result.deposited * fraction;
    rows.push({
      index: index + 1,
      material: layer.material.name,
      thickness: layer.thickness,
      energyIn: remainingEnergy,
      loss: energyLoss,
      energyOut: Math.max(remainingEnergy - energyLoss, 0),
      letValue: result.letValue,
      dpa: result.dpa * fraction,
      temperature: result.temperature * fraction,
    });
    remainingEnergy = Math.max(remainingEnergy - energyLoss, 0);
    if (remainingEnergy <= 0) break;
  }
  renderTable(document.querySelector("#multilayerTable"), ["Layer", "Material", "Thickness nm", "Energy in keV", "Loss keV", "Energy out keV", "LET", "DPA", "Temp rise K"], rows.map((row) => [
    row.index,
    row.material,
    row.thickness,
    formatNumber(row.energyIn, 2),
    formatNumber(row.loss, 2),
    formatNumber(row.energyOut, 2),
    formatNumber(row.letValue, 4),
    row.dpa.toExponential(3),
    formatNumber(row.temperature, 2),
  ]));
}

function timeEvolutionRecords() {
  return timelineSeconds.map((seconds) => {
    const logTime = Math.log10(seconds + 1);
    const damageFactor = 1 - Math.exp(-currentResult.dpa * (1 + 0.15 * logTime));
    const recovery = Math.min(0.18 * logTime, 0.65);
    const effectiveDamage = Math.max(damageFactor * (1 - recovery), 0);
    return {
      seconds,
      label: timeLabel(seconds),
      defectDensity: currentResult.defectDensity * Math.max(0.1, 1 - recovery),
      temperature: 300 + currentResult.temperature * Math.exp(-seconds / 600),
      conductivity: currentResult.material.electrical_conductivity * Math.max(0.02, 1 - 0.75 * effectiveDamage),
      bandgap: safeNumber(currentResult.material.bandgap, 0) + 0.12 * effectiveDamage,
      hardness: 1 + 0.35 * effectiveDamage,
    };
  });
}

function renderTimeEvolution() {
  const records = timeEvolutionRecords();
  drawLineChart(document.querySelector("#timeChart"), "Time Evolution", [
    { label: "Defects", color: "#ff5f7e", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: record.defectDensity })) },
    { label: "Temp K", color: "#ffd166", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: record.temperature })) },
    { label: "Hardness", color: "#6ee7b7", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: record.hardness })) },
  ], "mixed units");
  renderTable(document.querySelector("#timeTable"), ["Time", "Defect density", "Temperature K", "Conductivity", "Bandgap eV", "Relative hardness"], records.map((record) => [
    record.label,
    record.defectDensity.toExponential(3),
    formatNumber(record.temperature, 2),
    formatNumber(record.conductivity, 3),
    formatNumber(record.bandgap, 4),
    formatNumber(record.hardness, 4),
  ]));
}

function renderAnnealing() {
  const temperature = safeNumber(document.querySelector("#annealTemp").value, 700);
  const duration = safeNumber(document.querySelector("#annealDuration").value, 3600);
  const recovery = clamp(1 - Math.exp((-duration / 3600) * Math.exp((temperature - 950) / 240)), 0, 0.98);
  const rows = [
    ["Recovery fraction", `${(recovery * 100).toFixed(2)} %`],
    ["Remaining defect density", (currentResult.defectDensity * (1 - recovery)).toExponential(3)],
    ["Conductivity recovery", `${(Math.min(recovery * 0.85, 0.95) * 100).toFixed(2)} %`],
    ["Lattice restoration", `${(Math.min(recovery * 0.9, 0.98) * 100).toFixed(2)} %`],
    ["Carrier lifetime recovery", `${(Math.min(recovery * 0.75, 0.9) * 100).toFixed(2)} %`],
  ];
  renderTable(document.querySelector("#annealTable"), ["Metric", "Estimate"], rows);
}

function renderMultilayerEvolution() {
  runMultilayerStack();
  renderTimeEvolution();
  renderAnnealing();
}

function renderHardnessRanking() {
  const records = db.materials
    .map((material) => ({ material, score: radiationHardnessScore(material) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  renderTable(document.querySelector("#hardnessTable"), ["Rank", "Material", "Class", "Score", "Category", "Density", "Ed eV", "Bandgap", "Tolerance"], records.map((record, index) => [
    index + 1,
    record.material.name,
    record.material.material_class,
    record.score.toFixed(1),
    radiationCategory(record.score),
    formatNumber(record.material.density, 3),
    formatNumber(record.material.displacement_energy, 2),
    record.material.bandgap ?? "-",
    record.material.radiation_tolerance,
  ]));
}

function runRecommendation() {
  const goal = document.querySelector("#recommendGoal").value.toLowerCase();
  const candidateSymbols = ["H", "He", "C", "N", "O", "Ar", "Fe", "Kr", "Xe", "Au"].filter((symbol) => elementBySymbol.has(symbol));
  const ionRecords = candidateSymbols.map((symbol) => {
    const element = elementBySymbol.get(symbol);
    let score = 50 + element.atomic_number * 0.15;
    let energy = 500;
    let fluence = 1e14;
    if (goal.includes("conduct")) {
      score = 100 / Math.max(element.atomic_number, 1);
      energy = 150;
      fluence = 5e14;
    } else if (goal.includes("hard")) {
      score = element.atomic_number * 0.8;
      energy = 900;
      fluence = 1e15;
    } else if (goal.includes("surface")) {
      score = element.atomic_number * 0.35 + 30;
      energy = 80;
      fluence = 8e14;
    } else if (goal.includes("resistance")) {
      score = Math.abs(element.atomic_number - 14) < 12 ? 75 : 55 + element.atomic_number * 0.1;
      energy = 350;
      fluence = 2e14;
    }
    return { symbol, score, energy, fluence };
  }).sort((a, b) => b.score - a.score);
  const materials = db.materials
    .map((material) => ({ material, score: radiationHardnessScore(material) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const rows = [
    ["Recommended ion", ionRecords[0].symbol],
    ["Energy", `${ionRecords[0].energy.toFixed(0)} keV`],
    ["Fluence", `${ionRecords[0].fluence.toExponential(2)} ions/cm^2`],
    ["Recommended material", materials[0]?.material.name || currentResult.material.name],
    ["Material score", materials[0] ? materials[0].score.toFixed(1) : "-"],
    ["Alternate ions", ionRecords.slice(1, 5).map((item) => `${item.symbol} (${item.score.toFixed(1)})`).join(", ")],
  ];
  renderTable(document.querySelector("#recommendationTable"), ["Recommendation", "Value"], rows);
}

function runReverseEngineering() {
  const conductivity = safeNumber(document.querySelector("#desiredConductivity").value, 1000);
  const hardness = safeNumber(document.querySelector("#desiredHardness").value, 25);
  const bandgap = safeNumber(document.querySelector("#desiredBandgap").value, 1.5);
  let material = "Silicon";
  let ion = "H";
  let energy = 120;
  if (bandgap >= 4.5) {
    material = materialByName.has("Diamond") ? "Diamond" : "GaN";
    ion = "He";
    energy = 350;
  } else if (bandgap >= 3) {
    material = materialByName.has("GaN") ? "GaN" : "SiC";
    ion = "He";
    energy = 350;
  } else if (hardness > 20) {
    material = materialByName.has("PEEK") ? "PEEK" : "Iron";
    ion = "Ar";
    energy = 850;
  } else if (conductivity > 1e5) {
    material = materialByName.has("Copper") ? "Copper" : "Iron";
    ion = "H";
    energy = 180;
  }
  renderTable(document.querySelector("#reverseTable"), ["Output", "Suggested value"], [
    ["Ion", ion],
    ["Target material", material],
    ["Energy", `${energy.toFixed(0)} keV`],
    ["Fluence", "7.50e14 ions/cm^2"],
    ["Irradiation time", "600 s"],
    ["Reason", bandgap >= 3 ? "wide-bandgap target requested" : hardness > 20 ? "high damage-hardening target requested" : conductivity > 1e5 ? "conductivity retention requested" : "balanced modification requested"],
  ]);
}

function semiconductorDeviceResponse(result, material) {
  const doseFactor = Math.max(Math.log10(result.dpa + 1e-12) + 12, 0);
  const bandgap = safeNumber(material.bandgap, 1);
  return {
    "Device type": material.material_class === "Semiconductors" ? "MOSFET / detector material" : "generic dielectric stack",
    "Threshold shift V": 0.035 * doseFactor * (1 + bandgap / 4),
    "Leakage multiplier": Math.exp(Math.min(result.dpa * 12, 8)),
    "Mobility loss %": clamp(result.dpa * 180, 0, 95),
    "Carrier lifetime loss %": clamp(result.dpa * 240, 0, 98),
  };
}

function polymerResponse(result, material) {
  const fluenceFactor = Math.log10(Math.max(result.fluence / Math.max(result.time, 1) * 60, 1)) / 18;
  const scissionBias = material.name.includes("PTFE") || material.name.includes("PVC") ? 0.55 : 0.35;
  const crosslink = clamp(result.letValue * fluenceFactor * (1 - scissionBias), 0, 1);
  const scission = clamp(result.letValue * fluenceFactor * scissionBias, 0, 1);
  return {
    "Crosslink density": crosslink,
    "Chain scission": scission,
    "Carbonization": clamp(result.thermalSpike / 3000, 0, 1),
    "Radical fraction": clamp(result.secondaryElectrons / 1e5, 0, 1),
    "Molecular weight retention": clamp(1 - scission * 0.65 + crosslink * 0.15, 0.05, 1.2),
  };
}

function surfaceResponse(result) {
  const fluenceTerm = Math.log10(Math.max(result.fluence / Math.max(result.time, 1) * 60, 1)) / 16;
  const roughness = 1 + 35 * result.sputter * fluenceTerm;
  const surfaceEnergy = 25 + 18 * Math.min(result.letValue, 5);
  return {
    "Roughness nm": roughness,
    "Surface energy mJ/m2": surfaceEnergy,
    "Contact angle deg": clamp(110 - surfaceEnergy * 0.55, 10, 130),
    "Adhesion relative": clamp(surfaceEnergy / 60, 0.1, 2),
  };
}

function ionTrackResponse(result) {
  const radius = Math.max(0.4, 0.85 * Math.sqrt(Math.max(result.letValue, 1e-9)));
  const area = Math.PI * (radius * 1e-7) ** 2;
  return {
    "Track radius nm": radius,
    "Track length nm": result.range,
    "Track density cm^-2": result.fluence,
    "Track overlap": 1 - Math.exp(-result.fluence * area),
  };
}

function digitalTwinResponse(result, material) {
  const final = timeEvolutionRecords().at(-1);
  return {
    "Initial conductivity": material.electrical_conductivity,
    "Current conductivity": material.electrical_conductivity * 0.75,
    "Predicted conductivity": final.conductivity,
    "Current bandgap": safeNumber(material.bandgap, 0) + 0.04,
    "Predicted bandgap": final.bandgap,
    "Defect density": result.defectDensity,
  };
}

function renderApplicationLabs() {
  const device = semiconductorDeviceResponse(currentResult, currentResult.material);
  const polymer = polymerResponse(currentResult, currentResult.material);
  const surface = surfaceResponse(currentResult);
  const track = ionTrackResponse(currentResult);
  const twin = digitalTwinResponse(currentResult, currentResult.material);
  renderTable(document.querySelector("#deviceTable"), ["Semiconductor/device metric", "Value"], Object.entries(device).map(([key, value]) => [key, typeof value === "number" ? formatNumber(value, 4) : value]));
  renderTable(document.querySelector("#polymerTable"), ["Polymer irradiation metric", "Value"], Object.entries(polymer).map(([key, value]) => [key, formatNumber(value, 4)]));
  renderTable(document.querySelector("#surfaceTable"), ["Surface / ion-track metric", "Value"], [
    ...Object.entries(surface).map(([key, value]) => [key, formatNumber(value, 4)]),
    ...Object.entries(track).map(([key, value]) => [key, formatNumber(value, 4)]),
  ]);
  renderTable(document.querySelector("#twinTable"), ["Digital twin state", "Value"], Object.entries(twin).map(([key, value]) => [key, formatNumber(value, 4)]));
}

function renderRadiationAiLab() {
  renderHardnessRanking();
  runRecommendation();
  runReverseEngineering();
  renderApplicationLabs();
}

function renderUncertainty() {
  const combined = Math.sqrt(0.02 ** 2 + 0.05 ** 2 + 0.01 ** 2);
  const outputs = [
    ["Range nm", currentResult.range],
    ["LET keV/nm", currentResult.letValue],
    ["DPA", currentResult.dpa],
    ["Temperature rise K", currentResult.temperature],
    ["Beam current nA/cm^2", currentResult.beamCurrentNa],
  ];
  renderTable(document.querySelector("#uncertaintyTable"), ["Output", "Value", "Low", "High", "Relative uncertainty"], outputs.map(([name, value]) => [
    name,
    formatNumber(value, 4),
    formatNumber(value * (1 - combined), 4),
    formatNumber(value * (1 + combined), 4),
    `${(combined * 100).toFixed(2)} %`,
  ]));
}

function publicationSections() {
  const result = currentResult;
  return {
    Abstract: `${result.element.symbol} ion irradiation of ${result.material.name} was simulated using coupled stopping, damage, and thermal-spike estimates.`,
    Methodology: `Incident ${result.element.symbol}${result.charge}+ ions at ${result.energy.toFixed(1)} keV were propagated through ${result.material.name}. Electronic and nuclear stopping were integrated over a depth profile with fluence ${result.fluence.toExponential(3)} ions/cm^2.`,
    Results: `The estimated range is ${result.range.toFixed(2)} nm, LET is ${result.letValue.toFixed(5)} keV/nm, and damage is ${result.dpa.toExponential(3)} DPA. Electronic deposited energy is ${result.electronicDeposited.toFixed(3)} keV and nuclear deposited energy is ${result.nuclearDeposited.toFixed(3)} keV.`,
    Discussion: `The present condition ${result.se > result.sn ? "is dominated by electronic stopping and electron excitation" : "is dominated by nuclear stopping and displacement cascades"}. The stopping-region thermal spike reaches ${result.thermalSpike.toExponential(3)} K.`,
    Conclusion: `This virtual irradiation condition produces quantifiable ion-track damage, sputtering, and property-shift estimates that can be compared against alternate ions, target materials, annealing schedules, and SRIM/TRIM reference rows.`,
    FigureCaption: `Depth-resolved energy, LET, stopping, defect, and thermal-spike profiles for ${result.element.symbol} in ${result.material.name}.`,
  };
}

function generatePublication() {
  const text = Object.entries(publicationSections())
    .map(([heading, body]) => `${heading}\n${body}`)
    .join("\n\n");
  document.querySelector("#publicationText").value = text;
}

function addNotebookEntry() {
  const notes = document.querySelector("#notebookNotes").value.trim();
  const record = {
    date: new Date().toISOString(),
    ion: `${currentResult.element.symbol}${currentResult.charge}+`,
    material: currentResult.material.name,
    energy: currentResult.energy,
    fluence: currentResult.fluence,
    letValue: currentResult.letValue,
    range: currentResult.range,
    dpa: currentResult.dpa,
    notes,
  };
  notebookEntries.unshift(record);
  notebookEntries = notebookEntries.slice(0, 50);
  persistNotebook();
  renderNotebook();
  document.querySelector("#notebookNotes").value = "";
  addLog("Notebook entry added");
}

function renderNotebook() {
  renderTable(document.querySelector("#notebookTable"), ["Date", "Ion", "Material", "Energy", "Range", "DPA", "Notes"], notebookEntries.map((record) => [
    record.date,
    record.ion,
    record.material,
    formatNumber(record.energy, 2),
    formatNumber(record.range, 2),
    Number(record.dpa).toExponential(3),
    record.notes || "-",
  ]));
}

function persistNotebook() {
  try {
    localStorage.setItem("ionLabNotebook", JSON.stringify(notebookEntries));
  } catch (_error) {
    // Notebook remains available in memory if browser storage is unavailable.
  }
}

function loadNotebook() {
  try {
    return JSON.parse(localStorage.getItem("ionLabNotebook") || "[]");
  } catch (_error) {
    return [];
  }
}

function renderPublicationNotebook() {
  generatePublication();
  renderNotebook();
  renderUncertainty();
}

function runGrandComparison() {
  const ions = parseNameList(document.querySelector("#grandIons").value, elementBySymbol);
  const materials = parseNameList(document.querySelector("#grandMaterials").value, materialByName);
  const ionSet = ions.length ? ions : braggComparisonIons.filter((symbol) => elementBySymbol.has(symbol));
  const materialSet = materials.length ? materials : db.materials.slice(0, 6).map((material) => material.name);
  const records = [];
  for (const ion of ionSet) {
    for (const materialName of materialSet) {
      const result = calculate({ element: elementBySymbol.get(ion), mass: elementBySymbol.get(ion).atomic_mass, material: materialByName.get(materialName) });
      records.push({
        ion,
        material: materialName,
        range: result.range,
        letValue: result.letValue,
        dpa: result.dpa,
        hardness: radiationHardnessScore(materialByName.get(materialName)),
        damage: materialDamageScore(result),
      });
    }
  }
  drawHeatmap(document.querySelector("#grandHeatmap"), records, ionSet, materialSet);
  renderTable(document.querySelector("#grandTable"), ["Ion", "Material", "Range nm", "LET", "DPA", "Hardness score", "Damage score"], records.sort((a, b) => a.damage - b.damage).map((record) => [
    record.ion,
    record.material,
    formatNumber(record.range, 2),
    formatNumber(record.letValue, 4),
    record.dpa.toExponential(3),
    record.hardness.toFixed(1),
    record.damage.toFixed(2),
  ]));
}

function drawHeatmap(canvas, records, ions, materials) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText("Grand Comparison Damage Score Heatmap", 14, 20);
  const padLeft = 118;
  const padTop = 52;
  const cellWidth = Math.max(18, (width - padLeft - 18) / Math.max(ions.length, 1));
  const cellHeight = Math.max(22, (height - padTop - 34) / Math.max(materials.length, 1));
  const maxDamage = Math.max(...records.map((record) => record.damage), 1e-9);
  materials.forEach((material, row) => {
    context.fillStyle = "#9db6c8";
    context.fillText(material.slice(0, 17), 12, padTop + row * cellHeight + cellHeight * 0.62);
  });
  ions.forEach((ion, column) => {
    context.fillStyle = "#9db6c8";
    context.fillText(ion, padLeft + column * cellWidth + 4, 41);
  });
  for (const record of records) {
    const column = ions.indexOf(record.ion);
    const row = materials.indexOf(record.material);
    const intensity = record.damage / maxDamage;
    const red = Math.round(50 + 205 * intensity);
    const green = Math.round(200 - 130 * intensity);
    const blue = Math.round(255 - 190 * intensity);
    context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    context.fillRect(padLeft + column * cellWidth, padTop + row * cellHeight, cellWidth - 2, cellHeight - 2);
    context.fillStyle = intensity > 0.55 ? "#07111f" : "#dff8ff";
    context.font = "10px Inter, sans-serif";
    context.fillText(record.damage.toFixed(1), padLeft + column * cellWidth + 4, padTop + row * cellHeight + cellHeight * 0.62);
  }
}

function drawEvolutionGraph(canvas, records) {
  drawLineChart(canvas, "Property Evolution Timeline", [
    { label: "Conductivity", color: "#4dd8ff", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: Math.log10(Math.max(record.conductivity, 1e-16)) })) },
    { label: "Bandgap", color: "#ffd166", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: record.bandgap })) },
    { label: "Hardness", color: "#6ee7b7", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: record.hardness })) },
    { label: "Temp", color: "#ff5f7e", values: records.map((record) => ({ x: Math.log10(record.seconds + 1), y: record.temperature / 300 })) },
  ], "normalized/log units");
}

function drawRadarChart(canvas, stages) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText("Before vs After Radar", 14, 20);
  const records = stages.filter((entry) => ["Electrical", "Mechanical", "Thermal", "Optical", "Chemical", "Structural", "Surface", "Radiation Damage"].includes(entry.group)).slice(0, 8);
  const centerX = width / 2;
  const centerY = height / 2 + 10;
  const radius = Math.min(width, height) * 0.31;
  const before = records.map((entry) => normalizeRadarValue(entry.before, entry));
  const after = records.map((entry) => normalizeRadarValue(entry.after, entry));
  context.strokeStyle = "#27453e";
  context.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath();
    records.forEach((_entry, index) => {
      const angle = -Math.PI / 2 + (index / records.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius * ring / 4;
      const y = centerY + Math.sin(angle) * radius * ring / 4;
      index ? context.lineTo(x, y) : context.moveTo(x, y);
    });
    context.closePath();
    context.stroke();
  }
  records.forEach((entry, index) => {
    const angle = -Math.PI / 2 + (index / records.length) * Math.PI * 2;
    context.strokeStyle = "#1d332c";
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
    context.stroke();
    context.fillStyle = "#9db6c8";
    context.font = "10px Inter, sans-serif";
    context.fillText(entry.group.slice(0, 11), centerX + Math.cos(angle) * (radius + 8) - 28, centerY + Math.sin(angle) * (radius + 8));
  });
  drawRadarPolygon(context, centerX, centerY, radius, before, "#4dd8ff66", "#4dd8ff");
  drawRadarPolygon(context, centerX, centerY, radius, after, "#ff5f7e66", "#ff5f7e");
  context.fillStyle = "#4dd8ff";
  context.fillText("Before", width - 92, 20);
  context.fillStyle = "#ff5f7e";
  context.fillText("After", width - 92, 36);
}

function normalizeRadarValue(value, entry) {
  const maximum = Math.max(Math.abs(entry.before), Math.abs(entry.during), Math.abs(entry.after), 1);
  const normalized = clamp(Math.abs(value) / maximum, 0, 1);
  return entry.lowerIsBetter ? 1 - normalized * 0.8 : normalized;
}

function drawRadarPolygon(context, centerX, centerY, radius, values, fill, stroke) {
  context.beginPath();
  values.forEach((value, index) => {
    const angle = -Math.PI / 2 + (index / values.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius * value;
    const y = centerY + Math.sin(angle) * radius * value;
    index ? context.lineTo(x, y) : context.moveTo(x, y);
  });
  context.closePath();
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.fill();
  context.stroke();
}

function drawPropertyHeatmap(canvas, stages) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText("Property Change Heatmap", 14, 20);
  const rows = stages.slice(0, 12);
  const columns = ["Before", "During", "After"];
  const left = 128;
  const top = 48;
  const cellWidth = (width - left - 14) / columns.length;
  const cellHeight = Math.max(18, (height - top - 18) / rows.length);
  columns.forEach((column, index) => {
    context.fillStyle = "#9db6c8";
    context.fillText(column, left + index * cellWidth + 8, 38);
  });
  rows.forEach((entry, rowIndex) => {
    context.fillStyle = "#9db6c8";
    context.fillText(entry.property.slice(0, 18), 12, top + rowIndex * cellHeight + cellHeight * 0.62);
    [entry.before, entry.during, entry.after].forEach((value, columnIndex) => {
      const baseline = Math.max(Math.abs(entry.before), 1e-9);
      const change = Math.abs((value - entry.before) / baseline);
      context.fillStyle = changeColor(change);
      context.fillRect(left + columnIndex * cellWidth, top + rowIndex * cellHeight, cellWidth - 2, cellHeight - 2);
    });
  });
}

function changeColor(change) {
  if (change < 0.05) return "#2b7bc0";
  if (change < 0.20) return "#37a36b";
  if (change < 0.50) return "#d4a43e";
  return "#d45a5f";
}

function drawCorrelationMatrix(canvas, timeline) {
  const sized = resizeCanvas(canvas);
  if (!sized) return;
  const { context, width, height } = sized;
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);
  const variables = [
    ["Energy", timeline.map(() => currentResult.energy)],
    ["Fluence", timeline.map(() => Math.log10(currentResult.fluence))],
    ["LET", timeline.map(() => currentResult.letValue)],
    ["Conduct", timeline.map((entry) => Math.log10(Math.max(entry.conductivity, 1e-16)))],
    ["Bandgap", timeline.map((entry) => entry.bandgap)],
    ["Hardness", timeline.map((entry) => entry.hardness)],
    ["Temp", timeline.map((entry) => entry.temperature)],
    ["Defects", timeline.map((entry) => Math.log10(Math.max(entry.defectDensity, 1)))],
  ];
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText("Correlation Matrix", 14, 20);
  const left = 80;
  const top = 54;
  const cell = Math.min((width - left - 14) / variables.length, (height - top - 18) / variables.length);
  variables.forEach(([name], index) => {
    context.fillStyle = "#9db6c8";
    context.font = "10px Inter, sans-serif";
    context.fillText(name, left + index * cell + 2, 43);
    context.fillText(name, 12, top + index * cell + cell * 0.62);
  });
  variables.forEach((leftVar, row) => {
    variables.forEach((rightVar, column) => {
      const corr = row === column ? 1 : pearson(leftVar[1], rightVar[1]);
      const strength = Math.abs(corr);
      const red = Math.round(70 + 150 * Math.max(corr, 0));
      const blue = Math.round(80 + 150 * Math.max(-corr, 0));
      const green = Math.round(95 + 80 * (1 - strength));
      context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      context.fillRect(left + column * cell, top + row * cell, cell - 2, cell - 2);
    });
  });
}

function pearson(a, b) {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  return numerator / Math.max(Math.sqrt(denomA * denomB), 1e-12);
}

function runSmartFinder() {
  const query = document.querySelector("#smartFinderQuery")?.value.toLowerCase() || "";
  let records = db.materials.slice();
  if (query.includes("polymer")) records = records.filter((material) => material.material_class === "Polymers");
  if (query.includes("iii-v") || query.includes("iii v")) records = records.filter((material) => material.subclass?.includes("III-V"));
  if (query.includes("semiconductor")) records = records.filter((material) => material.material_class === "Semiconductors");
  if (query.includes("radiation resistant") || query.includes("radiation-resistant")) records = records.filter((material) => radiationHardnessScore(material) >= 70 || String(material.radiation_tolerance || "").toLowerCase().includes("high"));
  const bandgapMatch = query.match(/bandgap\s*>\s*([0-9.]+)/);
  if (bandgapMatch) records = records.filter((material) => safeNumber(material.bandgap, 0) > Number(bandgapMatch[1]));
  const conductivityMatch = query.match(/conductivity\s*>\s*([0-9.e+\-]+)/);
  if (conductivityMatch) records = records.filter((material) => safeNumber(material.electrical_conductivity, 0) > Number(conductivityMatch[1]));
  records = records
    .map((material) => ({ material, score: radiationHardnessScore(material) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  if (document.querySelector("#smartFinderResults")) {
    renderTable(document.querySelector("#smartFinderResults"), ["Material", "Class", "Subclass", "Bandgap", "Conductivity", "Radiation score"], records.map((record) => [
      record.material.name,
      record.material.material_class,
      record.material.subclass,
      record.material.bandgap ?? "-",
      formatNumber(record.material.electrical_conductivity, 3),
      record.score.toFixed(1),
    ]));
  }
}

function runPropertyCompare() {
  const names = parseNameList(document.querySelector("#propertyCompareMaterials")?.value || "", materialByName);
  const rows = names.map((name) => {
    const material = materialByName.get(name);
    const result = calculate({ material });
    const health = materialHealth(result);
    const polymer = polymerResponse(result, material);
    const surface = surfaceResponse(result);
    return [
      name,
      material.material_class,
      formatNumber(material.electrical_conductivity, 3),
      formatNumber(material.thermal_conductivity, 3),
      material.bandgap ?? "-",
      formatNumber(surface["Roughness nm"], 3),
      formatNumber(polymer["Chain scission"], 3),
      radiationHardnessScore(material).toFixed(1),
      health.damage.toFixed(2),
    ];
  });
  if (document.querySelector("#propertyCompareTable")) {
    renderTable(document.querySelector("#propertyCompareTable"), ["Material", "Class", "Electrical", "Thermal", "Optical gap", "Surface roughness", "Chemical scission", "Radiation resistance", "Damage"], rows);
  }
}

function renderFacilityPresets() {
  const selectedName = document.querySelector("#facilitySelect").value || db.facilities[0]?.name;
  const facility = db.facilities.find((entry) => entry.name === selectedName) || db.facilities[0];
  if (!facility) return;
  const energyMev = currentResult.energy / 1000;
  const range = facility.energy_range_mev || [0, facility.maximum_energy_mev || 0];
  const currents = facility.current_limits_na || [0, Infinity];
  const ionOk = (facility.available_ions || []).includes(currentResult.element.symbol);
  const energyOk = energyMev >= range[0] && energyMev <= range[1];
  const currentOk = currentResult.beamCurrentNa >= currents[0] && currentResult.beamCurrentNa <= currents[1];
  renderTable(document.querySelector("#facilityTable"), ["Field", "Value"], [
    ["Name", facility.name],
    ["Type", facility.type],
    ["Energy range", `${range[0]}-${range[1]} MeV`],
    ["Available ions", (facility.available_ions || []).join(", ")],
    ["Current range", `${currents[0]}-${currents[1]} nA`],
    ["Selected ion", `${currentResult.element.symbol} (${ionOk ? "supported" : "not in preset"})`],
    ["Selected energy", `${energyMev.toFixed(3)} MeV (${energyOk ? "in range" : "outside range"})`],
    ["Estimated current", `${currentResult.beamCurrentNa.toExponential(3)} nA/cm^2 (${currentOk ? "in range" : "outside range"})`],
  ]);
}

function parseSrimRows(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim().replaceAll(",", " "))
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/).map(Number).filter(Number.isFinite))
    .filter((values) => values.length >= 4)
    .map((values) => ({ energy: values[0], electronic: values[1], nuclear: values[2], range: values[3] }));
}

function compareSrimRows() {
  const rows = parseSrimRows(document.querySelector("#srimText").value);
  if (!rows.length) {
    renderTable(document.querySelector("#srimTable"), ["Status"], [["No numeric rows found"]]);
    return;
  }
  const nearest = rows.reduce((best, row) => Math.abs(row.range - currentResult.range) < Math.abs(best.range - currentResult.range) ? row : best, rows[0]);
  const rangeError = 100 * (currentResult.range - nearest.range) / Math.max(nearest.range, 1e-9);
  renderTable(document.querySelector("#srimTable"), ["Energy keV", "SRIM Se", "SRIM Sn", "SRIM range nm", "Simulator range nm", "Range error %"], rows.map((row) => [
    formatNumber(row.energy, 2),
    formatNumber(row.electronic, 4),
    formatNumber(row.nuclear, 4),
    formatNumber(row.range, 2),
    row === nearest ? formatNumber(currentResult.range, 2) : "",
    row === nearest ? formatNumber(rangeError, 2) : "",
  ]));
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
    `Beam current: ${result.beamCurrentNa.toExponential(6)} nA/cm^2`,
    `Electronic deposited energy: ${result.electronicDeposited.toFixed(6)} keV`,
    `Nuclear deposited energy: ${result.nuclearDeposited.toFixed(6)} keV`,
    `Vacancies per ion: ${result.vacancies.toExponential(6)}`,
    `Interstitials per ion: ${result.interstitials.toExponential(6)}`,
    `Secondary electrons per ion: ${result.secondaryElectrons.toExponential(6)}`,
    `Damage: ${result.dpa.toExponential(6)} DPA`,
    `Thermal spike: ${result.thermalSpike.toExponential(6)} K`,
    `Material health: ${materialHealth(result).integrity.toFixed(2)}% integrity, ${materialHealth(result).damage.toFixed(2)}% damage`,
    "",
    "PROPERTY EVOLUTION",
    ...stageProperties(result).map((entry) => `${entry.property}: ${formatNumber(entry.before, 3)} ${entry.unit} -> ${formatNumber(entry.during, 3)} ${entry.unit} -> ${formatNumber(entry.after, 3)} ${entry.unit} (${entry.status})`),
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
    outputs: { range: result.range, let: result.letValue, se: result.se, sn: result.sn, electronicDeposited: result.electronicDeposited, nuclearDeposited: result.nuclearDeposited, vacancies: result.vacancies, interstitials: result.interstitials, secondaryElectrons: result.secondaryElectrons, defectDensity: result.defectDensity, dpa: result.dpa, temperature: result.temperature, thermalSpike: result.thermalSpike, sputter: result.sputter, velocity: result.velocity, beamCurrentNa: result.beamCurrentNa },
    health: materialHealth(result),
    propertyEvolution: stageProperties(result),
    profile: result.profile,
  };
}

function saveSession() {
  const values = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));
  values.energyValue = document.querySelector("#energyValue").value;
  values.energyUnit = document.querySelector("#energyUnit").value;
  values.activeSceneView = activeSceneView;
  downloadFile("ion-beam-session.json", JSON.stringify({ version: 2, controls: values, mode, history: experimentHistory, notebook: notebookEntries }, null, 2), "application/json");
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
  if (payload.controls?.energyUnit) document.querySelector("#energyUnit").value = payload.controls.energyUnit;
  if (payload.controls?.energyValue) document.querySelector("#energyValue").value = payload.controls.energyValue;
  if (payload.controls?.activeSceneView) activeSceneView = payload.controls.activeSceneView;
  document.querySelectorAll("#sceneTabs button").forEach((button) => button.classList.toggle("active", button.dataset.view === activeSceneView));
  populateIonDependentControls();
  experimentHistory = Array.isArray(payload.history) ? payload.history : experimentHistory;
  notebookEntries = Array.isArray(payload.notebook) ? payload.notebook : notebookEntries;
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
  drawSceneModeOverlay(context, width, height, targetLeft, targetRight);

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
  context.fillText(`${activeSceneView} | ${currentResult.element.symbol}${currentResult.charge}+ | ${formatEnergy(currentResult.energy)} | range ${currentResult.range.toFixed(0)} nm | DPA ${currentResult.dpa.toExponential(2)}`, targetLeft + 10, height - 27);
}

function drawSceneModeOverlay(context, width, height, targetLeft, targetRight) {
  const scale = document.querySelector("#scaleMode")?.value || "Macroscopic";
  const top = 38;
  const bottom = height - 28;
  const viewWidth = targetRight - targetLeft;
  context.save();
  context.globalCompositeOperation = "source-over";
  if (activeSceneView === "electron" || scale === "Electron") {
    for (let index = 0; index < 48; index += 1) {
      const x = targetLeft + ((index * 43 + frame * 2) % viewWidth);
      const y = top + 24 + ((Math.sin(index * 1.7 + frame * 0.04) + 1) / 2) * (bottom - top - 48);
      context.strokeStyle = "#4dd8ff66";
      context.beginPath();
      context.arc(x, y, 8 + (index % 5), 0, Math.PI * 1.6);
      context.stroke();
      context.fillStyle = "#9be7ff";
      context.beginPath();
      context.arc(x, y, 2.2, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (activeSceneView === "damage" || scale === "Atomic") {
    const intensity = clamp(materialDamageScore(currentResult) / 100, 0.05, 0.9);
    for (let index = 0; index < 90; index += 1) {
      const depth = (Math.sin(index * 12.9898) + 1) / 2;
      const braggBias = Math.exp(-(((depth - 0.78) / 0.22) ** 2));
      const x = targetLeft + depth * viewWidth;
      const y = top + ((Math.sin(index * 78.233) + 1) / 2) * (bottom - top);
      context.fillStyle = braggBias * intensity > 0.28 ? "#ff5f7e" : "#ffd166";
      context.beginPath();
      context.arc(x, y, 2 + braggBias * 5, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (activeSceneView === "thermal") {
    for (let index = 0; index < 8; index += 1) {
      const fraction = index / 7;
      const x = targetLeft + fraction * viewWidth;
      const heat = Math.exp(-(((fraction - 0.82) / 0.2) ** 2));
      const gradient = context.createRadialGradient(x, height / 2, 2, x, height / 2, 40 + heat * 90);
      gradient.addColorStop(0, `rgba(255, 95, 126, ${0.12 + heat * 0.35})`);
      gradient.addColorStop(0.55, `rgba(255, 209, 102, ${heat * 0.18})`);
      gradient.addColorStop(1, "rgba(5, 8, 7, 0)");
      context.fillStyle = gradient;
      context.fillRect(targetLeft, top, viewWidth, bottom - top);
    }
  }
  if (activeSceneView === "track") {
    const track = ionTrackResponse(currentResult);
    const count = Math.min(36, Math.max(8, Math.round(track["Track overlap"] * 80)));
    for (let index = 0; index < count; index += 1) {
      const y = top + 18 + ((index * 37) % Math.max(bottom - top - 36, 1));
      const offset = Math.sin(index * 2.3) * 16;
      context.strokeStyle = index % 3 ? "#4dd8ffaa" : "#ff5f7eaa";
      context.lineWidth = 1.5 + Math.min(track["Track radius nm"], 4);
      context.beginPath();
      context.moveTo(targetLeft, y);
      context.bezierCurveTo(targetLeft + viewWidth * 0.35, y + offset, targetLeft + viewWidth * 0.65, y - offset, targetLeft + viewWidth, y + offset * 0.35);
      context.stroke();
    }
  }
  if (activeSceneView === "polymer") {
    const polymer = polymerResponse(currentResult, currentResult.material);
    for (let chain = 0; chain < 8; chain += 1) {
      const y = top + 28 + chain * ((bottom - top - 56) / 7);
      context.strokeStyle = "#b48cff";
      context.lineWidth = 2;
      context.beginPath();
      for (let point = 0; point < 24; point += 1) {
        const x = targetLeft + (point / 23) * viewWidth;
        const wave = Math.sin(point * 0.9 + chain + frame * 0.02) * 12;
        point ? context.lineTo(x, y + wave) : context.moveTo(x, y + wave);
        if (polymer["Chain scission"] > 0.25 && point % 7 === 0) {
          context.moveTo(x + 12, y + wave + 8);
        }
      }
      context.stroke();
      context.fillStyle = "#6ee7b7";
      for (let link = 4; link < 22; link += 6) {
        if (polymer["Crosslink density"] > link / 30) {
          const x = targetLeft + (link / 23) * viewWidth;
          context.fillRect(x - 2, y - 18, 4, 36);
        }
      }
    }
  }
  if (activeSceneView === "crystal") {
    const template = crystalTemplate(currentResult.material);
    context.strokeStyle = "#6ee7b766";
    for (let x = targetLeft + 18; x < targetRight - 10; x += 34) {
      for (let y = top + 18; y < bottom - 10; y += 34) {
        context.strokeRect(x - 8, y - 8, 16, 16);
        for (const [px, py] of template.positions.length ? template.positions : [[0.5, 0.5]]) {
          context.fillStyle = "#78d7ff";
          context.beginPath();
          context.arc(x + (px - 0.5) * 16, y + (py - 0.5) * 16, 2.5, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }
  context.restore();
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

function renderActiveTab(tab) {
  if (!tab || !currentResult) return;
  if (tab === "graphs") renderCharts();
  if (tab === "history") renderHistory();
  if (tab === "database-explorer") renderDatabaseExplorer();
  if (tab === "property-evolution") renderPropertyEvolution();
  if (tab === "material-explorer") renderMaterialExplorer();
  if (tab === "crystal-bragg") renderCrystalBragg();
  if (tab === "multilayer-evolution") renderMultilayerEvolution();
  if (tab === "radiation-ai") renderRadiationAiLab();
  if (tab === "publication-notebook") renderPublicationNotebook();
  if (tab === "grand-comparison") runGrandComparison();
  if (tab === "facility-srim") {
    renderFacilityPresets();
    compareSrimRows();
  }
}

function bindEvents() {
  Object.values(controls).forEach((control) => control.addEventListener("input", () => {
    if (control === controls.ion) {
      populateIonDependentControls();
      updatePeriodicSelection();
    }
    if (control === controls.materialClass) populateMaterialSelect();
    if (control === controls.energy) {
      document.querySelector("#energyValue").value = formatEnergyInUnit(Number(controls.energy.value), document.querySelector("#energyUnit").value);
    }
    syncAll();
  }));

  document.querySelectorAll(".tab-bar button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".tab-bar button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".tab-view").forEach((view) => view.classList.toggle("active", view.id === button.dataset.tab));
    renderActiveTab(button.dataset.tab);
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
  document.querySelector("#energyValue").addEventListener("change", () => {
    setEnergyKev(energyInputToKev(), "field");
    syncAll();
  });
  document.querySelector("#energyUnit").addEventListener("input", () => {
    document.querySelector("#energyValue").value = formatEnergyInUnit(Number(controls.energy.value), document.querySelector("#energyUnit").value);
  });
  document.querySelector("#energyPresets").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    setEnergyKev(Number(button.dataset.kev));
    syncAll();
    addLog(`Energy preset: ${button.textContent}`);
  }));
  document.querySelector("#globalSearch").addEventListener("input", renderGlobalSearch);
  document.querySelector("#globalSearch").addEventListener("blur", () => setTimeout(() => document.querySelector("#globalSearchResults").classList.remove("open"), 160));
  document.querySelector("#scaleMode").addEventListener("input", () => {
    particles = particles.slice(-18);
    addLog(`Scale view: ${document.querySelector("#scaleMode").value}`);
  });
  document.querySelectorAll("#sceneTabs button").forEach((button) => button.addEventListener("click", () => {
    activeSceneView = button.dataset.view;
    document.querySelectorAll("#sceneTabs button").forEach((item) => item.classList.toggle("active", item === button));
    particles = particles.slice(-18);
    addLog(`Scene view: ${activeSceneView}`);
  }));
  document.querySelector("#elementSearch").addEventListener("input", filterPeriodicTable);
  document.querySelector("#elementCategory").addEventListener("input", filterPeriodicTable);
  document.querySelector("#elementGroup").addEventListener("input", filterPeriodicTable);
  document.querySelector("#elementPeriod").addEventListener("input", filterPeriodicTable);
  document.querySelector("#runMaterialComparison").addEventListener("click", runMaterialComparison);
  document.querySelector("#runIonComparison").addEventListener("click", runIonComparison);
  document.querySelector("#learningLevel").addEventListener("input", renderLearning);
  document.querySelector("#runSweep").addEventListener("click", runSweep);
  document.querySelector("#timelinePoint").addEventListener("input", renderPropertyEvolution);
  document.querySelector("#runSmartFinder").addEventListener("click", runSmartFinder);
  document.querySelector("#smartFinderQuery").addEventListener("input", runSmartFinder);
  document.querySelector("#runPropertyCompare").addEventListener("click", runPropertyCompare);
  document.querySelector("#materialExplorerQuery").addEventListener("input", renderMaterialExplorer);
  document.querySelector("#materialExplorerClass").addEventListener("input", renderMaterialExplorer);
  document.querySelector("#materialExplorerSort").addEventListener("input", renderMaterialExplorer);
  document.querySelector("#materialExplorerRadiation").addEventListener("input", renderMaterialExplorer);
  document.querySelector("#crystalState").addEventListener("input", renderCrystalBragg);
  document.querySelector("#runBragg").addEventListener("click", renderCrystalBragg);
  document.querySelector("#runMultilayer").addEventListener("click", renderMultilayerEvolution);
  document.querySelector("#runAnneal").addEventListener("click", renderAnnealing);
  document.querySelector("#runHardnessRanking").addEventListener("click", renderHardnessRanking);
  document.querySelector("#runRecommend").addEventListener("click", runRecommendation);
  document.querySelector("#recommendGoal").addEventListener("input", runRecommendation);
  document.querySelector("#runReverse").addEventListener("click", runReverseEngineering);
  document.querySelector("#generatePublication").addEventListener("click", generatePublication);
  document.querySelector("#addNotebook").addEventListener("click", addNotebookEntry);
  document.querySelector("#runGrandComparison").addEventListener("click", runGrandComparison);
  document.querySelector("#facilitySelect").addEventListener("input", renderFacilityPresets);
  document.querySelector("#compareSrim").addEventListener("click", compareSrimRows);
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
    renderActiveTab(document.querySelector(".tab-view.active")?.id);
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

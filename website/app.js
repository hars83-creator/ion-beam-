const ions = {
  H: { z: 1, mass: 1.008, color: "#78f3ff" },
  He: { z: 2, mass: 4.0026, color: "#78f3ff" },
  Ar: { z: 18, mass: 39.948, color: "#ffd166" },
  Fe: { z: 26, mass: 55.845, color: "#ffd166" },
  Xe: { z: 54, mass: 131.29, color: "#ff7aa2" },
  Au: { z: 79, mass: 196.97, color: "#ff7aa2" },
};

const materials = {
  Iron: { className: "Metal", density: 7.87, mass: 55.845, bandgap: 0, ed: 40, se: 1.28, sn: 0.74, range: 1.0 },
  Silicon: { className: "Semiconductor", density: 2.329, mass: 28.085, bandgap: 1.12, ed: 15, se: 0.9, sn: 0.55, range: 1.35 },
  Alumina: { className: "Insulator", density: 3.95, mass: 101.96, bandgap: 8.8, ed: 40, se: 0.88, sn: 0.66, range: 1.16 },
  PTFE: { className: "Polymer", density: 2.2, mass: 12, bandgap: 5.8, ed: 12, se: 0.64, sn: 0.26, range: 2.5 },
  Gold: { className: "Metal", density: 19.3, mass: 196.97, bandgap: 0, ed: 35, se: 1.68, sn: 1.02, range: 0.72 },
  Diamond: { className: "Wide bandgap", density: 3.51, mass: 12.011, bandgap: 5.47, ed: 43, se: 0.7, sn: 0.5, range: 1.65 },
};

const controls = {
  ion: document.querySelector("#ion"),
  charge: document.querySelector("#charge"),
  energy: document.querySelector("#energy"),
  fluence: document.querySelector("#fluence"),
  time: document.querySelector("#time"),
  let: document.querySelector("#let"),
  angle: document.querySelector("#angle"),
  spread: document.querySelector("#spread"),
  material: document.querySelector("#material"),
};

const outputs = {
  energy: document.querySelector("#energyOut"),
  fluence: document.querySelector("#fluenceOut"),
  time: document.querySelector("#timeOut"),
  let: document.querySelector("#letOut"),
  angle: document.querySelector("#angleOut"),
  spread: document.querySelector("#spreadOut"),
};

const scene = document.querySelector("#scene");
const ctx = scene.getContext("2d");
const energyChart = document.querySelector("#energyChart").getContext("2d");
const letChart = document.querySelector("#letChart").getContext("2d");
const log = document.querySelector("#log");
let running = false;
let mode = "Educational";
let frame = 0;
let particles = [];
let flashes = [];

function readState() {
  const ion = ions[controls.ion.value];
  const mat = materials[controls.material.value];
  const energy = Number(controls.energy.value);
  const charge = Number(controls.charge.value);
  const fluence = 10 ** Number(controls.fluence.value);
  const time = Number(controls.time.value);
  const letInput = Number(controls.let.value);
  const angle = Number(controls.angle.value);
  const spread = Number(controls.spread.value);
  const se = mat.se * Math.sqrt(mat.density) * charge ** 1.25 / (0.9 + Math.sqrt(energy / ion.mass));
  const sn = mat.sn * mat.density ** 0.72 * Math.sqrt((ion.z * mat.mass) / 55) / Math.sqrt(energy / 100 + 0.25) * 0.12;
  const range = 0.55 * mat.range * energy ** 1.5 / (mat.density ** 0.72 * (1 + Math.sqrt(ion.mass / mat.mass))) * Math.cos((angle * Math.PI) / 180);
  const letValue = se + sn + letInput * 0.05;
  const deposited = Math.min(energy, letValue * range * 0.75);
  const defects = (0.8 * deposited * 1000 * fluence) / (2 * mat.ed * Math.max(range, 1) * 1e-7);
  const temp = (deposited * 1000 * 1.602e-19 * fluence) / Math.max(mat.density * Math.max(range, 1) * 1e-7 * 0.65, 1e-20);
  return { ion, mat, energy, charge, fluence, time, letInput, angle, spread, se, sn, range, letValue, deposited, defects, temp };
}

function syncLabels(s) {
  outputs.energy.value = `${s.energy.toFixed(0)} keV`;
  outputs.fluence.value = `${(10 ** Number(controls.fluence.value)).toExponential(1)} ions/cm^2`;
  outputs.time.value = `${s.time.toFixed(0)} s`;
  outputs.let.value = `${s.letInput.toFixed(2)} keV/nm`;
  outputs.angle.value = `${s.angle.toFixed(0)} deg`;
  outputs.spread.value = `${s.spread.toFixed(0)} deg`;
  document.querySelector("#rangeMetric").textContent = `${s.range.toFixed(0)} nm`;
  document.querySelector("#letMetric").textContent = `${s.letValue.toFixed(3)} keV/nm`;
  document.querySelector("#seMetric").textContent = `${s.se.toFixed(3)}`;
  document.querySelector("#snMetric").textContent = `${s.sn.toFixed(3)}`;
  document.querySelector("#defectMetric").textContent = `${s.defects.toExponential(2)} cm^-3`;
  document.querySelector("#tempMetric").textContent = `${s.temp.toExponential(2)} K`;
  document.querySelector("#explanation").textContent =
    `${controls.ion.value}${s.charge}+ ions deposit energy in ${controls.material.value}. ` +
    (s.se > s.sn * 1.4
      ? "Electronic stopping dominates, so excitation and secondary electrons are visible along the track. "
      : "Nuclear stopping is strong, so recoil atoms and dense defect regions appear near the end of range. ") +
    `The Bragg-like rise is centered near ${Math.round(s.range * 0.8)} nm in ${mode} mode.`;
  const readout = document.querySelector("#materialReadout");
  readout.innerHTML = `
    <dt>Class</dt><dd>${s.mat.className}</dd>
    <dt>Density</dt><dd>${s.mat.density} g/cm^3</dd>
    <dt>Bandgap</dt><dd>${s.mat.bandgap} eV</dd>
    <dt>Displacement</dt><dd>${s.mat.ed} eV</dd>
    <dt>Atomic mass</dt><dd>${s.mat.mass} amu</dd>
    <dt>Range factor</dt><dd>${s.mat.range}</dd>
  `;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return rect;
}

function drawScene(s) {
  const rect = resizeCanvas(scene);
  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#06111f";
  ctx.fillRect(0, 0, w, h);

  const targetLeft = w * 0.11;
  const targetRight = w - 28;
  ctx.fillStyle = "#0b1d2d";
  ctx.strokeStyle = "#31516d";
  ctx.lineWidth = 1;
  ctx.fillRect(targetLeft, 30, targetRight - targetLeft, h - 50);
  ctx.strokeRect(targetLeft, 30, targetRight - targetLeft, h - 50);
  ctx.strokeStyle = "#78d7ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(targetLeft, 30);
  ctx.lineTo(targetLeft, h - 20);
  ctx.stroke();

  for (let x = targetLeft + 24; x < targetRight - 10; x += 28) {
    for (let y = 58; y < h - 34; y += 28) {
      ctx.beginPath();
      ctx.fillStyle = s.mat.className === "Metal" ? "#5d7fa2" : s.mat.className === "Polymer" ? "#7c6ca8" : "#5d8f7a";
      ctx.arc(x, y + ((x + y) % 7) - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (running && frame % (mode === "Educational" ? 8 : 4) === 0) {
    const y = 60 + Math.random() * (h - 120);
    const a = ((s.angle + (Math.random() - 0.5) * s.spread) * Math.PI) / 180;
    particles.push({ x: 16, y, vx: Math.cos(a) * 5.6, vy: Math.sin(a) * 5.6, kind: "ion", ttl: 220, color: s.ion.color });
  }

  for (const p of particles) {
    if (p.kind === "ion" && p.x > targetLeft && p.x < targetRight) {
      const depth = (p.x - targetLeft) / (targetRight - targetLeft);
      const bragg = Math.exp(-(((depth - 0.82) / 0.2) ** 2));
      ctx.strokeStyle = bragg > 0.5 ? "#ff5f7e" : "#4dd8ff";
      ctx.lineWidth = 3 + bragg * 3;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (Math.random() < 0.04 + bragg * 0.12) {
        flashes.push({ x: p.x, y: p.y, r: 5 + bragg * 12, ttl: 14, color: bragg > 0.5 ? "#ff5f7e" : "#ffd166" });
        particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, kind: "electron", ttl: 55, color: "#9be7ff" });
        particles.push({ x: p.x, y: p.y, vx: Math.random() * 2, vy: (Math.random() - 0.5) * 3, kind: "recoil", ttl: 55, color: "#ff9f43" });
      }
    }
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.kind === "ion" ? 14 : 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.kind === "ion" ? 5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    p.x += p.vx;
    p.y += p.vy;
    p.ttl -= 1;
  }

  for (const f of flashes) {
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.stroke();
    f.r *= 1.08;
    f.ttl -= 1;
  }
  particles = particles.filter((p) => p.ttl > 0 && p.x < w + 40 && p.y > -30 && p.y < h + 30);
  flashes = flashes.filter((f) => f.ttl > 0);

  ctx.fillStyle = "#dff8ff";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(`${controls.ion.value}${s.charge}+  ${s.energy.toFixed(0)} keV  range ${s.range.toFixed(0)} nm`, targetLeft + 12, h - 28);
}

function drawChart(context, title, series, color, yLabel) {
  const rect = resizeCanvas(context.canvas);
  const w = rect.width;
  const h = rect.height;
  context.clearRect(0, 0, w, h);
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, w, h);
  context.strokeStyle = "#243a50";
  context.strokeRect(0.5, 0.5, w - 1, h - 1);
  context.fillStyle = "#dff8ff";
  context.font = "12px Inter, sans-serif";
  context.fillText(title, 14, 20);
  const pad = 34;
  const maxY = Math.max(...series.map((p) => p.y), 1e-9);
  context.strokeStyle = "#1d3448";
  for (let i = 0; i < 4; i += 1) {
    const y = pad + ((h - pad * 1.6) * i) / 3;
    context.beginPath();
    context.moveTo(pad, y);
    context.lineTo(w - 12, y);
    context.stroke();
  }
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  series.forEach((point, index) => {
    const x = pad + point.x * (w - pad - 14);
    const y = h - pad - (point.y / maxY) * (h - pad * 1.8);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.fillStyle = "#9db6c8";
  context.font = "11px Inter, sans-serif";
  context.fillText(yLabel, 12, h - 10);
}

function updateCharts(s) {
  const energySeries = [];
  const letSeries = [];
  for (let i = 0; i < 130; i += 1) {
    const x = i / 129;
    const bragg = 0.35 + 1.65 * Math.exp(-(((x - 0.82) / 0.19) ** 2));
    const localLet = (s.se * (1 - 0.28 * x) + s.sn * (0.55 + 1.25 * x ** 2.2)) * bragg;
    const energy = Math.max(0, s.energy * (1 - x ** 1.25));
    energySeries.push({ x, y: energy });
    letSeries.push({ x, y: localLet });
  }
  drawChart(energyChart, "Energy vs Depth", energySeries, "#4dd8ff", "keV");
  drawChart(letChart, "LET vs Depth", letSeries, "#ffd166", "keV/nm");
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  log.prepend(item);
  while (log.children.length > 6) log.lastChild.remove();
}

function tick() {
  const s = readState();
  syncLabels(s);
  drawScene(s);
  updateCharts(s);
  frame += 1;
  requestAnimationFrame(tick);
}

Object.values(controls).forEach((control) => control.addEventListener("input", () => {
  const s = readState();
  syncLabels(s);
  updateCharts(s);
}));

document.querySelector("#run").addEventListener("click", () => {
  running = !running;
  document.querySelector("#run").textContent = running ? "Pause" : "Start";
  addLog(running ? "Beam on" : "Beam paused");
});

document.querySelector("#reset").addEventListener("click", () => {
  particles = [];
  flashes = [];
  addLog("Scene reset");
});

document.querySelector("#educational").addEventListener("click", () => {
  mode = "Educational";
  document.querySelector("#educational").classList.add("active");
  document.querySelector("#research").classList.remove("active");
  addLog("Educational mode");
});

document.querySelector("#research").addEventListener("click", () => {
  mode = "Research";
  document.querySelector("#research").classList.add("active");
  document.querySelector("#educational").classList.remove("active");
  addLog("Research mode");
});

window.addEventListener("resize", () => {
  particles = particles.slice(-20);
});

addLog("Laboratory ready");
tick();

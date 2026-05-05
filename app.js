const components = [
  { key: "epoxy", name: "环氧树脂", short: "环氧", min: 10, max: 70, value: 52, color: "#008b98", locked: false },
  { key: "curing", name: "固化剂", short: "固化", min: 5, max: 40, value: 28, color: "#69b44b", locked: false },
  { key: "toughener", name: "增韧剂", short: "增韧", min: 0, max: 20, value: 8, color: "#e99223", locked: false },
  { key: "filler", name: "填料", short: "填料", min: 0, max: 15, value: 10, color: "#705cb6", locked: false },
  { key: "diluent", name: "稀释剂", short: "稀释", min: 0, max: 10, value: 2, color: "#4479bd", locked: false },
  { key: "catalyst", name: "催化剂", short: "催化", min: 0, max: 2, value: 0, color: "#8b929c", locked: false }
];

let state = {
  iteration: 18,
  totalBudget: 40,
  selectedCandidate: 1,
  lockedFormula: false
};

let history = [
  { iter: 17, sample: "S-017", epoxy: 49, curing: 26, toughener: 9, filler: 11, diluent: 3, catalyst: 2, tg: 167.2, constraint: "ok", status: "已实验", note: "较高 Tg" },
  { iter: 16, sample: "S-016", epoxy: 52, curing: 28, toughener: 8, filler: 10, diluent: 2, catalyst: 0, tg: 168.5, constraint: "ok", status: "已实验", note: "当前最佳" },
  { iter: 15, sample: "S-015", epoxy: 50, curing: 27, toughener: 8, filler: 8, diluent: 4, catalyst: 0, tg: 165.1, constraint: "ok", status: "已实验", note: "" },
  { iter: 14, sample: "S-014", epoxy: 46, curing: 24, toughener: 7, filler: 12, diluent: 5, catalyst: 1, tg: 158.6, constraint: "warn", status: "待回填", note: "填料接近上限" },
  { iter: 13, sample: "S-013", epoxy: 55, curing: 30, toughener: 6, filler: 14, diluent: 5, catalyst: 0, tg: null, constraint: "warn", status: "待回填", note: "" },
  { iter: 12, sample: "S-012", epoxy: 58, curing: 18, toughener: 6, filler: 16, diluent: 2, catalyst: 0, tg: null, constraint: "bad", status: "跳过", note: "比例总和异常" },
  { iter: 11, sample: "S-011", epoxy: 48, curing: 25, toughener: 9, filler: 9, diluent: 7, catalyst: 2, tg: 160.4, constraint: "ok", status: "已实验", note: "" },
  { iter: 10, sample: "S-010", epoxy: 45, curing: 25, toughener: 10, filler: 8, diluent: 10, catalyst: 2, tg: 156.8, constraint: "ok", status: "已实验", note: "" },
  { iter: 9, sample: "S-009", epoxy: 44, curing: 24, toughener: 12, filler: 8, diluent: 10, catalyst: 2, tg: 154.7, constraint: "ok", status: "已实验", note: "" },
  { iter: 8, sample: "S-008", epoxy: 43, curing: 23, toughener: 12, filler: 9, diluent: 11, catalyst: 2, tg: 151.9, constraint: "warn", status: "已实验", note: "稀释剂偏高" }
];

let candidates = [
  { id: 1, ei: 4.8, pred: 169.3, sigma: 2.1, epoxy: 51, curing: 26.5, toughener: 8, filler: 10, diluent: 2.5, catalyst: 2, constraint: "全部满足" },
  { id: 2, ei: 3.95, pred: 167.8, sigma: 2.3, epoxy: 52, curing: 27, toughener: 7, filler: 12.5, diluent: 1.5, catalyst: 0, constraint: "全部满足" },
  { id: 3, ei: 3.1, pred: 166.2, sigma: 2.0, epoxy: 48, curing: 25, toughener: 10, filler: 14.5, diluent: 2.5, catalyst: 0, constraint: "填料上限接近" },
  { id: 4, ei: 2.35, pred: 164.8, sigma: 2.4, epoxy: 53, curing: 30, toughener: 6, filler: 8, diluent: 3, catalyst: 0, constraint: "全部满足" },
  { id: 5, ei: 1.85, pred: 163.7, sigma: 2.2, epoxy: 46, curing: 23, toughener: 9, filler: 11.5, diluent: 9.5, catalyst: 1, constraint: "固化剂/环氧树脂比例偏低" }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function fmt(value, digits = 1) {
  return value === null || Number.isNaN(Number(value)) ? "—" : Number(value).toFixed(digits);
}

function getBest() {
  return [...history].filter((row) => typeof row.tg === "number").sort((a, b) => b.tg - a.tg)[0];
}

function totalOf(source = components) {
  return source.reduce((sum, item) => sum + Number(item.value ?? item[item.key] ?? 0), 0);
}

function editorValues() {
  return Object.fromEntries(components.map((component) => [component.key, component.value]));
}

function selectedCandidate() {
  return candidates.find((candidate) => candidate.id === state.selectedCandidate) || candidates[0];
}

function renderLeftRail() {
  $("#componentBounds").innerHTML = components.map((component) => `
    <div class="component-row">
      <span class="component-name"><i class="dot" style="background:${component.color}"></i>${component.name}</span>
      <input data-bound="${component.key}" data-kind="min" value="${component.min}" />
      <input data-bound="${component.key}" data-kind="max" value="${component.max}" />
      <input data-bound="${component.key}" data-kind="value" value="${fmt(component.value)}" />
    </div>
  `).join("");

  $("#boundsRows").innerHTML = components.map((component) => `
    <tr>
      <td>${component.name}</td>
      <td>${fmt(component.min)}</td>
      <td>${fmt(component.max)}</td>
    </tr>
  `).join("");

  const total = totalOf();
  const filler = components.find((component) => component.key === "filler").value;
  const catalyst = components.find((component) => component.key === "catalyst").value;
  const ratio = components.find((component) => component.key === "curing").value / components.find((component) => component.key === "epoxy").value;
  const checks = [
    { text: "比例总和 = 100%", ok: Math.abs(total - 100) < 0.05 },
    { text: "填料 ≤ 15%", ok: filler <= 15 },
    { text: "催化剂 ≤ 2%", ok: catalyst <= 2 },
    { text: "固化剂/环氧树脂 0.45 - 0.65", ok: ratio >= 0.45 && ratio <= 0.65, warn: ratio < 0.48 || ratio > 0.62 }
  ];
  $("#constraintList").innerHTML = checks.map((check) => `
    <li>
      <span class="constraint-icon ${check.ok ? "ok" : "warn"}">${check.ok ? "●" : "△"}</span>
      <span>${check.text}</span>
      <span class="constraint-icon ${check.ok ? "ok" : "warn"}">${check.ok ? "✓" : "!"}</span>
    </li>
  `).join("");
}

function renderMetrics() {
  const best = getBest();
  const top = candidates[0];
  $("#iterationNow").textContent = state.iteration;
  $("#iterationTotal").textContent = state.totalBudget;
  $("#bestTg").textContent = fmt(best.tg);
  $("#bestIteration").textContent = best.iter;
  $("#topEi").textContent = fmt(top.ei, 2);
  $("#topSigma").textContent = fmt(top.sigma, 1);
  $("#remainingBudget").textContent = Math.max(state.totalBudget - state.iteration, 0);
}

function renderEditor() {
  $("#compositionBar").innerHTML = components.map((component) => `
    <span class="bar-segment" style="width:${component.value}%;background:${component.color}">
      ${component.name} ${fmt(component.value)}%
    </span>
  `).join("");
  $("#compositionBar").insertAdjacentHTML("afterend", '<div class="bar-scale"><span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span></div>');
  const extraScales = $$(".bar-scale");
  extraScales.slice(1).forEach((node) => node.remove());

  $("#editorGrid").innerHTML = components.map((component) => `
    <div class="editor-item">
      <span class="component-name"><i class="dot" style="background:${component.color}"></i>${component.name}</span>
      <input type="number" step="0.1" min="${component.min}" max="${component.max}" value="${fmt(component.value)}" data-edit="${component.key}" />
      <button class="step-button" type="button" data-step="${component.key}" data-delta="-1">−</button>
      <button class="step-button" type="button" data-step="${component.key}" data-delta="1">＋</button>
      <input class="range" type="range" min="${component.min}" max="${component.max}" step="0.1" value="${fmt(component.value)}" data-range="${component.key}" />
      <label class="lock-label"><input type="checkbox" data-lock="${component.key}" ${component.locked ? "checked" : ""} /> 锁定</label>
    </div>
  `).join("");

  const total = totalOf();
  $("#compositionTotal").textContent = `${fmt(total)}%`;
  const valid = Math.abs(total - 100) < 0.05;
  $("#totalStatus").textContent = valid ? "满足约束" : "需归一化";
  $("#totalStatus").style.color = valid ? "var(--green)" : "var(--orange)";
}

function renderCandidates() {
  $("#candidateCards").innerHTML = candidates.map((candidate, index) => {
    const warning = candidate.constraint !== "全部满足";
    return `
      <article class="candidate-card ${index === 0 ? "featured" : ""} ${state.selectedCandidate === candidate.id ? "selected" : ""}">
        <div class="candidate-head">
          <span class="rank">${candidate.id}</span>
          <div class="candidate-metrics">
            <span><small>EI</small><strong>${fmt(candidate.ei, 2)} °C</strong></span>
            <span><small>Pred. Tg</small><strong>${fmt(candidate.pred)} °C</strong></span>
            <span><small>σ</small><strong>${fmt(candidate.sigma)} °C</strong></span>
          </div>
        </div>
        <div class="candidate-parts">
          ${components.map((component) => `<span><i style="background:${component.color}"></i>${component.short}<b>${fmt(candidate[component.key])}%</b></span>`).join("")}
        </div>
        <div class="candidate-check ${warning ? "constraint-warn" : ""}">${warning ? "△" : "✓"} ${candidate.constraint}</div>
        <div class="candidate-actions">
          <button class="secondary-button" type="button" data-apply="${candidate.id}">应用到编辑器</button>
          <button class="primary-button" type="button" data-mark="${candidate.id}">标记待实验</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  $("#historyCount").textContent = history.length;
  $("#recordCount").textContent = history.length;
  $("#historyRows").innerHTML = history.slice(0, 10).map((row) => {
    const constraintClass = row.constraint === "ok" ? "constraint-ok" : row.constraint === "warn" ? "constraint-warn" : "constraint-bad";
    const statusClass = row.status === "已实验" ? "done" : row.status === "待回填" ? "pending" : "skipped";
    return `
      <tr>
        <td>${row.iter}</td>
        <td>${row.sample}</td>
        ${components.map((component) => `<td>${fmt(row[component.key])}</td>`).join("")}
        <td>${fmt(row.tg)}</td>
        <td class="${constraintClass}">${row.constraint === "ok" ? "✓" : row.constraint === "warn" ? "△" : "×"}</td>
        <td><span class="status-pill ${statusClass}">${row.status}</span></td>
        <td>${row.note || "—"}</td>
      </tr>
    `;
  }).join("");
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  return { ctx, width: rect.width, height: rect.height };
}

function axes(ctx, width, height, padding, xLabel, yLabel) {
  ctx.strokeStyle = "#d9e4e8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
  ctx.fillStyle = "#536873";
  ctx.font = "12px Segoe UI";
  ctx.fillText(xLabel, width / 2 - 40, height - 7);
  ctx.save();
  ctx.translate(13, height / 2 + 45);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function drawSurrogate() {
  const canvas = $("#surrogateChart");
  const { ctx, width, height } = setupCanvas(canvas);
  const p = { left: 58, right: 22, top: 22, bottom: 44 };
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height, p, "填料比例 (%)", "预测 Tg (°C)");
  const plotW = width - p.left - p.right;
  const plotH = height - p.top - p.bottom;
  const tx = (x) => p.left + (x / 17) * plotW;
  const ty = (y) => height - p.bottom - ((y - 120) / 80) * plotH;

  ctx.strokeStyle = "#edf2f4";
  ctx.fillStyle = "#6b7c85";
  for (let y = 120; y <= 200; y += 10) {
    const py = ty(y);
    ctx.beginPath();
    ctx.moveTo(p.left, py);
    ctx.lineTo(width - p.right, py);
    ctx.stroke();
    if (y % 20 === 0) ctx.fillText(y, 24, py + 4);
  }

  ctx.fillStyle = "rgba(0, 121, 134, 0.16)";
  ctx.beginPath();
  for (let x = 0; x <= 17; x += 0.5) {
    const mean = 142 + 2.6 * x - 0.12 * x * x + Math.sin(x / 1.8) * 5;
    const upper = mean + 9 + Math.cos(x / 2) * 3;
    if (x === 0) ctx.moveTo(tx(x), ty(upper));
    else ctx.lineTo(tx(x), ty(upper));
  }
  for (let x = 17; x >= 0; x -= 0.5) {
    const mean = 142 + 2.6 * x - 0.12 * x * x + Math.sin(x / 1.8) * 5;
    const lower = mean - 9 - Math.cos(x / 2) * 3;
    ctx.lineTo(tx(x), ty(lower));
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#007986";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= 17; x += 0.4) {
    const mean = 142 + 2.6 * x - 0.12 * x * x + Math.sin(x / 1.8) * 5;
    if (x === 0) ctx.moveTo(tx(x), ty(mean));
    else ctx.lineTo(tx(x), ty(mean));
  }
  ctx.stroke();

  ctx.fillStyle = "#00636d";
  history.filter((row) => row.tg).slice(0, 9).forEach((row) => {
    ctx.beginPath();
    ctx.arc(tx(row.filler), ty(row.tg), 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  const current = editorValues();
  ctx.fillStyle = "#083b46";
  ctx.beginPath();
  ctx.moveTo(tx(current.filler), ty(178) - 8);
  ctx.lineTo(tx(current.filler) + 8, ty(178) + 8);
  ctx.lineTo(tx(current.filler) - 8, ty(178) + 8);
  ctx.closePath();
  ctx.fill();
}

function drawHeatmap() {
  const canvas = $("#heatmapChart");
  const { ctx, width, height } = setupCanvas(canvas);
  const p = { left: 58, right: 46, top: 20, bottom: 44 };
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height, p, "环氧树脂比例 (%)", "固化剂比例 (%)");
  const plotW = width - p.left - p.right;
  const plotH = height - p.top - p.bottom;
  const cols = 56;
  const rows = 34;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = i / cols;
      const y = j / rows;
      const g1 = Math.exp(-((x - 0.66) ** 2 / 0.025 + (y - 0.55) ** 2 / 0.06));
      const g2 = Math.exp(-((x - 0.34) ** 2 / 0.04 + (y - 0.38) ** 2 / 0.03));
      const v = Math.min(1, 0.18 + g1 * 0.78 + g2 * 0.38 + Math.sin(i / 5) * 0.04);
      ctx.fillStyle = heatColor(v);
      ctx.fillRect(p.left + x * plotW, p.top + y * plotH, plotW / cols + 1, plotH / rows + 1);
    }
  }

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#17314a";
  for (let i = 0; i < 32; i++) {
    const x = p.left + ((Math.sin(i * 2.3) + 1) / 2) * plotW;
    const y = p.top + ((Math.cos(i * 1.7) + 1) / 2) * plotH;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const active = selectedCandidate();
  const ax = p.left + ((active.epoxy - 10) / 60) * plotW;
  const ay = p.top + ((active.curing - 5) / 35) * plotH;
  ctx.fillStyle = "rgba(245, 232, 76, 0.72)";
  ctx.strokeStyle = "#354b54";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#354b54";
  ctx.fillText("★", ax - 5, ay + 5);

  const gradX = width - 28;
  const gradY = p.top + 12;
  for (let i = 0; i < 96; i++) {
    ctx.fillStyle = heatColor(1 - i / 96);
    ctx.fillRect(gradX, gradY + i * 1.7, 10, 2);
  }
  ctx.fillStyle = "#536873";
  ctx.fillText("EI (°C)", gradX - 16, p.top + 4);
}

function heatColor(v) {
  const r = Math.round(54 + v * 190);
  const g = Math.round(84 + v * 154);
  const b = Math.round(148 - v * 112);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawConvergence() {
  const canvas = $("#convergenceChart");
  const { ctx, width, height } = setupCanvas(canvas);
  const p = { left: 54, right: 18, top: 22, bottom: 42 };
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height, p, "迭代 (Iteration)", "Tg (°C)");
  const plotW = width - p.left - p.right;
  const plotH = height - p.top - p.bottom;
  const tx = (x) => p.left + (x / 40) * plotW;
  const ty = (y) => height - p.bottom - ((y - 130) / 45) * plotH;
  let best = 135;
  const points = [];
  for (let i = 0; i <= state.iteration; i++) {
    best = Math.max(best, 136 + i * 1.6 + Math.sin(i / 3) * 4);
    points.push({ x: i, y: best });
  }
  ctx.strokeStyle = "#007986";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(tx(point.x), ty(point.y)) : ctx.moveTo(tx(point.x), ty(point.y)));
  ctx.stroke();
  ctx.strokeStyle = "#9aaab2";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(tx(state.iteration), ty(points.at(-1).y));
  ctx.lineTo(tx(40), ty(points.at(-1).y + 5));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawUncertainty() {
  const canvas = $("#uncertaintyChart");
  const { ctx, width, height } = setupCanvas(canvas);
  const p = { left: 54, right: 18, top: 22, bottom: 42 };
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height, p, "填料比例 (%)", "σ (°C)");
  const plotW = width - p.left - p.right;
  const plotH = height - p.top - p.bottom;
  const tx = (x) => p.left + (x / 17) * plotW;
  const ty = (y) => height - p.bottom - (y / 5.5) * plotH;
  ctx.fillStyle = "rgba(0, 121, 134, 0.16)";
  ctx.beginPath();
  for (let x = 0; x <= 17; x += 0.5) {
    const y = 1.6 + Math.sin(x / 2) * 0.8 + Math.cos(x / 3) * 0.7;
    if (x === 0) ctx.moveTo(tx(x), ty(y + 1));
    else ctx.lineTo(tx(x), ty(y + 1));
  }
  for (let x = 17; x >= 0; x -= 0.5) {
    const y = 1.6 + Math.sin(x / 2) * 0.8 + Math.cos(x / 3) * 0.7;
    ctx.lineTo(tx(x), ty(Math.max(0.2, y - 1)));
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#007986";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= 17; x += 0.4) {
    const y = 1.6 + Math.sin(x / 2) * 0.8 + Math.cos(x / 3) * 0.7;
    if (x === 0) ctx.moveTo(tx(x), ty(y));
    else ctx.lineTo(tx(x), ty(y));
  }
  ctx.stroke();
  ctx.strokeStyle = "#aab7bd";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(tx(10), p.top);
  ctx.lineTo(tx(10), height - p.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderCharts() {
  drawSurrogate();
  drawHeatmap();
  drawConvergence();
  drawUncertainty();
}

function renderAll() {
  renderLeftRail();
  renderMetrics();
  renderEditor();
  renderCandidates();
  renderHistory();
  renderCharts();
}

function setComponentValue(key, raw) {
  const component = components.find((item) => item.key === key);
  if (!component || component.locked) return;
  const value = Math.max(component.min, Math.min(component.max, Number(raw)));
  component.value = Math.round(value * 10) / 10;
  renderAll();
}

function normalizeFormula() {
  const lockedTotal = components.filter((item) => item.locked).reduce((sum, item) => sum + item.value, 0);
  const free = components.filter((item) => !item.locked);
  const freeTotal = free.reduce((sum, item) => sum + item.value, 0);
  const target = Math.max(0, 100 - lockedTotal);
  free.forEach((item) => {
    item.value = Math.round(Math.max(item.min, Math.min(item.max, (item.value / freeTotal) * target)) * 10) / 10;
  });
  const delta = Math.round((100 - totalOf()) * 10) / 10;
  const last = [...free].reverse().find((item) => item.value + delta >= item.min && item.value + delta <= item.max);
  if (last) last.value = Math.round((last.value + delta) * 10) / 10;
  renderAll();
  showToast("配方已按未锁定组分归一化。");
}

function applyCandidate(id) {
  const candidate = candidates.find((item) => item.id === Number(id));
  if (!candidate) return;
  state.selectedCandidate = candidate.id;
  components.forEach((component) => {
    if (!component.locked) component.value = candidate[component.key];
  });
  renderAll();
  showToast(`已应用推荐配方 #${candidate.id} 到编辑器。`);
}

function markCandidate(id) {
  const candidate = candidates.find((item) => item.id === Number(id));
  if (!candidate) return;
  const iter = state.iteration + 1;
  history.unshift({
    iter,
    sample: `S-${String(iter).padStart(3, "0")}`,
    ...Object.fromEntries(components.map((component) => [component.key, candidate[component.key]])),
    tg: null,
    constraint: candidate.constraint === "全部满足" ? "ok" : "warn",
    status: "待回填",
    note: "推荐待实验"
  });
  state.selectedCandidate = candidate.id;
  renderAll();
  showToast(`推荐配方 #${candidate.id} 已标记为待实验。`);
}

function runIteration() {
  if (state.iteration >= state.totalBudget) {
    showToast("实验预算已用完。");
    return;
  }
  state.iteration += 1;
  candidates = candidates.map((candidate) => ({
    ...candidate,
    ei: Math.max(0.35, candidate.ei + (Math.random() - 0.55) * 0.7),
    pred: candidate.pred + (Math.random() - 0.35) * 1.2,
    sigma: Math.max(1.2, candidate.sigma + (Math.random() - 0.5) * 0.3)
  })).sort((a, b) => b.ei - a.ei).map((candidate, index) => ({ ...candidate, id: index + 1 }));
  state.selectedCandidate = 1;
  applyCandidate(1);
  showToast(`已完成第 ${state.iteration} 次迭代，候选已刷新。`);
}

function saveCurrentAsExperiment() {
  const iter = state.iteration + 1;
  const total = totalOf();
  history.unshift({
    iter,
    sample: `S-${String(iter).padStart(3, "0")}`,
    ...editorValues(),
    tg: null,
    constraint: Math.abs(total - 100) < 0.05 ? "ok" : "bad",
    status: "待回填",
    note: state.lockedFormula ? "锁定配方" : "编辑器保存"
  });
  renderAll();
  showToast("当前配方已保存为待回填实验记录。");
}

function confirmResult() {
  const sample = $("#sampleInput").value.trim() || `S-${String(state.iteration).padStart(3, "0")}`;
  const tg = Number($("#tgInput").value);
  if (!Number.isFinite(tg)) {
    showToast("请输入有效 Tg 数值。");
    return;
  }
  const existing = history.find((row) => row.sample === sample);
  if (existing) {
    existing.tg = Math.round(tg * 10) / 10;
    existing.status = "已实验";
    existing.note = $("#noteInput").value.trim();
  } else {
    history.unshift({
      iter: state.iteration,
      sample,
      ...editorValues(),
      tg: Math.round(tg * 10) / 10,
      constraint: Math.abs(totalOf() - 100) < 0.05 ? "ok" : "warn",
      status: "已实验",
      note: $("#noteInput").value.trim()
    });
  }
  $("#resultDialog").close();
  renderAll();
  showToast("实验结果已写入历史记录。");
}

function exportCsv() {
  const header = ["iter", "sample", ...components.map((item) => item.key), "tg", "constraint", "status", "note"];
  const rows = history.map((row) => [row.iter, row.sample, ...components.map((component) => row[component.key]), row.tg ?? "", row.constraint, row.status, row.note || ""]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "matopt-history.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("历史实验 CSV 已导出。");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function bindEvents() {
  $("#menuButton").addEventListener("click", () => {
    $("#leftRail").classList.toggle("collapsed");
    $(".layout-grid").classList.toggle("left-collapsed");
  });
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      const target = tab.dataset.panel === "space" ? ".formula-editor" : tab.dataset.panel === "analysis" ? ".history-panel" : ".analysis-grid";
      document.querySelector(target).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  $("#componentBounds").addEventListener("change", (event) => {
    const input = event.target.closest("[data-bound]");
    if (!input) return;
    const component = components.find((item) => item.key === input.dataset.bound);
    const value = Number(input.value);
    if (!component || !Number.isFinite(value)) return;
    component[input.dataset.kind === "value" ? "value" : input.dataset.kind] = value;
    renderAll();
  });
  $("#editorGrid").addEventListener("input", (event) => {
    const input = event.target.closest("[data-edit], [data-range]");
    if (!input) return;
    setComponentValue(input.dataset.edit || input.dataset.range, input.value);
  });
  $("#editorGrid").addEventListener("click", (event) => {
    const step = event.target.closest("[data-step]");
    if (!step) return;
    const component = components.find((item) => item.key === step.dataset.step);
    setComponentValue(component.key, component.value + Number(step.dataset.delta));
  });
  $("#editorGrid").addEventListener("change", (event) => {
    const lock = event.target.closest("[data-lock]");
    if (!lock) return;
    const component = components.find((item) => item.key === lock.dataset.lock);
    component.locked = lock.checked;
    renderAll();
  });
  $("#candidateCards").addEventListener("click", (event) => {
    const apply = event.target.closest("[data-apply]");
    const mark = event.target.closest("[data-mark]");
    if (apply) applyCandidate(apply.dataset.apply);
    if (mark) markCandidate(mark.dataset.mark);
  });
  $("#normalizeButton").addEventListener("click", normalizeFormula);
  $("#lockFormulaButton").addEventListener("click", () => {
    state.lockedFormula = !state.lockedFormula;
    components.forEach((component) => component.locked = state.lockedFormula);
    renderAll();
    showToast(state.lockedFormula ? "当前配方已锁定。" : "当前配方已解锁。");
  });
  $("#saveExperimentButton").addEventListener("click", saveCurrentAsExperiment);
  $("#runButton").addEventListener("click", runIteration);
  $("#addResultButton").addEventListener("click", () => $("#resultDialog").showModal());
  $("#confirmResultButton").addEventListener("click", confirmResult);
  $("#exportButton").addEventListener("click", exportCsv);
  $("#helpButton").addEventListener("click", () => $("#helpDialog").showModal());
  $("#settingsButton").addEventListener("click", () => showToast("设置入口已预留，可接入项目配置。"));
  $("#addComponentButton").addEventListener("click", () => showToast("MVP 已固定 6 个组分，后续可扩展动态组分。"));
  $("#showAllCandidates").addEventListener("click", () => showToast("当前展示前 5 组，完整 12 组可在下一版展开。"));
  $$(".mini-info").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.help)));
  window.addEventListener("resize", renderCharts);
}

bindEvents();
renderAll();

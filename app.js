const components = [
  { key: "epoxy", name: "环氧树脂", color: "#2e86de", min: 42, max: 46 },
  { key: "curing", name: "固化剂", color: "#f0a23a", min: 24, max: 26 },
  { key: "toughener", name: "增韧剂", color: "#3aa27c", min: 9, max: 11 },
  { key: "filler", name: "填料", color: "#74a9b1", min: 10, max: 14 },
  { key: "diluent", name: "稀释剂", color: "#7b8498", min: 8, max: 11 }
];

let experiments = [
  { id: 28, round: 8, epoxy: 43, curing: 25, toughener: 9, filler: 13, diluent: 10, tg: null, status: "待实验", source: "recommended" },
  { id: 27, round: 8, epoxy: 46, curing: 24, toughener: 10, filler: 12, diluent: 8, tg: null, status: "待实验", source: "recommended" },
  { id: 26, round: 7, epoxy: 44, curing: 26, toughener: 11, filler: 11, diluent: 8, tg: 142.1, status: "已实验", source: "manual" },
  { id: 25, round: 7, epoxy: 42, curing: 25, toughener: 9, filler: 14, diluent: 10, tg: 139.3, status: "已实验", source: "manual" },
  { id: 24, round: 7, epoxy: 45, curing: 24, toughener: 10, filler: 12, diluent: 9, tg: 145.8, status: "已实验", source: "manual" },
  { id: 23, round: 7, epoxy: 45, curing: 25, toughener: 10, filler: 12, diluent: 8, tg: 148.6, status: "已实验", source: "manual" },
  { id: 22, round: 6, epoxy: 44, curing: 24, toughener: 9, filler: 12, diluent: 11, tg: 136.4, status: "已实验", source: "manual" },
  { id: 21, round: 6, epoxy: 43, curing: 26, toughener: 11, filler: 10, diluent: 10, tg: 129.5, status: "已实验", source: "manual" },
  { id: 20, round: 6, epoxy: 45, curing: 25, toughener: 9, filler: 11, diluent: 10, tg: 126.4, status: "已实验", source: "manual" },
  { id: 19, round: 5, epoxy: 44, curing: 25, toughener: 10, filler: 11, diluent: 10, tg: 126.2, status: "已实验", source: "manual" },
  { id: 18, round: 5, epoxy: 42, curing: 26, toughener: 9, filler: 13, diluent: 10, tg: 126.0, status: "已实验", source: "manual" },
  { id: 17, round: 5, epoxy: 46, curing: 24, toughener: 9, filler: 13, diluent: 8, tg: 125.8, status: "已实验", source: "manual" },
  { id: 16, round: 4, epoxy: 44, curing: 24, toughener: 10, filler: 12, diluent: 10, tg: 100.2, status: "已实验", source: "manual" },
  { id: 15, round: 4, epoxy: 43, curing: 25, toughener: 11, filler: 11, diluent: 10, tg: 100.2, status: "已实验", source: "manual" },
  { id: 14, round: 3, epoxy: 45, curing: 24, toughener: 10, filler: 12, diluent: 9, tg: 100.0, status: "已实验", source: "manual" },
  { id: 13, round: 2, epoxy: 44, curing: 25, toughener: 10, filler: 12, diluent: 9, tg: 100.0, status: "已实验", source: "manual" },
  { id: 12, round: 1, epoxy: 43, curing: 26, toughener: 9, filler: 12, diluent: 10, tg: 100.0, status: "已实验", source: "manual" },
  { id: 11, round: 1, epoxy: 42, curing: 25, toughener: 10, filler: 13, diluent: 10, tg: 88.0, status: "已实验", source: "manual" }
];

let candidates = [
  { id: 1, epoxy: 44, curing: 25, toughener: 11, filler: 12, diluent: 8, predicted: 156.2, uncertainty: 4.1, improvement: 7.6, reason: "高树脂降低 Tg 提升，不确定性适中。", status: "待实验" },
  { id: 2, epoxy: 45, curing: 24, toughener: 10, filler: 12, diluent: 9, predicted: 153.1, uncertainty: 4.8, improvement: 4.5, reason: "填料协同增效，模型置信较高。", status: "待实验" },
  { id: 3, epoxy: 43, curing: 26, toughener: 11, filler: 11, diluent: 9, predicted: 151.7, uncertainty: 4.3, improvement: 3.1, reason: "固化剂略增，预测提升明显。", status: "待实验" },
  { id: 4, epoxy: 44, curing: 24, toughener: 9, filler: 13, diluent: 10, predicted: 150.2, uncertainty: 5.2, improvement: 1.6, reason: "填料提升，稳定性尚可。", status: "待实验" },
  { id: 5, epoxy: 46, curing: 25, toughener: 9, filler: 11, diluent: 9, predicted: 149.0, uncertainty: 4.9, improvement: 0.4, reason: "配方均衡，不确定性较低。", status: "待实验" },
  { id: 6, epoxy: 42, curing: 25, toughener: 10, filler: 13, diluent: 10, predicted: 148.3, uncertainty: 5.4, improvement: -0.3, reason: "接近当前最优，改进空间有限。", status: "待实验" }
];

const $ = (selector) => document.querySelector(selector);

function fmt(value, digits = 1) {
  return value === null || Number.isNaN(value) ? "—" : Number(value).toFixed(digits);
}

function rowTotal(row) {
  return components.reduce((sum, component) => sum + Number(row[component.key] || 0), 0);
}

function getCompleted() {
  return experiments.filter((item) => item.status === "已实验" && typeof item.tg === "number");
}

function getBestExperiment() {
  return getCompleted().sort((a, b) => b.tg - a.tg)[0];
}

function validateExperiments() {
  const seen = new Set();
  const issues = [];
  experiments.forEach((row) => {
    const signature = components.map((component) => row[component.key]).join("|");
    const total = rowTotal(row);
    components.forEach((component) => {
      const value = Number(row[component.key]);
      if (!Number.isFinite(value)) {
        issues.push(`实验 ${row.id}：${component.name} 不是有效数字。`);
      } else if (value < component.min || value > component.max) {
        issues.push(`实验 ${row.id}：${component.name} ${value}% 超出 ${component.min}-${component.max}% 约束。`);
      }
    });
    if (Math.abs(total - 100) > 0.01) {
      issues.push(`实验 ${row.id}：组分比例总和为 ${total.toFixed(1)}%，应为 100%。`);
    }
    if (seen.has(signature)) {
      issues.push(`实验 ${row.id}：与历史记录存在重复配方。`);
    }
    seen.add(signature);
    if (row.status === "已实验" && typeof row.tg !== "number") {
      issues.push(`实验 ${row.id}：已实验记录缺少 Tg 目标值。`);
    }
  });
  return issues;
}

function renderMetrics() {
  const completed = getCompleted();
  const best = getBestExperiment();
  const bestCandidate = [...candidates].sort((a, b) => b.predicted - a.predicted)[0];
  const issues = validateExperiments();

  $("#experimentCount").textContent = experiments.length;
  $("#validCount").textContent = completed.length;
  $("#invalidCount").textContent = issues.length;
  $("#bestValue").textContent = fmt(best?.tg);
  $("#bestSource").textContent = best ? `来源：实验 ID ${best.id}（第 ${best.round} 轮）` : "来源：--";
  $("#predictedBest").textContent = fmt(bestCandidate?.predicted);
  $("#candidateSource").textContent = bestCandidate ? `候选 #${bestCandidate.id}` : "候选 #--";
  $("#expectedGain").textContent = fmt(bestCandidate ? bestCandidate.predicted - best.tg : 0);
  $("#suggestionCount").textContent = candidates.length || 12;
  $("#validationIssueCount").textContent = issues.length;
  $("#toolbarIssueCount").textContent = issues.length;
  $("#experimentTotal").textContent = experiments.length;
  $("#bestCardValue").textContent = fmt(best?.tg);
  $("#bestCardMeta").textContent = best ? `实验 ID：${best.id}（第 ${best.round} 轮）` : "实验 ID：--";
}

function renderBestPanel() {
  const best = getBestExperiment();
  if (!best) return;
  $("#bestBar").innerHTML = components
    .map((component) => `<span class="bar-piece" style="width:${best[component.key]}%;background:${component.color}">${fmt(best[component.key])}</span>`)
    .join("");
  $("#bestComponents").innerHTML = components
    .map((component) => `
      <li>
        <span class="swatch" style="background:${component.color}"></span>
        <span>${component.name}</span>
        <strong>${fmt(best[component.key])}%</strong>
      </li>
    `)
    .join("");
}

function renderExperimentRows() {
  const best = getBestExperiment();
  $("#experimentRows").innerHTML = experiments
    .slice(0, 8)
    .map((row) => `
      <tr class="${best && row.id === best.id ? "best-row" : ""}">
        <td>${row.id}</td>
        <td>${row.round}</td>
        ${components.map((component) => `<td>${fmt(row[component.key])}</td>`).join("")}
        <td>${fmt(row.tg)}</td>
        <td><span class="status-pill ${row.status === "已实验" ? "done" : "pending"}">${row.status}</span></td>
        <td>${row.status === "待实验" ? '<button class="link-button" type="button">跳过</button>　<button class="link-button" type="button">回填真实值</button>' : "—"}</td>
      </tr>
    `)
    .join("");
}

function renderCandidateRows() {
  $("#candidateRows").innerHTML = candidates
    .map((row) => `
      <tr>
        <td>${row.id}</td>
        ${components.map((component) => `<td>${fmt(row[component.key])}</td>`).join("")}
        <td>${fmt(rowTotal(row), 1)}%</td>
        <td>${fmt(row.predicted)}</td>
        <td><span class="delta">± ${fmt(row.uncertainty)}</span></td>
        <td class="${row.improvement >= 0 ? "positive" : "danger"}">${row.improvement >= 0 ? "+" : ""}${fmt(row.improvement)}</td>
        <td>${row.reason}</td>
        <td><span class="status-pill ${row.status === "待实验" ? "pending" : row.status === "已实验" ? "done" : "skipped"}">${row.status}</span></td>
        <td><button class="link-button" type="button" data-action="adopt" data-id="${row.id}">转实验</button></td>
      </tr>
    `)
    .join("");
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

function drawAxes(ctx, width, height, padding) {
  ctx.strokeStyle = "#d9e4e6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

function drawTrendChart() {
  const canvas = $("#trendChart");
  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { left: 48, right: 20, top: 20, bottom: 34 };
  const byRound = new Map();
  getCompleted()
    .sort((a, b) => a.round - b.round || a.id - b.id)
    .forEach((row) => {
      const current = byRound.get(row.round) ?? -Infinity;
      byRound.set(row.round, Math.max(current, row.tg));
    });
  const points = [...byRound.entries()].map(([round, value]) => ({ round, value }));
  const minY = 60;
  const maxY = 160;
  const minX = 0;
  const maxX = Math.max(7, ...points.map((p) => p.round));
  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height, padding);

  ctx.strokeStyle = "#e4ecee";
  ctx.fillStyle = "#697a82";
  ctx.font = "12px Segoe UI";
  for (let y = 60; y <= 160; y += 20) {
    const py = height - padding.bottom - ((y - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(padding.left, py);
    ctx.lineTo(width - padding.right, py);
    ctx.stroke();
    ctx.fillText(y, 14, py + 4);
  }

  const toX = (round) => padding.left + ((round - minX) / (maxX - minX)) * (width - padding.left - padding.right);
  const toY = (value) => height - padding.bottom - ((value - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);
  ctx.strokeStyle = "#007d75";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = toX(point.round);
    const y = toY(point.value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#007d75";
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(toX(point.round), toY(point.value), 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDistributionChart() {
  const canvas = $("#distributionChart");
  const { ctx, width, height } = setupCanvas(canvas);
  const padding = { left: 44, right: 28, top: 18, bottom: 34 };
  const values = getCompleted().map((row) => row.tg);
  const predicted = candidates.map((row) => row.predicted);
  const buckets = [80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
  const counts = buckets.map((bucket) => values.filter((value) => value >= bucket && value < bucket + 10).length);
  const maxCount = Math.max(5, ...counts);
  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height, padding);

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const barW = plotW / buckets.length * 0.72;
  buckets.forEach((bucket, index) => {
    const x = padding.left + (index / buckets.length) * plotW + barW * 0.2;
    const barH = (counts[index] / maxCount) * plotH;
    ctx.fillStyle = "#a7d9cf";
    ctx.fillRect(x, height - padding.bottom - barH, barW, barH);
    ctx.fillStyle = "#697a82";
    ctx.font = "12px Segoe UI";
    if (index % 2 === 0) ctx.fillText(bucket, x, height - 12);
  });

  const toX = (value) => padding.left + ((value - 80) / 110) * plotW;
  const best = getBestExperiment();
  const predictedBest = Math.max(...predicted);
  [best?.tg, predictedBest].forEach((value, index) => {
    if (!value) return;
    ctx.strokeStyle = index === 0 ? "#007d75" : "#f0a23a";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(value), padding.top);
    ctx.lineTo(toX(value), height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(index === 0 ? `当前最优 ${fmt(value)}℃` : `预测最优 ${fmt(value)}℃`, toX(value) - 52, padding.top + 18 + index * 18);
  });

  ctx.strokeStyle = "#00877d";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  predicted.sort((a, b) => a - b).forEach((value, index) => {
    const x = toX(value);
    const y = height - padding.bottom - Math.sin((index / Math.max(predicted.length - 1, 1)) * Math.PI) * plotH * 0.45 - 20;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

function buildCandidate(id, best) {
  let epoxy = randomBetween(42, 46);
  let curing = randomBetween(24, 26);
  let toughener = randomBetween(9, 11);
  let filler = randomBetween(10, 14);
  let diluent = 100 - epoxy - curing - toughener - filler;
  diluent = Math.max(8, Math.min(11, Math.round(diluent * 10) / 10));
  filler = Math.round((100 - epoxy - curing - toughener - diluent) * 10) / 10;
  const predicted = 120 + epoxy * 1.8 + curing * 0.9 + toughener * 0.6 + filler * 1.4 - diluent * 2.6 + Math.random() * 4;
  const uncertainty = randomBetween(3.8, 5.8);
  return {
    id,
    epoxy,
    curing,
    toughener,
    filler,
    diluent,
    predicted: Math.round(predicted * 10) / 10,
    uncertainty,
    improvement: Math.round((predicted - best.tg) * 10) / 10,
    reason: predicted > best.tg ? "探索高 Tg 可行区，比例满足全部约束。" : "贴近当前最优，用于降低模型不确定性。",
    status: "待实验"
  };
}

function generateCandidates() {
  const best = getBestExperiment();
  const generated = [];
  const signatures = new Set(experiments.map((row) => components.map((component) => row[component.key]).join("|")));
  let attempts = 0;
  while (generated.length < 12 && attempts < 200) {
    attempts += 1;
    const candidate = buildCandidate(generated.length + 1, best);
    const signature = components.map((component) => candidate[component.key]).join("|");
    if (Math.abs(rowTotal(candidate) - 100) < 0.01 && !signatures.has(signature)) {
      generated.push(candidate);
      signatures.add(signature);
    }
  }
  candidates = generated.sort((a, b) => b.predicted - a.predicted).map((row, index) => ({ ...row, id: index + 1 }));
  renderAll();
}

function adoptCandidate(id) {
  const candidate = candidates.find((row) => row.id === id);
  if (!candidate) return;
  const nextId = Math.max(...experiments.map((row) => row.id)) + 1;
  experiments.unshift({
    id: nextId,
    round: 8,
    epoxy: candidate.epoxy,
    curing: candidate.curing,
    toughener: candidate.toughener,
    filler: candidate.filler,
    diluent: candidate.diluent,
    tg: null,
    status: "待实验",
    source: "recommended"
  });
  candidate.status = "已实验";
  renderAll();
}

function exportCsv() {
  const header = ["candidate_id", ...components.map((component) => component.key), "total", "predicted_tg", "uncertainty", "expected_improvement", "reason", "status"];
  const rows = candidates.map((row) => [
    row.id,
    ...components.map((component) => row[component.key]),
    rowTotal(row).toFixed(1),
    row.predicted,
    row.uncertainty,
    row.improvement,
    row.reason,
    row.status
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "SOBO_recommendations.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(",").map((item) => item.trim());
  const required = ["epoxy", "curing", "toughener", "filler", "diluent", "tg"];
  const missing = required.filter((field) => !header.includes(field));
  if (missing.length) {
    alert(`CSV 缺少列：${missing.join(", ")}`);
    return;
  }
  const imported = lines.map((line, index) => {
    const cells = line.split(",").map((item) => item.trim());
    const row = Object.fromEntries(header.map((field, cellIndex) => [field, cells[cellIndex]]));
    return {
      id: Math.max(...experiments.map((item) => item.id)) + index + 1,
      round: Number(row.round || 1),
      epoxy: Number(row.epoxy),
      curing: Number(row.curing),
      toughener: Number(row.toughener),
      filler: Number(row.filler),
      diluent: Number(row.diluent),
      tg: Number(row.tg),
      status: "已实验",
      source: "import"
    };
  });
  experiments = [...imported, ...experiments];
  renderAll();
}

function showValidationDialog() {
  const issues = validateExperiments();
  $("#validationList").innerHTML = issues.length
    ? issues.map((issue) => `<li>${issue}</li>`).join("")
    : "<li>当前实验数据通过全部校验。</li>";
  $("#validationDialog").showModal();
}

function bindEvents() {
  $("#generateButton").addEventListener("click", generateCandidates);
  $("#exportButton").addEventListener("click", exportCsv);
  $("#showValidation").addEventListener("click", showValidationDialog);
  $("#showValidationInline").addEventListener("click", showValidationDialog);
  $("#closeValidation").addEventListener("click", () => $("#validationDialog").close());
  $("#candidateRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='adopt']");
    if (button) adoptCandidate(Number(button.dataset.id));
  });
  $("#csvInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    file.text().then(parseCsv);
    event.target.value = "";
  });
  $("#importButton").addEventListener("click", () => $("#csvInput").click());
  window.addEventListener("resize", () => {
    drawTrendChart();
    drawDistributionChart();
  });
}

function renderAll() {
  renderMetrics();
  renderBestPanel();
  renderExperimentRows();
  renderCandidateRows();
  drawTrendChart();
  drawDistributionChart();
}

bindEvents();
renderAll();

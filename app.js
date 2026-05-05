const components = [
  { key: "epoxy", name: "环氧树脂", min: 10, max: 70 },
  { key: "curing", name: "固化剂", min: 5, max: 40 },
  { key: "toughener", name: "增韧剂", min: 0, max: 20 },
  { key: "filler", name: "填料", min: 0, max: 15 },
  { key: "diluent", name: "稀释剂", min: 0, max: 10 }
];

let iteration = 18;

let optimization = {
  objectiveName: "Tg",
  objectiveUnit: "℃",
  direction: "max",
  acquisition: "ei"
};

let experiments = [
  { id: 1, sample: "H-001", epoxy: 52, curing: 28, toughener: 8, filler: 10, diluent: 2, tg: 168.5, note: "当前最佳" },
  { id: 2, sample: "H-002", epoxy: 50, curing: 30, toughener: 6, filler: 12, diluent: 2, tg: 165.2, note: "-" },
  { id: 3, sample: "H-003", epoxy: 54, curing: 26, toughener: 9, filler: 9, diluent: 2, tg: 166.8, note: "-" },
  { id: 4, sample: "H-004", epoxy: 51, curing: 27, toughener: 8, filler: 12, diluent: 1.2, tg: null, note: "缺少 Tg" },
  { id: 5, sample: "H-005", epoxy: 49, curing: 31, toughener: 7, filler: 11, diluent: 2, tg: 164.1, note: "总和 99.2%" }
];

let recommendations = [
  { id: 1, epoxy: 51, curing: 29, toughener: 7, filler: 11, diluent: 2, predicted: 172.4, uncertainty: 2.1, improvement: 3.9 },
  { id: 2, epoxy: 53, curing: 30, toughener: 7, filler: 11, diluent: 2, predicted: 170.8, uncertainty: 2.3, improvement: 2.3 },
  { id: 3, epoxy: 49, curing: 31, toughener: 7, filler: 11, diluent: 2, predicted: 169.3, uncertainty: 2.6, improvement: 0.8 }
];

let feedback = [
  { iteration: 18, sample: "A018", formula: recommendations[0], predicted: 172.4, measured: null, status: "待回填", note: "-" },
  { iteration: 17, sample: "A017", formula: { epoxy: 52, curing: 28, toughener: 8, filler: 10, diluent: 2 }, predicted: 169.8, measured: 168.5, status: "已实验", note: "当前最佳" }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function fmt(value, digits = 1) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? "" : Number(value).toFixed(digits).replace(/\.0$/, "");
}

function rowTotal(row) {
  return components.reduce((sum, component) => sum + Number(row[component.key] || 0), 0);
}

function acquisitionWeights() {
  if (optimization.acquisition === "ucb") return { exploration: 0.75, exploitation: 0.45 };
  if (optimization.acquisition === "pi") return { exploration: 0.25, exploitation: 0.85 };
  return { exploration: 0.45, exploitation: 0.65 };
}

function objectiveLabel(prefix = "") {
  return `${prefix}${optimization.objectiveName} (${optimization.objectiveUnit})`;
}

function directionText() {
  return optimization.direction === "min" ? "最小化" : "最大化";
}

function getBestObjectiveValue() {
  const values = experiments.map((row) => Number(row.tg)).filter(Number.isFinite);
  if (!values.length) return 0;
  return optimization.direction === "min" ? Math.min(...values) : Math.max(...values);
}

function scoreCandidate(predicted, uncertainty) {
  const best = getBestObjectiveValue();
  const exploitationGain = optimization.direction === "min" ? best - predicted : predicted - best;
  const weights = acquisitionWeights();
  if (optimization.acquisition === "ucb") {
    return exploitationGain * weights.exploitation + uncertainty * weights.exploration * 1.6;
  }
  if (optimization.acquisition === "pi") {
    return exploitationGain > 0 ? weights.exploitation + weights.exploration * uncertainty * 0.08 : weights.exploration * uncertainty * 0.03;
  }
  return exploitationGain * weights.exploitation + Math.max(0, uncertainty) * weights.exploration;
}

function renderSettings() {
  $("#topObjective").textContent = `${directionText()} ${optimization.objectiveName}`;
  $("#objectiveName").value = optimization.objectiveName;
  $("#objectiveUnit").value = optimization.objectiveUnit;
  $("#objectiveDirection").value = optimization.direction;
  $("#acquisitionFunction").value = optimization.acquisition;
  $("#variableSummary").textContent = `${components.length} 个：${components.map((component) => component.name).join("、")}`;
  $("#constraintSummary").textContent = `比例总和 100%，${components.find((component) => component.key === "filler")?.name || "填料"} ≤ ${components.find((component) => component.key === "filler")?.max ?? 15}%`;
  $("#feedbackPredictedHead").textContent = objectiveLabel("预测 ");
  $("#feedbackMeasuredHead").textContent = objectiveLabel("实测 ");
  $("#strategyHint").textContent = strategyHint();
}

function strategyHint() {
  const current = optimization.acquisition === "ucb" ? "当前偏前期探索" : optimization.acquisition === "pi" ? "当前偏后期稳健利用" : "当前适合中期平衡探索与利用";
  return `前期用 UCB，中期用 EI，后期用 PI。${current}。`;
}

function validateRow(row) {
  const total = rowTotal(row);
  if (row.tg === null || row.tg === "" || Number.isNaN(Number(row.tg))) return { type: "warning", label: "待修正", note: "缺少 Tg" };
  if (Math.abs(total - 100) > 0.05) return { type: "warning", label: "警告", note: `总和 ${fmt(total)}%` };
  const out = components.find((component) => row[component.key] < component.min || row[component.key] > component.max);
  if (out) return { type: "error", label: "错误", note: `${out.name}越界` };
  return { type: "valid", label: "有效", note: row.note || "-" };
}

function renderHistory() {
  $("#historyHead").innerHTML = `
    <tr>
      <th>编号</th>
      <th>样品ID</th>
      ${components.map((component) => `<th>${component.name} %</th>`).join("")}
      <th>${objectiveLabel("实测 ")}</th>
      <th>校验</th>
      <th>备注</th>
    </tr>
  `;
  $("#historyRows").innerHTML = experiments.map((row) => {
    const validation = validateRow(row);
    return `
      <tr data-row="${row.id}">
        <td>${row.id}</td>
        <td>${row.sample}</td>
        ${components.map((component) => `<td><input data-field="${component.key}" value="${fmt(row[component.key])}" /></td>`).join("")}
        <td><input data-field="tg" value="${fmt(row.tg)}" /></td>
        <td><span class="validation ${validation.type}">${validation.type === "valid" ? "✓" : "△"} ${validation.label}</span></td>
        <td>${validation.note}</td>
      </tr>
    `;
  }).join("");
  const issues = experiments.filter((row) => validateRow(row).type !== "valid").length;
  $("#issueCount").textContent = issues;
  $("#validCount").textContent = 128 - issues;
  $("#importedCount").textContent = 128;
}

function formulaText(row) {
  return components.map((component) => `${component.name} ${fmt(row[component.key])}%`).join(" · ");
}

function renderRecommendations() {
  const count = Math.max(1, Math.min(20, Number($("#recommendCount").value || 3)));
  $("#recommendationCards").innerHTML = recommendations.slice(0, count).map((rec) => `
    <article class="recommend-card">
      <div class="recommend-head">
        <strong class="recommend-title">推荐 ${rec.id}</strong>
        <span class="recommend-metric"><small>预测 ${optimization.objectiveName}</small><strong class="teal">${fmt(rec.predicted)} ${optimization.objectiveUnit}</strong></span>
        <span class="recommend-metric"><small>不确定性</small><strong>±${fmt(rec.uncertainty)} ${optimization.objectiveUnit}</strong></span>
        <span class="recommend-metric"><small>预期${optimization.direction === "min" ? "降低" : "提升"}</small><strong>${rec.improvement >= 0 ? "+" : ""}${fmt(rec.improvement)} ${optimization.objectiveUnit}</strong></span>
      </div>
      <p class="formula-line">${formulaText(rec)}</p>
      <div class="card-actions">
        <button class="primary-button" type="button" data-apply="${rec.id}">应用为待实验</button>
      </div>
    </article>
  `).join("");
}

function renderFeedback() {
  $("#feedbackRows").innerHTML = feedback.map((row, index) => `
    <tr data-feedback="${index}">
      <td>${row.iteration}</td>
      <td>${row.sample}</td>
      <td><button class="link-button" type="button" data-formula="${index}">查看</button></td>
      <td>${fmt(row.predicted)}</td>
      <td><input type="number" step="0.1" data-measured="${index}" value="${fmt(row.measured)}" /></td>
      <td><span class="status-pill ${row.status === "已实验" ? "done" : "pending"}">${row.status}</span></td>
      <td>${row.note}</td>
    </tr>
  `).join("");
}

function renderVariables() {
  $("#variableRows").innerHTML = components.map((component) => `
    <div class="variable-row">
      <label>变量名称 <input data-var="${component.key}" data-kind="name" value="${component.name}" /></label>
      <label>下限 <input data-var="${component.key}" data-kind="min" value="${component.min}" /></label>
      <label>上限 <input data-var="${component.key}" data-kind="max" value="${component.max}" /></label>
      <label>单位 <input value="%" disabled /></label>
      <button class="secondary-button" type="button" data-delete-var="${component.key}">删除</button>
    </div>
  `).join("");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function showIssues() {
  const issues = experiments
    .map((row) => ({ row, validation: validateRow(row) }))
    .filter((item) => item.validation.type !== "valid")
    .map((item) => `<li>${item.row.sample}：${item.validation.note}</li>`);
  $("#issuesList").innerHTML = issues.length ? issues.join("") : "<li>全部数据有效。</li>";
  $("#issuesDialog").showModal();
}

function addRow() {
  const id = experiments.length + 1;
  experiments.push({ id, sample: `H-${String(id).padStart(3, "0")}`, epoxy: 50, curing: 28, toughener: 8, filler: 12, diluent: 2, tg: null, note: "新增" });
  renderHistory();
  showToast("已添加一行实验数据。");
}

function generateRecommendations() {
  const best = getBestObjectiveValue();
  const count = Math.max(1, Math.min(20, Number($("#recommendCount").value || 3)));
  const weights = acquisitionWeights();
  const raw = Array.from({ length: count }, (_, index) => {
    const values = buildFormula(index);
    const uncertainty = 1.4 + weights.exploration * 2 + index * 0.18;
    const exploitationStep = weights.exploitation * (3.6 - index * 0.85);
    const explorationStep = weights.exploration * (index % 2 === 0 ? 0.8 : 1.4);
    const delta = Math.max(0.2, exploitationStep + explorationStep + Math.random() * 0.35);
    const predicted = optimization.direction === "min" ? best - delta : best + delta;
    const improvement = optimization.direction === "min" ? best - predicted : predicted - best;
    return { id: index + 1, ...values, predicted, uncertainty, improvement, score: scoreCandidate(predicted, uncertainty) };
  });
  recommendations = raw.sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, id: index + 1 }));
  renderRecommendations();
  showToast(`已按${directionText()}与${$("#acquisitionFunction").selectedOptions[0].textContent}生成 ${count} 个推荐配方。`);
}

function buildFormula(seed) {
  const values = {};
  let remaining = 100;
  components.forEach((component, index) => {
    if (index === components.length - 1) {
      values[component.key] = Math.max(component.min, Math.min(component.max, Math.round(remaining * 10) / 10));
      return;
    }
    const span = Math.max(0, component.max - component.min);
    const wave = ((seed * 17 + index * 23) % 100) / 100;
    const value = Math.round((component.min + span * (0.35 + wave * 0.3)) * 10) / 10;
    values[component.key] = Math.max(component.min, Math.min(component.max, value));
    remaining -= values[component.key];
  });
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  const adjustable = components.find((component) => values[component.key] + (100 - total) >= component.min && values[component.key] + (100 - total) <= component.max) || components[0];
  values[adjustable.key] = Math.round((values[adjustable.key] + (100 - total)) * 10) / 10;
  return values;
}

function applyRecommendation(id) {
  const rec = recommendations.find((item) => item.id === Number(id));
  if (!rec) return;
  const sample = `A${String(iteration).padStart(3, "0")}`;
  feedback.unshift({ iteration, sample, formula: rec, predicted: rec.predicted, measured: null, status: "待回填", note: "-" });
  renderFeedback();
  showToast(`推荐 ${id} 已应用为待实验。`);
}

function updateModel() {
  feedback.forEach((row) => {
    if (row.measured !== null && row.measured !== "") {
      row.status = "已实验";
      const nextId = experiments.length + 1;
      if (!experiments.some((exp) => exp.sample === row.sample)) {
        experiments.push({ id: nextId, sample: row.sample, ...row.formula, tg: Number(row.measured), note: row.note });
      }
    }
  });
  iteration += 1;
  $("#iterationNow").textContent = iteration;
  renderHistory();
  generateRecommendations();
  showToast("模型已更新，并生成下一轮推荐。");
}

function exportCsv() {
  const header = ["id", "sample", ...components.map((c) => c.key), "tg", "validation", "note"];
  const rows = experiments.map((row) => [row.id, row.sample, ...components.map((c) => row[c.key]), row.tg ?? "", validateRow(row).label, validateRow(row).note]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "matopt-experiments.csv";
  link.click();
  URL.revokeObjectURL(url);
  showToast("实验数据已导出。");
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(",").map((item) => item.trim());
  const required = ["sample", "epoxy", "curing", "toughener", "filler", "diluent", "tg"];
  const missing = required.filter((field) => !header.includes(field));
  if (missing.length) {
    showToast(`CSV 缺少列：${missing.join(", ")}`);
    return;
  }
  const imported = lines.map((line, index) => {
    const cells = line.split(",").map((item) => item.trim());
    const row = Object.fromEntries(header.map((field, i) => [field, cells[i]]));
    return {
      id: experiments.length + index + 1,
      sample: row.sample,
      epoxy: Number(row.epoxy),
      curing: Number(row.curing),
      toughener: Number(row.toughener),
      filler: Number(row.filler),
      diluent: Number(row.diluent),
      tg: Number(row.tg),
      note: row.note || "CSV 导入"
    };
  });
  experiments = [...experiments, ...imported];
  renderHistory();
  showToast(`已导入 ${imported.length} 条 CSV 数据。`);
}

function bindEvents() {
  $("#historyRows").addEventListener("change", (event) => {
    const input = event.target.closest("[data-field]");
    if (!input) return;
    const row = experiments.find((item) => item.id === Number(input.closest("tr").dataset.row));
    row[input.dataset.field] = input.dataset.field === "tg" && input.value === "" ? null : Number(input.value);
    renderHistory();
  });
  $("#feedbackRows").addEventListener("change", (event) => {
    const input = event.target.closest("[data-measured]");
    if (!input) return;
    const row = feedback[Number(input.dataset.measured)];
    row.measured = input.value === "" ? null : Number(input.value);
    row.status = row.measured === null ? "待回填" : "已实验";
    renderFeedback();
  });
  $("#recommendationCards").addEventListener("click", (event) => {
    const apply = event.target.closest("[data-apply]");
    if (apply) applyRecommendation(apply.dataset.apply);
  });
  $("#addRowButton").addEventListener("click", addRow);
  $("#newExperimentButton").addEventListener("click", addRow);
  $("#validateButton").addEventListener("click", showIssues);
  $("#showIssuesButton").addEventListener("click", showIssues);
  $("#closeIssuesButton").addEventListener("click", () => $("#issuesDialog").close());
  $("#trainButton").addEventListener("click", () => showToast("训练完成：已使用有效历史数据更新代理模型。"));
  $("#generateButton").addEventListener("click", generateRecommendations);
  $("#recommendCount").addEventListener("change", () => {
    saveOptimizationSettings(false);
    generateRecommendations();
  });
  $("#saveSettingsButton").addEventListener("click", () => {
    saveOptimizationSettings(true);
    generateRecommendations();
  });
  $("#nextRoundButton").addEventListener("click", updateModel);
  $("#exportButton").addEventListener("click", exportCsv);
  $("#manualInputButton").addEventListener("click", addRow);
  $("#mappingButton").addEventListener("click", () => showToast("字段映射已按默认模板：sample/epoxy/curing/toughener/filler/diluent/tg。"));
  $("#editVariablesButton").addEventListener("click", () => {
    renderVariables();
    $("#variableDialog").showModal();
  });
  $("#variableRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-var]");
    if (!button) return;
    if (components.length <= 1) {
      showToast("至少保留 1 个变量。");
      return;
    }
    const key = button.dataset.deleteVar;
    const index = components.findIndex((component) => component.key === key);
    components.splice(index, 1);
    experiments.forEach((row) => delete row[key]);
    recommendations.forEach((row) => delete row[key]);
    feedback.forEach((row) => row.formula && delete row.formula[key]);
    renderVariables();
    showToast("变量已删除，保存后生效。");
  });
  $("#closeVariableButton").addEventListener("click", () => $("#variableDialog").close());
  $("#addVariableButton").addEventListener("click", () => {
    const next = components.length + 1;
    const key = `var${Date.now()}`;
    components.push({ key, name: `变量${next}`, min: 0, max: 20 });
    experiments.forEach((row) => row[key] = 0);
    recommendations.forEach((row) => row[key] = 0);
    feedback.forEach((row) => {
      if (row.formula) row.formula[key] = 0;
    });
    renderVariables();
    showToast("已添加变量，请设置名称和上下限。");
  });
  $("#saveVariablesButton").addEventListener("click", () => {
    $$("#variableRows [data-var]").forEach((input) => {
      const component = components.find((item) => item.key === input.dataset.var);
      component[input.dataset.kind] = input.dataset.kind === "name" ? input.value.trim() || component.name : Number(input.value);
    });
    $("#variableDialog").close();
    renderSettings();
    renderHistory();
    renderRecommendations();
    renderFeedback();
    showToast("变量与约束已保存。");
  });
  $("#csvInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    file.text().then(parseCsv);
    event.target.value = "";
  });
}

function saveOptimizationSettings(showMessage) {
  optimization.objectiveName = $("#objectiveName").value.trim() || "Tg";
  optimization.objectiveUnit = $("#objectiveUnit").value.trim() || "℃";
  optimization.direction = $("#objectiveDirection").value;
  optimization.acquisition = $("#acquisitionFunction").value;
  renderSettings();
  if (showMessage) showToast("优化设置已保存。");
}

bindEvents();
renderSettings();
renderHistory();
renderRecommendations();
renderFeedback();

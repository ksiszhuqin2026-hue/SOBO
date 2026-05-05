const components = [
  { key: "epoxy", name: "环氧树脂", min: 10, max: 70 },
  { key: "curing", name: "固化剂", min: 5, max: 40 },
  { key: "toughener", name: "增韧剂", min: 0, max: 20 },
  { key: "filler", name: "填料", min: 0, max: 15 },
  { key: "diluent", name: "稀释剂", min: 0, max: 10 }
];

let iteration = 18;

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

function validateRow(row) {
  const total = rowTotal(row);
  if (row.tg === null || row.tg === "" || Number.isNaN(Number(row.tg))) return { type: "warning", label: "待修正", note: "缺少 Tg" };
  if (Math.abs(total - 100) > 0.05) return { type: "warning", label: "警告", note: `总和 ${fmt(total)}%` };
  const out = components.find((component) => row[component.key] < component.min || row[component.key] > component.max);
  if (out) return { type: "error", label: "错误", note: `${out.name}越界` };
  return { type: "valid", label: "有效", note: row.note || "-" };
}

function renderHistory() {
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
        <span class="recommend-metric"><small>预测 Tg</small><strong class="teal">${fmt(rec.predicted)} °C</strong></span>
        <span class="recommend-metric"><small>不确定性</small><strong>±${fmt(rec.uncertainty)} °C</strong></span>
        <span class="recommend-metric"><small>预期提升</small><strong>+${fmt(rec.improvement)} °C</strong></span>
      </div>
      <p class="formula-line">${formulaText(rec)}</p>
      <div class="card-actions">
        <button class="primary-button" type="button" data-apply="${rec.id}">应用为待实验</button>
        <button class="secondary-button" type="button" data-detail="${rec.id}">查看详情</button>
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
      <strong>${component.name}</strong>
      <label>下限 <input data-var="${component.key}" data-kind="min" value="${component.min}" /></label>
      <label>上限 <input data-var="${component.key}" data-kind="max" value="${component.max}" /></label>
      <label>单位 <input value="%" disabled /></label>
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
  const best = Math.max(...experiments.map((row) => Number(row.tg || 0)));
  const count = Math.max(1, Math.min(20, Number($("#recommendCount").value || 3)));
  recommendations = Array.from({ length: count }, (_, index) => {
    const epoxy = 49 + ((index * 2) % 5);
    const curing = 29 + (index % 3);
    const toughener = 7;
    const filler = 11 - (index % 2);
    const diluent = 100 - epoxy - curing - toughener - filler;
    const predicted = best + 3.8 - index * 1.1 + Math.random() * 0.4;
    return { id: index + 1, epoxy, curing, toughener, filler, diluent, predicted, uncertainty: 2.1 + index * 0.2, improvement: predicted - best };
  });
  renderRecommendations();
  showToast(`已生成 ${count} 个推荐配方。`);
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
    const detail = event.target.closest("[data-detail]");
    if (apply) applyRecommendation(apply.dataset.apply);
    if (detail) showToast(formulaText(recommendations.find((item) => item.id === Number(detail.dataset.detail))));
  });
  $("#addRowButton").addEventListener("click", addRow);
  $("#newExperimentButton").addEventListener("click", addRow);
  $("#validateButton").addEventListener("click", showIssues);
  $("#showIssuesButton").addEventListener("click", showIssues);
  $("#closeIssuesButton").addEventListener("click", () => $("#issuesDialog").close());
  $("#trainButton").addEventListener("click", () => showToast("训练完成：已使用有效历史数据更新代理模型。"));
  $("#generateButton").addEventListener("click", generateRecommendations);
  $("#recommendCount").addEventListener("change", generateRecommendations);
  $("#nextRoundButton").addEventListener("click", updateModel);
  $("#exportButton").addEventListener("click", exportCsv);
  $("#manualInputButton").addEventListener("click", addRow);
  $("#mappingButton").addEventListener("click", () => showToast("字段映射已按默认模板：sample/epoxy/curing/toughener/filler/diluent/tg。"));
  $("#editVariablesButton").addEventListener("click", () => {
    renderVariables();
    $("#variableDialog").showModal();
  });
  $("#closeVariableButton").addEventListener("click", () => $("#variableDialog").close());
  $("#saveVariablesButton").addEventListener("click", () => {
    $$("#variableRows [data-var]").forEach((input) => {
      const component = components.find((item) => item.key === input.dataset.var);
      component[input.dataset.kind] = Number(input.value);
    });
    $("#variableDialog").close();
    renderHistory();
    showToast("变量与约束已保存。");
  });
  $("#csvInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    file.text().then(parseCsv);
    event.target.value = "";
  });
}

bindEvents();
renderHistory();
renderRecommendations();
renderFeedback();

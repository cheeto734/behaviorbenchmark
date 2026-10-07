const RESULTS = {
  super: "./results/super.json",
  ultra: "./results/ultra.json",
};

const MODELS = [
  { key: "super", label: "Nemotron Super", color: "#e7624d" },
  { key: "ultra", label: "Nemotron Ultra", color: "#147c78" },
];

const number = (value, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : "-";
const taskData = (result, taskName) => result.tasks.find((task) => task.task_name === taskName);
const metric = (result, taskName, name) => result.metrics[taskName]?.[name];

function values(task, field) {
  return (task?.predictions || [])
    .map((entry) => Number(entry[field]))
    .filter(Number.isFinite);
}

function histogram(valuesToCount, labels) {
  return labels.map((label) => valuesToCount.filter((value) => value === Number(label)).length);
}

function dictatorHistogram(task) {
  const predictions = (task?.predictions || [])
    .map((entry) => Number(entry.parsed_prediction))
    .filter(Number.isFinite);
  const references = (task?.predictions || [])
    .map((entry) => Number(entry.expected))
    .filter(Number.isFinite);
  const labels = Array.from({ length: 11 }, (_, index) => index * 10);
  const bucket = (valuesToBucket) => labels.map((label) => valuesToBucket.filter((value) => {
    const lower = label;
    const upper = label === 100 ? 101 : label + 10;
    return value >= lower && value < upper;
  }).length);
  return { labels, predictions: bucket(predictions), references: bucket(references) };
}

function createMetricsTable(results) {
  const tbody = document.querySelector("#metrics-table tbody");
  tbody.innerHTML = MODELS.map((model) => {
    const result = results[model.key];
    return `<tr>
      <td>${model.label}</td>
      <td>${number(metric(result, "multiround_behavior_dictator", "MAE_with_normalization_mae"), 2)}</td>
      <td>${number(metric(result, "multiround_behavior_dictator", "Spearman_with_pvalue_correlation"), 3)}</td>
      <td>${number(metric(result, "surv_resp_pred", "Accuracy_averaged"), 3)}</td>
      <td>${number(metric(result, "surv_resp_pred", "MAE_averaged"), 3)}</td>
    </tr>`;
  }).join("");
}

function chartOptions(yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { usePointStyle: true, padding: 20, font: { family: "DM Mono" } } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "DM Mono" } } },
      y: { beginAtZero: true, title: { display: true, text: yTitle }, ticks: { precision: 0 }, grid: { color: "#e2e1da" } },
    },
  };
}

function makeCharts(results) {
  const dictatorSets = MODELS.map((model) => {
    const data = dictatorHistogram(taskData(results[model.key], "multiround_behavior_dictator"));
    return { label: `${model.label} prediction`, data: data.predictions, borderColor: model.color, backgroundColor: `${model.color}bb`, borderWidth: 2 };
  });
  const dictatorHuman = dictatorHistogram(taskData(results.super, "multiround_behavior_dictator"));
  new Chart(document.querySelector("#dictator-chart"), {
    type: "bar",
    data: { labels: dictatorHuman.labels.map((label) => `$${label}`), datasets: [
      { label: "Human reference", data: dictatorHuman.references, borderColor: "#18211f", backgroundColor: "#18211f33", borderWidth: 2 },
      ...dictatorSets,
    ] },
    options: chartOptions("Examples"),
  });

  const surveyLabels = [1, 2, 3, 4, 5];
  const surveyHuman = histogram(values(taskData(results.super, "surv_resp_pred"), "expected"), surveyLabels);
  const surveySets = MODELS.map((model) => ({
    label: `${model.label} prediction`,
    data: histogram(values(taskData(results[model.key], "surv_resp_pred"), "parsed_prediction"), surveyLabels),
    borderColor: model.color,
    backgroundColor: `${model.color}bb`,
    borderWidth: 2,
  }));
  new Chart(document.querySelector("#survey-chart"), {
    type: "bar",
    data: { labels: surveyLabels, datasets: [
      { label: "Human reference", data: surveyHuman, borderColor: "#18211f", backgroundColor: "#18211f33", borderWidth: 2 },
      ...surveySets,
    ] },
    options: chartOptions("Examples"),
  });
}

async function load() {
  try {
    const entries = await Promise.all(MODELS.map(async (model) => [model.key, await fetch(RESULTS[model.key]).then((response) => response.json())]));
    const results = Object.fromEntries(entries);
    createMetricsTable(results);
    makeCharts(results);
    document.querySelector("#status").textContent = "Results loaded / 400 API calls";
  } catch (error) {
    document.querySelector("#status").textContent = "Could not load results";
    console.error(error);
  }
}

load();

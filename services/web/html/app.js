/* TaskFlow frontend.
 * All API calls go through the nginx reverse proxy that serves this page,
 * so the browser never needs to know the internal service addresses.
 */

const TASKS_URL = "/api/tasks";
const ANALYTICS_URL = "/api/analytics";

const el = (id) => document.getElementById(id);
const PRIORITY_LABEL = { 1: "високий", 2: "середній", 3: "низький" };

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json();
}

function setBadge(id, label, value, ok) {
  const node = el(id);
  node.textContent = ok ? `${label} ${value}` : `${label} —`;
  node.classList.toggle("up", ok);
  node.classList.toggle("down", !ok);
}

async function loadVersions() {
  const sources = [
    ["badge-web", "web", "/version"],
    ["badge-api", "tasks-api", "/api/version/tasks"],
    ["badge-analytics", "analytics", "/api/version/analytics"],
  ];
  for (const [id, label, url] of sources) {
    try {
      const data = await getJSON(url);
      setBadge(id, label, data.version, true);
    } catch {
      setBadge(id, label, "", false);
    }
  }
}

function renderTasks(tasks) {
  const list = el("tasks");
  list.innerHTML = "";

  if (tasks.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Поки що порожньо — додайте перше завдання";
    list.appendChild(li);
    return;
  }

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = task.done ? "done" : "";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = Boolean(task.done);
    toggle.addEventListener("change", () => updateTask(task, toggle.checked));

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = task.title;

    const pill = document.createElement("span");
    pill.className = `pill p${task.priority}`;
    pill.textContent = PRIORITY_LABEL[task.priority] || "—";

    const remove = document.createElement("button");
    remove.className = "icon";
    remove.textContent = "✕";
    remove.title = "Видалити";
    remove.addEventListener("click", () => deleteTask(task.id));

    li.append(toggle, title, pill, remove);
    list.appendChild(li);
  }
}

async function loadTasks() {
  try {
    renderTasks(await getJSON(TASKS_URL));
  } catch (err) {
    el("tasks").innerHTML = `<li class="empty">tasks-api недоступний (${err.message})</li>`;
  }
}

function renderBreakdown(breakdown) {
  const box = el("breakdown");
  if (!breakdown) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const max = Math.max(1, ...Object.values(breakdown));
  const rows = [
    ["high", "bar-high", "val-high"],
    ["medium", "bar-medium", "val-medium"],
    ["low", "bar-low", "val-low"],
  ];
  for (const [key, barId, valId] of rows) {
    const value = breakdown[key] || 0;
    el(barId).style.width = `${Math.round((value / max) * 100)}%`;
    el(valId).textContent = value;
  }
}

async function loadAnalytics() {
  const note = el("analytics-note");
  try {
    const data = await getJSON(ANALYTICS_URL);
    el("stat-total").textContent = data.total;
    el("stat-done").textContent = data.done;
    el("stat-pending").textContent = data.pending;
    el("stat-rate").textContent = `${Math.round(data.completion_rate * 100)}%`;
    renderBreakdown(data.priority_breakdown);
    note.textContent = data.busiest_priority
      ? `Найбільше незавершених завдань з пріоритетом: ${data.busiest_priority}`
      : "Незавершених завдань немає.";
  } catch (err) {
    for (const id of ["stat-total", "stat-done", "stat-pending", "stat-rate"]) {
      el(id).textContent = "—";
    }
    renderBreakdown(null);
    note.textContent = `Сервіс аналітики недоступний (${err.message})`;
  }
}

async function refresh() {
  await Promise.all([loadTasks(), loadAnalytics()]);
}

async function createTask(event) {
  event.preventDefault();
  const error = el("form-error");
  error.hidden = true;

  const payload = {
    title: el("title").value.trim(),
    priority: Number(el("priority").value),
  };

  try {
    const res = await fetch(TASKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body.errors || [body.error || res.statusText]).join(", "));
    }
    el("title").value = "";
    await refresh();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
}

async function updateTask(task, done) {
  await fetch(`${TASKS_URL}/${task.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: task.title, priority: task.priority, done }),
  });
  await refresh();
}

async function deleteTask(id) {
  await fetch(`${TASKS_URL}/${id}`, { method: "DELETE" });
  await refresh();
}

el("task-form").addEventListener("submit", createTask);
el("refresh").addEventListener("click", refresh);

loadVersions();
refresh();
setInterval(refresh, 15000);

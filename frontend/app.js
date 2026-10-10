const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
const apiBase = window.READQUEST_API_BASE_URL || "http://localhost:8000";

const els = {
  status: document.querySelector("#api-status"),
  refresh: document.querySelector("#refresh"),
  activities: document.querySelector("#activities"),
  title: document.querySelector("#practice-heading"),
  skill: document.querySelector("#skill-label"),
  difficulty: document.querySelector("#difficulty"),
  prompt: document.querySelector("#prompt"),
  choices: document.querySelector("#choices"),
  correct: document.querySelector("#correct"),
  incorrect: document.querySelector("#incorrect"),
  result: document.querySelector("#result"),
};

let selectedActivity = null;
let activities = [];

function setStatus(text, state) {
  els.status.textContent = text;
  els.status.className = `status ${state || ""}`.trim();
}

function setResult(html, isError = false) {
  els.result.innerHTML = isError ? `<p class="error">${html}</p>` : html;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return response.json();
}

function renderActivities() {
  els.activities.innerHTML = "";
  activities.forEach((activity) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `activity-button ${selectedActivity?.id === activity.id ? "active" : ""}`;
    button.textContent = activity.title;
    const label = document.createElement("span");
    label.textContent = activity.skills.map(skill => skill.name).join(", ");
    button.appendChild(label);
    button.addEventListener("click", () => selectActivity(activity));
    els.activities.appendChild(button);
  });
}

function selectActivity(activity) {
  selectedActivity = activity;
  els.title.textContent = activity.title;
  els.skill.textContent = activity.skills.map((skill) => skill.name).join(", ");
  els.difficulty.textContent = `Difficulty ${activity.difficulty}`;
  els.prompt.textContent = activity.prompt;
  els.choices.innerHTML = "";
  const choices = activity.content.choices || [];
  choices.forEach((choice) => {
    const item = document.createElement("div");
    item.className = "choice";
    item.textContent = choice;
    els.choices.appendChild(item);
  });
  els.correct.disabled = false;
  els.incorrect.disabled = false;
  setResult("");
  renderActivities();
}

async function load() {
  setStatus("Checking API", "");
  els.correct.disabled = true;
  els.incorrect.disabled = true;
  try {
    await request("/ready");
    setStatus("API ready", "ok");
    activities = await request("/demo/activities");
    renderActivities();
    if (activities.length > 0) {
      selectActivity(selectedActivity || activities[0]);
    } else {
      setResult("No published activities found. Run the demo seed first.", true);
    }
  } catch (error) {
    setStatus("API offline", "fail");
    setResult(`Could not load demo data: ${escapeHTML(error.message)}`, true);
  }
}

async function submitAttempt(isCorrect) {
  if (!selectedActivity) {
    return;
  }
  els.correct.disabled = true;
  els.incorrect.disabled = true;
  setResult("Submitting attempt...");
  try {
    const result = await request("/demo/attempts", {
      method: "POST",
      body: JSON.stringify({
        activity_id: selectedActivity.id,
        is_correct: isCorrect,
        selected_index: isCorrect ? selectedActivity.content.correct_index || 0 : 1,
        response_ms: 2400,
      }),
    });
    const mastery = result.mastery
      .map(
        (item) =>
          `<li><strong>${escapeHTML(item.band.replaceAll("_", " "))}</strong>: ${(item.score * 100).toFixed(0)}% confidence ${escapeHTML(item.confidence)}</li>`,
      )
      .join("");
    const recommendation = result.recommendation
      ? `<p><strong>Next recommendation:</strong> ${escapeHTML(result.recommendation.reason_code.replaceAll("_", " "))} at ${(result.recommendation.priority_score * 100).toFixed(0)}% priority.</p>`
      : "<p><strong>Next recommendation:</strong> none available.</p>";
    setResult(`<ul>${mastery}</ul>${recommendation}`);
  } catch (error) {
    setResult(`Attempt failed: ${escapeHTML(error.message)}`, true);
  } finally {
    els.correct.disabled = false;
    els.incorrect.disabled = false;
  }
}

els.refresh.addEventListener("click", load);
els.correct.addEventListener("click", () => submitAttempt(true));
els.incorrect.addEventListener("click", () => submitAttempt(false));

load();

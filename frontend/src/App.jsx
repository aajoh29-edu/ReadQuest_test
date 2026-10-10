import React, { useCallback, useEffect, useState } from "react";
import { request } from "./api.js";

const words = { high_priority: "Let's grow this skill", additional_practice: "Keep practicing", normal_review: "Doing well", mastered: "Strong skill", unassessed: "Ready to try" };

function Message({ error, notice, busy }) {
  return <>{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}{busy && <p role="status">Working…</p>}</>;
}

export function Progress({ rows }) {
  return <section aria-labelledby="progress-title"><h2 id="progress-title">Reading progress</h2>
    {rows.length === 0 ? <p>No skills to show yet.</p> : <ul className="progress-grid">{rows.map(row => <li key={row.skill_id}>
      <h3>{row.skill_name}</h3><p>{row.attempt_count ? words[row.band] || row.band : "Ready to try"}</p>
      {row.attempt_count > 0 && <><progress max="1" value={row.score} aria-label={`${row.skill_name} mastery`} /><p>{Math.round(row.score * 100)}% · {row.confidence} confidence · {row.attempt_count} recent answers</p></>}
      <p>{row.last_practiced_at ? `Last practice: ${new Date(row.last_practiced_at).toLocaleDateString()}` : "No practice yet"}</p>
    </li>)}</ul>}
  </section>;
}

function Login({ onLogin }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try { onLogin(await request("/auth/login", { method: "POST", body: Object.fromEntries(data) })); }
    catch (err) { setError(err.status === 401 ? "The email or password did not match." : err.message); }
    finally { setBusy(false); }
  }
  return <section className="card login"><h2>Welcome to ReadQuest</h2><p>Sign in to start your reading adventure.</p>
    <form onSubmit={submit} aria-label="Sign in">
      <label>Email<input name="email" type="email" autoComplete="username" required maxLength="254" /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength="128" /></label>
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form><Message error={error} />
  </section>;
}

function PasswordChange({ onChanged }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    try { await request("/auth/password", { method: "POST", body: Object.fromEntries(new FormData(form)) }); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <details><summary>Change password</summary><form onSubmit={submit} aria-label="Change password">
    <label>Current password<input name="current_password" type="password" autoComplete="current-password" required maxLength="128" /></label>
    <label>New password (12–128 characters)<input name="new_password" type="password" autoComplete="new-password" required minLength="12" maxLength="128" /></label>
    <button disabled={busy}>Change password and sign out</button><Message error={error} />
  </form></details>;
}

function ChildReader() {
  const [activities, setActivities] = useState([]); const [selected, setSelected] = useState(null);
  const [children, setChildren] = useState([]); const [progress, setProgress] = useState([]);
  const [recommendation, setRecommendation] = useState(null); const [result, setResult] = useState(null);
  const [choice, setChoice] = useState(null); const [error, setError] = useState("");
  const [busy, setBusy] = useState(true); const [started, setStarted] = useState(Date.now());
  const select = useCallback(row => { setSelected(row); setChoice(null); setResult(null); setStarted(Date.now()); }, []);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [rows, profiles] = await Promise.all([request("/activities"), request("/children")]);
      setActivities(rows); setChildren(profiles); select(rows[0] || null);
      if (profiles[0]) {
        const [scores, next] = await Promise.all([request(`/children/${profiles[0].id}/progress`), request(`/children/${profiles[0].id}/recommendations`, { method: "POST" })]);
        setProgress(scores); setRecommendation(next);
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [select]);
  useEffect(() => { load(); }, [load]);
  async function submit(event) {
    event.preventDefault(); if (choice === null || !selected) return;
    setBusy(true); setError("");
    try {
      const outcome = await request("/attempts", { method: "POST", body: { activity_id: selected.id, selected_index: choice, response_ms: Math.min(3600000, Date.now() - started) } });
      setResult(outcome); setProgress(outcome.mastery); setRecommendation(outcome.recommendation);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <><div className="section-heading"><h2>Hello{children[0] ? `, ${children[0].display_name}` : " reader"}!</h2><button className="secondary" onClick={load} disabled={busy}>Refresh activities</button></div>
    <Message error={error} busy={busy} />
    <div className="reader-grid"><aside className="card"><h2>Choose an adventure</h2>
      {!busy && activities.length === 0 && <p>No activities yet. Ask your grown-up to add some.</p>}
      <div className="activity-list">{activities.map(row => <button className="secondary" key={row.id} disabled={busy} aria-pressed={selected?.id === row.id} onClick={() => select(row)}>{row.title}</button>)}</div>
    </aside><section className="card" aria-labelledby="activity-title">
      {selected ? <><p className="eyebrow">Level {selected.difficulty}</p><h2 id="activity-title">{selected.title}</h2>
        {selected.content.passage && <p className="passage">{selected.content.passage}</p>}<p className="prompt">{selected.prompt}</p>
        <form onSubmit={submit}><fieldset disabled={busy || !!result}><legend>Choose your answer</legend>
          {selected.content.choices.map((text, index) => <label className="choice" key={index}><input type="radio" name="answer" value={index} checked={choice === index} onChange={() => setChoice(index)} />{text}</label>)}
        </fieldset><button disabled={busy || choice === null || !!result}>Check my answer</button></form>
        {result && <div className="notice" role="status"><h3>{result.is_correct ? "Great reading!" : "Good try. Keep learning!"}</h3><p>Your progress has been saved.</p></div>}
      </> : <h2 id="activity-title">Your adventure will appear here</h2>}
      <section aria-label="Next practice"><h3>What is next?</h3>{recommendation ? <><p>{recommendation.explanation}</p><button disabled={busy} onClick={() => select(recommendation.activity)}>Try {recommendation.activity.title}</button></> : !busy && <p>You have explored today's suggestions. Choose another activity or come back later.</p>}</section>
    </section></div><Progress rows={progress} />
  </>;
}

function ChildForm({ onCreated }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(form)); data.grade_level = data.grade_level === "" ? null : Number(data.grade_level);
    try { await request("/children", { method: "POST", body: data }); form.reset(); await onCreated(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <details><summary>Create a child account</summary><form onSubmit={submit} aria-label="Create child">
    <label>Display name<input name="display_name" required maxLength="80" /></label>
    <label>Login email<input name="email" type="email" autoComplete="off" required /></label>
    <label>Initial password<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
    <label>Grade (optional)<input name="grade_level" type="number" min="0" max="12" /></label>
    <button disabled={busy}>Create child</button><Message error={error} />
  </form></details>;
}

function Dashboard({ role }) {
  const [children, setChildren] = useState([]); const [selected, setSelected] = useState("");
  const [classes, setClasses] = useState([]); const [classChildren, setClassChildren] = useState({});
  const [scores, setScores] = useState([]); const [next, setNext] = useState(null);
  const [busy, setBusy] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const rows = await request("/children"); setChildren(rows); setSelected(current => rows.some(c => c.id === current) ? current : rows[0]?.id || "");
      if (role !== "parent") {
        const rooms = await request("/classes"); setClasses(rooms);
        const pairs = await Promise.all(rooms.map(async room => [room.id, await request(`/classes/${room.id}/children`)]));
        setClassChildren(Object.fromEntries(pairs));
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [role]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let active = true; setScores([]); setNext(null);
    if (!selected) return;
    setBusy(true); setError("");
    Promise.all([request(`/children/${selected}/progress`), request(`/children/${selected}/recommendations`, { method: "POST" })])
      .then(([rows, recommendation]) => { if (active) { setScores(rows); setNext(recommendation); } })
      .catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selected]);
  async function action(path, method, body, message) {
    setBusy(true); setError(""); setNotice("");
    try { await request(path, { method, body }); setNotice(message); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <><h2>{role === "parent" ? "Your family" : "Your readers"}</h2><Message error={error} notice={notice} busy={busy} />
    {(role === "parent" || role === "admin") && <ChildForm onCreated={load} />}
    <label>Reader<select aria-label="Reader" value={selected} onChange={event => setSelected(event.target.value)}><option value="">Choose a reader</option>{children.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label>
    {!busy && !children.length && <p>No linked readers yet.</p>}
    {selected && <><Progress rows={scores} /><section className="card"><h3>Suggested practice</h3><p>{next ? `${next.activity.title}: ${next.explanation}` : "No suggestion available right now."}</p></section></>}
    {(role === "parent" || role === "admin") && selected && <form aria-label="Join class" onSubmit={e => { e.preventDefault(); action(`/children/${selected}/enrollments`, "POST", { join_code: new FormData(e.currentTarget).get("join_code") }, "Class joined."); }}>
      <label>Class join code<input name="join_code" required maxLength="20" /></label><button disabled={busy}>Join class</button>
    </form>}
    {role !== "parent" && <section><h2>Classes</h2>{role === "teacher" && <form aria-label="Create class" onSubmit={e => { e.preventDefault(); const form=e.currentTarget; action("/classes", "POST", { name: new FormData(form).get("name") }, "Class created.").then(() => form.reset()); }}>
      <label>Class name<input name="name" required maxLength="120" /></label><button disabled={busy}>Create class</button></form>}
      {!classes.length && !busy && <p>No classes yet.</p>}
      {classes.map(room => <article className="card" key={room.id}><h3>{room.name}</h3><p>Join code: <code>{room.join_code}</code> · {room.status}</p>
        <button className="secondary" disabled={busy} onClick={() => action(`/classes/${room.id}`, "PATCH", { status: room.status === "active" ? "archived" : "active" }, "Class updated.")}>{room.status === "active" ? "Archive" : "Restore"} class {room.name}</button>
        <ul>{(classChildren[room.id] || []).map(c => <li key={c.id}>{c.display_name} <button className="secondary" disabled={busy} onClick={() => action(`/classes/${room.id}/children/${c.id}`, "DELETE", undefined, "Reader removed from class.")}>Remove {c.display_name}</button></li>)}</ul>
      </article>)}
    </section>}
  </>;
}

function AccountAdmin() {
  const [users, setUsers] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("parent"); const [notice, setNotice] = useState("");
  const load = useCallback(async () => { try { setUsers(await request("/admin/users")); } catch (err) { setError(err.message); } }, []);
  useEffect(() => { load(); }, [load]);
  async function submit(e) {
    e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form)); setBusy(true); setError(""); setNotice("");
    if (data.role !== "child") delete data.display_name;
    try { await request("/admin/users", { method: "POST", body: data }); form.reset(); setRole("parent"); await load(); setNotice("Account created."); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function status(row) {
    setBusy(true); setError("");
    try { await request(`/admin/users/${row.id}`, { method: "PATCH", body: { status: row.status === "active" ? "disabled" : "active" } }); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section><h2>Accounts</h2><Message error={error} notice={notice} busy={busy} /><form aria-label="Create account" onSubmit={submit}>
    <label>Email<input name="email" type="email" required /></label><label>Initial password<input name="password" type="password" autoComplete="new-password" minLength="12" maxLength="128" required /></label>
    <label>Role<select name="role" value={role} onChange={e => setRole(e.target.value)}>{["parent", "teacher", "admin", "child"].map(r => <option key={r}>{r}</option>)}</select></label>
    {role === "child" && <label>Display name<input name="display_name" required maxLength="80" /></label>}<button disabled={busy}>Create account</button>
    </form><ul>{users.map(row => <li key={row.id}>{row.email} · {row.role} · {row.status} <button className="secondary" disabled={busy} onClick={() => status(row)}>{row.status === "active" ? "Disable" : "Enable"} {row.email}</button></li>)}</ul>
  </section>;
}

function CurriculumAdmin() {
  const [skills, setSkills] = useState([]); const [lessons, setLessons] = useState([]); const [activities, setActivities] = useState([]);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const load = useCallback(async () => {
    try { const [s,l,a] = await Promise.all([request("/admin/skills"), request("/admin/lessons"), request("/admin/activities")]); setSkills(s); setLessons(l); setActivities(a); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function save(path, method, data, form) {
    setBusy(true); setError(""); setNotice("");
    try { await request(path, { method, body: data }); await load(); if (form) form.reset(); setEdit(null); setNotice("Curriculum saved."); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function activitySubmit(e) {
    e.preventDefault(); const form=e.currentTarget; const values=Object.fromEntries(new FormData(form));
    const choices=values.choices.split("\n").map(s => s.trim()).filter(Boolean);
    let mappings;
    try { mappings=JSON.parse(values.mappings); } catch { setError("Skill mappings must be a JSON list of skill_id and weight."); return; }
    const data={ lesson_id: values.lesson_id, title: values.title, activity_type: values.activity_type, prompt: values.prompt,
      content: { choices, correct_index: Number(values.correct_index), ...(values.passage ? { passage: values.passage } : {}) },
      difficulty: Number(values.difficulty), sequence: Number(values.sequence), status: values.status, skills: mappings };
    save(`/admin/activities${edit ? `/${edit.id}` : ""}`, edit ? "PUT" : "POST", data, form);
  }
  return <section><h2>Curriculum</h2><Message error={error} notice={notice} busy={busy} />
    <details><summary>Add a skill</summary><form aria-label="Add skill" onSubmit={e => { e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form)); data.level=Number(data.level); save("/admin/skills", "POST", data, form); }}>
      <label>Code<input name="code" pattern="[A-Z][A-Z0-9_]{0,49}" required /></label><label>Skill name<input name="name" maxLength="120" required /></label><label>Category<input name="category" maxLength="60" required /></label><label>Level<input name="level" type="number" min="1" max="10" defaultValue="1" required /></label><StatusSelect /><button disabled={busy}>Add skill</button>
    </form></details>
    <ul>{skills.map(row => <li key={row.id}>{row.name} · {row.status} <code>{row.id}</code> <button className="secondary" disabled={busy} onClick={() => { const {id,...data}=row; save(`/admin/skills/${id}`, "PUT", {...data,status: row.status === "published" ? "archived" : "published"}); }}>{row.status === "published" ? "Archive" : "Publish"} skill {row.name}</button></li>)}</ul>
    <details><summary>Add a lesson</summary><form aria-label="Add lesson" onSubmit={e => { e.preventDefault(); const form=e.currentTarget; const data=Object.fromEntries(new FormData(form)); data.sequence=Number(data.sequence); save("/admin/lessons", "POST", data, form); }}>
      <label>Lesson title<input name="title" maxLength="160" required /></label><label>Description<textarea name="description" maxLength="5000" /></label><label>Order<input name="sequence" type="number" min="0" defaultValue="1" required /></label><StatusSelect /><button disabled={busy}>Add lesson</button>
    </form></details>
    <ul>{lessons.map(row => <li key={row.id}>{row.title} · {row.status} <button className="secondary" disabled={busy} onClick={() => { const {id,...data}=row; save(`/admin/lessons/${id}`, "PUT", {...data,status: row.status === "published" ? "archived" : "published"}); }}>{row.status === "published" ? "Archive" : "Publish"} lesson {row.title}</button></li>)}</ul>
    <h3>{edit ? `Edit ${edit.title}` : "Add an activity"}</h3>
    <form key={edit?.id || "new"} aria-label="Activity editor" onSubmit={activitySubmit}>
      <label>Lesson<select name="lesson_id" defaultValue={edit?.lesson_id} required><option value="">Choose a lesson</option>{lessons.map(l => <option value={l.id} key={l.id}>{l.title}</option>)}</select></label>
      <label>Title<input name="title" maxLength="160" defaultValue={edit?.title} required /></label>
      <label>Type<select name="activity_type" defaultValue={edit?.activity_type || "multiple_choice"}>{["multiple_choice","word_match","read_and_answer"].map(t => <option key={t}>{t}</option>)}</select></label>
      <label>Prompt<textarea name="prompt" maxLength="5000" defaultValue={edit?.prompt} required /></label>
      <label>Passage (for read-and-answer)<textarea name="passage" maxLength="10000" defaultValue={edit?.content.passage || ""} /></label>
      <label>Choices (one per line)<textarea name="choices" defaultValue={edit?.content.choices.join("\n")} required /></label>
      <label>Correct choice index (first choice is 0)<input name="correct_index" type="number" min="0" max="7" defaultValue={edit?.content.correct_index || 0} required /></label>
      <label>Difficulty<input name="difficulty" type="number" min="1" max="10" defaultValue={edit?.difficulty || 1} required /></label>
      <label>Order in lesson<input name="sequence" type="number" min="0" defaultValue={edit?.sequence || 0} required /></label>
      <label>Skill mappings (JSON; positive weights total 1)<textarea name="mappings" defaultValue={JSON.stringify(edit?.skill_weights || (skills[0] ? [{skill_id:skills[0].id,weight:1}] : []))} required /></label>
      <StatusSelect value={edit?.status} /><button disabled={busy}>Save activity</button>{edit && <button className="secondary" type="button" onClick={() => setEdit(null)}>Cancel edit</button>}
    </form><ul>{activities.map(a => <li key={a.id}>{a.title} · {a.status} <button className="secondary" disabled={busy} onClick={() => setEdit(a)}>Edit {a.title}</button></li>)}</ul>
  </section>;
}

function StatusSelect({ value }) { return <label>Status<select name="status" defaultValue={value || "draft"}>{["draft","published","archived"].map(s => <option key={s}>{s}</option>)}</select></label>; }

export default function App() {
  const [user, setUser] = useState(null); const [checking, setChecking] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => {
    let active=true;
    request("/auth/me").then(row => {if(active) setUser(row);}).catch(err => {if(active && err.status !== 401) setError(err.message);}).finally(() => {if(active) setChecking(false);});
    const expired=() => { setUser(null); setNotice("Please sign in again to continue."); };
    window.addEventListener("readquest-session-expired", expired);
    return () => { active=false; window.removeEventListener("readquest-session-expired", expired); };
  }, []);
  async function logout() {
    try { await request("/auth/logout", { method: "POST" }); setUser(null); setNotice("You are signed out."); }
    catch(err) { setError(err.message); }
  }
  return <><a className="skip-link" href="#main">Skip to content</a><header><div><p className="eyebrow">A little practice. A new adventure.</p><h1>ReadQuest</h1></div>{user && <div><span>{user.role}</span><button className="secondary" onClick={logout}>Sign out</button></div>}</header>
    <main id="main"><Message error={error} notice={notice} />{checking ? <p role="status">Opening your reading space…</p> : !user ? <Login onLogin={row => { setUser(row); setError(""); setNotice(""); }} /> : <>
      <PasswordChange onChanged={() => {setUser(null);setNotice("Password changed. Sign in with your new password.");}} />
      {user.role === "child" ? <ChildReader /> : <Dashboard role={user.role} />}
      {user.role === "admin" && <><AccountAdmin /><CurriculumAdmin /></>}
    </>}</main><footer>ReadQuest · Reading grows with practice.</footer></>;
}

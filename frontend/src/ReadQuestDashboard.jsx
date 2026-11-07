import React, { useCallback, useEffect, useState } from "react";

export default function ReadQuestDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpiredSession, setIsExpiredSession] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setIsLoading(true);
    setError(null);
    setIsExpiredSession(false);
    try {
      const response = await fetch("/api/dashboard", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
        signal,
      });
      if (response.status === 401) {
        setIsExpiredSession(true);
        return;
      }
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      setData(await response.json());
    } catch (err) {
      if (err.name !== "AbortError") setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (isLoading) {
    return <section aria-live="polite" aria-busy="true"><p role="status">Loading your dashboard…</p></section>;
  }

  if (isExpiredSession) {
    return <section role="alert" aria-live="assertive"><h2>Session expired</h2><p>Please sign in again to continue.</p></section>;
  }

  if (error) {
    return <section role="alert" aria-live="assertive"><h2>We could not load your dashboard</h2><p>{error.message}</p><button type="button" onClick={() => load()}>Try again</button></section>;
  }

  const hasNoData = !data || (Array.isArray(data) && data.length === 0);
  if (hasNoData) {
    return <section aria-live="polite"><h2>Nothing to show yet</h2><p>There is no dashboard data yet. Check back soon.</p></section>;
  }

  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  if (candidates.length === 0) {
    return <section aria-live="polite"><h2>No next recommendation</h2><p>You have explored today&apos;s suggestions. Try again later.</p></section>;
  }

  return <section aria-labelledby="dashboard-title"><h2 id="dashboard-title">ReadQuest dashboard</h2>
    {Array.isArray(data.mastery) && data.mastery.length > 0 && <section aria-labelledby="mastery-title"><h3 id="mastery-title">Server mastery</h3><ul>{data.mastery.map((row) => <li key={row.skill_id}>{row.skill_name}: {Math.round((row.score || 0) * 100)}%</li>)}</ul></section>}
    <section aria-labelledby="recommendations-title"><h3 id="recommendations-title">Recommended practice</h3><ul>{candidates.map((row) => <li key={row.id}>{row.title}</li>)}</ul></section>
  </section>;
}

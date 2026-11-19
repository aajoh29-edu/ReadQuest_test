# ReadQuest Adaptive Engine Specification

> **Target Architecture**: Frontend Demo Service Layer (TypeScript) with 1:1 Parity for FastAPI Backend (Python).
> **Configuration Version**: `1.0.0`
> **Status**: Deterministic, Testable, Pedagogically Documented Engineering Defaults.

---

## 1. Overview & Pedagogical Disclaimer

The ReadQuest Adaptive Engine governs skill mastery assessment, spaced review scheduling, and next-activity recommendation. These formulas and criteria are **configurable engineering defaults**, not clinically validated diagnostic measures. They provide a predictable, encouraging, and pedagogically sound adaptive experience for early childhood readers.

---

## 2. Mastery Scoring Formula

For each learner and skill, mastery is calculated over a rolling window of the **most recent 10 scored attempts** (chronologically sorted).

### Mathematical Definition

$$\text{Mastery} = 100 \times \left( 0.60 \times \text{Accuracy} + 0.20 \times \text{Recency} + 0.20 \times \text{Consistency} \right)$$

Where each component ranges strictly within $[0.0, 1.0]$.

### Component Definitions

#### 1. Accuracy ($w_A = 0.60$)
Fraction of correct answers in the window:
$$\text{Accuracy} = \frac{N_{\text{correct}}}{N_{\text{window}}}$$
*If $N_{\text{window}} = 0$, accuracy is undefined (mastery is Unknown).*

#### 2. Recency ($w_R = 0.20$)
Exponential time-decayed performance weighting recent successes higher:
$$\text{Recency} = \frac{\sum_{i=1}^{N_{\text{window}}} \left( \text{correctness}_i \times 2^{-\Delta t_i / 14} \right)}{N_{\text{window}}}$$
- $\text{correctness}_i \in \{0, 1\}$ ($1$ for correct, $0$ for incorrect).
- $\Delta t_i$: Elapsed days between attempt timestamp and evaluation time ($t_{\text{now}} - t_i$ in fractional days, $\ge 0$).
- **Half-Life parameter**: $14$ days. An attempt made today has decay weight $1.0$; an attempt made 14 days ago has decay weight $0.5$; 28 days ago has decay weight $0.25$.

#### 3. Consistency ($w_C = 0.20$)
Measures run stability across adjacent attempts in the chronological sequence:
$$\text{Consistency} = \begin{cases}
\text{correctness}_1 & \text{if } N_{\text{window}} = 1 \text{ (provisional single-attempt value)} \\
\frac{\sum_{i=1}^{N-1} \mathbf{1}(\text{attempt}_i.\text{correct} \land \text{attempt}_{i+1}.\text{correct})}{N_{\text{window}} - 1} & \text{if } N_{\text{window}} \ge 2
\end{cases}$$
- For $\ge 2$ attempts, consistency evaluates adjacent pairs $(A_i, A_{i+1})$. Both must be correct for the pair to count.
- Example: $[1, 1, 0, 1, 1]$ has 4 adjacent pairs:
  - $(1,1) \to 1$
  - $(1,0) \to 0$
  - $(0,1) \to 0$
  - $(1,1) \to 1$
  - Consistency $= \frac{2}{4} = 0.50$.

---

## 3. Evidence Status and Confirmation Gate

Evidence status is strictly separated from the numerical score.

| Attempt Count | Session Count | Evidence Status | Numerical Score ($[0, 100]$) | Label Eligibility |
|---|---|---|---|---|
| $0$ | $0$ | `unknown` | `null` (not $0$) | "Not Started" / Unknown |
| $1 \le N < 5$ | Any | `provisional` | Calculated via formula | "Provisional" badge |
| $N \ge 5$ | $1$ | `insufficient_sessions` | Calculated via formula | "Provisional" (multi-session gate pending) |
| $N \ge 5$ | $\ge 2$ | `confirmed` | Calculated via formula | "Confirmed" (eligible for Mastered label) |

### Strict Rule for "Mastered" Confirmation
Even if the unrounded score is $\ge 90.0$, a skill **cannot** be labeled as confirmed Mastered unless:
1. Attempt count $\ge 5$.
2. Attempts span at least $2$ distinct sessions (`session_ids.size >= 2`).

If a learner achieves score $\ge 90$ in a single session with 5 attempts, evidence status is `insufficient_sessions` and the display label is **Provisional High Score** until reinforced in a subsequent session.

---

## 4. Mastery Bands and Spaced Review Intervals

Classifications use the **unrounded score**:

| Band ID | Score Range | Pedagogical Category | Review Interval | Description |
|---|---|---|---|---|
| `needs_focus` | $< 60.0$ | High-Priority Practice | 0 days (immediate) | Frequent scaffolding and beginner items needed. |
| `developing` | $60.0 \le \text{Score} < 75.0$ | Additional Practice | 0 days (immediate) | Emerging skill requiring continued practice. |
| `proficient` | $75.0 \le \text{Score} < 90.0$ | Normal Review | **3 days** | Stable skill; periodic retention check scheduled. |
| `mastered` | $90.0 \le \text{Score} \le 100.0$ | Mastered / Spaced Review | **7 days** | Confirmed mastery; weekly spaced maintenance. |

### Review Due Determination
$$\text{Days Since Last Attempt} = \frac{t_{\text{now}} - t_{\text{last}}}{86,400,000}$$
$$\text{Review Due} \iff \text{Days Since Last Attempt} \ge \text{Review Interval}$$

---

## 5. Stable Recommendation Priority Policy

Recommendations are computed deterministically using an ordered priority queue:

### Priority Tiers

1. **Tier 1 — Pending Assignments (Without Permanent Crowding Out)**:
   - If an active assignment exists and has not been practiced within the current active session, it receives top priority.
   - *Anti-crowding guard*: If the learner has already attempted the assignment in the current session, the engine yields to adaptive practice.
2. **Tier 2 — High-Priority Practice (< 60.0) & Overdue Reviews**:
   - Skills with mastery $< 60.0$.
   - Proficient / Mastered skills where $\text{Days Since Last Practice} \ge \text{Review Interval}$.
3. **Tier 3 — Unstarted Skills (Cold Start / Introduction)**:
   - Skills with `unknown` evidence are introduced with foundational Difficulty 1 activities.
4. **Tier 4 — Additional Practice (60.0 to 74.9) & Ongoing Mastery**:
   - Developing skills advancing toward proficiency.

### Difficulty Matching Matrix
- **Score $< 60$ or Unstarted**: Difficulty 1 (Scaffolded / Beginner).
- **$60 \le \text{Score} < 75$**: Difficulty 2 (Intermediate).
- **$\text{Score} \ge 75$**: Difficulty 2 or 3 (Advanced / Challenge).

### Anti-Repetition Guard
- Checks the learner's last $3$ activity attempt IDs.
- If alternative activities exist for the selected skill/lesson that have not been attempted in the last 3 turns, the engine strictly selects the least-recently-attempted alternative.

### Deterministic Tie-Breaking
When multiple candidate activities or skills tie in priority tier:
1. **Days overdue / days since practice** (Descending — most overdue first).
2. **Skill ID** (Alphabetical ascending — e.g., `skill-comp-main-idea` before `skill-ls-consonants`).
3. **Activity ID** (Alphabetical ascending — e.g., `act-ls1-q1` before `act-ls1-q2`).

---

## 6. Milestone Rewards System

Rewards celebrate engagement and completion, strictly decoupled from speed or mastery scores:
- **Milestones**:
  - `milestone-first-quest`: Complete 1st reading quest.
  - `milestone-3-quests`: Complete 3 unique reading quests.
  - `milestone-5-quests`: Complete 5 unique reading quests.
  - `milestone-all-12`: Complete all 12 curriculum quests.
  - `milestone-perfect-accuracy`: Achieve 100% accuracy on any 5-question quest.
  - `milestone-25-activities`: Complete 25 total activities across any sessions.
  - `milestone-50-activities`: Complete 50 total activities across any sessions.
- **Duplicate Prevention**: Every reward has a stable unique ID stored in `learner.badges` and `learner.earnedRewards`. Re-evaluations never grant duplicate stars or duplicate badges.
- **Speed Neutrality**: No reward bonuses are awarded based on completion speed.

---

## 7. Python / FastAPI Porting Guide

When implementing in Python (`readquest_api/services/adaptive_engine.py`):
```python
from datetime import datetime, timezone
import math

CONFIG_VERSION = "1.0.0"

def calculate_mastery(attempts: list[dict], now: datetime = None) -> dict:
    if now is None:
        now = datetime.now(timezone.utc)
        
    if not attempts:
        return {
            "score": None,
            "evidence_status": "unknown",
            "band": "unknown",
            "is_confirmed_mastered": False,
            "config_version": CONFIG_VERSION
        }
        
    window = attempts[-10:] # Most recent 10
    n = len(window)
    
    # 1. Accuracy
    accuracy = sum(1 for a in window if a["is_correct"]) / n
    
    # 2. Recency
    recency_sum = 0.0
    for a in window:
        dt_days = max(0.0, (now - a["timestamp"]).total_seconds() / 86400.0)
        decay = math.pow(2.0, -dt_days / 14.0)
        if a["is_correct"]:
            recency_sum += decay
    recency = recency_sum / n
    
    # 3. Consistency
    if n == 1:
        consistency = 1.0 if window[0]["is_correct"] else 0.0
    else:
        pairs_correct = sum(
            1 for i in range(n - 1) 
            if window[i]["is_correct"] and window[i + 1]["is_correct"]
        )
        consistency = pairs_correct / (n - 1)
        
    score = 100.0 * (0.60 * accuracy + 0.20 * recency + 0.20 * consistency)
    
    # Evidence & Sessions
    unique_sessions = {a["session_id"] for a in attempts}
    if len(attempts) < 5:
        evidence = "provisional"
    elif len(unique_sessions) < 2:
        evidence = "insufficient_sessions"
    else:
        evidence = "confirmed"
        
    # Banding
    if score < 60.0:
        band = "needs_focus"
    elif score < 75.0:
        band = "developing"
    elif score < 90.0:
        band = "proficient"
    else:
        band = "mastered"
        
    is_confirmed = (evidence == "confirmed" and band == "mastered")
    return {
        "score": score,
        "evidence_status": evidence,
        "band": band,
        "is_confirmed_mastered": is_confirmed,
        "components": {
            "accuracy": accuracy,
            "recency": recency,
            "consistency": consistency
        }
    }
```

/**
 * ActivePracticeTimer
 * Accurately measures child's active learning time:
 * 1. Pauses immediately when document is hidden (switching tabs/minimizing)
 * 2. Pauses during extended idle periods (> 60 seconds of no keyboard/mouse/touch events)
 * 3. Caps duration per activity (e.g., maximum 300 seconds) to prevent inflated metrics.
 */
export class ActivePracticeTimer {
  private activeSeconds: number = 0;
  private isRunning: boolean = false;
  private lastTickTimestamp: number | null = null;
  private lastInteractionTimestamp: number = Date.now();
  private maxDurationSeconds: number = 300; // 5 minute safety cap
  private idleThresholdMs: number = 60 * 1000; // 60s idle threshold
  private intervalId: number | null = null;

  private onVisibilityChangeBound: () => void;
  private onUserInteractionBound: () => void;

  constructor(maxDurationSeconds: number = 300, idleThresholdSeconds: number = 60) {
    this.maxDurationSeconds = maxDurationSeconds;
    this.idleThresholdMs = idleThresholdSeconds * 1000;

    this.onVisibilityChangeBound = this.handleVisibilityChange.bind(this);
    this.onUserInteractionBound = this.handleUserInteraction.bind(this);

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChangeBound);
      window.addEventListener('keydown', this.onUserInteractionBound, { passive: true });
      window.addEventListener('pointerdown', this.onUserInteractionBound, { passive: true });
      window.addEventListener('touchstart', this.onUserInteractionBound, { passive: true });
    }
  }

  private handleUserInteraction() {
    this.lastInteractionTimestamp = Date.now();
  }

  private handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  public start() {
    this.reset();
    this.isRunning = true;
    this.lastTickTimestamp = Date.now();
    this.lastInteractionTimestamp = Date.now();

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    if (!this.isRunning) return;

    // Check if tab is hidden
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    const now = Date.now();

    // Check idle state
    if (now - this.lastInteractionTimestamp > this.idleThresholdMs) {
      // User has been idle for more than threshold
      return;
    }

    if (this.lastTickTimestamp !== null) {
      const elapsedSeconds = Math.round((now - this.lastTickTimestamp) / 1000);
      if (elapsedSeconds >= 1) {
        this.activeSeconds = Math.min(this.maxDurationSeconds, this.activeSeconds + elapsedSeconds);
        this.lastTickTimestamp = now;
      }
    } else {
      this.lastTickTimestamp = now;
    }
  }

  public pause() {
    this.isRunning = false;
    this.lastTickTimestamp = null;
  }

  public resume() {
    if (typeof document !== 'undefined' && document.hidden) return;
    this.isRunning = true;
    this.lastTickTimestamp = Date.now();
    this.lastInteractionTimestamp = Date.now();
  }

  public getActiveSeconds(): number {
    return Math.min(this.maxDurationSeconds, Math.max(1, Math.round(this.activeSeconds)));
  }

  public stop(): number {
    this.pause();
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    return this.getActiveSeconds();
  }

  public reset() {
    this.activeSeconds = 0;
    this.lastTickTimestamp = Date.now();
    this.lastInteractionTimestamp = Date.now();
  }

  public destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
      window.removeEventListener('keydown', this.onUserInteractionBound);
      window.removeEventListener('pointerdown', this.onUserInteractionBound);
      window.removeEventListener('touchstart', this.onUserInteractionBound);
    }
  }
}

// AccountSync.js
// Talks to the same Cloudflare Worker as CloudLeaderboardService, but for
// the player-account side: registering the username as an account, pulling
// down server-side progress (so admin grants/resets reach the player), and
// pushing local progress up at checkpoints.
//
// Every method here is best-effort: if apiBaseUrl isn't configured, or the
// network request fails (offline, Worker down), calls resolve to a "no-op"
// result rather than throwing — nothing about local gameplay should ever
// depend on these succeeding.

export class AccountSync {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = (apiBaseUrl || '').replace(/\/$/, '');
  }

  get isConfigured() {
    return Boolean(this.apiBaseUrl);
  }

  /**
   * Registers (or re-confirms) this username as an account, seeding it with
   * `initialState` only if the server has never seen this username before.
   * Returns the server's authoritative snapshot on success, or null.
   */
  async register(username, initialState) {
    if (!this.isConfigured) return null;
    const res = await fetch(`${this.apiBaseUrl}/api/players/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, initialState })
    });
    if (!res.ok) throw new Error(`Registration failed (${res.status})`);
    const data = await res.json();
    return data.player || null;
  }

  /** Pushes the current local progress up to the server. Fire-and-forget friendly. */
  async pushProgress(username, snapshot) {
    if (!this.isConfigured) return null;
    const res = await fetch(`${this.apiBaseUrl}/api/players/${encodeURIComponent(username)}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot)
    });
    if (!res.ok) throw new Error(`Progress sync failed (${res.status})`);
    return res.json();
  }

  async redeemCode(username, code) {
    if (!this.isConfigured) {
      return { ok: false, error: 'Codes are not available right now.' };
    }
    const res = await fetch(`${this.apiBaseUrl}/api/codes/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, code })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Could not redeem that code.' };
    }
    return { ok: true, coinsAwarded: data.coinsAwarded || 0, itemUnlocked: data.itemUnlocked || null, player: data.player || null };
  }
}

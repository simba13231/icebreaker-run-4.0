// AdProvider.js
// Wraps Google's Ad Placement API (adBreak()) behind the same interface the
// rest of the game already talks to: showRewardedAd() -> Promise<boolean>.
//
// Requires index.html to load the AdSense script + the adBreak/adConfig
// shim (see the <head> of index.html). While testing, that script tag has
// data-adbreak-test="on", which shows mock ads instead of real ones — no
// AdSense/H5 Games Ads approval needed to test the full flow. Remove that
// attribute once approved and ready to go live.
//
// Reference: https://developers.google.com/ad-placement/docs/example

export class AdProvider {
  /**
   * Shows a rewarded ad via adBreak(). Resolves true only if the player
   * actually watched the ad through (adViewed) — never on dismiss/skip/no-fill.
   */
  async showRewardedAd() {
    if (typeof window === 'undefined' || typeof window.adBreak !== 'function') {
      // adBreak isn't available (script blocked, offline, not yet loaded).
      // Fail closed: no ad shown, no reward granted.
      console.warn('AdProvider: adBreak() is not available — no ad shown.');
      return false;
    }

    return new Promise((resolve) => {
      let settled = false;
      const settle = (granted) => {
        if (settled) return;
        settled = true;
        resolve(granted);
      };

      window.adBreak({
        type: 'reward',
        name: 'revive-boat',
        beforeReward: (showAdFn) => {
          // An ad is ready — show it immediately since the player already
          // tapped "Watch Ad to Revive" (adBreak must be called as part of
          // a user action, which this already was).
          showAdFn();
        },
        adViewed: () => {
          settle(true);
        },
        adDismissed: () => {
          settle(false);
        },
        // Safety net: if no ad was available at all, beforeReward never
        // fires and adBreakDone is the only callback guaranteed to run.
        adBreakDone: () => {
          settle(false);
        }
      });
    });
  }
}

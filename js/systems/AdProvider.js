// AdProvider.js
// Abstraction over "watch a rewarded ad". The game only ever talks to this
// interface — never to a specific ad SDK directly — so a real provider
// (Google AdSense H5 Games Ads' adBreak(), AdMob via Capacitor, etc.) can be
// swapped in later by replacing the body of `showRewardedAd()` alone.
//
// Contract:
//   showRewardedAd(): Promise<boolean>
//     Resolves true if the reward should be granted (ad watched fully),
//     false if the player dismissed/skipped or no ad was available.

export class AdProvider {
  /**
   * Placeholder implementation: simulates a short "ad" delay and always
   * grants the reward. Replace this method's body with a real SDK call,
   * e.g.:
   *
   *   return new Promise((resolve) => {
   *     window.adsbygoogle = window.adsbygoogle || [];
   *     adsbygoogle.push({
   *       type: 'reward',
   *       name: 'revive-boat',
   *       beforeReward: (showAdFn) => showAdFn(),
   *       adViewed: () => resolve(true),
   *       adDismissed: () => resolve(false),
   *     });
   *   });
   */
  async showRewardedAd() {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return true;
  }
}

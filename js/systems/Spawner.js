// Spawner.js
// Responsible for obstacle timing and pattern generation.
//
// FAIRNESS ALGORITHM (documented per project requirements):
// -----------------------------------------------------------------------
// The spawner never places a pattern that blocks every lane, and it also
// tracks "reachability" across consecutive rows so the player is never
// required to move more than one lane per row-to-row transition (i.e. no
// teleporting from lane 0 to lane 2 between two closely-timed rows).
//
// Steps for each new row:
//   1. Decide how many lanes to block this row based on the current
//      difficulty tier (early game = mostly single icebergs).
//   2. Generate a candidate set of blocked lanes.
//   3. Compute the set of lanes reachable from the player's *previous*
//      safe lane (previous safe lane, previous safe lane - 1, previous
//      safe lane + 1) — this models one lane-change per row at most.
//   4. Verify that at least one reachable lane is NOT blocked.
//   5. If not, regenerate (or fall back to a guaranteed-safe pattern).
//   6. Remember a safe lane from this row as the reference for the next
//      row's reachability check.
// -----------------------------------------------------------------------

import { CONFIG } from '../config.js';
import { Iceberg } from '../entities/Iceberg.js';

function randInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Spawner {
  constructor(laneCount) {
    this.laneCount = laneCount;
    this.reset();
  }

  reset() {
    this.timeSinceLastSpawnMs = 0;
    this.lastSafeLane = randInt(this.laneCount);
    this.pendingRows = []; // queue of {lanes: Set, rowOffset} for multi-row patterns
  }

  /** Lanes reachable from lastSafeLane assuming at most one lane change. */
  _reachableLanes() {
    const reachable = new Set([this.lastSafeLane]);
    if (this.lastSafeLane - 1 >= 0) reachable.add(this.lastSafeLane - 1);
    if (this.lastSafeLane + 1 < this.laneCount) reachable.add(this.lastSafeLane + 1);
    return reachable;
  }

  /** Generates a single-row obstacle pattern guaranteed to leave a reachable safe lane. */
  _generateRow(tierProgress) {
    const reachable = this._reachableLanes();

    // Decide how many lanes to attempt to block, scaled by difficulty tier.
    let maxBlock = 1;
    if (tierProgress > 0.25) maxBlock = 2; // two-lane obstacles unlock
    if (tierProgress > 0.65) maxBlock = this.laneCount - 1; // near-max complexity
    maxBlock = Math.min(maxBlock, this.laneCount - 1); // never block all lanes

    const blockCount = 1 + randInt(maxBlock);
    const laneOrder = shuffle([...Array(this.laneCount).keys()]);

    const blocked = new Set();
    for (const lane of laneOrder) {
      if (blocked.size >= blockCount) break;
      // Tentatively block this lane, then verify a reachable safe lane remains.
      blocked.add(lane);
      const stillSafe = [...reachable].some((l) => !blocked.has(l));
      if (!stillSafe) {
        blocked.delete(lane); // reject — would create an impossible pattern
      }
    }

    // Safety net: if somehow nothing got blocked or all reachable lanes are
    // blocked (shouldn't happen given the check above), fall back to a
    // trivially safe single-lane block.
    const reachableOpen = [...reachable].filter((l) => !blocked.has(l));
    if (reachableOpen.length === 0) {
      blocked.clear();
      blocked.add((this.lastSafeLane + 1) % this.laneCount);
    }

    // Choose the new reference safe lane from the reachable, unblocked set.
    const openLanes = [...reachable].filter((l) => !blocked.has(l));
    this.lastSafeLane = openLanes[randInt(openLanes.length)];

    return blocked;
  }

  update(deltaMs, difficulty, spawnCallback) {
    this.timeSinceLastSpawnMs += deltaMs;
    if (this.timeSinceLastSpawnMs < difficulty.spawnInterval) return;
    this.timeSinceLastSpawnMs = 0;

    const tierProgress = difficulty.tierProgress;
    const blockedLanes = this._generateRow(tierProgress);
    spawnCallback(blockedLanes);
  }
}

/** Creates Iceberg instances for a set of blocked lanes at spawn time. */
export function createIcebergsForRow(blockedLanes, lanePositions, spawnY) {
  const icebergs = [];
  for (const laneIndex of blockedLanes) {
    icebergs.push(new Iceberg(laneIndex, lanePositions[laneIndex], spawnY));
  }
  return icebergs;
}

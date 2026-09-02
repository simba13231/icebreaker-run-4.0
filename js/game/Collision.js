// Collision.js
// Pure collision detection logic, kept separate from rendering and gameplay flow.
// Uses shrunk bounding boxes (see CONFIG hitbox shrink factors) so that
// transparent visual edges of the boat/iceberg art never cause unfair hits.

/**
 * Returns the fair (shrunk) hitbox for an entity centered at (x, y)
 * with the given full visual width/height.
 */
export function getHitbox(x, y, width, height, shrink) {
  const w = width * shrink;
  const h = height * shrink;
  return {
    left: x - w / 2,
    right: x + w / 2,
    top: y - h / 2,
    bottom: y + h / 2
  };
}

export function boxesIntersect(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Checks the boat against all active icebergs and returns the first
 * colliding iceberg, or null if there is no collision.
 */
export function checkCollisions(boat, icebergs) {
  const boatBox = boat.getHitbox();
  for (const iceberg of icebergs) {
    if (iceberg.markedForRemoval) continue;
    const bergBox = iceberg.getHitbox();
    if (boxesIntersect(boatBox, bergBox)) {
      return iceberg;
    }
  }
  return null;
}

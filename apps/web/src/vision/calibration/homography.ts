import type { Point2D } from '../../types/shared';

/**
 * Compute homography matrix from 4 point correspondences using DLT (Direct Linear Transform)
 * Maps from source points (video pixels) to destination points (normalized 0-1 table coords)
 */
export function computeHomography(
  srcPoints: [Point2D, Point2D, Point2D, Point2D],
  dstPoints: [Point2D, Point2D, Point2D, Point2D] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]
): number[][] {
  // Build matrix A for DLT algorithm
  const A: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const src = srcPoints[i];
    const dst = dstPoints[i];

    A.push([
      -src.x, -src.y, -1, 0, 0, 0, dst.x * src.x, dst.x * src.y, dst.x
    ]);
    A.push([
      0, 0, 0, -src.x, -src.y, -1, dst.y * src.x, dst.y * src.y, dst.y
    ]);
  }

  // Solve using SVD approximation (simplified)
  // For production, use a proper linear algebra library
  // This is a simplified solution assuming well-conditioned points
  const h = solveDLT(A);

  // Reshape into 3x3 matrix
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]]
  ];
}

/**
 * Apply homography transformation to a point
 */
export function applyHomography(H: number[][], point: Point2D): Point2D {
  const x = point.x;
  const y = point.y;

  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  const xPrime = (H[0][0] * x + H[0][1] * y + H[0][2]) / w;
  const yPrime = (H[1][0] * x + H[1][1] * y + H[1][2]) / w;

  return { x: xPrime, y: yPrime };
}

/**
 * Check if a point is within the normalized table bounds [0,1] x [0,1]
 */
export function isInTableBounds(point: Point2D, margin: number = 0): boolean {
  return (
    point.x >= -margin &&
    point.x <= 1 + margin &&
    point.y >= -margin &&
    point.y <= 1 + margin
  );
}

/**
 * Map table UV coordinates to lane index
 */
export function uvToLane(uv: Point2D, numLanes: number): number {
  const lane = Math.floor(uv.x * numLanes);
  return Math.max(0, Math.min(numLanes - 1, lane));
}

/**
 * Simplified DLT solver using least squares approximation
 * For a more robust solution, use numeric libraries like ml-matrix
 */
function solveDLT(A: number[][]): number[] {
  // This is a simplified solution - in production use SVD
  // For now, use a basic least squares approach with normalization

  // Build A^T * A
  const ATA: number[][] = Array(9).fill(0).map(() => Array(9).fill(0));
  const ATb: number[] = Array(9).fill(0);

  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < 9; j++) {
      for (let k = 0; k < 9; k++) {
        ATA[j][k] += A[i][j] * A[i][k];
      }
    }
  }

  // Solve using Gaussian elimination (simplified)
  // In production, use proper linear algebra library
  const h = gaussianElimination(ATA, ATb);

  // Normalize so h[8] = 1
  const scale = h[8] || 1;
  return h.map(v => v / scale);
}

/**
 * Simple Gaussian elimination solver
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / (aug[i][i] || 1e-10);
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n] || 0;
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i] || 1;
  }

  return x;
}

/**
 * Validate that corners form a reasonable quadrilateral
 */
export function validateCorners(corners: Point2D[]): { valid: boolean; error?: string } {
  if (corners.length !== 4) {
    return { valid: false, error: 'Must have exactly 4 corners' };
  }

  // Check that points are not too close together
  const minDistance = 50; // pixels
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dist = Math.sqrt(
        Math.pow(corners[i].x - corners[j].x, 2) +
        Math.pow(corners[i].y - corners[j].y, 2)
      );
      if (dist < minDistance) {
        return { valid: false, error: 'Corners are too close together' };
      }
    }
  }

  // Check that corners form a convex quadrilateral (simplified check)
  // This prevents self-intersecting quads
  const cross = (a: Point2D, b: Point2D, c: Point2D) => {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  };

  const signs = [
    Math.sign(cross(corners[0], corners[1], corners[2])),
    Math.sign(cross(corners[1], corners[2], corners[3])),
    Math.sign(cross(corners[2], corners[3], corners[0])),
    Math.sign(cross(corners[3], corners[0], corners[1]))
  ];

  const allSameSign = signs.every(s => s === signs[0]);
  if (!allSameSign) {
    return { valid: false, error: 'Corners must form a convex quadrilateral' };
  }

  return { valid: true };
}

import { describe, expect, it } from 'vitest'
import { computeGaze, isLooking } from './useEyeContactTracker'

interface Landmark {
  x: number
  y: number
  z: number
}

const EYE_A_OUTER = 33
const EYE_A_INNER = 133
const EYE_A_IRIS = 468
const EYE_B_OUTER = 263
const EYE_B_INNER = 362
const EYE_B_IRIS = 473
const NOSE_TIP = 1

function makeLandmarks(overrides: Record<number, Partial<Landmark>>): Landmark[] {
  const landmarks: Landmark[] = Array.from({ length: 474 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }))
  for (const [index, point] of Object.entries(overrides)) {
    landmarks[Number(index)] = { x: 0.5, y: 0.5, z: 0, ...point }
  }
  return landmarks
}

/** Face centered in frame, both irises dead center -> gaze ≈ (0, 0). */
function centeredFace(): Landmark[] {
  return makeLandmarks({
    [EYE_A_OUTER]: { x: 0.4, y: 0.45 },
    [EYE_A_INNER]: { x: 0.6, y: 0.45 },
    [EYE_A_IRIS]: { x: 0.5, y: 0.45 },
    [EYE_B_OUTER]: { x: 0.6, y: 0.45 },
    [EYE_B_INNER]: { x: 0.4, y: 0.45 },
    [EYE_B_IRIS]: { x: 0.5, y: 0.45 },
    [NOSE_TIP]: { x: 0.5, y: 0.55 },
  })
}

describe('computeGaze', () => {
  it('returns null for empty or too-short landmark sets', () => {
    expect(computeGaze([])).toBeNull()
    expect(computeGaze(undefined as unknown as Landmark[])).toBeNull()
    expect(computeGaze(makeLandmarks({}))).not.toBeNull()
  })

  it('returns a near-zero gaze for a centered face', () => {
    const gaze = computeGaze(centeredFace())
    expect(gaze).not.toBeNull()
    expect(gaze!.x).toBeCloseTo(0, 2)
    expect(gaze!.y).toBeCloseTo(0, 2)
  })

  it('pulls gaze toward the inner corner when the iris drifts inward', () => {
    const landmarks = centeredFace()
    landmarks[EYE_A_IRIS] = { x: 0.56, y: 0.45, z: 0 }
    const gaze = computeGaze(landmarks)
    expect(gaze).not.toBeNull()
    expect(gaze!.x).toBeGreaterThan(0)
  })

  it('reflects head turn via the nose-tip offset', () => {
    const landmarks = centeredFace()
    landmarks[NOSE_TIP] = { x: 0.62, y: 0.55, z: 0 }
    const gaze = computeGaze(landmarks)
    expect(gaze).not.toBeNull()
    expect(gaze!.x).toBeGreaterThan(0)
  })
})

describe('isLooking', () => {
  it('classifies a centered gaze as looking', () => {
    expect(isLooking(computeGaze(centeredFace())!, 0.14)).toBe(true)
  })

  it('classifies a strongly averted gaze as not looking', () => {
    const landmarks = centeredFace()
    landmarks[EYE_A_IRIS] = { x: 0.3, y: 0.45, z: 0 }
    landmarks[EYE_B_IRIS] = { x: 0.3, y: 0.45, z: 0 }
    const gaze = computeGaze(landmarks)
    expect(gaze).not.toBeNull()
    expect(gaze!.x).toBeLessThan(-0.1)
    expect(isLooking(gaze!, 0.14)).toBe(false)
  })

  it('obeys a tighter tolerance', () => {
    expect(isLooking({ x: 0.1, y: 0 }, 0.14)).toBe(true)
    expect(isLooking({ x: 0.1, y: 0 }, 0.05)).toBe(false)
  })
})

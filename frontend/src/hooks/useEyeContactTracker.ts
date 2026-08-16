import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

export interface GazeHistoryEntry {
  timestamp: number
  looking: boolean
}

export interface EyeContactTrackerResult {
  eyeContactPercentage: number
  isCurrentlyLooking: boolean
  gazeHistory: GazeHistoryEntry[]
}

export interface UseEyeContactTrackerOptions {
  sampleRateHz?: number
  tolerance?: number
  maxHistoryLength?: number
}

// MediaPipe FaceMesh is deprecated on npm, so we load the solution + wasm from
// a pinned jsdelivr CDN instead of bundling it. camera_utils is loaded for
// parity with the requested package pair, but its `Camera` class is NOT used:
// it calls getUserMedia and replaces the video's srcObject with a video-only
// stream, which would drop the recorder's audio track.
const FACE_MESH_VERSION = '0.4.1633559619'
const CAMERA_UTILS_VERSION = '0.3.1675466862'
const FACE_MESH_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${FACE_MESH_VERSION}/`

const DEFAULT_SAMPLE_RATE_HZ = 7
const DEFAULT_TOLERANCE = 0.14
const DEFAULT_MAX_HISTORY = 512

// Landmark indices (MediaPipe FaceMesh canonical numbering):
// - Eye A (person's right): outer corner 33, inner corner 133, iris 468
// - Eye B (person's left): outer corner 263, inner corner 362, iris 473
// - Nose tip: 1
const EYE_A_OUTER = 33
const EYE_A_INNER = 133
const EYE_A_IRIS = 468
const EYE_B_OUTER = 263
const EYE_B_INNER = 362
const EYE_B_IRIS = 473
const NOSE_TIP = 1
const LANDMARK_COUNT = 474

interface Landmark {
  x: number
  y: number
  z: number
}

type Gaze = { x: number; y: number }

/**
 * Horizontal/vertical offset of an iris within its eye, normalized so that a
 * perfectly centered iris yields (0, 0). Positive x means the iris sits toward
 * the inner corner; the sign is irrelevant for the tolerance check.
 */
export function eyeGaze(outer: Landmark, inner: Landmark, iris: Landmark): Gaze {
  const dx = inner.x - outer.x
  const dy = inner.y - outer.y
  const widthSq = Math.max(dx * dx + dy * dy, 1e-6)
  const t = ((iris.x - outer.x) * dx + (iris.y - outer.y) * dy) / widthSq
  return {
    x: t - 0.5,
    y: (iris.y - (outer.y + inner.y) / 2) / Math.sqrt(widthSq),
  }
}

/** Head yaw/pitch proxy: nose-tip offset from the eye-corner midpoint. */
export function headPose(
  nose: Landmark,
  leftOuter: Landmark,
  rightOuter: Landmark,
): Gaze {
  const width = Math.max(
    Math.hypot(rightOuter.x - leftOuter.x, rightOuter.y - leftOuter.y),
    1e-6,
  )
  return {
    x: (nose.x - (leftOuter.x + rightOuter.x) / 2) / width,
    y: (nose.y - (leftOuter.y + rightOuter.y) / 2) / width,
  }
}

/**
 * Combine both eyes' gaze offsets with the head yaw into a single centeredness
 * vector. Horizontal must be mirror-corrected: when the user looks one way,
 * their eyes drift the same image direction but in OPPOSITE within-eye
 * directions (eye A's iris goes toward its inner corner while eye B's goes
 * toward its outer corner), so a plain average would cancel out — hence
 * `(a.x - b.x) / 2`. Vertical is symmetric and averages normally.
 *
 * Head pitch is intentionally NOT folded in from the nose tip: the nose sits a
 * distance-dependent amount below the eye line even when level, which would
 * bias every frame. Up/down is captured by the iris offset within each eye.
 *
 * Returns null when the iris landmarks (available only with refineLandmarks)
 * or eye corners are missing.
 */
export function computeGaze(landmarks: readonly Landmark[]): Gaze | null {
  if (!landmarks || landmarks.length < LANDMARK_COUNT) {
    return null
  }
  if (!landmarks[EYE_A_IRIS] || !landmarks[EYE_B_IRIS]) {
    return null
  }
  const a = eyeGaze(
    landmarks[EYE_A_OUTER],
    landmarks[EYE_A_INNER],
    landmarks[EYE_A_IRIS],
  )
  const b = eyeGaze(
    landmarks[EYE_B_OUTER],
    landmarks[EYE_B_INNER],
    landmarks[EYE_B_IRIS],
  )
  const pose = headPose(
    landmarks[NOSE_TIP],
    landmarks[EYE_A_OUTER],
    landmarks[EYE_B_OUTER],
  )
  return {
    x: (a.x - b.x) / 2 + pose.x,
    y: (a.y + b.y) / 2,
  }
}

export function isLooking(gaze: Gaze, tolerance: number): boolean {
  return Math.abs(gaze.x) <= tolerance && Math.abs(gaze.y) <= tolerance
}

interface FaceMeshResults {
  multiFaceLandmarks: Landmark[][] | undefined
}

interface FaceMeshInstance {
  setOptions(options: {
    maxNumFaces: number
    refineLandmarks: boolean
    minDetectionConfidence: number
    minTrackingConfidence: number
  }): void
  onResults(callback: (results: FaceMeshResults) => void): void
  send(input: { image: HTMLVideoElement }): Promise<unknown>
  close(): void
}

interface FaceMeshConstructor {
  new (options: { locateFile: (file: string) => string }): FaceMeshInstance
}

declare global {
  interface Window {
    FaceMesh?: FaceMeshConstructor
    Camera?: unknown
  }
}

let mediaPipeLoader: Promise<FaceMeshConstructor> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function loadMediaPipe(): Promise<FaceMeshConstructor> {
  if (!mediaPipeLoader) {
    mediaPipeLoader = (async () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('MediaPipe requires a browser environment')
      }
      if (window.FaceMesh) {
        return window.FaceMesh
      }
      await loadScript(
        `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@${CAMERA_UTILS_VERSION}/camera_utils.js`,
      )
      await loadScript(`${FACE_MESH_BASE}face_mesh.js`)
      if (!window.FaceMesh) {
        throw new Error('MediaPipe FaceMesh failed to load')
      }
      return window.FaceMesh
    })().catch((error: unknown) => {
      mediaPipeLoader = null
      throw error
    })
  }
  return mediaPipeLoader
}

export function useEyeContactTracker(
  videoRef: RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  options: UseEyeContactTrackerOptions = {},
): EyeContactTrackerResult {
  const sampleRateHz = options.sampleRateHz ?? DEFAULT_SAMPLE_RATE_HZ
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE
  const maxHistoryLength = options.maxHistoryLength ?? DEFAULT_MAX_HISTORY

  const [eyeContactPercentage, setEyeContactPercentage] = useState(0)
  const [isCurrentlyLooking, setCurrentlyLooking] = useState(false)
  const [gazeHistory, setGazeHistory] = useState<GazeHistoryEntry[]>([])

  // Ref mirrors so the sampling loop never closes over stale state.
  const lookingFramesRef = useRef(0)
  const totalFramesRef = useRef(0)
  const historyRef = useRef<GazeHistoryEntry[]>([])
  const toleranceRef = useRef(tolerance)
  toleranceRef.current = tolerance

  useEffect(() => {
    if (!isActive) {
      return undefined
    }
    if (typeof requestAnimationFrame === 'undefined') {
      return undefined
    }

    let disposed = false
    let rafId: number | null = null
    let inferenceInFlight = false
    let mesh: FaceMeshInstance | null = null
    let lastSampleAt = 0
    const sampleIntervalMs = 1000 / sampleRateHz

    function handleResults(results: FaceMeshResults) {
      if (disposed) {
        return
      }
      inferenceInFlight = false
      const landmarks = results.multiFaceLandmarks?.[0]
      if (!landmarks) {
        return
      }
      const gaze = computeGaze(landmarks)
      if (!gaze) {
        return
      }

      totalFramesRef.current += 1
      const looking = isLooking(gaze, toleranceRef.current)
      if (looking) {
        lookingFramesRef.current += 1
      }

      const percentage =
        (lookingFramesRef.current / totalFramesRef.current) * 100
      const entry = { timestamp: performance.now(), looking }
      const nextHistory = [
        ...historyRef.current.slice(-(maxHistoryLength - 1)),
        entry,
      ]
      historyRef.current = nextHistory

      setGazeHistory(nextHistory)
      setCurrentlyLooking(looking)
      setEyeContactPercentage(Math.round(percentage * 10) / 10)
    }

    function sample(now: number) {
      if (disposed) {
        return
      }
      const video = videoRef.current
      if (
        video &&
        now - lastSampleAt >= sampleIntervalMs &&
        !inferenceInFlight &&
        video.readyState >= 2 &&
        video.videoWidth > 0
      ) {
        lastSampleAt = now
        inferenceInFlight = true
        void mesh?.send({ image: video })
      }
      rafId = requestAnimationFrame(sample)
    }

    function dispose() {
      disposed = true
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      if (mesh) {
        try {
          mesh.close()
        } catch {
          // FaceMesh may already be torn down by the browser.
        }
        mesh = null
      }
    }

    void loadMediaPipe()
      .then((FaceMesh) => {
        if (disposed) {
          return
        }
        mesh = new FaceMesh({ locateFile: (file) => `${FACE_MESH_BASE}${file}` })
        mesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        mesh.onResults(handleResults)
        if (disposed) {
          dispose()
          return
        }
        rafId = requestAnimationFrame(sample)
      })
      .catch((error: unknown) => {
        // Face/iris detection is best-effort; leave percentages at 0.
        console.warn('Eye contact tracker unavailable:', error)
      })

    return dispose
  }, [isActive, maxHistoryLength, sampleRateHz, videoRef])

  return { eyeContactPercentage, isCurrentlyLooking, gazeHistory }
}
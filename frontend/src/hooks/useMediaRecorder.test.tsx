/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaRecorder } from './useMediaRecorder'

interface MockTrack {
  enabled: boolean
  readyState: 'live' | 'ended'
  kind?: string
  stop: ReturnType<typeof vi.fn>
}

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = []
  static isTypeSupported = vi.fn((mimeType: string) =>
    mimeType === 'audio/webm;codecs=opus' || mimeType === 'video/webm',
  )
  stream: unknown
  mimeType: string
  audioBitsPerSecond: number | undefined
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onerror: (() => void) | null = null
  onstop: (() => void) | null = null
  state: 'inactive' | 'recording' = 'inactive'
  stop = vi.fn(() => {
    this.state = 'inactive'
    const chunkType = this.mimeType.startsWith('audio/') ? this.mimeType : 'video/webm'
    this.ondataavailable?.({ data: new Blob(['mock'], { type: chunkType }) })
    this.onstop?.()
  })

  constructor(stream?: unknown, options?: { mimeType?: string; audioBitsPerSecond?: number }) {
    this.stream = stream
    this.mimeType = options?.mimeType ?? 'video/webm'
    this.audioBitsPerSecond = options?.audioBitsPerSecond
    MockMediaRecorder.instances.push(this)
  }

  start() {
    this.state = 'recording'
  }
}

class MockMediaStream {
  tracks: MockTrack[]
  constructor(tracks: MockTrack[]) {
    this.tracks = tracks
  }
}

function installMediaMocks(options: { unsupported?: boolean; denied?: boolean } = {}) {
  const audioTrack: MockTrack = {
    enabled: true,
    readyState: 'live',
    kind: 'audio',
    stop: vi.fn(() => {
      audioTrack.readyState = 'ended'
    }),
  }
  const videoTrack: MockTrack = {
    enabled: true,
    readyState: 'live',
    kind: 'video',
    stop: vi.fn(() => {
      videoTrack.readyState = 'ended'
    }),
  }
  const stream = {
    getAudioTracks: () => [audioTrack],
    getTracks: () => [audioTrack, videoTrack],
    getVideoTracks: () => [videoTrack],
  } as unknown as MediaStream

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: options.denied
        ? vi.fn().mockRejectedValue(new Error('denied'))
        : vi.fn().mockResolvedValue(stream),
    },
  })

  Object.defineProperty(window, 'MediaRecorder', {
    configurable: true,
    value: options.unsupported ? undefined : MockMediaRecorder,
  })
  Object.defineProperty(window, 'MediaStream', {
    configurable: true,
    value: MockMediaStream,
  })
  Object.defineProperty(globalThis, 'MediaStream', {
    configurable: true,
    value: MockMediaStream,
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:recording'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })

  return { audioTrack, stream, videoTrack }
}

afterEach(() => {
  vi.restoreAllMocks()
  MockMediaRecorder.instances = []
})

describe('useMediaRecorder', () => {
  it('supports manual recording stop and restart', async () => {
    installMediaMocks()
    const { result } = renderHook(() => useMediaRecorder())

    await waitFor(() => expect(result.current.stream).not.toBeNull())
    await act(async () => {
      await result.current.startRecording()
    })
    expect(result.current.state).toBe('RECORDING')

    act(() => {
      result.current.stopRecording()
    })
    await waitFor(() => expect(result.current.state).toBe('RECORDED'))

    await act(async () => {
      await result.current.startRecording()
    })
    expect(result.current.state).toBe('RECORDING')
  })

  it('records an isolated lightweight audio blob alongside the composite video blob', async () => {
    installMediaMocks()
    const { result } = renderHook(() => useMediaRecorder())

    await waitFor(() => expect(result.current.stream).not.toBeNull())
    await act(async () => {
      await result.current.startRecording()
    })

    // Two dedicated recorders: composite A/V + isolated audio-only.
    expect(MockMediaRecorder.instances).toHaveLength(2)
    const [, audioRecorder] = MockMediaRecorder.instances

    // The audio recorder receives a stream containing only the audio track,
    // compressed at 32 kbps with the best supported opus mime type.
    const audioStream = audioRecorder.stream as unknown as { tracks: MockTrack[] }
    expect(audioStream.tracks).toHaveLength(1)
    expect(audioStream.tracks[0].kind).toBe('audio')
    expect(audioRecorder.mimeType).toBe('audio/webm;codecs=opus')
    expect(audioRecorder.audioBitsPerSecond).toBe(32000)
    expect(audioRecorder.state).toBe('recording')

    act(() => {
      result.current.stopRecording()
    })

    await waitFor(() => expect(result.current.state).toBe('RECORDED'))
    const media = result.current.recordedMedia
    expect(media).not.toBeNull()
    expect(media?.blob.type).toContain('video/webm')
    expect(media?.audioBlob.type).toBe('audio/webm;codecs=opus')
    expect(media?.audioMimeType).toBe('audio/webm;codecs=opus')
    expect(media?.audioBlob.size).toBeGreaterThan(0)
    expect(media?.url).toBe('blob:recording')
  })

  it('cuts off active recording and stops media tracks and both recorders', async () => {
    const { audioTrack, videoTrack } = installMediaMocks()
    const { result } = renderHook(() => useMediaRecorder())

    await waitFor(() => expect(result.current.stream).not.toBeNull())
    await act(async () => {
      await result.current.startRecording()
    })

    act(() => {
      result.current.cutoffRecording()
    })

    for (const recorder of MockMediaRecorder.instances) {
      expect(recorder.stop).toHaveBeenCalled()
    }
    expect(audioTrack.stop).toHaveBeenCalled()
    expect(videoTrack.stop).toHaveBeenCalled()
    await waitFor(() => expect(result.current.stream).toBeNull())
  })

  it('handles permission denial gracefully', async () => {
    installMediaMocks({ denied: true })
    const { result } = renderHook(() => useMediaRecorder())

    await waitFor(() => expect(result.current.permissionError).toContain('denied'))
    expect(result.current.stream).toBeNull()
  })

  it('handles unsupported MediaRecorder gracefully', async () => {
    installMediaMocks({ unsupported: true })
    const { result } = renderHook(() => useMediaRecorder())

    await waitFor(() => expect(result.current.stream).not.toBeNull())
    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.state).toBe('ERROR')
    expect(result.current.recordingError).toContain('not supported')
  })
})

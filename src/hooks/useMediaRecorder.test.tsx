/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaRecorder } from './useMediaRecorder'

interface MockTrack {
  enabled: boolean
  readyState: 'live' | 'ended'
  stop: ReturnType<typeof vi.fn>
}

class MockMediaRecorder {
  static lastInstance: MockMediaRecorder | null = null
  mimeType = 'video/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onerror: (() => void) | null = null
  onstop: (() => void) | null = null
  state: 'inactive' | 'recording' = 'inactive'
  stop = vi.fn(() => {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['mock'], { type: 'video/webm' }) })
    this.onstop?.()
  })

  constructor() {
    MockMediaRecorder.lastInstance = this
  }

  start() {
    this.state = 'recording'
  }
}

function installMediaMocks(options: { unsupported?: boolean; denied?: boolean } = {}) {
  const audioTrack: MockTrack = {
    enabled: true,
    readyState: 'live',
    stop: vi.fn(() => {
      audioTrack.readyState = 'ended'
    }),
  }
  const videoTrack: MockTrack = {
    enabled: true,
    readyState: 'live',
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
  MockMediaRecorder.lastInstance = null
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
    expect(result.current.state).toBe('RECORDED')

    await act(async () => {
      await result.current.startRecording()
    })
    expect(result.current.state).toBe('RECORDING')
  })

  it('cuts off active recording and stops media tracks', async () => {
    const { audioTrack, videoTrack } = installMediaMocks()
    const { result } = renderHook(() => useMediaRecorder())

    await waitFor(() => expect(result.current.stream).not.toBeNull())
    await act(async () => {
      await result.current.startRecording()
    })

    act(() => {
      result.current.cutoffRecording()
    })

    expect(MockMediaRecorder.lastInstance?.stop).toHaveBeenCalled()
    expect(audioTrack.stop).toHaveBeenCalled()
    expect(videoTrack.stop).toHaveBeenCalled()
    expect(result.current.stream).toBeNull()
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

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecordedMedia, RecordingState } from '../types/interview'

const CHUNK_TIMESLICE_MS = 500

export function useMediaRecorder() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [state, setState] = useState<RecordingState>('READY')
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(false)

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const requestMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError('This browser does not support camera and microphone recording.')
      return null
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      if (!mountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop())
        return null
      }

      streamRef.current = mediaStream
      setPermissionError(null)
      setStream(mediaStream)
      return mediaStream
    } catch {
      if (mountedRef.current) {
        setPermissionError(
          'Camera or microphone permission was denied. You can still explore the UI, but recording needs access.',
        )
      }
      return null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void requestMedia()

    return () => {
      mountedRef.current = false
      releaseStream()
    }
  }, [releaseStream, requestMedia])

  useEffect(() => {
    if (state !== 'RECORDING') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      if (startedAtRef.current) {
        setDurationSeconds(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        )
      }
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [state])

  useEffect(() => {
    return () => {
      if (recordedMedia) {
        URL.revokeObjectURL(recordedMedia.url)
      }
    }
  }, [recordedMedia])

  const startRecording = useCallback(
    async (onChunk?: (chunk: Blob) => void) => {
      const activeStream =
        streamRef.current &&
        streamRef.current.getTracks().some((track) => track.readyState === 'live')
          ? streamRef.current
          : await requestMedia()

      if (!activeStream) {
        setState('ERROR')
        setRecordingError('Camera and microphone access is required before recording.')
        return false
      }

      if (!window.MediaRecorder) {
        setState('ERROR')
        setRecordingError('MediaRecorder is not supported in this browser.')
        return false
      }

      try {
        chunksRef.current = []
        if (recordedMedia) {
          URL.revokeObjectURL(recordedMedia.url)
        }
        setRecordedMedia(null)
        setRecordingError(null)

        const recorder = new MediaRecorder(activeStream)
        recorderRef.current = recorder
        startedAtRef.current = Date.now()
        setDurationSeconds(0)

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
            onChunk?.(event.data)
          }
        }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const duration = startedAtRef.current
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          : 0
        setRecordedMedia({ blob, url, mimeType, durationSeconds: duration })
        setDurationSeconds(duration)
        setState('RECORDED')
        startedAtRef.current = null
      }

      recorder.onerror = () => {
        setState('ERROR')
        setRecordingError('Recording failed. Please try again.')
      }

      recorder.start(CHUNK_TIMESLICE_MS)
      setState('RECORDING')
      return true
    } catch {
      setState('ERROR')
      setRecordingError('Recording could not be started.')
      return false
    }
  }, [recordedMedia, requestMedia])

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const cutoffRecording = useCallback(() => {
    try {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    } catch {
      setRecordingError('Recording stopped unexpectedly.')
    } finally {
      releaseStream()
    }
  }, [releaseStream])

  const setUploading = useCallback(() => setState('UPLOADING'), [])
  const setProcessing = useCallback(() => setState('PROCESSING'), [])
  const setUploaded = useCallback(() => setState('UPLOADED'), [])
  const setError = useCallback((message: string) => {
    setState('ERROR')
    setRecordingError(message)
  }, [])

  return {
    durationSeconds,
    permissionError,
    recordedMedia,
    recordingError,
    cutoffRecording,
    setError,
    setProcessing,
    setUploaded,
    setUploading,
    startRecording,
    state,
    stopRecording,
    stream,
  }
}

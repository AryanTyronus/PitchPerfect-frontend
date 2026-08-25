import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecordedMedia, RecordingState } from '../types/interview'

const CHUNK_TIMESLICE_MS = 500
// 32 kbps opus keeps clean voice capture while a 2-minute recording stays
// well under 1 MB — small enough for the transcription upload limits.
const AUDIO_BITS_PER_SECOND = 32000

/** Best supported audio-only mime type for whisper-compatible uploads. */
function selectAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return ''
  }
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm'
  }
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4'
  }
  return ''
}

/** Isolated audio stream so the dedicated audio recorder never muxes video. */
function createAudioOnlyStream(stream: MediaStream): MediaStream {
  const tracks = stream.getAudioTracks()
  if (typeof MediaStream === 'undefined' || tracks.length === 0) {
    return stream
  }
  return new MediaStream(tracks)
}

export function useMediaRecorder() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [state, setState] = useState<RecordingState>('READY')
  const [recordedMedia, setRecordedMedia] = useState<RecordedMedia | null>(null)
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioChunksRef = useRef<BlobPart[]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
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

  const stopActiveRecorders = useCallback(() => {
    for (const recorder of [recorderRef.current, audioRecorderRef.current]) {
      try {
        if (recorder?.state === 'recording') {
          recorder.stop()
        }
      } catch {
        // Recorder already inactive; finalization handles the rest.
      }
    }
  }, [])

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
        audioChunksRef.current = []
        if (recordedMedia) {
          URL.revokeObjectURL(recordedMedia.url)
        }
        setRecordedMedia(null)
        setRecordingError(null)

        startedAtRef.current = Date.now()
        setDurationSeconds(0)

        // Composite A/V recorder: live preview playback only.
        const recorder = new MediaRecorder(activeStream)
        recorderRef.current = recorder

        // Isolated lightweight audio recorder for the transcription upload.
        const audioMimeType = selectAudioMimeType()
        let audioRecorder: MediaRecorder | null = null
        if (activeStream.getAudioTracks().length > 0) {
          try {
            const audioOptions: MediaRecorderOptions = {
              audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
            }
            if (audioMimeType) {
              audioOptions.mimeType = audioMimeType
            }
            audioRecorder = new MediaRecorder(
              createAudioOnlyStream(activeStream),
              audioOptions,
            )
          } catch {
            audioRecorder = null
          }
        }
        audioRecorderRef.current = audioRecorder

        let videoStopped = false
        let audioStopped = !audioRecorder
        let audioErrored = false
        let capturedBlob: Blob | null = null
        let capturedUrl: string | null = null
        let capturedMime = 'video/webm'

        const finalizeIfReady = () => {
          if (!videoStopped) {
            return
          }
          if (!audioStopped && !audioErrored) {
            return
          }
          const hasAudio = Boolean(audioRecorder) && audioStopped && !audioErrored
          const duration = startedAtRef.current
            ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
            : 0
          const resolvedAudioMime =
            (hasAudio && audioRecorder?.mimeType) || audioMimeType || 'audio/webm'
          setRecordedMedia({
            blob: capturedBlob ?? new Blob([]),
            url: capturedUrl ?? '',
            mimeType: capturedMime,
            durationSeconds: duration,
            audioBlob: hasAudio
              ? new Blob(audioChunksRef.current, { type: resolvedAudioMime })
              : capturedBlob ?? new Blob([], { type: resolvedAudioMime }),
            audioMimeType: resolvedAudioMime,
          })
          setDurationSeconds(duration)
          setState('RECORDED')
          startedAtRef.current = null
        }

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data)
            onChunk?.(event.data)
          }
        }

        recorder.onstop = () => {
          capturedMime = recorder.mimeType || 'video/webm'
          capturedBlob = new Blob(chunksRef.current, { type: capturedMime })
          capturedUrl = URL.createObjectURL(capturedBlob)
          videoStopped = true
          finalizeIfReady()
        }

        recorder.onerror = () => {
          setState('ERROR')
          setRecordingError('Recording failed. Please try again.')
        }

        if (audioRecorder) {
          audioRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }
          audioRecorder.onstop = () => {
            audioStopped = true
            finalizeIfReady()
          }
          audioRecorder.onerror = () => {
            audioErrored = true
            finalizeIfReady()
          }
          audioRecorder.start(CHUNK_TIMESLICE_MS)
        }

        recorder.start(CHUNK_TIMESLICE_MS)
        setState('RECORDING')
        return true
      } catch {
        setState('ERROR')
        setRecordingError('Recording could not be started.')
        return false
      }
    },
    [recordedMedia, requestMedia],
  )

  const stopRecording = useCallback(() => {
    stopActiveRecorders()
  }, [stopActiveRecorders])

  const cutoffRecording = useCallback(() => {
    try {
      stopActiveRecorders()
    } catch {
      setRecordingError('Recording stopped unexpectedly.')
    } finally {
      releaseStream()
    }
  }, [releaseStream, stopActiveRecorders])

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

import { useEffect, useRef, useState } from 'react'

interface CameraPreviewProps {
  stream: MediaStream | null
  error: string | null
  isRecording: boolean
  isTimeExpired: boolean
  microphoneEnabled: boolean
}

export function CameraPreview({
  stream,
  error,
  isRecording,
  isTimeExpired,
  microphoneEnabled,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraEnabled, setCameraEnabled] = useState(true)

  useEffect(() => {
    if (videoRef.current && stream && cameraEnabled) {
      videoRef.current.srcObject = stream
    }
  }, [cameraEnabled, stream])

  useEffect(() => {
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled
    })
  }, [cameraEnabled, stream])

  if (error) {
    return (
      <div className="camera-preview" data-od-id="camera-preview">
        <div className="camera-placeholder" role="alert">
          Camera unavailable — {error}
        </div>
      </div>
    )
  }

  const stageClass = `camera-preview${isRecording ? ' is-recording' : ''}`

  return (
    <div className={stageClass} data-od-id="camera-preview">
      {stream && cameraEnabled ? (
        <video autoPlay muted playsInline ref={videoRef} />
      ) : (
        <div className="camera-placeholder">
          <span>Camera preview</span>
        </div>
      )}
      <div className="camera-overlays">
        {isRecording ? <span className="rec-chip is-recording">REC</span> : null}
        {isTimeExpired ? <span className="rec-chip muted-chip">Mic cut off</span> : null}
      </div>
      <div className="media-status-row" aria-label="Media status">
        <span>{cameraEnabled && stream ? 'Camera on' : 'Camera off'}</span>
        <span>{microphoneEnabled ? 'Microphone on' : 'Microphone off'}</span>
      </div>
      <button
        aria-pressed={!cameraEnabled}
        className="media-toggle"
        disabled={isTimeExpired || !stream}
        onClick={() => setCameraEnabled((enabled) => !enabled)}
        type="button"
      >
        {cameraEnabled ? 'Camera on' : 'Camera off'}
      </button>
    </div>
  )
}
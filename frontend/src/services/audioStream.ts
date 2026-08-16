import { env } from '../config/env'
import type { WordTimestamp } from './api'

/**
 * Messages received from the backend `/ws/audio` endpoint. The backend sends
 * a `partial` frame (a TranscriptionResult plus a `type` marker) for every
 * recognized chunk, or an `error` frame when transcription is unavailable.
 */
export interface AudioStreamMessage {
  type: 'partial' | 'error'
  text?: string
  duration?: number
  words?: WordTimestamp[]
  message?: string
}

export interface AudioStreamClientOptions {
  onOpen?: () => void
  onClose?: () => void
  onError?: (message: string) => void
  onPartial?: (message: AudioStreamMessage) => void
  reconnect?: boolean
}

const WS_PATH = '/ws/audio'
const MAX_RECONNECT_DELAY_MS = 10_000

export class AudioStreamClient {
  private readonly options: AudioStreamClientOptions
  private readonly reconnect: boolean
  private socket: WebSocket | null = null
  private shouldReconnect = false
  private reconnectAttempts = 0

  constructor(options: AudioStreamClientOptions = {}) {
    this.options = options
    this.reconnect = options.reconnect ?? true
  }

  get isConnected(): boolean {
    return (
      this.socket !== null &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    )
  }

  connect(): void {
    if (this.isConnected) {
      return
    }

    if (typeof WebSocket === 'undefined') {
      // Non-browser environment (e.g. tests, SSR); nothing to stream to.
      return
    }

    const socket = new WebSocket(`${env.wsBaseUrl}${WS_PATH}`)
    this.socket = socket
    this.shouldReconnect = true

    socket.onopen = () => {
      this.reconnectAttempts = 0
      this.options.onOpen?.()
    }

    socket.onmessage = (event) => this.handleMessage(event)

    socket.onerror = () => {
      this.options.onError?.('The live audio stream could not be reached.')
    }

    socket.onclose = () => {
      this.socket = null
      this.options.onClose?.()
      if (this.shouldReconnect && this.reconnect) {
        this.scheduleReconnect()
      }
    }
  }

  send(chunk: Blob | ArrayBuffer): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false
    }
    this.socket.send(chunk)
    return true
  }

  close(): void {
    this.shouldReconnect = false
    this.socket?.close()
    this.socket = null
  }

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data !== 'string') {
      return
    }

    let message: AudioStreamMessage
    try {
      message = JSON.parse(event.data) as AudioStreamMessage
    } catch {
      return
    }

    if (message.type === 'error') {
      this.options.onError?.(message.message ?? 'transcription unavailable')
      return
    }

    this.options.onPartial?.(message)
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS)
    this.reconnectAttempts += 1
    window.setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
      }
    }, delay)
  }
}
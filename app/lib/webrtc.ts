import type { Id } from "@/convex/_generated/dataModel"

export type WebRTCSignal = {
  type: "offer" | "answer" | "ice-candidate"
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export type WebRTCCallbacks = {
  onSendSignal: (targetUserId: Id<"users">, signal: WebRTCSignal) => Promise<void>
}

export class WebRTCService {
  private peers: Map<Id<"users">, RTCPeerConnection> = new Map()
  public localStream: MediaStream | null = null
  private callbacks: WebRTCCallbacks

  constructor(callbacks: WebRTCCallbacks) {
    this.callbacks = callbacks
  }

  async initializeAudio(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      console.error("Failed to get user media:", error)
      throw error
    }
  }

  async connectToPeer(userId: Id<"users">, isInitiator: boolean): Promise<void> {
    if (this.peers.has(userId)) {
      return // Already connected
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    })

    this.peers.set(userId, peerConnection)

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (!remoteStream) return
      this.playAudioStream(remoteStream, userId)
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        // Serialize ICE candidate to plain object
        const candidateInit: RTCIceCandidateInit = {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        }

        // Only add usernameFragment if it exists
        if (event.candidate.usernameFragment) {
          candidateInit.usernameFragment = event.candidate.usernameFragment
        }

        await this.callbacks.onSendSignal(userId, {
          type: "ice-candidate",
          candidate: candidateInit,
        })
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${userId}:`, peerConnection.connectionState)
      if (
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        this.disconnectFromPeer(userId)
      }
    }

    // If initiator, create offer
    if (isInitiator) {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      await this.callbacks.onSendSignal(userId, { type: "offer", sdp: offer })
    }
  }

  async handleSignal(fromUserId: Id<"users">, signal: any): Promise<void> {
    let peerConnection = this.peers.get(fromUserId)

    if (!peerConnection) {
      // Create a new peer connection as the receiver
      await this.connectToPeer(fromUserId, false)
      peerConnection = this.peers.get(fromUserId)
    }

    if (!peerConnection) return

    try {
      if (signal.type === "offer") {
        await peerConnection.setRemoteDescription(signal.sdp)
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        await this.callbacks.onSendSignal(fromUserId, { type: "answer", sdp: answer })
      } else if (signal.type === "answer") {
        await peerConnection.setRemoteDescription(signal.sdp)
      } else if (signal.type === "ice-candidate") {
        if (signal.candidate?.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate))
        }
      }
    } catch (error) {
      console.error(`Error handling signal from ${fromUserId}:`, error)
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return false

    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach((track) => {
      track.enabled = !track.enabled
    })
    return !audioTracks[0]?.enabled
  }

  toggleDeafen(): boolean {
    const audioElements = document.querySelectorAll('audio[id^="audio-"]')
    const shouldMute = audioElements.length > 0 && !(audioElements[0] as HTMLAudioElement).muted

    audioElements.forEach((audio) => {
      ;(audio as HTMLAudioElement).muted = shouldMute
    })

    return shouldMute
  }

  private playAudioStream(stream: MediaStream, userId: Id<"users">): void {
    const audio = document.createElement("audio")
    audio.srcObject = stream
    audio.autoplay = true
    audio.id = `audio-${userId}`

    // Remove existing audio element if it exists
    const existing = document.getElementById(`audio-${userId}`)
    if (existing) {
      existing.remove()
    }

    document.body.appendChild(audio)
  }

  disconnectFromPeer(userId: Id<"users">): void {
    const peerConnection = this.peers.get(userId)
    if (peerConnection) {
      peerConnection.close()
      this.peers.delete(userId)
    }

    // Remove audio element
    const audio = document.getElementById(`audio-${userId}`)
    audio?.remove()
  }

  disconnectAll(): void {
    this.peers.forEach((_, userId) => {
      this.disconnectFromPeer(userId)
    })

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }
  }

  isConnectedToPeer(userId: Id<"users">): boolean {
    const peerConnection = this.peers.get(userId)
    return peerConnection ? peerConnection.connectionState === "connected" : false
  }
}

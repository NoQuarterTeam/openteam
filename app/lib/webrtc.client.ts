import SimplePeer from "simple-peer"

export interface PeerConnection {
  userId: string
  peer: SimplePeer.Instance
  stream?: MediaStream
}

export class WebRTCService {
  private peers = new Map<string, PeerConnection>()
  private localStream: MediaStream | null = null
  private isMuted = false
  private isDeafened = false

  async initializeAudio(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      return this.localStream
    } catch (error) {
      console.error("Failed to get user media:", error)
      throw error
    }
  }

  createPeer(userId: string, initiator: boolean, onSignal: (signal: any) => void): SimplePeer.Instance {
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: this.localStream || undefined,
    })

    peer.on("signal", onSignal)

    peer.on("stream", (remoteStream) => {
      console.log("Received remote stream from", userId)
      const peerConnection = this.peers.get(userId)
      if (peerConnection) {
        peerConnection.stream = remoteStream
        this.playRemoteStream(remoteStream, userId)
      }
    })

    peer.on("connect", () => {
      console.log("Connected to peer", userId)
    })

    peer.on("error", (error) => {
      console.error("Peer error:", error)
      this.removePeer(userId)
    })

    peer.on("close", () => {
      console.log("Peer connection closed", userId)
      this.removePeer(userId)
    })

    this.peers.set(userId, { userId, peer })
    return peer
  }

  handleSignal(userId: string, signal: any) {
    const peerConnection = this.peers.get(userId)
    if (peerConnection) {
      peerConnection.peer.signal(signal)
    }
  }

  private playRemoteStream(stream: MediaStream, userId: string) {
    // Create or update audio element for this user
    let audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement
    if (!audioElement) {
      audioElement = document.createElement("audio")
      audioElement.id = `audio-${userId}`
      audioElement.autoplay = true
      audioElement.style.display = "none"
      document.body.appendChild(audioElement)
    }

    audioElement.srcObject = stream
    audioElement.volume = this.isDeafened ? 0 : 1
  }

  removePeer(userId: string) {
    const peerConnection = this.peers.get(userId)
    if (peerConnection) {
      peerConnection.peer.destroy()
      this.peers.delete(userId)

      // Remove audio element
      const audioElement = document.getElementById(`audio-${userId}`)
      if (audioElement) {
        audioElement.remove()
      }
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted
      })
    }
    return this.isMuted
  }

  toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened
    // Update volume for all remote audio elements
    this.peers.forEach((_, userId) => {
      const audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement
      if (audioElement) {
        audioElement.volume = this.isDeafened ? 0 : 1
      }
    })
    return this.isDeafened
  }

  getMuteState(): boolean {
    return this.isMuted
  }

  getDeafenState(): boolean {
    return this.isDeafened
  }

  disconnect() {
    // Destroy all peer connections
    this.peers.forEach((peerConnection) => {
      peerConnection.peer.destroy()
    })
    this.peers.clear()

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    // Remove all audio elements
    document.querySelectorAll('audio[id^="audio-"]').forEach((el) => el.remove())
  }

  getPeers(): PeerConnection[] {
    return Array.from(this.peers.values())
  }
}

// Global instance
export const webrtcService = new WebRTCService()

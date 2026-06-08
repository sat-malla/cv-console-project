import VideoPanel from "../components/VideoPanel"

export default function Home() {
  return (
    <div style={{ width: "640px", height: "480px" }}>
      <VideoPanel url="ws://127.0.0.1:8000/video" />
    </div>
  )
}

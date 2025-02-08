import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import AudioRecorder from './AudioRecorder'
import AudioDecibel from './AudioDecibel'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      {/* <AudioRecorder /> */}
      <AudioDecibel />
    </>
  )
}

export default App

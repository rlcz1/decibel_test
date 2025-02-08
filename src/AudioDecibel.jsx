import React, { useState, useEffect, useRef } from 'react';

const AudioDecibel = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [decibel, setDecibel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameId = useRef(null);
  const mediaStreamRef = useRef(null);

  // 오디오 컨텍스트 초기화
  const initAudioContext = () => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
  };

  // 데시벨 계산 함수 수정
  const calculateDecibel = () => {
    const dataArray = dataArrayRef.current;
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // RMS (Root Mean Square) 계산
    const rms = Math.sqrt(
      dataArray.reduce((acc, val) => acc + (val ** 2), 0) / dataArray.length
    );
    
    // 보정값 적용 (기준값 조정)
    const calibration = 60; // 보정값 추가
    
    // 0~130 범위의 데시벨로 변환
    const minDecibels = 0;
    const maxDecibels = 130;
    
    // rms 값을 0~130 범위로 매핑하고 보정값 적용
    const decibelValue = ((rms / 255) * (maxDecibels - minDecibels) + minDecibels) + calibration;
    
    setDecibel(Math.min(maxDecibels, Math.max(minDecibels, decibelValue)));
  };

  // 실시간 업데이트 루프
  const startDecibelMonitoring = () => {
    const update = () => {
      calculateDecibel();
      animationFrameId.current = requestAnimationFrame(update);
    };
    animationFrameId.current = requestAnimationFrame(update);
  };

  // 녹음 시작 처리
  const startRecording = async () => {
    try {
      if (!audioContextRef.current) initAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      setIsRecording(true);
      startDecibelMonitoring();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // 녹음 중지 처리
  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsRecording(false);
    setDecibel(0);
  };

  // 컴포넌트 정리
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="audio-recorder" style={styles.audioRecorder}>
      <h2>실시간 데시벨 측정기</h2>
      <div className="decibel-display" style={{
        ...styles.decibelDisplay,
        color: decibel > 85 ? '#ff4444' : '#4CAF50'
      }}>
        현재 음량: {decibel.toFixed(1)} dB
      </div>
      
      {!isRecording ? (
        <button 
          style={{...styles.button, ...styles.startButton}}
          onClick={startRecording}
        >
          녹음 시작
        </button>
      ) : (
        <button 
          style={{...styles.button, ...styles.stopButton}}
          onClick={stopRecording}
        >
          녹음 중지
        </button>
      )}
    </div>
  );
};

// 스타일 객체
const styles = {
  audioRecorder: {
    padding: '20px',
    textAlign: 'center',
  },
  decibelDisplay: {
    fontSize: '24px',
    margin: '20px 0',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '5px',
    transition: 'background-color 0.3s',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  stopButton: {
    backgroundColor: '#ff4444',
    color: 'white',
  },
};

export default AudioDecibel;

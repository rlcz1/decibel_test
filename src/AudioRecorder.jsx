import { useEffect, useState, useRef } from 'react';

const DECIBEL_THRESHOLD = -30; // 임계값 조정 (필요에 따라 더 조정 가능)
const BUFFER_DURATION = 3; // 전후로 캡처할 시간(초)

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentDecibel, setCurrentDecibel] = useState(-100);
  const [audioUrl, setAudioUrl] = useState(null); // 녹음된 오디오 URL 저장
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioChunksRef = useRef([]);
  const lastTriggerTimeRef = useRef(0);
  const meterRef = useRef(null);

  // 컴포넌트 마운트/언마운트 시 자동 녹음 시작/종료
  useEffect(() => {
    startRecording();

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setCurrentDecibel(-100);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []); // 빈 의존성 배열로 마운트 시에만 실행

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      // 분석기 설정 수정
      analyserRef.current.fftSize = 2048;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      analyserRef.current.smoothingTimeConstant = 0.85;
      
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength); // Uint8Array 대신 Float32Array 사용

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const checkVolume = () => {
        if (!isRecording) return;

        try {
          // 현재 미터 값 가져오기
          const volume = meterRef.current.getLevel();
          const decibels = Math.round(20 * Math.log10(volume));
          const normalizedDecibel = Math.max(-100, Math.min(0, decibels));
          
          // 콘솔에 현재 볼륨과 데시벨 값 출력
          console.log('Current Volume:', volume);
          console.log('Current Decibel:', normalizedDecibel, 'dB');
          
          setCurrentDecibel(normalizedDecibel);

          if (normalizedDecibel > DECIBEL_THRESHOLD) {
            const currentTime = Date.now();
            if (currentTime - lastTriggerTimeRef.current > 1000) {
              console.log('소리 감지됨!', normalizedDecibel, 'dB');
              handleLoudSound();
              lastTriggerTimeRef.current = currentTime;
            }
          }
        } catch (error) {
          console.error('Volume check error:', error);
        }

        requestAnimationFrame(checkVolume);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      checkVolume();
      
      console.log('녹음이 시작되었습니다.');
    } catch (error) {
      console.error('녹음을 시작할 수 없습니다:', error);
    }
  };

  const handleLoudSound = async () => {
    if (!mediaRecorderRef.current) return;

    // 현재 녹음 중지
    mediaRecorderRef.current.stop();
    
    // 잠시 대기 후 새로운 녹음 시작
    setTimeout(() => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      // 오디오 URL 생성 및 저장
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      sendToServer(audioBlob);
      
      // 새로운 녹음 시작
      audioChunksRef.current = [];
      mediaRecorderRef.current?.start();
    }, BUFFER_DURATION * 1000);
  };

  const sendToServer = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('YOUR_API_ENDPOINT', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('서버 전송 실패');
      }

      console.log('오디오 파일이 성공적으로 전송되었습니다.');
    } catch (error) {
      console.error('서버 전송 중 오류 발생:', error);
    }
  };

  // 수동으로 녹음 중지하는 함수 추가
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // 녹음된 오디오 처리
      setTimeout(() => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        audioChunksRef.current = [];
      }, 100);
    }
  };

  // 녹음 다시 시작하는 함수 추가
  const resumeRecording = () => {
    setAudioUrl(null); // 이전 녹음 URL 제거
    startRecording();
  };

  return (
    <div>
      <div style={{ marginTop: '1rem' }}>
        <div>녹음 상태: {isRecording ? '녹음 중' : '대기 중'}</div>
        <div>현재 데시벨: {currentDecibel > -100 ? currentDecibel.toFixed(1) : '무음'} dB</div>
        <div 
          style={{
            width: '200px',
            height: '20px',
            border: '1px solid #ccc',
            marginTop: '0.5rem'
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, (currentDecibel + 100) / 100 * 100))}%`,
              height: '100%',
              backgroundColor: currentDecibel > DECIBEL_THRESHOLD ? '#ff4444' : '#44ff44',
              transition: 'all 0.1s ease'
            }}
          />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
          임계값: {DECIBEL_THRESHOLD} dB
        </div>

        {/* 녹음 제어 버튼 추가 */}
        <div style={{ marginTop: '1rem' }}>
          <button 
            onClick={isRecording ? stopRecording : resumeRecording}
            style={{
              padding: '8px 16px',
              margin: '0 8px',
              backgroundColor: isRecording ? '#ff4444' : '#44ff44',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isRecording ? '녹음 중지' : '녹음 시작'}
          </button>
        </div>

        {/* 녹음된 오디오 재생 */}
        {audioUrl && (
          <div style={{ marginTop: '1rem' }}>
            <audio 
              controls 
              src={audioUrl}
              style={{ width: '100%', maxWidth: '300px' }}
            />
            <button
              onClick={() => {
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
              }}
              style={{
                padding: '4px 8px',
                marginTop: '8px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              녹음 삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder; 
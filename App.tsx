// FIX: Add missing Web Speech API type definitions to resolve TypeScript errors.
// These are not included in standard DOM typings.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from './types';
import { summarizeToKana } from './services/geminiService';
import { MicIcon, StopIcon, LoadingIcon, SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [geminiResult, setGeminiResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);


  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) {
      setAppState(AppState.IDLE);
      return;
    }
    setAppState(AppState.PROCESSING);
    setError('');
    try {
      const result = await summarizeToKana(text);
      setGeminiResult(result);
      setAppState(AppState.RESULT);
    } catch (err) {
      console.error(err);
      setError('AIとの通信中にエラーがおきました。もういちどおためしください。');
      setAppState(AppState.ERROR);
    }
  }, []);

  const startRecording = () => {
    setAppState(AppState.LISTENING);
    setError('');
    setTranscript('');
    setInterimTranscript('');
    setGeminiResult('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('お使いのブラウザは音声認識に対応していません。');
      setAppState(AppState.ERROR);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'ja-JP';
    recognitionRef.current.interimResults = true;
    recognitionRef.current.continuous = true;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalPart = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalPart += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalPart) {
        setTranscript(prev => prev + finalPart);
      }
      setInterimTranscript(interim);
    };

    recognitionRef.current.onend = () => {
      if (appStateRef.current === AppState.LISTENING) {
        processTranscript(transcriptRef.current);
      }
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = '音声認識中にエラーがおきました。';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessage = 'マイクの使用が許可されていません。ブラウザの設定を確認してください。';
      } else if (event.error === 'no-speech') {
        errorMessage = '音声が聞き取れませんでした。もう一度お試しください。';
      }
      setError(errorMessage);
      setAppState(AppState.ERROR);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  
  const handleRecordButtonClick = () => {
    if (appState === AppState.LISTENING) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getStatusMessage = () => {
    switch (appState) {
      case AppState.IDLE:
        return 'マイクボタンをおして はなしてください';
      case AppState.LISTENING:
        return 'きいています...';
      case AppState.PROCESSING:
        return 'AIがまとめています...';
      case AppState.RESULT:
        return 'かんせい！';
      case AppState.ERROR:
        return 'エラーがはっせいしました';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 font-sans p-4 text-slate-800">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-700">
            ひらがな・カタカナ まとめ
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            はなした ないようを よみやすく せいりします
          </p>
        </header>

        <main className="flex flex-col items-center gap-6">
          <div className="relative">
            <button
              onClick={handleRecordButtonClick}
              disabled={appState === AppState.PROCESSING}
              className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50
                ${appState === AppState.LISTENING 
                  ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400'}
                ${appState === AppState.PROCESSING && 'bg-gray-400 cursor-not-allowed'}`}
            >
              {appState === AppState.LISTENING ? (
                <StopIcon className="w-10 h-10" />
              ) : (
                <MicIcon className="w-10 h-10" />
              )}
            </button>
            {appState === AppState.LISTENING && (
                 <div className="absolute top-0 left-0 w-24 h-24 bg-red-500 rounded-full animate-ping opacity-75 -z-10"></div>
            )}
          </div>
          
          <div className="h-10 flex items-center justify-center">
            <p className="text-slate-600 text-xl font-medium flex items-center gap-2">
              {appState === AppState.PROCESSING && <LoadingIcon />}
              {getStatusMessage()}
            </p>
          </div>

          <div className="w-full bg-white rounded-xl shadow-md p-6 min-h-[200px] transition-opacity duration-500">
            {error && (
              <div className="text-red-500 text-center font-medium p-4 bg-red-50 rounded-lg">
                <p>{error}</p>
              </div>
            )}
            {!error && appState === AppState.LISTENING && (
                <>
                  {(transcript || interimTranscript) ? (
                    <p className="text-3xl leading-relaxed text-slate-700">
                      {transcript}
                      <span className="text-slate-400">{interimTranscript}</span>
                    </p>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <p>はなしはじめてください...</p>
                    </div>
                  )}
                </>
            )}
            {!error && appState !== AppState.LISTENING && (
              <>
                {geminiResult && appState === AppState.RESULT && (
                  <div className="space-y-4">
                    <h2 className="text-4xl font-bold text-blue-600 flex items-center gap-2 mb-4">
                      <SparklesIcon />
                      まとめ
                    </h2>
                    {geminiResult.split('\n').map((line, index) =>
                      line.trim() ? (
                        <p key={index} className="text-4xl leading-relaxed text-slate-700">
                          {line}
                        </p>
                      ) : null
                    )}
                  </div>
                )}
                 {transcript && appState === AppState.PROCESSING && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-400 mb-2">はなした ないよう：</h3>
                    <p className="text-slate-500 text-sm">{transcript}</p>
                  </div>
                )}
                {appState === AppState.IDLE && !error && !geminiResult && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400">ここに けっかが ひょうじされます</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

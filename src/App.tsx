
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
    // FIX: Changed type to 'any' to resolve "Subsequent property declarations must have the same type" errors.
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import React, { useState, useRef, useCallback } from 'react';
import { AppState } from './types';
import { summarizeToKana } from './services/geminiService';
import { MicIcon, StopIcon, LoadingIcon, SparklesIcon, RefreshIcon } from './components/icons';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscript] = useState<string>('');
  const [geminiResult, setGeminiResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    setGeminiResult('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('お使いのブラウザは音声認識に対応していません。');
      setAppState(AppState.ERROR);
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'ja-JP';
    recognitionRef.current.interimResults = false;
    recognitionRef.current.continuous = false;

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript;
        setTranscript(text);
        processTranscript(text);
      }
    };

    recognitionRef.current.onend = () => {
      if (appState === AppState.LISTENING) {
         setAppState(AppState.PROCESSING);
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
    setAppState(AppState.IDLE);
  };
  
  const handleRecordButtonClick = () => {
    if (appState === AppState.LISTENING) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setTranscript('');
    setGeminiResult('');
    setError('');
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
      <div className="w-full max-w-4xl mx-auto flex flex-col h-screen pt-8">
        <main className="flex flex-col items-center gap-4 flex-grow">
          <div className="relative">
            <button
              onClick={handleRecordButtonClick}
              disabled={appState === AppState.PROCESSING}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50
                ${appState === AppState.LISTENING 
                  ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400'}
                ${appState === AppState.PROCESSING && 'bg-gray-400 cursor-not-allowed'}`}
              aria-label={appState === AppState.LISTENING ? '録音停止' : '録音開始'}
            >
              {appState === AppState.LISTENING ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <MicIcon className="w-4 h-4" />
              )}
            </button>
            {appState === AppState.LISTENING && (
                 <div className="absolute top-0 left-0 w-8 h-8 bg-red-500 rounded-full animate-ping opacity-75 -z-10"></div>
            )}
          </div>
          
          <div className="h-10 flex items-center justify-center">
            <p className="text-slate-600 text-lg font-medium flex items-center gap-2">
              {appState === AppState.PROCESSING && <LoadingIcon />}
              {getStatusMessage()}
            </p>
          </div>

          <div className="w-full bg-white rounded-xl shadow-md p-6 flex-grow flex flex-col transition-opacity duration-500 mb-4">
             {error ? (
              <div className="flex-grow flex items-center justify-center text-red-500 text-center font-medium p-4 bg-red-50 rounded-lg">
                <p>{error}</p>
              </div>
            ) : (
              <div className="flex-grow flex flex-col justify-center">
                {appState === AppState.IDLE && (
                  <div className="text-center text-slate-400">
                    <p>ここに けっかが ひょうじされます</p>
                  </div>
                )}
                {appState === AppState.LISTENING && (
                  <div className="text-center text-slate-400">
                    <p>はなしおわったら、AIがまとめます...</p>
                  </div>
                )}
                {appState === AppState.PROCESSING && transcript && (
                  <div className="w-full">
                      <h3 className="text-sm font-bold text-slate-400 mb-2">はなした ないよう：</h3>
                      <p className="text-slate-500 text-sm">{transcript}</p>
                  </div>
                )}
                {appState === AppState.RESULT && geminiResult && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                        <SparklesIcon />
                        まとめ
                      </h2>
                      <button
                        onClick={handleReset}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors duration-200"
                        aria-label="リセット"
                      >
                        <RefreshIcon className="w-6 h-6" />
                      </button>
                    </div>
                    {geminiResult.split('\n').map((line, index) =>
                      line.trim() ? (
                        <p key={index} className="text-3xl leading-relaxed text-slate-700">
                          {line}
                        </p>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

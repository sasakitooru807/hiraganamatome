
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from './types';
import { summarizeToKana } from './services/geminiService';
import { MicIcon, StopIcon, LoadingIcon, SparklesIcon, RefreshIcon } from './components/icons';

// Define Speech Recognition types to avoid conflicts with global declarations
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  [index: number]: {
    readonly transcript: string;
  };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

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

  // Check for API key at runtime
  useEffect(() => {
    if (!process.env.API_KEY) {
      setError('API_KEYが設定されていません。VercelのEnvironment Variablesを確認してください。');
      setAppState(AppState.ERROR);
    }
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) {
      setAppState(AppState.IDLE);
      return;
    }
    setAppState(AppState.PROCESSING);
    setError('');
    try {
      const result = await summarizeToKana(cleanText);
      setGeminiResult(result);
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setError('AIのまとめに しっぱいしました。もういちど おねがいします。');
      setAppState(AppState.ERROR);
    }
  }, []);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('お使いのブラウザは音声認識に対応していません。Chromeなどのブラウザを使用してください。');
      setAppState(AppState.ERROR);
      return;
    }

    setAppState(AppState.LISTENING);
    setError('');
    setTranscript('');
    setInterimTranscript('');
    setGeminiResult('');

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current!.lang = 'ja-JP';
    recognitionRef.current!.interimResults = true;
    recognitionRef.current!.continuous = true;

    recognitionRef.current!.onresult = (event: SpeechRecognitionEvent) => {
      let finalPart = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalPart += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalPart) setTranscript(prev => prev + finalPart);
      setInterimTranscript(interim);
    };

    recognitionRef.current!.onend = () => {
      if (appStateRef.current === AppState.LISTENING) {
        const finalContent = transcript + interimTranscript;
        processTranscript(finalContent);
      }
    };

    recognitionRef.current!.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return;
      setError(`マイクエラー: ${event.error}`);
      setAppState(AppState.ERROR);
    };

    recognitionRef.current!.start();
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

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setTranscript('');
    setInterimTranscript('');
    setGeminiResult('');
    setError('');
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 font-sans p-4 text-slate-800">
      <div className="w-full max-w-2xl flex flex-col items-center pt-10">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-700 tracking-tight">
            ひらがな・カタカナ まとめ
          </h1>
          <p className="text-slate-500 mt-3 text-lg">
            やさしい ことばで おはなしを まとめます
          </p>
        </header>

        <div className="mb-8 relative">
          <button
            onClick={handleRecordButtonClick}
            disabled={appState === AppState.PROCESSING}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none focus:ring-4
              ${appState === AppState.LISTENING 
                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'}
              ${appState === AppState.PROCESSING ? 'bg-slate-400 cursor-not-allowed' : ''}`}
            aria-label={appState === AppState.LISTENING ? "停止" : "開始"}
          >
            {appState === AppState.LISTENING ? <StopIcon className="w-10 h-10 text-white" /> : <MicIcon className="w-10 h-10 text-white" />}
          </button>
          {appState === AppState.LISTENING && (
            <div className="absolute inset-0 w-24 h-24 bg-red-400 rounded-full animate-ping opacity-25"></div>
          )}
        </div>

        <div className="w-full bg-white rounded-3xl shadow-xl p-8 min-h-[300px] border border-slate-100 relative overflow-hidden">
          {appState === AppState.PROCESSING && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
              <LoadingIcon className="w-12 h-12 mb-4 text-blue-600" />
              <p className="text-xl font-bold text-slate-600">まとめています...</p>
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
                <p className="font-bold text-lg">{error}</p>
              </div>
              <button onClick={handleReset} className="text-slate-400 underline hover:text-slate-600">さいしょにもどる</button>
            </div>
          ) : (
            <div className="h-full">
              {appState === AppState.IDLE && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20 text-center">
                  <p className="text-xl">ボタンをおして おはなししてください</p>
                  <p className="text-sm mt-2">おわったら もういちど ボタンをおします</p>
                </div>
              )}

              {appState === AppState.LISTENING && (
                <div className="space-y-4">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">きいています...</p>
                  <p className="text-3xl leading-relaxed text-slate-700 font-medium break-words">
                    {transcript}<span className="text-slate-300">{interimTranscript}</span>
                  </p>
                </div>
              )}

              {appState === AppState.RESULT && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-blue-600 flex items-center gap-2">
                      <SparklesIcon className="w-6 h-6" />
                      まとめ
                    </h2>
                    <button
                      onClick={handleReset}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                      title="やりなおす"
                    >
                      <RefreshIcon className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {geminiResult.split('\n').map((line, i) => (
                      line.trim() ? <p key={i} className="text-4xl leading-tight text-slate-800 font-bold break-words">{line}</p> : null
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <footer className="mt-10 text-slate-400 text-sm flex flex-col items-center gap-1">
          <span>Gemini AI (gemini-3-flash-preview)</span>
          <span className="opacity-50 text-xs text-center px-4">※このアプリは「src/」フォルダを使わずルートディレクトリで動作します。ビルドエラー回避のため冗長なファイルを無視してください。</span>
        </footer>
      </div>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GeminiLiveClient } from './services/geminiLive';
import LanguageSelect from './components/LanguageSelect';
import Visualizer from './components/Visualizer';
import Transcript from './components/Transcript';
import { ConnectionState, TranscriptionItem } from './types';
import { LANGUAGES } from './constants';

const App: React.FC = () => {
  const [sourceLang, setSourceLang] = useState('sw');
  const [targetLang, setTargetLang] = useState('en');
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [volumes, setVolumes] = useState({ input: 0, output: 0 });
  
  // Use a ref to hold the client instance to persist across renders without re-triggering effects
  const clientRef = useRef<GeminiLiveClient | null>(null);

  const getLanguageName = (code: string) => LANGUAGES.find(l => l.code === code)?.name || code;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const toggleConnection = async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      setConnectionState(ConnectionState.DISCONNECTED);
      setVolumes({ input: 0, output: 0 });
      return;
    }

    setError(null);
    setConnectionState(ConnectionState.CONNECTING);

    const client = new GeminiLiveClient({
      sourceLanguage: getLanguageName(sourceLang),
      targetLanguage: getLanguageName(targetLang),
      onConnectionUpdate: (connected) => {
        setConnectionState(connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED);
      },
      onVolumeUpdate: (input, output) => {
        setVolumes({ input, output });
      },
      onTranscription: () => {
          // Text transcription currently disabled for stability
      },
      onError: (err) => {
        setError(err);
        setConnectionState(ConnectionState.ERROR);
      }
    });

    clientRef.current = client;
    await client.connect();
  };

  const handleSwapLanguages = () => {
    if (connectionState === ConnectionState.CONNECTED) return; // Disable swap while active
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gemini Live Translator</h1>
            <p className="text-xs text-gray-400">Real-time Speech-to-Speech</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm font-medium text-gray-400">
                {connectionState === ConnectionState.CONNECTED ? 'Live' : 'Offline'}
            </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* Controls Sidebar (Mobile: Top, Desktop: Left) */}
        <div className="w-full md:w-96 bg-gray-900 p-6 flex flex-col border-r border-gray-800 z-10 shadow-2xl">
          
          <div className="space-y-6 flex-1">
            <div className="relative group">
                <LanguageSelect 
                    label="I speak" 
                    selected={sourceLang} 
                    onChange={setSourceLang} 
                    disabled={connectionState !== ConnectionState.DISCONNECTED} 
                />
            </div>

            <div className="flex justify-center -my-2 relative z-10">
                <button 
                    onClick={handleSwapLanguages}
                    disabled={connectionState !== ConnectionState.DISCONNECTED}
                    className="p-2 rounded-full bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 transition-all text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                </button>
            </div>

            <div className="relative group">
                <LanguageSelect 
                    label="Translate to" 
                    selected={targetLang} 
                    onChange={setTargetLang} 
                    disabled={connectionState !== ConnectionState.DISCONNECTED}
                />
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
            )}
            
            {/* Connection Button */}
            <div className="pt-4">
                <button
                    onClick={toggleConnection}
                    disabled={connectionState === ConnectionState.CONNECTING}
                    className={`
                        w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-lg transition-all transform active:scale-95
                        ${connectionState === ConnectionState.CONNECTED 
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                            : connectionState === ConnectionState.CONNECTING
                                ? 'bg-gray-700 text-gray-300 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                        }
                    `}
                >
                    {connectionState === ConnectionState.CONNECTED ? 'Stop Translation' : 
                     connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 'Start Translation'}
                </button>
                <p className="text-center text-xs text-gray-500 mt-3">
                    {connectionState === ConnectionState.CONNECTED ? 'Listening...' : 'Press start to begin speaking'}
                </p>
            </div>
          </div>

          {/* Visualization Area in Sidebar */}
          <div className="mt-8 pt-8 border-t border-gray-800 flex justify-around items-end h-32">
             <Visualizer volume={volumes.input} color="bg-blue-500" label="Input (You)" />
             <Visualizer volume={volumes.output} color="bg-purple-500" label="Output (AI)" />
          </div>

        </div>

        {/* Transcript Area */}
        <div className="flex-1 flex flex-col bg-gray-950 relative">
             <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-gray-950 to-transparent pointer-events-none z-10" />
             
             <Transcript items={[]} />
             
             <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none z-10" />
        </div>

      </main>
    </div>
  );
};

export default App;
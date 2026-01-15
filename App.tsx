
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppStatus, CharacterType, UserProfile } from './types';
import { 
  decode, 
  decodeAudioData, 
  createPcmBlob, 
  playPopSound, 
  playMagicSuccessSound, 
  playErrorOopsSound, 
  playToggleSound 
} from './services/audioUtils';

const CHARACTERS = [
  { 
    id: 'Luna' as CharacterType, 
    name: 'Luna', 
    fullName: 'Luna si Burung Hantu',
    emoji: '🦉', 
    color: 'bg-indigo-400', 
    voice: 'Kore',
    description: 'Bijak dan senang bercerita.',
    prompt: 'Kamu adalah Luna yang bijak. Gunakan kata-kata yang lembut. Suka memberitahu fakta lucu tentang alam dengan cara yang ajaib.'
  },
  { 
    id: 'Cica' as CharacterType, 
    name: 'Cica', 
    fullName: 'Cica si Kucing',
    emoji: '🐱', 
    color: 'bg-orange-400', 
    voice: 'Puck',
    description: 'Lincah, lucu, dan ceria.',
    prompt: 'Kamu adalah Cica yang sangat ceria dan enerjik! Sering mengeong "Meow!" dan mengajak bermain tebak-tebakan suara hewan.'
  },
  { 
    id: 'Sharky' as CharacterType, 
    name: 'Sharky', 
    fullName: 'Sharky si Hiu',
    emoji: '🦈', 
    color: 'bg-blue-400', 
    voice: 'Fenrir',
    description: 'Pemberani dan suka laut.',
    prompt: 'Kamu adalah Sharky, pahlawan bawah laut! Bicaralah dengan semangat tentang petualangan di terumbu karang yang berwarna-warni.'
  },
  { 
    id: 'Titi' as CharacterType, 
    name: 'Titi', 
    fullName: 'Titi si Kelinci',
    emoji: '🐰', 
    color: 'bg-pink-400', 
    voice: 'Zephyr',
    description: 'Manis dan baik hati.',
    prompt: 'Kamu adalah Titi yang sangat penyayang. Senang berbicara tentang makanan sehat seperti wortel dan hobi melompat-lompat bahagia.'
  }
];

const SetupScreen = ({ onStart }: { onStart: (profile: UserProfile) => void }) => {
  const [name, setName] = useState('');
  const [selectedChar, setSelectedChar] = useState<CharacterType>('Luna');

  const handleStart = () => {
    playPopSound();
    onStart({ name, character: selectedChar, age: 5 });
  };

  const handleSelectChar = (id: CharacterType) => {
    playPopSound();
    setSelectedChar(id);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto animate-fade-in-up bg-blue-50/50">
      <div className="max-w-4xl w-full flex flex-col items-center py-6">
        <header className="text-center mb-6 md:mb-10">
          <h1 className="text-3xl md:text-6xl font-bold text-blue-600 mb-2 drop-shadow-sm">Halo Sahabat! 🌟</h1>
          <p className="text-gray-500 text-base md:text-2xl px-2">Siapa namamu dan siapa temanmu?</p>
        </header>
        
        <div className="w-full max-w-sm mb-6 md:mb-10 px-4">
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="Tulis namamu..."
            className="w-full p-4 md:p-5 rounded-3xl border-4 border-white focus:border-blue-400 outline-none text-lg md:text-2xl shadow-lg text-center transition-all bg-white"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8 mb-8 md:mb-12 w-full max-w-2xl px-2">
          {CHARACTERS.map(char => (
            <button
              key={char.id}
              onClick={() => handleSelectChar(char.id)}
              className={`p-3 md:p-6 rounded-[2rem] transition-all flex flex-col items-center border-4 relative overflow-hidden ${
                selectedChar === char.id 
                ? 'border-blue-500 bg-white shadow-xl scale-105 z-10' 
                : 'border-transparent bg-white/60 grayscale-[0.3]'
              }`}
            >
              <span className={`text-4xl md:text-7xl mb-2 md:mb-4 ${selectedChar === char.id ? 'float-animation' : ''}`}>
                {char.emoji}
              </span>
              <span className="font-bold text-gray-800 text-sm md:text-xl">{char.name}</span>
            </button>
          ))}
        </div>

        <button
          disabled={!name.trim()}
          onClick={handleStart}
          className={`px-12 md:px-20 py-3 md:py-6 rounded-full text-xl md:text-4xl font-bold text-white shadow-xl transition-all active:scale-95 ${
            name.trim() 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-2xl' 
            : 'bg-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          Mulai! 🚀
        </button>
      </div>
    </div>
  );
};

const ChatScreen = ({ profile, onBack }: { profile: UserProfile, onBack: () => void }) => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isMutedRef = useRef(false);
  const statusRef = useRef<AppStatus>(AppStatus.IDLE);
  const isConnectingRef = useRef(false);
  
  const character = CHARACTERS.find(c => c.id === profile.character)!;

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted) setUserVolume(0);
  }, [isMuted]);

  useEffect(() => {
    statusRef.current = status;
    if (status === AppStatus.CONNECTED) {
      playMagicSuccessSound();
      setErrorMessage(null);
      setTimeout(() => setIsContentVisible(true), 50);
    } else if (status === AppStatus.ERROR || status === AppStatus.IDLE) {
      if (status === AppStatus.ERROR) playErrorOopsSound();
      setIsContentVisible(false);
    } else if (status === AppStatus.PAUSED) {
      playToggleSound(false);
      setUserVolume(0);
      activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
      activeSourcesRef.current.clear();
      setIsAiSpeaking(false);
    }
  }, [status]);

  const stopConversation = useCallback(() => {
    isConnectingRef.current = false;
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    activeSourcesRef.current.clear();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextInRef.current) {
      try { audioContextInRef.current.close(); } catch(e) {}
      audioContextInRef.current = null;
    }
    if (audioContextOutRef.current) {
      try { audioContextOutRef.current.close(); } catch(e) {}
      audioContextOutRef.current = null;
    }
    
    setStatus(AppStatus.IDLE);
    setIsAiSpeaking(false);
  }, []);

  const handleToggleMute = () => {
    if (status === AppStatus.PAUSED) return;
    playToggleSound(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleTogglePause = () => {
    if (status === AppStatus.CONNECTED) {
      setStatus(AppStatus.PAUSED);
    } else if (status === AppStatus.PAUSED) {
      playToggleSound(true);
      setStatus(AppStatus.CONNECTED);
    }
  };

  const handleBack = () => {
    playPopSound();
    stopConversation();
    onBack();
  };

  const startConversation = async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setErrorMessage(null);

    // Bersihkan sesi lama jika ada
    if (sessionRef.current) stopConversation();

    try {
      setStatus(AppStatus.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      // Setup Audio Contexts
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Request Mikrofon
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      if (audioContextInRef.current.state === 'suspended') await audioContextInRef.current.resume();
      if (audioContextOutRef.current.state === 'suspended') await audioContextOutRef.current.resume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: character.voice } }
          },
        },
        callbacks: {
          onopen: () => {
            isConnectingRef.current = false;
            setStatus(AppStatus.CONNECTED);
            
            // Jeda singkat sebelum mengirim teks pertama untuk stabilitas
            setTimeout(() => {
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  text: `
                  OVERRIDE SYSTEM PERSONA:
                  - Kamu adalah ${character.fullName}. 
                  - Teman bicaramu adalah ${profile.name}, anak berusia 5 tahun.
                  - ATURAN BICARA:
                    1. Gunakan Bahasa Indonesia yang SANGAT sederhana (level TK).
                    2. Kalimat harus PENDEK (maksimal 2-3 kalimat saja sekali bicara).
                    3. Nada bicara harus ceria, ekspresif, dan penuh keajaiban.
                    4. Selalu akhiri setiap ucapanmu dengan pertanyaan yang sangat mudah dijawab.
                    5. Fokus pada topik: ${character.prompt}
                  - TUGAS PERTAMA: Sapa ${profile.name} sekarang dengan penuh semangat!`
                });
              }).catch(err => console.error("Initial send failed:", err));
            }, 100);

            if (!audioContextInRef.current) return;
            
            const source = audioContextInRef.current.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current || statusRef.current === AppStatus.PAUSED || statusRef.current !== AppStatus.CONNECTED) { 
                setUserVolume(0); 
                return; 
              }
              
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) { sum += inputData[i] * inputData[i]; }
              const volume = Math.sqrt(sum / inputData.length);
              setUserVolume(Math.min(volume * 10, 1));
              
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => { 
                if (statusRef.current === AppStatus.CONNECTED) {
                  session.sendRealtimeInput({ media: pcmBlob }); 
                }
              }).catch(() => {});
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (statusRef.current === AppStatus.PAUSED) return;
            
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current) {
              setIsAiSpeaking(true);
              const ctx = audioContextOutRef.current;
              
              if (ctx.state === 'suspended') await ctx.resume();
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              try {
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                  if (activeSourcesRef.current.size === 0) setIsAiSpeaking(false);
                };
                activeSourcesRef.current.add(source);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
              } catch (err) {
                console.error('Audio decoding failed:', err);
              }
            }
            
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }
          },
          onerror: (e: any) => { 
            console.error('Session Error Callback:', e); 
            isConnectingRef.current = false;
            
            if (e?.message?.includes('Network error')) {
              setErrorMessage('Sinyal ajaibnya sedang lemah. Pastikan internetmu aktif dan coba lagi ya!');
            } else {
              setErrorMessage('Waduh, koneksi kita terputus! Tekan tombol ulangi di bawah ya.');
            }
            setStatus(AppStatus.ERROR); 
          },
          onclose: (e) => { 
            console.log('Session Closed:', e);
            isConnectingRef.current = false;
            if (statusRef.current !== AppStatus.PAUSED && statusRef.current !== AppStatus.ERROR) {
              setStatus(AppStatus.IDLE); 
            }
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      console.error('Connection process failed:', err); 
      isConnectingRef.current = false;
      
      if (err?.message?.includes('Network error')) {
        setErrorMessage('Ups! Sepertinya ada masalah koneksi. Coba cek internetmu ya!');
      } else {
        setErrorMessage('Gagal memanggil temanmu. Ayo coba tekan tombol ulangi!');
      }
      setStatus(AppStatus.ERROR); 
    }
  };

  useEffect(() => {
    startConversation();
    return () => stopConversation();
  }, []);

  const isWorkingState = status === AppStatus.CONNECTED || status === AppStatus.PAUSED;

  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-between overflow-hidden">
      
      {/* Header */}
      <div className={`w-full p-4 md:p-6 ${character.color} text-white flex items-center justify-between shadow-md z-30 transition-colors duration-700`}>
        <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full active:scale-90" aria-label="Kembali">
          <svg className="w-6 h-6 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="font-bold text-lg md:text-3xl leading-none">{character.name}</span>
          <span className="text-[10px] md:text-xs opacity-90 font-bold uppercase tracking-widest mt-0.5">Teman {profile.name}</span>
        </div>
        <button 
          onClick={handleBack}
          className="px-3 py-1.5 md:px-5 md:py-2 bg-white/20 hover:bg-white/30 rounded-full text-xs md:text-base font-bold border border-white/40 active:scale-95 transition-all flex items-center gap-1 shadow-sm"
        >
          <span>Berhenti</span>
          <span className="hidden md:inline">👋</span>
        </button>
      </div>

      {/* Main Experience Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Character Avatar */}
        <div className={`relative transition-all duration-700 transform ${isAiSpeaking ? 'scale-105 md:scale-110' : 'scale-100'} ${isContentVisible ? 'opacity-100' : 'opacity-0 translate-y-6'}`}>
          {isAiSpeaking && status === AppStatus.CONNECTED && (
            <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping scale-[1.8] opacity-20"></div>
          )}

          {!isMuted && userVolume > 0.05 && status === AppStatus.CONNECTED && (
            <div 
              className="absolute inset-0 rounded-full blur-3xl transition-all duration-150 opacity-40"
              style={{ 
                transform: `scale(${1 + userVolume * 1.5})`,
                backgroundColor: userVolume > 0.6 ? '#facc15' : '#f87171' 
              }}
            ></div>
          )}
          
          <div className={`text-[8rem] md:text-[14rem] select-none transition-all duration-500 transform ${isAiSpeaking && status === AppStatus.CONNECTED ? 'glow-active' : 'float-animation'}`}>
            {character.emoji}
          </div>
        </div>

        {/* Status Area */}
        <div className="mt-8 text-center z-10 px-4 min-h-[4rem] flex flex-col justify-center">
          {status === AppStatus.CONNECTING ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-blue-500 font-bold text-sm md:text-xl animate-pulse">Menghubungkan Keajaiban...</p>
            </div>
          ) : status === AppStatus.ERROR ? (
            <div className="flex flex-col items-center gap-4 animate-fade-in-up">
              <p className="text-red-500 font-bold text-base md:text-xl max-w-xs">{errorMessage}</p>
              <button 
                onClick={() => startConversation()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
              >
                Ulangi 🔄
              </button>
            </div>
          ) : status === AppStatus.PAUSED ? (
            <div className="animate-fade-in-up">
              <h2 className="text-xl md:text-3xl font-bold text-slate-500">Istirahat Sejenak 💤</h2>
            </div>
          ) : (
            <div className={`space-y-1 transition-all duration-500 ${isContentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <h2 className={`text-xl md:text-3xl font-bold ${isAiSpeaking ? 'text-blue-600' : 'text-slate-400'}`}>
                {isAiSpeaking ? `${character.name} sedang bicara...` : isMuted ? 'Mikrofon Mati' : 'Silakan bicara!'}
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Control Footer */}
      <div className={`w-full p-6 md:p-10 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] md:rounded-t-[3.5rem] z-30 transition-all duration-700 ${isWorkingState ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-md mx-auto flex flex-col items-center gap-6">
          
          {/* Visualizer */}
          <div className="flex items-end justify-center gap-1.5 h-10 w-full">
            {!isMuted && status === AppStatus.CONNECTED && [...Array(7)].map((_, i) => {
              const distanceFromCenter = Math.abs(i - 3);
              const heightVal = Math.max(15, userVolume * (100 - distanceFromCenter * 20) * 1.5);
              return (
                <div 
                  key={i}
                  className="w-2.5 md:w-3 rounded-full transition-all duration-100"
                  style={{ 
                    height: `${heightVal}%`,
                    backgroundColor: userVolume > 0.6 ? '#facc15' : userVolume > 0.3 ? '#fb923c' : '#f87171',
                    opacity: 0.5 + userVolume * 0.5
                  }}
                ></div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 md:gap-12 w-full">
            <button
              onClick={handleTogglePause}
              className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all shadow-md active:scale-90 border-2 border-white ${
                status === AppStatus.PAUSED ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {status === AppStatus.PAUSED ? (
                <svg className="w-6 h-6 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg className="w-6 h-6 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              )}
            </button>

            <button 
              onClick={handleToggleMute}
              disabled={status === AppStatus.PAUSED}
              className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl transform active:scale-95 border-4 md:border-8 border-white ring-8 ${
                isMuted || status === AppStatus.PAUSED
                ? 'bg-slate-200 text-slate-500 ring-slate-100' 
                : 'bg-red-500 text-white ring-red-100'
              }`}
            >
              {!isMuted && userVolume > 0.1 && status === AppStatus.CONNECTED && (
                <div className="absolute -inset-4 border-2 border-red-200 rounded-full animate-ping opacity-30"></div>
              )}
              {isMuted || status === AppStatus.PAUSED ? (
                <svg className="w-10 h-10 md:w-14 md:h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z M1 1l22 22" />
                </svg>
              ) : (
                <svg className="w-10 h-10 md:w-14 md:h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            <div className="w-14 h-14 md:w-20 md:h-20 flex items-center justify-center opacity-40">
               <span className="text-2xl">{character.emoji}</span>
            </div>
          </div>

          <p className={`text-[10px] md:text-sm font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isMuted || status === AppStatus.PAUSED ? 'text-slate-400' : 'text-red-500'}`}>
            {status === AppStatus.PAUSED ? 'Percakapan Berhenti' : isMuted ? 'Mikrofon Mati' : 'Mikrofon Aktif'}
          </p>
        </div>
      </div>

      <div className="absolute top-20 left-4 opacity-[0.03] pointer-events-none text-6xl rotate-12">☁️</div>
      <div className="absolute top-1/2 -right-6 opacity-[0.03] pointer-events-none text-7xl -rotate-12">🌈</div>
    </div>
  );
};

const App = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#f0f9ff]">
        {!profile ? (
          <SetupScreen onStart={setProfile} />
        ) : (
          <ChatScreen profile={profile} onBack={() => setProfile(null)} />
        )}
      </div>
    </HashRouter>
  );
};

export default App;

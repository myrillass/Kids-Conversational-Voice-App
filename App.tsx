
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

// Helper to check for external API key dialog
const checkApiKey = async () => {
  if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

const openKeyPicker = async () => {
  if (typeof (window as any).aistudio?.openSelectKey === 'function') {
    await (window as any).aistudio.openSelectKey();
    return true;
  }
  return false;
};

const SetupScreen = ({ onStart }: { onStart: (profile: UserProfile) => void }) => {
  const [name, setName] = useState('');
  const [selectedChar, setSelectedChar] = useState<CharacterType>('Luna');
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkApiKey().then(setHasKey);
  }, []);

  const handleStart = async () => {
    playPopSound();
    if (!hasKey) {
      const opened = await openKeyPicker();
      if (!opened && !process.env.API_KEY) {
        alert("Maaf, aplikasi butuh 'Kunci Ajaib' untuk mulai bicara. Silakan hubungkan kuncinya ya!");
        return;
      }
    }
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

        {!hasKey && hasKey !== null && (
          <p className="mt-6 text-xs text-blue-400 font-bold uppercase tracking-widest animate-pulse">
            * Memerlukan Kunci Ajaib untuk bicara
          </p>
        )}
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
    if (audioContextInRef.current) { try { audioContextInRef.current.close(); } catch(e) {} audioContextInRef.current = null; }
    if (audioContextOutRef.current) { try { audioContextOutRef.current.close(); } catch(e) {} audioContextOutRef.current = null; }
    setStatus(AppStatus.IDLE);
    setIsAiSpeaking(false);
  }, []);

  const startConversation = async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setErrorMessage(null);

    try {
      setStatus(AppStatus.CONNECTING);
      
      // Inisialisasi API dengan kunci terbaru
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
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
            
            setTimeout(() => {
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  text: `OVERRIDE SYSTEM PERSONA: Halo, namaku ${character.fullName}. Temanku ${profile.name} (5th) sudah datang! SAPA DIA SEKARANG dengan 2 kalimat ceria dan ajak dia bicara tentang ${character.prompt}. Ingat: Gunakan bahasa anak-anak yang sangat sederhana.`
                });
              }).catch(() => {});
            }, 150);

            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMutedRef.current || statusRef.current !== AppStatus.CONNECTED) { setUserVolume(0); return; }
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setUserVolume(Math.min(Math.sqrt(sum / inputData.length) * 10, 1));
              
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => { 
                if (statusRef.current === AppStatus.CONNECTED) session.sendRealtimeInput({ media: pcmBlob }); 
              }).catch(() => {});
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current) {
              setIsAiSpeaking(true);
              const ctx = audioContextOutRef.current;
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
              } catch (err) {}
            }
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiSpeaking(false);
            }
          },
          onerror: (e: any) => { 
            isConnectingRef.current = false;
            const msg = e?.message || "";
            if (msg.includes('Requested entity was not found')) {
              setErrorMessage('Kunci ajaibnya perlu diperbarui. Ayo klik tombol di bawah!');
              openKeyPicker();
            } else if (msg.includes('Network error')) {
              setErrorMessage('Sinyal kita sedang lemah. Cek internetmu ya!');
            } else {
              setErrorMessage('Waduh, koneksi terputus! Coba tekan tombol ulangi.');
            }
            setStatus(AppStatus.ERROR); 
          },
          onclose: () => { 
            isConnectingRef.current = false;
            if (statusRef.current !== AppStatus.ERROR) setStatus(AppStatus.IDLE); 
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      isConnectingRef.current = false;
      setErrorMessage('Gagal memanggil temanmu. Ayo coba tekan tombol ulangi!');
      setStatus(AppStatus.ERROR); 
    }
  };

  useEffect(() => {
    startConversation();
    return () => stopConversation();
  }, []);

  const handleBack = () => { playPopSound(); stopConversation(); onBack(); };

  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-between overflow-hidden">
      <div className={`w-full p-4 ${character.color} text-white flex items-center justify-between shadow-md z-30`}>
        <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
        <span className="font-bold text-xl">{character.name}</span>
        <button onClick={handleBack} className="px-4 py-2 bg-white/20 rounded-full font-bold">Berhenti 👋</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className={`text-[12rem] transition-all duration-700 transform ${isAiSpeaking ? 'scale-110 glow-active' : 'float-animation'} ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
          {character.emoji}
        </div>
        
        <div className="mt-8 text-center px-6 min-h-[4rem]">
          {status === AppStatus.CONNECTING ? (
            <div className="animate-pulse text-blue-500 font-bold">Menghubungkan Keajaiban...</div>
          ) : status === AppStatus.ERROR ? (
            <div className="space-y-4">
              <p className="text-red-500 font-bold">{errorMessage}</p>
              <button onClick={() => startConversation()} className="bg-blue-500 text-white px-8 py-3 rounded-full font-bold shadow-lg">Ulangi 🔄</button>
            </div>
          ) : (
            <h2 className={`text-2xl font-bold ${isAiSpeaking ? 'text-blue-600' : 'text-slate-400'}`}>
              {isAiSpeaking ? `${character.name} bicara...` : isMuted ? 'Mikrofon Mati' : 'Silakan bicara!'}
            </h2>
          )}
        </div>
      </div>

      <div className="w-full p-8 bg-white shadow-2xl rounded-t-[3rem] z-30">
        <div className="max-w-xs mx-auto flex flex-col items-center gap-6">
          <button 
            onClick={() => { playToggleSound(!isMuted); setIsMuted(!isMuted); }}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl border-8 border-white ring-8 ${isMuted ? 'bg-slate-200 text-slate-500 ring-slate-100' : 'bg-red-500 text-white ring-red-100'}`}
          >
            {isMuted ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z M1 1l22 22" /></svg>
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            )}
          </button>
          <p className={`font-black uppercase tracking-widest ${isMuted ? 'text-slate-400' : 'text-red-500'}`}>{isMuted ? 'Mati' : 'Mikrofon Aktif'}</p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  return (
    <div className="min-h-screen bg-[#f0f9ff]">
      {!profile ? <SetupScreen onStart={setProfile} /> : <ChatScreen profile={profile} onBack={() => setProfile(null)} />}
    </div>
  );
};

export default App;

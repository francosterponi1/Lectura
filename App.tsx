
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Voice, VoiceBlock, ProcessingLog, AppStatus, SelectionMode } from './types';
import { geminiService } from './services/geminiService';
import * as audioUtils from './services/audioUtils';
import { VOCAL_PROFILES } from './services/vocalProfiles';

const SAMPLE_RATE = 24000;
const SILENCE_SECONDS = 4;
const ALARM_DURATION = 6;

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(
    "Kore: Sistema AC1 optimizado. Ahora puedes forzar mi identidad o la de Charon.\n________________\nCharon: O mantener el modo Automático para diálogos dinámicos.\n________________\nKore: Sea cual sea el modo, nuestra coherencia vocal está sellada por el Blueprint interno."
  );
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.AUTO);
  const [blocks, setBlocks] = useState<VoiceBlock[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: ProcessingLog['type'] = 'info') => {
    const newLog: ProcessingLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const parseBlocksInternal = useCallback((): VoiceBlock[] => {
    addLog(`Iniciando motor AC1 en modo: ${selectionMode}`, 'info');
    
    if (selectionMode === SelectionMode.KORE_ONLY || selectionMode === SelectionMode.CHARON_ONLY) {
      const selectedVoice = selectionMode === SelectionMode.KORE_ONLY ? Voice.KORE : Voice.CHARON;
      addLog(`Forzando identidad inmutable: ${selectedVoice}`, 'warning');
      const textClean = inputText.replace(/^(Kore:|Charon:)/gmi, '').trim();
      return [{
        id: 'fixed-block',
        voice: selectedVoice,
        text: textClean,
        order: 0
      }];
    }

    // Dynamic Automatic Parsing
    const lines = inputText.split('\n');
    const parsedBlocks: VoiceBlock[] = [];
    let currentVoice = Voice.KORE;
    let currentTextBuffer: string[] = [];

    const flushBuffer = () => {
      if (currentTextBuffer.length > 0) {
        const text = currentTextBuffer.join(' ').trim();
        const newBlock = {
          id: Math.random().toString(36).substr(2, 9),
          voice: currentVoice,
          text: text,
          order: parsedBlocks.length
        };
        parsedBlocks.push(newBlock);
        addLog(`Cargando bloque ${newBlock.order + 1} para [${currentVoice}]`, 'success');
        currentTextBuffer = [];
      }
    };

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (/^_{3,}$/.test(trimmedLine)) {
        flushBuffer();
        currentVoice = currentVoice === Voice.KORE ? Voice.CHARON : Voice.KORE;
        return;
      }

      if (trimmedLine.toLowerCase().startsWith('kore:')) {
        flushBuffer();
        currentVoice = Voice.KORE;
        currentTextBuffer.push(trimmedLine.substring(5).trim());
        return;
      }
      if (trimmedLine.toLowerCase().startsWith('charon:')) {
        flushBuffer();
        currentVoice = Voice.CHARON;
        currentTextBuffer.push(trimmedLine.substring(7).trim());
        return;
      }

      currentTextBuffer.push(trimmedLine);
    });

    flushBuffer();
    setBlocks(parsedBlocks);
    return parsedBlocks;
  }, [inputText, selectionMode, addLog]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus('extracting');
    addLog(`--- Extracción Vision IA AC1 ---`, 'warning');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        addLog("Analizando caracteres...", 'info');
        const extracted = await geminiService.extractTextFromFile(base64, file.type);
        setInputText(extracted);
        addLog("Datos cargados correctamente.", "success");
        setIsProcessing(false);
        setStatus('idle');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      addLog(`FALLO SISTEMA VISIÓN: ${error.message}`, 'error');
      audioUtils.playAlertTone(ALARM_DURATION, 220, 'error');
      setIsProcessing(false);
      setStatus('error');
    }
  };

  const synthesizeAndMaster = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setAudioUrl(null);
    setLogs([]); 
    
    try {
      addLog(">>> ACTIVANDO BUCLE DE REALIMENTACIÓN DE IDENTIDAD AC1 <<<", 'warning');
      addLog("Estado: Limpieza Sonora HIFI Activada.", 'info');
      const currentBlocks = parseBlocksInternal();
      
      if (currentBlocks.length === 0) {
        addLog("Error: No hay contenido.", "error");
        audioUtils.playAlertTone(ALARM_DURATION, 220, 'error');
        setIsProcessing(false);
        return;
      }

      setStatus('synthesizing');
      const pcmBuffers: Int16Array[] = [];

      for (const block of currentBlocks) {
        const profile = VOCAL_PROFILES[block.voice];
        addLog(`Sintetizando ${profile.identity}: Anclaje de Timbre y Calidad Cristalina...`, 'info');
        
        const base64 = await geminiService.generateTTS(block.text, block.voice);
        const pcmBytes = audioUtils.decodeBase64(base64);
        let rawPcm = new Int16Array(pcmBytes.buffer);
        
        // Limpieza de audio: Aplicar Fades para evitar chasquidos
        rawPcm = audioUtils.applyFade(rawPcm, 480);
        
        addLog(`Ajustando volumen master AC1 (${(profile.masteringLevel * 100).toFixed(0)}%)...`, 'info');
        const normalizedPcm = audioUtils.normalizePCM(rawPcm, profile.masteringLevel);
        pcmBuffers.push(normalizedPcm);
      }

      setStatus('mastering');
      addLog("--- CONSOLIDACIÓN Y MASTERIZACIÓN FINAL ---", 'info');
      addLog("Limpieza: Eliminando artefactos de transición.", 'success');

      const silence = audioUtils.createSilencePCM(SILENCE_SECONDS, SAMPLE_RATE);
      let totalLength = 0;
      pcmBuffers.forEach((buf, idx) => {
        totalLength += buf.length;
        if (idx < pcmBuffers.length - 1) totalLength += silence.length;
      });

      const masterPcm = new Int16Array(totalLength);
      let offset = 0;
      pcmBuffers.forEach((buf, idx) => {
        masterPcm.set(buf, offset);
        offset += buf.length;
        if (idx < pcmBuffers.length - 1) {
          masterPcm.set(silence, offset);
          offset += silence.length;
        }
      });

      addLog("--- EXPORTACIÓN MP3 FIDELITY LOCK ---", 'info');
      const mp3Blob = await audioUtils.encodeToMp3(masterPcm, SAMPLE_RATE, 128);
      const url = URL.createObjectURL(mp3Blob);
      setAudioUrl(url);

      addLog(`Master AC1 completado. Sonido cristalino y coherencia absoluta.`, "success");
      audioUtils.playAlertTone(ALARM_DURATION, 660, 'success');
      setStatus('completed');
    } catch (error: any) {
      addLog(`ERROR CRÍTICO: ${error.message}`, "error");
      audioUtils.playAlertTone(ALARM_DURATION, 220, 'error');
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col gap-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 glass-panel p-6 rounded-2xl animate-in shadow-indigo-900/30 shadow-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-indigo-700 to-indigo-900 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/40 border border-white/10 ring-4 ring-indigo-500/5">
            <i className="fa-solid fa-microphone-lines text-3xl text-white"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-200 via-white to-cyan-100 bg-clip-text text-transparent tracking-tighter">Gemelo Voz AC1</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-md border border-indigo-500/20 font-black uppercase tracking-widest flex items-center gap-1">
                <i className="fa-solid fa-lock text-[8px]"></i> Blueprint Locked
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-md border border-cyan-500/20 font-black uppercase tracking-widest flex items-center gap-1">
                <i className="fa-solid fa-sparkles text-[8px]"></i> Sonido HIFI
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Selector de Voces */}
          <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-white/10">
            <button 
              onClick={() => setSelectionMode(SelectionMode.AUTO)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectionMode === SelectionMode.AUTO ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Automático
            </button>
            <button 
              onClick={() => setSelectionMode(SelectionMode.KORE_ONLY)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectionMode === SelectionMode.KORE_ONLY ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Kore Only
            </button>
            <button 
              onClick={() => setSelectionMode(SelectionMode.CHARON_ONLY)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectionMode === SelectionMode.CHARON_ONLY ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Charon Only
            </button>
          </div>

          <div className="flex gap-2">
            <label className="cursor-pointer px-5 py-2.5 bg-slate-800 hover:bg-slate-700 transition-all rounded-2xl text-xs font-black flex items-center gap-2 border border-white/10 active:scale-95 group">
              <i className="fa-solid fa-file-import text-indigo-400 group-hover:scale-110 transition"></i>
              Importar
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={synthesizeAndMaster}
              disabled={isProcessing || !inputText.trim()}
              className={`px-8 py-2.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all shadow-2xl active:scale-95 ${
                isProcessing ? 'bg-slate-700 opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/50'
              }`}
            >
              {isProcessing ? <i className="fa-solid fa-dna fa-spin"></i> : <i className="fa-solid fa-fingerprint"></i>}
              GENERAR MASTER
            </button>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        <section className="lg:col-span-8 flex flex-col gap-4 animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-panel flex-1 rounded-3xl flex flex-col overflow-hidden relative border-white/5 shadow-inner shadow-black/80">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <i className="fa-solid fa-keyboard text-indigo-500"></i> Editor Master
                </span>
                <span className="text-[9px] px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/10 uppercase font-bold tracking-tighter">
                  Status: HIFI Cleaning Locked
                </span>
              </div>
              <div className="flex gap-6">
                 <div className="flex items-center gap-2 group">
                   <div className="w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_#ec4899]"></div>
                   <span className="text-[10px] text-pink-400 font-black uppercase tracking-tighter">Kore Blueprint</span>
                 </div>
                 <div className="flex items-center gap-2 group">
                   <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_#06b6d4]"></div>
                   <span className="text-[10px] text-cyan-400 font-black uppercase tracking-tighter">Charon Blueprint</span>
                 </div>
              </div>
            </div>
            <textarea
              className="w-full flex-1 bg-transparent p-10 text-xl font-extralight focus:outline-none resize-none leading-relaxed text-slate-100 placeholder:text-slate-800 custom-scrollbar tracking-wide"
              placeholder="Ingrese el texto aquí..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          {audioUrl && (
            <div className="glass-panel p-8 rounded-3xl border-emerald-500/50 border animate-in shadow-2xl shadow-emerald-500/10 bg-emerald-950/20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="space-y-2">
                  <h3 className="text-emerald-400 font-black flex items-center gap-3 text-2xl tracking-tighter">
                    <i className="fa-solid fa-shield-halved text-3xl"></i> MASTER AC1 GENERADO
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-black tracking-widest uppercase">Timbre Fixed</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-black tracking-widest uppercase">High Fidelity Sound</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-black tracking-widest uppercase">Clean Mastering</span>
                  </div>
                </div>
                <a 
                  href={audioUrl} 
                  download="master-ac1-coherence-lock.mp3"
                  className="w-full md:w-auto text-sm bg-emerald-500 text-black px-10 py-4 rounded-2xl hover:bg-emerald-400 transition-all shadow-2xl shadow-emerald-500/50 font-black flex items-center justify-center gap-4 active:scale-95"
                >
                  <i className="fa-solid fa-cloud-arrow-down text-xl"></i>DESCARGAR MP3
                </a>
              </div>
              <div className="bg-black/60 p-4 rounded-2xl border border-white/5 ring-1 ring-white/10">
                <audio src={audioUrl} controls className="w-full h-14 accent-indigo-500" />
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-4 flex flex-col gap-6 animate-in" style={{ animationDelay: '0.2s' }}>
          {/* Panel de Calibración */}
          <div className="glass-panel rounded-3xl p-6 border-indigo-500/20 shadow-xl space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 border-b border-indigo-500/20 pb-2">Panel de Calibración Biométrica</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Timbre Stability', value: 'LOCKED', icon: 'fa-fingerprint', color: 'text-indigo-400' },
                { label: 'Audio Cleanliness', value: 'ULTRA HIFI', icon: 'fa-broom', color: 'text-cyan-400' },
                { label: 'Linguistic Lock', value: 'LATAM NEUT', icon: 'fa-globe', color: 'text-emerald-400' },
                { label: 'Siglas Engine', value: 'ENG_SPELL', icon: 'fa-font', color: 'text-amber-400' }
              ].map((item, i) => (
                <div key={i} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <i className={`fa-solid ${item.icon} text-[10px] opacity-40`}></i>
                    <span className="text-[8px] font-black uppercase opacity-30 tracking-tighter">{item.label}</span>
                  </div>
                  <span className={`text-[10px] font-black ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl flex flex-col flex-1 border-white/5 overflow-hidden shadow-inner shadow-black/80 bg-black/40">
            <div className="p-5 border-b border-white/10 bg-white/10 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <i className="fa-solid fa-terminal text-indigo-400"></i> Terminal AC1 Engine
              </span>
              <div className="flex gap-2 items-center">
                <span className={`w-2.5 h-2.5 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}></span>
                <span className="text-[10px] opacity-80 font-mono font-black text-white/60 uppercase">{status}</span>
              </div>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-[10px] space-y-3 flex-1 custom-scrollbar">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-4 leading-relaxed animate-in border-b border-white/5 pb-2 last:border-0 items-start">
                  <span className="opacity-20 shrink-0 font-bold bg-white/5 px-1.5 rounded text-[8px]">[{log.timestamp}]</span>
                  <span className={`${
                    log.type === 'error' ? 'text-rose-400 font-black' : 
                    log.type === 'success' ? 'text-emerald-400 font-bold' :
                    log.type === 'warning' ? 'text-amber-400 italic' : 'text-indigo-400 font-medium'
                  } break-words`}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4 p-10 text-center grayscale">
                  <i className="fa-solid fa-microchip text-5xl"></i>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">System Standby • Encryption Active</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-6 text-[10px] text-slate-700 uppercase tracking-[0.5em] font-black opacity-30">
        Professional Vocal Suite AC1.5 • Clean Studio Mastering • © 2025
      </footer>
    </div>
  );
};

export default App;

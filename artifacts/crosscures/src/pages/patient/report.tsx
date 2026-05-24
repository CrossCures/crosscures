import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { HeartPulse, PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2, CheckCircle2 } from "lucide-react";
import { patientApi } from "@/lib/api";
import { speakText } from "@/lib/cartesia";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import PatientLayout from "@/components/PatientLayout";

function stripMarkdown(text: string): string {
  return text.replace(/#{1,6}\s+/g, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^[-*+]\s+/gm, "").replace(/---+/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

type Message = { id: string; role: "user" | "assistant" | "system"; content: string; timestamp: string };

export default function ReportPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isSpeakingRef = useRef(false);
  const micMutedRef = useRef(false);
  const loadingRef = useRef(false);
  const sessionCompleteRef = useRef(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTextRef = useRef("");
  const startRecognitionRef = useRef<() => void>(() => {});

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { sessionCompleteRef.current = sessionComplete; }, [sessionComplete]);
  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { return () => { recognitionRef.current?.stop(); if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }; }, []);

  const addMessage = (role: Message["role"], content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, content, timestamp: new Date().toISOString() }]);
  };

  const sendMessage = useCallback(async (text: string) => {
    const sid = sessionIdRef.current;
    if (!text.trim() || !sid || loadingRef.current || sessionCompleteRef.current) return;
    setLiveTranscript("");
    addMessage("user", text);
    loadingRef.current = true; setLoading(true);
    recognitionRef.current?.stop();
    try {
      const res = await patientApi.sendHealthReportTurn(sid, text);
      const content = stripMarkdown(res.data.content);
      addMessage("assistant", content);
      if (res.data.session_complete) { setSessionComplete(true); sessionCompleteRef.current = true; }
      if (ttsEnabled) {
        isSpeakingRef.current = true; setTtsPlaying(true);
        try { await speakText(content); } finally { setTtsPlaying(false); isSpeakingRef.current = false; }
      }
    } catch { addMessage("assistant", "I'm sorry, I couldn't process that. Please try again."); }
    finally {
      loadingRef.current = false; setLoading(false);
      if (sessionIdRef.current && !micMutedRef.current && !sessionCompleteRef.current) startRecognitionRef.current();
    }
  }, [ttsEnabled]);

  const scheduleSend = useCallback((text: string) => {
    pendingTextRef.current = pendingTextRef.current ? `${pendingTextRef.current} ${text}` : text;
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      const t = pendingTextRef.current.trim();
      pendingTextRef.current = "";
      if (t) sendMessage(t);
    }, 3500);
  }, [sendMessage]);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try { recognitionRef.current?.stop(); } catch {}
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e: any) => {
      if (isSpeakingRef.current || micMutedRef.current) return;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) { const text = e.results[i][0].transcript.trim(); if (text) scheduleSend(text); }
        else interim += e.results[i][0].transcript;
      }
      setLiveTranscript(interim);
    };
    rec.onerror = (e: any) => { if (e.error !== "no-speech" && e.error !== "aborted") console.warn("[Report STT] error:", e.error); };
    rec.onend = () => {
      if (sessionIdRef.current && !isSpeakingRef.current && !micMutedRef.current && !loadingRef.current && !sessionCompleteRef.current) try { rec.start(); } catch {}
    };
    rec.start();
    recognitionRef.current = rec;
  }, [scheduleSend]);

  useEffect(() => { startRecognitionRef.current = startRecognition; }, [startRecognition]);

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await patientApi.startHealthReportSession();
      const sid = res.data.session_id;
      const firstMsg = res.data.initial_message || "Hi, I'm here to help you report a health condition. Please describe what you're experiencing.";
      setSessionId(sid); sessionIdRef.current = sid;
      addMessage("assistant", firstMsg);
      if (ttsEnabled) {
        isSpeakingRef.current = true; setTtsPlaying(true);
        try { await speakText(firstMsg); } finally { setTtsPlaying(false); isSpeakingRef.current = false; }
      }
      setTimeout(() => startRecognition(), 300);
    } catch (e: any) {
      addMessage("system", `Could not start session: ${e.response?.data?.detail || e.message}`);
    } finally { setStarting(false); }
  };

  const endSession = async () => {
    if (pauseTimerRef.current) { clearTimeout(pauseTimerRef.current); pauseTimerRef.current = null; }
    pendingTextRef.current = "";
    recognitionRef.current?.stop(); recognitionRef.current = null;
    if (sessionId) { try { await patientApi.endHealthReportSession(sessionId); } catch {} }
    addMessage("system", "Report saved. Your doctor will review this before your appointment.");
    setSessionId(null); sessionIdRef.current = null;
    setLiveTranscript("");
  };

  const newReport = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pendingTextRef.current = "";
    recognitionRef.current?.stop(); recognitionRef.current = null;
    setMessages([]); setSessionId(null); sessionIdRef.current = null;
    setSessionComplete(false); sessionCompleteRef.current = false;
    setLiveTranscript("");
  };

  const micStatus = micMuted ? "Muted" : ttsPlaying ? "Maria is speaking..." : loading ? "Thinking..." : liveTranscript ? "Hearing you..." : "Listening...";
  const micColor = micMuted ? "bg-slate-300" : ttsPlaying ? "bg-teal-400 animate-pulse" : loading ? "bg-amber-400 animate-pulse" : liveTranscript ? "bg-rose-500 animate-pulse" : "bg-green-400 animate-pulse";

  if (!user) return null;

  return (
    <PatientLayout>
      <div className="flex h-[calc(100vh-56px)] lg:h-screen max-w-4xl mx-auto">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shadow-sm">
                  <HeartPulse className="w-5 h-5 text-rose-600" />
                </div>
                {sessionId && !sessionComplete && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Report Health Condition</h1>
                <p className="text-xs text-slate-400">
                  {sessionComplete ? "Report complete" : sessionId ? "Maria is listening" : "Describe a symptom or concern to Maria"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTtsEnabled(!ttsEnabled)} className="p-2 rounded-xl border transition-all"
                style={ttsEnabled ? { borderColor: '#fecaca', color: '#dc2626', backgroundColor: '#fff1f2' } : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {sessionId && !sessionComplete && (
                <button onClick={endSession} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-all">
                  <PhoneOff className="w-4 h-4" /> End
                </button>
              )}
              {sessionComplete && (
                <button onClick={newReport} className="btn-secondary text-sm py-2 px-4">New Report</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-8">
                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center shadow-lg">
                  <HeartPulse className="w-10 h-10 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Report a Health Condition</h2>
                  <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                    Describe a symptom or concern to Maria. She'll ask follow-up questions and summarize the report for your doctor.
                  </p>
                </div>
                <button className="btn-primary" onClick={startSession} disabled={starting}
                  style={{ backgroundColor: '#dc2626' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
                >
                  {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><HeartPulse className="w-4 h-4" /> Start Report</>}
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3 animate-fade-in", msg.role === "user" ? "flex-row-reverse" : "flex-row", msg.role === "system" ? "justify-center" : "")}>
                {msg.role === "system" ? (
                  <div className="bg-slate-100 text-slate-500 text-xs rounded-xl px-4 py-2 max-w-sm text-center">{msg.content}</div>
                ) : (
                  <>
                    <div className={cn("w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold", msg.role === "user" ? "gradient-bg text-white" : "bg-rose-100 text-rose-700")}>
                      {msg.role === "user" ? "Y" : "M"}
                    </div>
                    <div className={cn("max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm", msg.role === "user" ? "gradient-bg text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-800 rounded-tl-none")}>
                      {msg.content}
                    </div>
                  </>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 text-sm font-bold flex-shrink-0">M</div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            {sessionComplete && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-semibold text-slate-900">Report complete</p>
                <p className="text-sm text-slate-500 mt-1">Your doctor will review this before your appointment.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {sessionId && !sessionComplete && (
            <div className="bg-white border-t border-slate-100 px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", micColor)} />
                <span className="text-xs text-slate-500">{micStatus}</span>
                {liveTranscript && <span className="text-xs text-slate-400 italic truncate flex-1">{liveTranscript}</span>}
                <button onClick={() => { const next = !micMuted; setMicMuted(next); micMutedRef.current = next; if (next) { recognitionRef.current?.stop(); setLiveTranscript(""); } else startRecognition(); }}
                  className={cn("ml-auto p-1.5 rounded-lg transition-all", micMuted ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600")}>
                  {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PatientLayout>
  );
}

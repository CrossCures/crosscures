import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Phone, PhoneOff, Volume2, VolumeX, Mic, MicOff, Loader2 } from "lucide-react";
import { patientApi } from "@/lib/api";
import { speakText } from "@/lib/cartesia";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import PatientLayout from "@/components/PatientLayout";

const WAKE_WORD = "maria";

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Message = { id: string; role: "user" | "assistant" | "system"; content: string; timestamp: string };
type TranscriptEntry = { id: string; text: string; time: string; triggered: boolean };

export default function ClinicPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [wakeDetected, setWakeDetected] = useState(false);
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isSpeakingRef = useRef(false);
  const micMutedRef = useRef(false);
  const loadingRef = useRef(false);
  const sendMessageRef = useRef<(text?: string) => void>(() => {});
  const startRecognitionRef = useRef<() => void>(() => {});

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  const addMessage = (role: Message["role"], content: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role, content, timestamp: new Date().toISOString() }]);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    const sid = sessionIdRef.current;
    if (!content || !sid || loadingRef.current) return;

    setInput("");
    setLiveTranscript("");
    setWakeDetected(false);
    addMessage("user", content);
    loadingRef.current = true;
    setLoading(true);
    recognitionRef.current?.stop();

    try {
      const res = await patientApi.sendClinicTurn(sid, content);
      const agentContent = stripMarkdown(res.data.content);
      addMessage("assistant", agentContent);
      if (ttsEnabled) {
        isSpeakingRef.current = true;
        setTtsPlaying(true);
        try { await speakText(agentContent); } finally { setTtsPlaying(false); isSpeakingRef.current = false; }
      }
    } catch {
      addMessage("assistant", "I'm having trouble right now. Please try again.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      if (sessionIdRef.current && !micMutedRef.current) startRecognitionRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, ttsEnabled]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try { recognitionRef.current?.stop(); } catch {}

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      if (isSpeakingRef.current || micMutedRef.current) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) continue;
          const triggered = text.toLowerCase().includes(WAKE_WORD);
          const afterWake = triggered ? text.replace(/^.*?maria[,!?\s]*/i, "").trim() : "";
          setTranscriptLog(prev => [...prev, { id: Date.now().toString(), text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), triggered }]);
          setLiveTranscript("");
          if (triggered) {
            setWakeDetected(true);
            if (afterWake.length > 2) setTimeout(() => sendMessageRef.current(afterWake), 300);
          }
        } else {
          interim += result[0].transcript;
          setLiveTranscript(interim);
        }
      }
    };

    recognition.onerror = (e: any) => { if (e.error === "no-speech" || e.error === "aborted") return; };
    recognition.onend = () => {
      if (sessionIdRef.current && !isSpeakingRef.current && !micMutedRef.current && !loadingRef.current) {
        try { recognition.start(); } catch {}
      }
    };
    recognition.start();
    recognitionRef.current = recognition;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { startRecognitionRef.current = startRecognition; }, [startRecognition]);

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await patientApi.startClinicSession({ audio_enabled: true });
      const sid = res.data.session_id;
      setSessionId(sid);
      sessionIdRef.current = sid;
      const greeting = "Hi, I'm Maria, your clinic companion. Just say my name to get started.";
      addMessage("assistant", greeting);
      if (ttsEnabled) {
        isSpeakingRef.current = true;
        setTtsPlaying(true);
        try { await speakText(greeting); } finally { setTtsPlaying(false); isSpeakingRef.current = false; }
      }
      setTimeout(() => startRecognition(), 300);
    } catch (e: any) {
      addMessage("system", `Failed to start session: ${e.response?.data?.detail || e.message}`);
    } finally {
      setStarting(false);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    try { await patientApi.endClinicSession(sessionId); addMessage("system", "Session ended. Thank you!"); } catch { addMessage("system", "Session ended."); }
    setSessionId(null);
    sessionIdRef.current = null;
    setLiveTranscript("");
    setWakeDetected(false);
    setTranscriptLog([]);
  };

  const toggleMic = () => {
    const next = !micMuted;
    setMicMuted(next);
    micMutedRef.current = next;
    if (next) { recognitionRef.current?.stop(); setLiveTranscript(""); } else startRecognition();
  };

  const micStatusLabel = micMuted ? "Muted" : ttsPlaying ? "Maria is speaking..." : loading ? "Thinking..." : liveTranscript ? "Hearing you..." : "Listening for Maria...";
  const micStatusColor = micMuted ? "bg-slate-300" : ttsPlaying ? "bg-teal-400 animate-pulse" : loading ? "bg-amber-400 animate-pulse" : liveTranscript ? "bg-blue-500 animate-pulse" : "bg-green-400 animate-pulse";

  return (
    <PatientLayout>
      <div className="flex h-[calc(100vh-56px)] lg:h-screen max-w-5xl mx-auto">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                {sessionId && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Maria</h1>
                <p className="text-xs text-slate-400">{sessionId ? "Clinic AI Companion · Active" : "Your Clinic AI Companion"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={cn("p-2 rounded-xl border transition-all", ttsEnabled ? "border-slate-200 text-slate-600 bg-slate-50" : "border-slate-200 text-slate-400")}
                style={ttsEnabled ? { borderColor: 'var(--color-crosscure-200)', color: 'var(--color-crosscure-600)', backgroundColor: 'var(--color-crosscure-50)' } : {}}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {sessionId && (
                <button
                  onClick={endSession}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-all"
                >
                  <PhoneOff className="w-4 h-4" /> End session
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pb-8">
                <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl">M</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Meet Maria</h2>
                  <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                    Your AI clinic companion. Say{" "}
                    <span className="font-semibold" style={{ color: 'var(--color-crosscure-600)' }}>"Maria"</span> to activate — she can recall your medications, symptoms, and help prepare questions for your doctor.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
                  {["Maria, what medications am I taking?", "Maria, what are my recent symptoms?", "Maria, help me prepare for my doctor visit"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { if (sessionId) sendMessage(s.replace(/^Maria, /i, "")); }}
                      className="text-sm text-left px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all disabled:opacity-40"
                      disabled={!sessionId}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {!sessionId && (
                  <button className="btn-primary" onClick={startSession} disabled={starting}>
                    {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><Phone className="w-4 h-4" /> Start Session with Maria</>}
                  </button>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3 animate-fade-in", msg.role === "user" ? "flex-row-reverse" : "flex-row", msg.role === "system" ? "justify-center" : "")}>
                {msg.role === "system" ? (
                  <div className="bg-slate-100 text-slate-500 text-xs rounded-xl px-4 py-2 max-w-sm text-center">{msg.content}</div>
                ) : (
                  <>
                    <div className={cn("w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold", msg.role === "user" ? "gradient-bg text-white" : "bg-teal-100 text-teal-700")}>
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
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold flex-shrink-0">M</div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {sessionId && (
            <>
              {liveTranscript && (
                <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 text-sm text-slate-500 italic">
                  {liveTranscript}
                </div>
              )}
              <div className="bg-white border-t border-slate-100 px-4 py-3 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", micStatusColor)} />
                  <span className="text-xs text-slate-500">{micStatusLabel}</span>
                  <button onClick={toggleMic} className={cn("ml-auto p-1.5 rounded-lg transition-all", micMuted ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    className="input-field flex-1 text-sm"
                    placeholder="Or type a message and press Enter..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                  />
                  <button className="btn-primary py-2 px-4 text-sm" onClick={() => sendMessage()} disabled={loading || !input.trim()}>Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </PatientLayout>
  );
}

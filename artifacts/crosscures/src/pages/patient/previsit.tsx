import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { PhoneCall, PhoneOff, Volume2, VolumeX, Mic, MicOff, Loader2, Plus, Check, Clock, ChevronRight } from "lucide-react";
import { patientApi } from "@/lib/api";
import { speakText } from "@/lib/cartesia";
import { useAuthStore } from "@/lib/store";
import { cn, formatDatetime } from "@/lib/utils";
import PatientLayout from "@/components/PatientLayout";

function stripMarkdown(text: string): string {
  return text.replace(/#{1,6}\s+/g, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/^[-*+]\s+/gm, "").replace(/---+/g, "").trim();
}

type Message = { id: string; role: "user" | "assistant" | "system"; content: string; timestamp: string };

function slotStatusBadge(status: string): string {
  switch (status) {
    case "scheduled": return "bg-blue-100 text-blue-700";
    case "in_progress": return "bg-green-100 text-green-700";
    case "completed": return "bg-slate-100 text-slate-600";
    case "missed": return "bg-red-100 text-red-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

export default function PrevisitPage() {
  const { user } = useAuthStore();
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const autoStart = location.includes("start=1");

  const [view, setView] = useState<"schedule" | "call">(autoStart ? "call" : "schedule");
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduling, setScheduling] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isSpeakingRef = useRef(false);
  const micMutedRef = useRef(false);
  const loadingRef = useRef(false);
  const startRecognitionRef = useRef<() => void>(() => {});

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  useEffect(() => {
    if (!user) return;
    patientApi.getPrevisitSlots().then((res) => setSlots(res.data.slots || [])).finally(() => setSlotsLoading(false));
  }, [user]);

  const addMessage = (role: Message["role"], content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, content, timestamp: new Date().toISOString() }]);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    const sid = sessionIdRef.current;
    if (!content || !sid || loadingRef.current) return;
    setInput(""); setLiveTranscript("");
    addMessage("user", content);
    loadingRef.current = true; setLoading(true);
    recognitionRef.current?.stop();
    try {
      const res = await patientApi.sendPrevisitTurn(sid, content);
      const agentContent = stripMarkdown(res.data.content);
      addMessage("assistant", agentContent);
      if (ttsEnabled) {
        isSpeakingRef.current = true; setTtsPlaying(true);
        try { await speakText(agentContent); } finally { setTtsPlaying(false); isSpeakingRef.current = false; }
      }
    } catch { addMessage("assistant", "I'm having trouble. Please try again."); }
    finally {
      loadingRef.current = false; setLoading(false);
      if (sessionIdRef.current && !micMutedRef.current) startRecognitionRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, ttsEnabled]);

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
        if (e.results[i].isFinal) {
          const text = e.results[i][0].transcript.trim();
          if (text) setTimeout(() => sendMessage(text), 100);
        } else interim += e.results[i][0].transcript;
      }
      setLiveTranscript(interim);
    };
    rec.onerror = (e: any) => { if (e.error !== "no-speech" && e.error !== "aborted") console.warn("STT error:", e.error); };
    rec.onend = () => {
      if (sessionIdRef.current && !isSpeakingRef.current && !micMutedRef.current && !loadingRef.current) try { rec.start(); } catch {}
    };
    rec.start();
    recognitionRef.current = rec;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { startRecognitionRef.current = startRecognition; }, [startRecognition]);

  const startCall = async (slotId?: string) => {
    setStarting(true);
    try {
      const res = await patientApi.startPrevisitSession(slotId ? { slot_id: slotId } : {});
      const sid = res.data.session_id;
      setSessionId(sid); sessionIdRef.current = sid;
      setView("call");
      const greeting = res.data.initial_message || "Hi, I'm Maria. I'll help you prepare for your upcoming appointment. How are you feeling today?";
      addMessage("assistant", greeting);
      if (ttsEnabled) {
        isSpeakingRef.current = true; setTtsPlaying(true);
        try { await speakText(greeting); } finally { setTtsPlaying(false); isSpeakingRef.current = false; }
      }
      setTimeout(() => startRecognition(), 300);
    } catch (e: any) {
      addMessage("system", `Could not start call: ${e.response?.data?.detail || e.message}`);
    } finally { setStarting(false); }
  };

  const endCall = async () => {
    recognitionRef.current?.stop(); recognitionRef.current = null;
    if (sessionId) { try { await patientApi.endPrevisitSession(sessionId); } catch {} }
    addMessage("system", "Pre-visit call ended. Summary saved.");
    setSessionId(null); sessionIdRef.current = null;
    setLiveTranscript("");
  };

  const scheduleCall = async () => {
    if (!scheduleDate) return;
    setScheduling(true);
    try {
      const scheduled_at = `${scheduleDate}T${scheduleTime}:00`;
      await patientApi.schedulePrevisit({ scheduled_at });
      const res = await patientApi.getPrevisitSlots();
      setSlots(res.data.slots || []);
      setScheduleDate("");
    } catch (e: any) {
      alert(e.response?.data?.detail || "Scheduling failed");
    } finally { setScheduling(false); }
  };

  const minDate = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  if (view === "call") {
    return (
      <PatientLayout>
        <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen max-w-3xl mx-auto">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-sm">
                  <PhoneCall className="w-5 h-5 text-white" />
                </div>
                {sessionId && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
              </div>
              <div>
                <h1 className="font-bold text-slate-900">Pre-Visit Call with Maria</h1>
                <p className="text-xs text-slate-400">{sessionId ? "Active session" : "Preparing..."}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTtsEnabled(!ttsEnabled)} className={cn("p-2 rounded-xl border transition-all")} style={ttsEnabled ? { borderColor: 'var(--color-crosscure-200)', color: 'var(--color-crosscure-600)', backgroundColor: 'var(--color-crosscure-50)' } : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {sessionId && (
                <button onClick={endCall} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-all">
                  <PhoneOff className="w-4 h-4" /> End call
                </button>
              )}
              <button onClick={() => setView("schedule")} className="text-sm text-slate-400 hover:text-slate-600">Back</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && !starting && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg">
                  <PhoneCall className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Ready to talk with Maria?</h2>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm">Maria will help you prepare for your upcoming appointment by collecting your symptoms, medications, and concerns.</p>
                </div>
                <button className="btn-primary" onClick={() => startCall()} disabled={starting}>
                  {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><PhoneCall className="w-4 h-4" /> Start Call</>}
                </button>
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
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-bold flex-shrink-0">M</div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {sessionId && (
            <div className="bg-white border-t border-slate-100 px-4 py-3 flex-shrink-0">
              {liveTranscript && <p className="text-xs text-slate-400 italic mb-2">{liveTranscript}</p>}
              <div className="flex items-center gap-2">
                <button onClick={() => { const next = !micMuted; setMicMuted(next); micMutedRef.current = next; if (next) { recognitionRef.current?.stop(); setLiveTranscript(""); } else startRecognition(); }}
                  className={cn("p-2 rounded-xl border transition-all", micMuted ? "bg-red-100 text-red-600 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                  {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <input
                  type="text"
                  className="input-field flex-1 text-sm"
                  placeholder="Or type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button className="btn-primary py-2 px-4 text-sm" onClick={() => sendMessage()} disabled={loading || !input.trim()}>Send</button>
              </div>
            </div>
          )}
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 lg:px-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pre-Visit Call</h1>
          <p className="text-slate-400 text-sm mt-1">Talk with Maria before your appointment</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <h2 className="section-title mb-2 flex items-center gap-2">
            <Plus className="w-4 h-4 text-slate-400" /> Schedule a Call
          </h2>
          <p className="text-sm text-slate-500 mb-4">Book your call up to 7 days in advance. Each slot is 15 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="date" min={minDate} max={maxDate} value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)} className="input-field flex-1" />
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="input-field w-36" />
            <button onClick={scheduleCall} disabled={!scheduleDate || scheduling} className="btn-primary flex items-center gap-2 flex-shrink-0 disabled:opacity-40">
              {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Book slot
            </button>
          </div>
        </div>

        <div>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Your Scheduled Slots
          </h2>
          {slotsLoading ? (
            <div className="flex items-center gap-3 text-slate-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : slots.length === 0 ? (
            <div className="metric-card text-center py-8 text-slate-400">
              <PhoneCall className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No slots scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((slot: any) => (
                <div key={slot.slot_id} className="metric-card flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-crosscure-50)' }}>
                      <PhoneCall className="w-5 h-5" style={{ color: 'var(--color-crosscure-500)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{formatDatetime(slot.scheduled_at)}</p>
                      <p className="text-xs text-slate-400">{slot.duration_minutes} min · Pre-Visit Call</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={cn("badge text-xs", slotStatusBadge(slot.status))}>
                      {slot.status === "in_progress" ? "In progress" : slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                    </span>
                    {(slot.status === "scheduled" || slot.status === "in_progress") && (
                      <button onClick={() => startCall(slot.slot_id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1" disabled={starting}>
                        {starting ? <Loader2 className="w-3 h-3 animate-spin" /> : <PhoneCall className="w-3 h-3" />}
                        Start
                      </button>
                    )}
                    {slot.status === "completed" && (
                      <span className="flex items-center gap-1 text-xs text-green-600"><Check className="w-3 h-3" /> Done</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
          <h3 className="font-semibold text-teal-900 text-sm mb-2">What to expect</h3>
          <ul className="text-sm text-teal-700 space-y-1.5">
            {["Maria will ask about your reason for the visit and current symptoms", "She'll collect your medication history, allergies, and past medical history", "The call takes 10–15 minutes and you can speak naturally", "All information is shared with your doctor before your appointment"].map(t => (
              <li key={t} className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 text-teal-500" />{t}
              </li>
            ))}
          </ul>
        </div>

        <button className="btn-primary w-full" onClick={() => startCall()} disabled={starting}>
          {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><PhoneCall className="w-4 h-4" /> Start Call Now</>}
        </button>
      </div>
    </PatientLayout>
  );
}

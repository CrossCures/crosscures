import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ClipboardList, Loader2, CheckCircle2, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { patientApi } from "@/lib/api";
import { speakText } from "@/lib/cartesia";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import PatientLayout from "@/components/PatientLayout";

export default function CheckinPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [checkin, setCheckin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    patientApi.getTodayCheckin()
      .then((res) => setCheckin(res.data))
      .catch(() => setCheckin(null))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!checkin) return;
    setSubmitting(true);
    try {
      const responseList = checkin.questions.map((q: any) => ({
        question_id: q.id,
        value: responses[q.id] ?? null,
        answered_at: new Date().toISOString(),
        skipped: responses[q.id] == null,
      }));
      await patientApi.submitCheckin({ responses: responseList });
      setSubmitted(true);
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to submit check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (q: any) => {
    switch (q.type) {
      case "scale":
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{q.min_label || q.scale_min}</span>
              <span>{q.max_label || q.scale_max}</span>
            </div>
            <input
              type="range"
              min={q.scale_min ?? 1}
              max={q.scale_max ?? 10}
              value={responses[q.id] ?? Math.round(((q.scale_min ?? 1) + (q.scale_max ?? 10)) / 2)}
              onChange={(e) => setResponses((r) => ({ ...r, [q.id]: Number(e.target.value) }))}
              className="w-full accent-current"
              style={{ accentColor: 'var(--color-crosscure-600)' }}
            />
            <div className="text-center text-2xl font-bold" style={{ color: 'var(--color-crosscure-700)' }}>
              {responses[q.id] ?? Math.round(((q.scale_min ?? 1) + (q.scale_max ?? 10)) / 2)}
            </div>
          </div>
        );
      case "boolean":
        return (
          <div className="flex gap-3">
            {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setResponses((r) => ({ ...r, [q.id]: opt.value }))}
                className={cn(
                  "flex-1 py-3 rounded-xl border-2 font-semibold transition-all",
                  responses[q.id] === opt.value ? "text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
                style={responses[q.id] === opt.value ? { borderColor: 'var(--color-crosscure-500)', backgroundColor: 'var(--color-crosscure-500)' } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      case "multiple_choice":
        return (
          <div className="space-y-2">
            {q.options?.map((opt: string) => (
              <button
                key={opt}
                onClick={() => setResponses((r) => ({ ...r, [q.id]: opt }))}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                  responses[q.id] === opt ? "text-white" : "border-slate-200 text-slate-700 hover:border-slate-300"
                )}
                style={responses[q.id] === opt ? { borderColor: 'var(--color-crosscure-500)', backgroundColor: 'var(--color-crosscure-500)' } : {}}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      default:
        return (
          <textarea
            rows={3}
            className="input-field resize-none"
            placeholder="Type your answer..."
            value={responses[q.id] ?? ""}
            onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
          />
        );
    }
  };

  return (
    <PatientLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Daily Check-in</h1>
            <p className="text-slate-400 text-sm mt-1">How are you feeling today?</p>
          </div>
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={cn("p-2 rounded-xl border transition-all", ttsEnabled ? "border-slate-200 text-slate-600 bg-slate-50" : "border-slate-200 text-slate-400 bg-white")}
            style={ttsEnabled ? { borderColor: 'var(--color-crosscure-200)', color: 'var(--color-crosscure-600)', backgroundColor: 'var(--color-crosscure-50)' } : {}}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-crosscure-500)' }} /></div>
        ) : submitted ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Check-in complete!</h2>
            <p className="text-slate-500">Your responses have been recorded. Your care team will review them.</p>
          </div>
        ) : !checkin || checkin.completion_status === "completed" ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Already complete</h2>
            <p className="text-slate-500">You've completed today's check-in. Great job!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {checkin.questions?.map((q: any, i: number) => (
              <div key={q.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: 'var(--color-crosscure-600)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{q.text}</p>
                    {q.subtext && <p className="text-sm text-slate-400 mt-0.5">{q.subtext}</p>}
                  </div>
                  {ttsEnabled && (
                    <button
                      onClick={() => speakText(q.text)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {renderQuestion(q)}
              </div>
            ))}
            <button
              className="btn-primary w-full text-base"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : "Submit Check-in"}
            </button>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}

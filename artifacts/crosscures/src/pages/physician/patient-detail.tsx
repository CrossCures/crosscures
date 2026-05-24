import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { ChevronLeft, FileText, Bell, ChevronRight, Loader2, AlertTriangle, Users } from "lucide-react";
import { physicianApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn, timeAgo, severityBadgeColor, getInitials } from "@/lib/utils";
import PhysicianLayout from "@/components/PhysicianLayout";

export default function PatientDetailPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/physician/patients/:patientId");
  const patientId = params?.patientId;
  const [briefs, setBriefs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!patientId) return;
    physicianApi.getPatients().then(async (res) => {
      const pts = res.data.patients || [];
      const pt = pts.find((p: any) => p.id === patientId);
      setPatient(pt);
      const [briefRes, alertRes] = await Promise.all([
        physicianApi.getPatientBriefs(patientId).catch(() => ({ data: { briefs: [] } })),
        physicianApi.getPatientAlerts(patientId).catch(() => ({ data: { alerts: [] } })),
      ]);
      setBriefs(briefRes.data.briefs || []);
      setAlerts(alertRes.data.alerts || []);
    }).finally(() => setLoading(false));
  }, [user, patientId, navigate]);

  if (loading) return (
    <PhysicianLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-crosscure-500)' }} /></div></PhysicianLayout>
  );

  return (
    <PhysicianLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={() => navigate("/physician/patients")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Patients
        </button>

        {patient && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 mb-8 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ backgroundColor: 'var(--color-crosscure-600)' }}>
              {getInitials(patient.full_name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.full_name}</h1>
              <p className="text-slate-400 text-sm">{patient.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" /> Alerts ({alerts.length})
              </h2>
            </div>
            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-slate-400 text-sm">No alerts</div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Link key={alert.alert_id} href={`/physician/alerts/${alert.alert_id}`}>
                    <div className={cn("bg-white rounded-2xl p-4 border hover:shadow-sm transition-all flex items-center gap-4 group", !alert.acknowledged_at ? "border-red-100 hover:border-red-200" : "border-slate-100")}>
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", alert.severity === "severe" ? "bg-red-100" : "bg-orange-100")}>
                        <Bell className={cn("w-4 h-4", alert.severity === "severe" ? "text-red-600" : "text-orange-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("badge text-xs", severityBadgeColor(alert.severity))}>{alert.severity}</span>
                          {!alert.acknowledged_at && <span className="badge bg-red-100 text-red-700 text-xs">Pending</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(alert.generated_at)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" /> Pre-Visit Briefs ({briefs.length})
              </h2>
            </div>
            {briefs.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center text-slate-400 text-sm">No briefs generated yet</div>
            ) : (
              <div className="space-y-3">
                {briefs.map((brief) => (
                  <Link key={brief.brief_id} href={`/physician/briefs/${brief.brief_id}`}>
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all flex items-center gap-4 group">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">Pre-visit brief</p>
                        <p className="text-xs text-slate-400">{timeAgo(brief.generated_at)}</p>
                      </div>
                      {brief.acknowledged_at ? (
                        <span className="badge bg-green-100 text-green-700 text-xs flex-shrink-0">Acknowledged</span>
                      ) : (
                        <span className="badge bg-amber-100 text-amber-700 text-xs flex-shrink-0">Unread</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PhysicianLayout>
  );
}

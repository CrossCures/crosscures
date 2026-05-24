import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { FileText, Upload, Loader2, Search } from "lucide-react";
import { patientApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import PatientLayout from "@/components/PatientLayout";

const RESOURCE_ICONS: Record<string, string> = {
  Condition: "🫀",
  Observation: "📊",
  MedicationRequest: "💊",
  Procedure: "🔬",
  AllergyIntolerance: "⚠️",
  Immunization: "💉",
  DiagnosticReport: "📋",
  Encounter: "🏥",
  default: "📄",
};

const RESOURCE_TYPES = ["All", "Condition", "Observation", "MedicationRequest", "Procedure", "AllergyIntolerance", "Immunization", "DiagnosticReport", "Encounter"];

export default function RecordsPage() {
  const { user } = useAuthStore();
  const [, navigate] = useLocation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadRecords();
  }, [user, navigate]);

  const loadRecords = () => {
    patientApi.getRecords().then((res) => {
      setRecords(res.data.records || []);
    }).finally(() => setLoading(false));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await patientApi.uploadRecords(formData);
      loadRecords();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = records.filter((r) => {
    const typeMatch = filter === "All" || r.resource_type === filter;
    const searchMatch = !search || r.display_text?.toLowerCase().includes(search.toLowerCase());
    return typeMatch && searchMatch;
  });

  return (
    <PatientLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Health Records</h1>
            <p className="text-slate-400 text-sm mt-1">{records.length} records</p>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept=".json,.pdf" className="hidden" onChange={handleUpload} />
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Record</>}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search records..."
              className="input-field pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field w-full sm:w-48"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {RESOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-crosscure-500)' }} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400">No records found</p>
            <p className="text-slate-300 text-sm mt-1">Upload your first health record above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((record) => (
              <div key={record.id} className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-xl flex-shrink-0">
                  {RESOURCE_ICONS[record.resource_type] || RESOURCE_ICONS.default}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{record.display_text}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="badge bg-slate-100 text-slate-600 text-xs">{record.resource_type}</span>
                    {record.occurred_at && <span className="text-xs text-slate-400">{formatDate(record.occurred_at)}</span>}
                    {record.source_name && <span className="text-xs text-slate-400 truncate hidden sm:block">{record.source_name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}

function resolveDefaultApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.trim()) return explicit.replace(/\/+$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain && domain.trim()) {
    const host = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return "";
}

let API_URL = resolveDefaultApiUrl();
let authTokenGetter: (() => string | null) | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setApiUrl(url: string) {
  API_URL = url.replace(/\/+$/, "");
}

export function setAuthTokenGetter(getter: () => string | null) {
  authTokenGetter = getter;
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export function getApiUrl(): string {
  return API_URL;
}

async function request<T = any>(
  method: string,
  path: string,
  options: { body?: any; query?: Record<string, any>; formData?: FormData } = {}
): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "API URL is not configured. Set EXPO_PUBLIC_API_URL to your FastAPI backend (or rely on EXPO_PUBLIC_DOMAIN for the default)."
    );
  }

  let url = `${API_URL}${path}`;
  if (options.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const q = params.toString();
    if (q) url += `?${q}`;
  }

  const headers: Record<string, string> = {};
  const token = authTokenGetter?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: any = undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url, { method, headers, body });

  if (res.status === 401) {
    unauthorizedHandler?.();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const txt = await res.text();
      detail = txt;
    } catch {}
    throw new Error(`HTTP ${res.status}: ${detail || res.statusText}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as any;
}

export const authApi = {
  register: (data: RegisterRequest) => request("POST", "/v1/auth/register", { body: data }),
  login: (data: LoginRequest) => request("POST", "/v1/auth/login", { body: data }),
  me: () => request("GET", "/v1/auth/me"),
  linkPhysician: (physician_email: string) =>
    request("POST", "/v1/auth/link-physician", { body: { physician_email } }),
};

export const patientApi = {
  getConsents: () => request("GET", "/v1/patient/consent"),
  grantConsent: (action: string) => request("POST", "/v1/patient/consent/grant", { body: { action } }),
  revokeConsent: (action: string) => request("POST", "/v1/patient/consent/revoke", { body: { action } }),

  uploadRecords: (formData: FormData) =>
    request("POST", "/v1/patient/records/upload", { formData }),
  getRecords: (params?: { resource_type?: string }) =>
    request("GET", "/v1/patient/records", { query: params }),

  getTodayCheckin: () => request("GET", "/v1/patient/checkin/today"),
  submitCheckin: (data: CheckinSubmitRequest) =>
    request("POST", "/v1/patient/checkin/response", { body: data }),

  getAppointments: () => request("GET", "/v1/patient/appointments"),
  createAppointment: (data: AppointmentCreateRequest) =>
    request("POST", "/v1/patient/appointments", { body: data }),
  generateBrief: (appointmentId: string, force = false) =>
    request("POST", `/v1/patient/appointments/${appointmentId}/generate-brief`, { query: { force } }),

  startClinicSession: (data: { appointment_id?: string; audio_enabled: boolean }) =>
    request("POST", "/v1/patient/clinic/session/start", { body: data }),
  sendClinicTurn: (sessionId: string, content: string) =>
    request("POST", `/v1/patient/clinic/session/${sessionId}/turn`, { body: { content } }),
  endClinicSession: (sessionId: string) =>
    request("POST", `/v1/patient/clinic/session/${sessionId}/end`),

  getPrescriptions: () => request("GET", "/v1/patient/prescriptions"),
  createPrescription: (data: PrescriptionCreateRequest) =>
    request("POST", "/v1/patient/prescriptions", { body: data }),
  confirmPrescription: (id: string) =>
    request("POST", `/v1/patient/prescriptions/${id}/confirm`),

  getProfile: () => request("GET", "/v1/patient/profile"),

  schedulePrevisit: (data: { scheduled_at: string; appointment_id?: string }) =>
    request("POST", "/v1/patient/previsit/schedule", { body: data }),
  getPrevisitSlots: () => request("GET", "/v1/patient/previsit/slots"),
  startPrevisitSession: (data?: { slot_id?: string; appointment_id?: string }) =>
    request("POST", "/v1/patient/previsit/session/start", { body: data ?? {} }),
  sendPrevisitTurn: (sessionId: string, content: string) =>
    request("POST", `/v1/patient/previsit/session/${sessionId}/turn`, { body: { content } }),
  endPrevisitSession: (sessionId: string) =>
    request("POST", `/v1/patient/previsit/session/${sessionId}/end`),

  startHealthReportSession: () =>
    request("POST", "/v1/patient/health-report/session/start"),
  sendHealthReportTurn: (sessionId: string, content: string) =>
    request("POST", `/v1/patient/health-report/session/${sessionId}/turn`, { body: { content } }),
  endHealthReportSession: (sessionId: string) =>
    request("POST", `/v1/patient/health-report/session/${sessionId}/end`),
};

export const physicianApi = {
  getDashboard: () => request("GET", "/v1/physician/dashboard"),
  getPatients: () => request("GET", "/v1/physician/patients"),
  getPatientBriefs: (patientId: string) => request("GET", `/v1/physician/patients/${patientId}/briefs`),
  getBrief: (briefId: string) => request("GET", `/v1/physician/briefs/${briefId}`),
  acknowledgeBrief: (briefId: string) =>
    request("POST", `/v1/physician/briefs/${briefId}/acknowledge`),
  getPatientAlerts: (patientId: string) =>
    request("GET", `/v1/physician/patients/${patientId}/alerts`),
  getAlert: (alertId: string) => request("GET", `/v1/physician/alerts/${alertId}`),
  acknowledgeAlert: (alertId: string) =>
    request("POST", `/v1/physician/alerts/${alertId}/acknowledge`),
};

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: "patient" | "physician";
  date_of_birth?: string;
  npi_number?: string;
  specialty?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CheckinSubmitRequest {
  responses: Array<{ question_id: string; value: any; answered_at: string; skipped: boolean }>;
  session_date?: string;
  prescription_id?: string;
  day_since_start?: number;
}

export interface AppointmentCreateRequest {
  physician_name: string;
  appointment_date: string;
  location?: string;
  reason?: string;
  physician_id?: string;
}

export interface PrescriptionCreateRequest {
  medication_name: string;
  dose: string;
  frequency: string;
  prescribing_physician?: string;
  start_date: string;
  medication_code?: string;
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Hospital, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store";

const STITCH_CSS = "https://cdn.fastenhealth.com/connect/v4/fasten-stitch-element.css";
const STITCH_JS = "https://cdn.fastenhealth.com/connect/v4/fasten-stitch-element.js";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "fasten-stitch-element": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        "public-id"?: string;
        "external-id"?: string;
        "show-splash"?: boolean;
        "static-backdrop"?: boolean;
      };
    }
  }
}

type Status = "idle" | "pending" | "syncing" | "complete" | "failed";

export default function FastenConnect({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuthStore();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const publicId = process.env.NEXT_PUBLIC_FASTEN_PUBLIC_ID || "";

  useEffect(() => {
    if (!document.querySelector('link[data-fasten="css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = STITCH_CSS;
      link.setAttribute("data-fasten", "css");
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-fasten="js"]')) {
      const script = document.createElement("script");
      script.src = STITCH_JS;
      script.type = "module";
      script.setAttribute("data-fasten", "js");
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log("[Fasten:eventBus]", detail);

      const eventType: string = detail?.event_type || "";
      const normalized = eventType.replace(/^patient\./, "");

      if (normalized === "connection_pending") {
        setStatus("pending");
      } else if (normalized === "connection_success") {
        setStatus("syncing");
      } else if (normalized === "connection_failed") {
        setStatus("failed");
        setErrorMsg(detail?.data?.error_description || detail?.data?.error || "Connection failed");
      } else if (eventType === "widget.complete") {
        setStatus("syncing");
        onComplete?.();
      } else if (eventType === "widget.config_error") {
        setStatus("failed");
        setErrorMsg("Widget misconfigured — check NEXT_PUBLIC_FASTEN_PUBLIC_ID");
      }
    };

    el.addEventListener("eventBus", handler);
    return () => el.removeEventListener("eventBus", handler);
  }, [onComplete]);

  if (!publicId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <AlertCircle className="inline w-4 h-4 mr-1" />
        NEXT_PUBLIC_FASTEN_PUBLIC_ID is not set in frontend .env.local
      </div>
    );
  }
  if (!user) return null;

  return (
    <div ref={wrapperRef} className="rounded-2xl border border-crosscure-200 bg-gradient-to-br from-crosscure-50 to-white p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-crosscure-100 flex items-center justify-center flex-shrink-0">
          <Hospital className="w-6 h-6 text-crosscure-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Connect your hospital</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
            Import your records directly from MyChart, Cerner, or any of 50,000+ providers via Fasten.
          </p>

          <fasten-stitch-element
            public-id={publicId}
            external-id={user.id}
          >
            <button className="btn-primary">
              <Hospital className="w-4 h-4" /> Connect your hospital
            </button>
          </fasten-stitch-element>

          {status === "pending" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Authorizing with your provider…
            </div>
          )}
          {status === "syncing" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-crosscure-600">
              <Loader2 className="w-4 h-4 animate-spin" /> Connected. Importing records — this can take up to a minute…
            </div>
          )}
          {status === "complete" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" /> Records imported.
            </div>
          )}
          {status === "failed" && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {errorMsg || "Connection failed"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

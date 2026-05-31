"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Fallback landing page for Fasten Connect's registered Redirect URL.
 *
 * The Stitch widget is fully modal — it emits widget.complete in-page rather
 * than navigating here. This page exists for edge cases where the OAuth flow
 * does fall through to a top-level redirect. Best behavior: punt the user
 * back to /patient/records, where polling will pick up the new data once
 * the EHI export webhook completes.
 */
export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/patient/records"), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-crosscure-500 mx-auto mb-3" />
        <p className="text-slate-600">Finishing up — returning you to your records…</p>
      </div>
    </div>
  );
}

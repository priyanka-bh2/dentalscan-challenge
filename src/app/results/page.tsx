"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import MessagingSidebar from "@/components/MessagingSidebar";

/**
 * Results page — shown after a scan is finalized.
 */
export default function ResultsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Demo values but we can replace with real session data
  const patientId = "patient_demo_001";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
        <h1 className="font-bold text-blue-400">DentalScan AI</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95
            text-sm font-semibold rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Message Clinic
        </button>
      </div>

      {/* Main content */}
      <div className={`p-6 transition-all duration-300 ${sidebarOpen ? "sm:mr-96" : ""}`}>
        {/* Status banner */}
        <div className="mb-6 flex items-center gap-3 bg-green-900/20 border border-green-800 rounded-2xl px-5 py-4">
          <CheckCircle2 size={28} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">Scan Finalized</p>
            <p className="text-xs text-green-600">Your clinic has been notified and will review your scan shortly.</p>
          </div>
        </div>

        {/* Placeholder for AI analysis */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <h2 className="text-base font-bold mb-4">Scan Summary</h2>
          <p className="text-sm text-zinc-500">5 angles captured: Front · Left · Right · Upper · Lower</p>
          <p className="text-sm text-zinc-500 mt-1">AI analysis in progress — results typically available within 2 minutes.</p>
        </div>
      </div>

      {/* Messaging sidebar */}
      <MessagingSidebar
        patientId={patientId}
        currentSender="patient"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
}

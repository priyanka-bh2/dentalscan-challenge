"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// types

type GuardrailStatus = "idle" | "poor" | "fair" | "good";

interface GuardrailState {
  status: GuardrailStatus;
  stability: number;
  hint: string;
}

// constants

const VIEWS = [
  { label: "Front View",  instruction: "Smile and look straight at the camera." },
  { label: "Left View",   instruction: "Turn your head to the left." },
  { label: "Right View",  instruction: "Turn your head to the right." },
  { label: "Upper Teeth", instruction: "Tilt your head back and open wide." },
  { label: "Lower Teeth", instruction: "Tilt your head down and open wide." },
];

const STATUS_COLOR: Record<GuardrailStatus, string> = {
  idle: "#71717a",
  poor: "#ef4444",
  fair: "#f59e0b",
  good: "#22c55e",
};

const STATUS_LABEL: Record<GuardrailStatus, string> = {
  idle: "Align your mouth inside the guide",
  poor: "Move closer and hold steady",
  fair: "Almost there — hold still",
  good: "Perfect — capturing in…",
};

// hook

function useGuardrail(step: number, active: boolean): GuardrailState {
  const [state, setState] = useState<GuardrailState>({
    status: "idle", stability: 0, hint: STATUS_LABEL.idle,
  });

  useEffect(() => {
    if (!active) return;
    setState({ status: "idle", stability: 0, hint: STATUS_LABEL.idle });

    const phases: GuardrailState[] = [
      { status: "poor", stability: 25, hint: STATUS_LABEL.poor },
      { status: "fair", stability: 60, hint: STATUS_LABEL.fair },
      { status: "good", stability: 95, hint: STATUS_LABEL.good },
    ];
    const timers = phases.map((p, i) => setTimeout(() => setState(p), 1000 + i * 1100));
    return () => timers.forEach(clearTimeout);
 
  }, [step, active]);

  return state;
}

// Mouth Guide Overlay 
function MouthGuide({ guardrail, stepIndex }: { guardrail: GuardrailState; stepIndex: number }) {
  const color = STATUS_COLOR[guardrail.status];
  const isGood = guardrail.status === "good";
  const rx = stepIndex === 1 || stepIndex === 2 ? "27%" : "33%";
  const ry = stepIndex === 3 || stepIndex === 4 ? "20%" : "27%";

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {/* Vignette */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <mask id="guide-mask">
            <rect width="100" height="100" fill="white" />
            <ellipse cx="50" cy="50" rx={rx} ry={ry} fill="black" />
          </mask>
        </defs>
        <rect width="100" height="100" fill="rgba(0,0,0,0.58)" mask="url(#guide-mask)" />
      </svg>

      {/* Ellipse border + pulse */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {isGood && (
          <ellipse cx="50" cy="50" rx={rx} ry={ry} fill="none" stroke={color} strokeWidth="0.6"
            style={{ animation: "ds-pulse 1.4s ease-out infinite", opacity: 0.4 }} />
        )}
        <ellipse cx="50" cy="50" rx={rx} ry={ry} fill="none" stroke={color} strokeWidth="0.55"
          strokeDasharray={isGood ? undefined : "3 2"}
          style={{ transition: "stroke 0.35s ease", animation: isGood ? undefined : "ds-dash 10s linear infinite" }} />
      </svg>

      {/* Crosshairs */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {([[50,23,0],[50,77,0],[17,50,90],[83,50,90]] as [number,number,number][]).map(([x,y,r],i) => (
          <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
            <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke={color} strokeWidth="0.6" style={{transition:"stroke 0.35s"}} />
            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke={color} strokeWidth="0.6" style={{transition:"stroke 0.35s"}} />
          </g>
        ))}
      </svg>

      {/* Stability bar */}
      <div className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 w-48">
        <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${guardrail.stability}%`,
            backgroundColor: color,
            transition: "width 0.7s ease, background-color 0.35s ease",
          }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-center"
          style={{ color, transition: "color 0.35s ease" }}>
          {guardrail.hint}
        </span>
      </div>

      <style>{`
        @keyframes ds-dash { to { stroke-dashoffset: -30; } }
        @keyframes ds-pulse { 0% { transform:scale(1);opacity:0.4; } 100% { transform:scale(1.07);opacity:0; } }
      `}</style>
    </div>
  );
}

// Countdown circle

function Countdown({ n }: { n: number }) {
  const r = 20, circ = 2 * Math.PI * r;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
          <circle cx="24" cy="24" r={r} fill="none" stroke="#22c55e" strokeWidth="3"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - n / 3)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.9s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">{n}</span>
      </div>
    </div>
  );
}

// Main Component

export default function ScanningFlow() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "done">("idle");

  const guardrail = useGuardrail(currentStep, camReady && currentStep < 5 && countdown === null);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCamReady(true);
        }
      } catch {
        setCamError(true);
      }
    }
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-countdown on "good"
  useEffect(() => {
    if (guardrail.status === "good" && countdown === null && camReady && currentStep < 5) {
      setCountdown(3);
    }
  }, [guardrail.status, countdown, camReady, currentStep]);

  // Tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { handleCapture(); return; }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
 
  }, [countdown]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    if (!video) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const next = [...capturedImages, dataUrl];
    setCapturedImages(next);
    setCountdown(null);
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    if (nextStep === 5) fireNotification(next);

  }, [capturedImages, currentStep]);

  async function fireNotification(images: string[]) {
    setNotifyStatus("sending");
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: `scan_${Date.now()}`, status: "completed", imageCount: images.length }),
      });
    } catch { /* non-fatal */ }
    setNotifyStatus("done");
  }

  const isDone = currentStep >= 5;

  return (
    <div className="flex flex-col items-center bg-black min-h-screen text-white">
      {/* Header */}
      <div className="p-4 w-full bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
        <h1 className="font-bold text-blue-400">DentalScan AI</h1>
        {!isDone && (
          <div className="flex items-center gap-2">
            {VIEWS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i < currentStep ? "bg-green-500" : i === currentStep ? "bg-blue-400 scale-125" : "bg-zinc-700"
              }`} />
            ))}
            <span className="text-xs text-zinc-500 ml-1">{currentStep + 1}/{VIEWS.length}</span>
          </div>
        )}
      </div>

      {/* Step label */}
      {!isDone && (
        <div className="w-full max-w-md px-4 pt-3 pb-1 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Step {currentStep + 1} of {VIEWS.length}</p>
            <h2 className="text-sm font-semibold">{VIEWS[currentStep].label}</h2>
          </div>
          <AnimatePresence mode="wait">
            <motion.span key={guardrail.status}
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{
                backgroundColor: `${STATUS_COLOR[guardrail.status]}22`,
                color: STATUS_COLOR[guardrail.status],
                border: `1px solid ${STATUS_COLOR[guardrail.status]}44`,
              }}>
              {guardrail.status === "idle" ? "Waiting" : guardrail.status === "poor" ? "Adjusting" :
               guardrail.status === "fair" ? "Almost" : "Ready ✓"}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {/* Viewport */}
      <div className="relative w-full max-w-md aspect-[3/4] bg-zinc-950 overflow-hidden flex items-center justify-center">
        {!isDone ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
            {camError && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm text-center px-8">
                Camera access denied. Please allow camera permissions and refresh.
              </div>
            )}
            {camReady && !camError && <MouthGuide guardrail={guardrail} stepIndex={currentStep} />}
            {countdown !== null && countdown > 0 && <Countdown n={countdown} />}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 pt-10 bg-gradient-to-t from-black/90 to-transparent text-center">
              <p className="text-sm font-medium text-white/90">{VIEWS[currentStep].instruction}</p>
            </div>
          </>
        ) : (
          <motion.div className="text-center p-10"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold">Scan Complete!</h2>
            <p className="text-zinc-400 mt-2 text-sm">
              {notifyStatus === "sending" ? "Notifying your clinic…" :
               notifyStatus === "done"    ? "Clinic notified ✓" : "Uploading results…"}
            </p>
          </motion.div>
        )}
      </div>

      {/* Manual capture button */}
      <div className="p-10 w-full flex justify-center">
        {!isDone && (
          <button onClick={() => { setCountdown(null); handleCapture(); }}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Capture photo">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Camera className="text-black" />
            </div>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 p-4 overflow-x-auto w-full">
        {VIEWS.map((v, i) => (
          <div key={i} className={`relative w-16 h-20 rounded border-2 shrink-0 overflow-hidden ${
            i < currentStep ? "border-green-500" : i === currentStep ? "border-blue-500 bg-blue-500/10" : "border-zinc-800"
          }`}>
            {capturedImages[i] ? (
             
              <img src={capturedImages[i]} alt={v.label} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <span className="text-[10px] text-zinc-600 font-bold">{i + 1}</span>
                <span className="text-[8px] text-zinc-700 text-center px-1 leading-tight">{v.label}</span>
              </div>
            )}
            {i < currentStep && (
              <div className="absolute top-0.5 right-0.5">
                <CheckCircle2 size={12} className="text-green-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

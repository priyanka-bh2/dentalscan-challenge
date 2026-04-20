# DentalScan AI — Audit

**Lakshmi Priyanka Bhallamudi**
**20 April 2026**

---

I have througly analysed the assignment on dentalscan.us going through the full 5-angle scan flow as a first-time user. Here's what I found.

## What's working

The no-app approach is genuinely smart. Asking someone to download something before their first scan adds drop-off risk, so keeping it browser-based is the right call. 
The step-by-step angle progression also felt clear - I always knew what was coming next.

## What felt off

**No guidance while capturing.** This was the biggest thing. I wasn't sure if I was too close, too far, or at the right angle until after the photo was taken. For a healthcare product where image quality directly affects the AI output, that's a real problem. A simple oval guide that turns green when the framing looks good would 
fix most of this.

**Having to tap the button while holding steady.** On mobile, trying to keep your phone still AND press the shutter at the same time is awkward, especially for the upper/lower angles where you're tilting your head back. An auto-capture that fires once the frame stabilises would feel much smoother.

**No confirmation that the clinic got it.** After submitting, I had no idea if someone on the other end received anything. A small "your clinic has been notified" message would go a long way — even if it's just cosmetic.

**Nowhere to ask a question after.** The scan finishes and that's it. If I had a follow-up question I'd have to go find a phone number or email. A quick message field on the results screen would keep patients engaged instead of sending them elsewhere.

## Mobile camera risks I'd flag

The upper and lower angle shots are the tricky ones — users tilt their head and the phone naturally drifts. Worth thinking about whether a rear-camera option makes more sense for those two angles specifically.

Permission handling is also worth hardening. On iOS, if the user backgrounds the app mid-scan and camera access gets revoked, the current flow would probably just 
break silently. That needs a graceful recovery.

Low light is another quiet failure mode — the scan appears to complete normally but the image quality is poor. Some basic brightness detection before capture 
would catch this early.

One I'd keep an eye on with Android: holding the MediaStream open for all five captures back to back can be rough on lower-end devices. Restarting between captures is slightly more code but safer on memory.
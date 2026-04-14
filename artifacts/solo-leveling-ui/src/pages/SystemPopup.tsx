import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import "@/styles/system.css";

// ── Constants ─────────────────────────────────────────────────
const CORRUPT_CHARS  = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";
const ADMIN_PASSWORD = "hunter";
const REWARD_NAMES   = ["Power", "Gold", "Freedom"];
const MAX_STAGE      = 7;
const DODGE_RADIUS   = 100;

const NEIGHBORS: Record<string, string> = {
  a:"s",b:"v",c:"x",d:"f",e:"r",f:"d",g:"h",h:"g",i:"u",j:"k",
  k:"j",l:"k",m:"n",n:"m",o:"p",p:"o",q:"w",r:"e",s:"a",t:"r",
  u:"y",v:"b",w:"s",x:"z",y:"t",z:"x",
};

// Type-verification phrases – each has a zero-width space (U+200B) so keyboard
// input can never match the internal value. User physically cannot win.
const TYPE_PHRASES = [
  { display:"ACCESS GRANTED",      internal:"ACCESS\u200bGRANTED" },
  { display:"SHADOW EXTRACTION",   internal:"SHADOW\u200bEXTRACTION" },
  { display:"DUNGEON CLEAR CODE",  internal:"DUNGEON\u200bCLEAR CODE" },
  { display:"RANK UP PROTOCOL",    internal:"RANK\u200bUP PROTOCOL" },
  { display:"ARISE NOW HUNTER",    internal:"ARISE\u200bNOW HUNTER" },
  { display:"GATE OVERRIDE SEVEN", internal:"GATE\u200bOVERRIDE SEVEN" },
  { display:"MONARCH SEAL VERIFY", internal:"MONARCH\u200bSEAL VERIFY" },
  { display:"NULL VOID CONFIRM",   internal:"NULL\u200bVOID CONFIRM" },
  { display:"KXRT ZEPHYR ONLINE",  internal:"KXRT\u200bZEPHYR ONLINE" },
  { display:"VORTEX SIGNAL NULL",  internal:"VORTEX\u200bSIGNAL NULL" },
];

// ── Stage 3 chaos helpers ──────────────────────────────────────
// Aggressive whole-string corruption (for per-keystroke chaos)
function fullCorrupt(s: string): string {
  const out = s.split("").map(c => {
    const r = Math.random();
    if (r < 0.35) return CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
    if (r < 0.55) return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
    return c;
  });
  // partial shuffle
  for (let i = out.length - 1; i > 0; i--) {
    if (Math.random() < 0.45) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  }
  return out.join("");
}

// Corruption used inside the slowpoke popup message (funny-looking, not just junk)
function corruptForSlowpoke(s: string): string {
  if (!s.trim()) return "ERROR_NULL_PLAYER";
  const upper = s.toUpperCase().split("");
  const out = upper.map(c => {
    const r = Math.random();
    if (r < 0.22) return CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
    if (r < 0.38) return "?";
    return c;
  });
  return out.sort(() => Math.random() - 0.5).join("") + "_??";
}

function randomCorrupt(len: number) {
  return Array.from({ length: len },
    () => CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)]
  ).join("");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Types ──────────────────────────────────────────────────────
type Stage3Status = "typing" | "validating" | "invalid" | "expired" | "slowpoke";
type Stage6Status = "typing" | "checking" | "incorrect" | "granted" | "failed";

// ══════════════════════════════════════════════════════════════
export default function SystemPopup() {

  // ── Core ─────────────────────────────────────────────────────
  const [stage,       setStage]       = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const glitchDoneRef = useRef<() => void>(() => {});

  // ── Stage 1 – proximity dodge ────────────────────────────────
  const [translate,  setTranslate]  = useState({ x: 0, y: 0 });
  const buttonRef    = useRef<HTMLButtonElement>(null);
  const popupRef     = useRef<HTMLDivElement>(null);
  const naturalPos   = useRef<{ x: number; y: number } | null>(null);
  const dodgeCoolRef = useRef(false);

  // ── Stage 2 – recalculating ──────────────────────────────────
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ── Stage 3 – name input trap ────────────────────────────────
  const [inputValue,    setInputValue]    = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [stage3Status,  setStage3Status]  = useState<Stage3Status>("typing");
  const [slowpokeName,  setSlowpokeName]  = useState("");

  const inputValueRef       = useRef("");
  const corruptTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCountRef      = useRef(0);
  // Hidden-pass tracking refs
  const firstKeypressAtRef  = useRef<number | null>(null);
  const backspaceUsedRef    = useRef(false);
  // Slowpoke refs
  const slowpokeShownRef    = useRef(false);
  const stage3StatusRef     = useRef<Stage3Status>("typing"); // mirror for closures

  // Keep mirror in sync (called every time we update stage3Status)
  const setS3 = useCallback((s: Stage3Status) => {
    stage3StatusRef.current = s;
    setStage3Status(s);
  }, []);

  // ── Stage 4 – fake loading ───────────────────────────────────
  const [stage4Phase, setStage4Phase] = useState<"filling" | "stuck" | "error">("filling");

  // ── Stage 5 – reward selection ───────────────────────────────
  const [rewards,       setRewards]       = useState([...REWARD_NAMES]);
  const [rewardInvalid, setRewardInvalid] = useState(false);
  const [rewardPos,     setRewardPos]     = useState([
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  ]);

  // ── Stage 6 – type verification ──────────────────────────────
  const [typeInput,    setTypeInput]    = useState("");
  const [typeStatus,   setTypeStatus]   = useState<Stage6Status>("typing");
  const [typePhrase,   setTypePhrase]   = useState(TYPE_PHRASES[0]);
  const [typeAttempts, setTypeAttempts] = useState(0);
  const typeInputRef   = useRef("");
  const typeCorruptRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stage 7 – final fake-out ─────────────────────────────────
  const [stage7Phase,     setStage7Phase]     = useState<"granted" | "claiming" | "final">("granted");
  const stageFinalDirect = useRef(false);

  // ── Ragebait helpers ─────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState(false);
  const [btnJammed,     setBtnJammed]     = useState(false);

  // ── Admin ─────────────────────────────────────────────────────
  const [adminOpen,     setAdminOpen]     = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError,    setAdminError]    = useState(false);
  const [adminJumpOpen, setAdminJumpOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ────────────────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (stage !== 1) return;
    const btn = buttonRef.current, popup = popupRef.current;
    if (!btn || !popup) return;
    const bR = btn.getBoundingClientRect(), pR = popup.getBoundingClientRect();
    naturalPos.current = { x: bR.left - pR.left, y: bR.top - pR.top };
  }, [stage]);

  useEffect(() => {
    if (!isGlitching) return;
    setCorruptText(randomCorrupt(24));
    const iv = setInterval(() =>
      setCorruptText(randomCorrupt(16 + Math.floor(Math.random() * 12))), 70);
    const t = setTimeout(() => { clearInterval(iv); setIsGlitching(false); glitchDoneRef.current(); }, 1600);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [isGlitching]);

  useEffect(() => {
    if (stage !== 2) return;
    setIsRecalculating(true);
    const t = setTimeout(() => setIsRecalculating(false), 1700);
    return () => clearTimeout(t);
  }, [stage]);

  // ── Stage 3 – aggressive name input chaos ────────────────────
  useEffect(() => {
    if (stage !== 3) return;

    // Reset all state
    setInputValue(""); inputValueRef.current = "";
    setInputDisabled(false);
    setS3("typing");
    submitCountRef.current    = 0;
    firstKeypressAtRef.current  = null;
    backspaceUsedRef.current    = false;
    slowpokeShownRef.current    = false;
    if (corruptTimerRef.current) { clearTimeout(corruptTimerRef.current); corruptTimerRef.current = null; }

    // After 10 s of sitting here: slowpoke popup
    const slowTimer = setTimeout(() => {
      if (slowpokeShownRef.current) return;
      if (stage3StatusRef.current !== "typing") return;
      slowpokeShownRef.current = true;
      const cur = inputValueRef.current;
      setSlowpokeName(corruptForSlowpoke(cur));
      setS3("slowpoke");
      // Auto-dismiss after 5 s, reset input
      setTimeout(() => {
        setInputValue(""); inputValueRef.current = "";
        setInputDisabled(false);
        setS3("typing");
      }, 5000);
    }, 10000);

    // Safety fallback
    const fallback = setTimeout(() => setStage(4), 60000);

    return () => {
      clearTimeout(slowTimer); clearTimeout(fallback);
      if (corruptTimerRef.current) { clearTimeout(corruptTimerRef.current); corruptTimerRef.current = null; }
    };
  }, [stage, setS3]);

  useEffect(() => {
    if (stage !== 4) return;
    setStage4Phase("filling");
    const t1 = setTimeout(() => setStage4Phase("stuck"),  2600);
    const t2 = setTimeout(() => setStage4Phase("error"),  5300);
    const t3 = setTimeout(() => setStage(5),              6900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [stage]);

  useEffect(() => {
    if (stage !== 5) return;
    setRewards([...REWARD_NAMES]); setRewardInvalid(false);
    setRewardPos([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
    const iv = setInterval(() => setRewards(prev => shuffle(prev)), 2800);
    return () => clearInterval(iv);
  }, [stage]);

  useEffect(() => {
    if (stage !== 6) return;
    const idx = Math.floor(Math.random() * TYPE_PHRASES.length);
    setTypePhrase(TYPE_PHRASES[idx]);
    setTypeInput(""); typeInputRef.current = "";
    setTypeStatus("typing"); setTypeAttempts(0);
    if (typeCorruptRef.current) { clearTimeout(typeCorruptRef.current); typeCorruptRef.current = null; }
  }, [stage]);

  useEffect(() => {
    if (stage !== 7) return;
    if (stageFinalDirect.current) { stageFinalDirect.current = false; setStage7Phase("final"); return; }
    setStage7Phase("granted");
  }, [stage]);

  // Cursor interference on stages 2–6
  useEffect(() => {
    if (stage < 2 || stage > 6) return;
    setBtnJammed(false);
    const iv = setInterval(() => {
      if (Math.random() < 0.45) { setBtnJammed(true); setTimeout(() => setBtnJammed(false), 420); }
    }, 3800);
    return () => { clearInterval(iv); setBtnJammed(false); };
  }, [stage]);

  useEffect(() => {
    if (adminOpen && !adminUnlocked)
      setTimeout(() => passwordInputRef.current?.focus(), 50);
  }, [adminOpen, adminUnlocked]);

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────

  const withDelay = useCallback((fn: () => void, ms = 700) => {
    if (pendingAction || btnJammed) return;
    setPendingAction(true);
    setTimeout(() => { setPendingAction(false); fn(); }, ms);
  }, [pendingAction, btnJammed]);

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────

  // Stage 1 – proximity dodge
  const handlePopupMouseMove = useCallback((e: React.MouseEvent) => {
    if (stage !== 1 || isGlitching || dodgeCoolRef.current) return;
    const btn = buttonRef.current, popup = popupRef.current;
    if (!btn || !popup || !naturalPos.current) return;
    const bR = btn.getBoundingClientRect(), pR = popup.getBoundingClientRect();
    const btnCx = bR.left + bR.width / 2, btnCy = bR.top + bR.height / 2;
    const dist = Math.sqrt((e.clientX - btnCx) ** 2 + (e.clientY - btnCy) ** 2);
    if (dist > DODGE_RADIUS) return;
    const pad = 20, minX = pad, maxX = pR.width - bR.width - pad, minY = pad, maxY = pR.height - bR.height - pad;
    let tx: number, ty: number, tries = 0;
    do {
      tx = minX + Math.random() * (maxX - minX);
      ty = minY + Math.random() * (maxY - minY);
      tries++;
    } while (tries < 12 && Math.abs(tx - (naturalPos.current.x + translate.x)) < 70 && Math.abs(ty - (naturalPos.current.y + translate.y)) < 35);
    setTranslate({ x: tx - naturalPos.current.x, y: ty - naturalPos.current.y });
    dodgeCoolRef.current = true;
    setTimeout(() => { dodgeCoolRef.current = false; }, 280);
  }, [stage, isGlitching, translate]);

  const handleAccept = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    glitchDoneRef.current = () => setStage(2);
    setIsGlitching(true);
  }, []);

  // ── Stage 3 – aggressive per-keystroke chaos ──────────────────
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (stage3StatusRef.current !== "typing") return;

    const newVal = e.target.value;

    // Track first keypress for hidden-pass timing
    if (!firstKeypressAtRef.current && newVal.length > 0)
      firstKeypressAtRef.current = Date.now();

    // Commit the new value first so user sees their char briefly
    setInputValue(newVal);
    inputValueRef.current = newVal;

    // No chaos on the very first character — give false hope
    if (newVal.length < 2) return;

    // 85% chance of chaos after a short delay
    if (Math.random() > 0.15) {
      // Cancel any previous pending chaos and schedule fresh one
      if (corruptTimerRef.current) clearTimeout(corruptTimerRef.current);
      const delay = 55 + Math.random() * 110; // 55–165 ms

      corruptTimerRef.current = setTimeout(() => {
        corruptTimerRef.current = null;
        const cur = inputValueRef.current;
        if (!cur.length) return;

        const r = Math.random();
        let next: string;

        if (r < 0.30) {
          // Delete one letter at a random position
          const pos = Math.floor(Math.random() * cur.length);
          next = cur.slice(0, pos) + cur.slice(pos + 1);
        } else if (r < 0.44) {
          // Wipe everything
          next = "";
        } else if (r < 0.64) {
          // Replace one letter with junk or a random char
          const pos = Math.floor(Math.random() * cur.length);
          const rep = Math.random() < 0.55
            ? CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)]
            : String.fromCharCode(97 + Math.floor(Math.random() * 26));
          next = cur.slice(0, pos) + rep + cur.slice(pos + 1);
        } else if (r < 0.82) {
          // Corrupt the entire name with junk + case flips
          next = fullCorrupt(cur);
        } else {
          // Scramble letter order
          next = cur.split("").sort(() => Math.random() - 0.5).join("");
        }

        setInputValue(next);
        inputValueRef.current = next;
      }, delay);
    }
  }, []);

  // Track backspace for hidden-pass check
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") backspaceUsedRef.current = true;
    if (e.key === "Enter") handleNameSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stage 3 – submit: check hidden pass or show rejection
  const handleNameSubmit = useCallback(() => {
    if (stage3StatusRef.current !== "typing") return;
    if (corruptTimerRef.current) { clearTimeout(corruptTimerRef.current); corruptTimerRef.current = null; }

    // Hidden pass: typed within 0.5 s of first keypress AND no backspace
    const timeSinceFirst = firstKeypressAtRef.current ? Date.now() - firstKeypressAtRef.current : Infinity;
    if (timeSinceFirst < 500 && !backspaceUsedRef.current && inputValueRef.current.length > 0) {
      // System grudgingly advances
      setInputDisabled(true);
      setS3("validating");
      setTimeout(() => setStage(4), 900);
      return;
    }

    // Standard rejection flow
    setInputDisabled(true);
    setS3("validating");
    submitCountRef.current += 1;

    setTimeout(() => {
      setS3("invalid");
      const shouldExpire = submitCountRef.current < 3 && Math.random() < 0.35;

      setTimeout(() => {
        if (shouldExpire) {
          setS3("expired");
          setInputValue(""); inputValueRef.current = "";
          setTimeout(() => { setInputDisabled(false); setS3("typing"); }, 2000);
        } else {
          setStage(4);
        }
      }, 1400);
    }, 1100);
  }, [setS3]);

  // Stage 5 – reward buttons
  const handleRewardHover = useCallback((idx: number) => {
    if (rewardInvalid) return;
    setRewardPos(prev => {
      const n = [...prev]; n[idx] = { x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 22 }; return n;
    });
  }, [rewardInvalid]);

  const handleRewardClick = useCallback(() => {
    if (rewardInvalid) return;
    setRewardInvalid(true);
    setTimeout(() => setStage(6), 1400);
  }, [rewardInvalid]);

  // Stage 6 – type input with corruption
  const handleTypeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeStatus !== "typing") return;
    if (typeCorruptRef.current) { clearTimeout(typeCorruptRef.current); typeCorruptRef.current = null; }
    const newVal = e.target.value;
    const r = Math.random();
    const commit = (v: string) => {
      setTypeInput(v); typeInputRef.current = v;
      if (v.length >= 4 && Math.random() < 0.20) {
        typeCorruptRef.current = setTimeout(() => {
          typeCorruptRef.current = null;
          const cur = typeInputRef.current;
          if (!cur.length) return;
          if (Math.random() < 0.55) {
            const next = cur.slice(0, -1); setTypeInput(next); typeInputRef.current = next;
          } else {
            const last = cur[cur.length - 1];
            const lower = last.toLowerCase();
            const rep = NEIGHBORS[lower] ?? "x";
            const replaced = last === last.toUpperCase() ? rep.toUpperCase() : rep;
            const next = cur.slice(0, -1) + replaced; setTypeInput(next); typeInputRef.current = next;
          }
        }, 150 + Math.random() * 200);
      }
    };
    if (r < 0.04) return;
    else if (r < 0.12) setTimeout(() => commit(newVal), 70 + Math.random() * 90);
    else commit(newVal);
  }, [typeStatus]);

  // Stage 6 – submit: always incorrect; 3rd attempt → fake success → fail
  const handleTypeSubmit = useCallback(() => {
    if (typeStatus !== "typing") return;
    if (typeCorruptRef.current) { clearTimeout(typeCorruptRef.current); typeCorruptRef.current = null; }
    setTypeStatus("checking");
    const newAttempts = typeAttempts + 1;
    setTypeAttempts(newAttempts);
    setTimeout(() => {
      if (newAttempts >= 3) {
        setTypeStatus("granted");
        setTimeout(() => {
          setTypeStatus("failed");
          setTimeout(() => setStage(7), 1800);
        }, 750);
      } else {
        setTypeStatus("incorrect");
        setTimeout(() => { setTypeInput(""); typeInputRef.current = ""; setTypeStatus("typing"); }, 1600);
      }
    }, 900);
  }, [typeStatus, typeAttempts]);

  // Stage 7 – Claim
  const handleClaim = useCallback(() => {
    if (stage7Phase !== "granted" || pendingAction || btnJammed) return;
    setPendingAction(true);
    setTimeout(() => {
      setPendingAction(false);
      setStage7Phase("claiming");
      setTimeout(() => setStage7Phase("final"), 420);
    }, 650);
  }, [stage7Phase, pendingAction, btnJammed]);

  // ── Admin ──────────────────────────────────────────────────────
  const handleAdminTrigger = useCallback(() => {
    setAdminOpen(true); setAdminPassword(""); setAdminError(false);
  }, []);

  const handleAdminSubmit = useCallback(() => {
    if (adminPassword === ADMIN_PASSWORD) { setAdminUnlocked(true); setAdminError(false); }
    else { setAdminError(true); setAdminPassword(""); }
  }, [adminPassword]);

  const handleAdminKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter")  handleAdminSubmit();
    if (e.key === "Escape") setAdminOpen(false);
  }, [handleAdminSubmit]);

  const handleSkipNext = useCallback(() => {
    setIsGlitching(false); setPendingAction(false); setBtnJammed(false);
    setStage(prev => { const n = Math.min(prev + 1, MAX_STAGE); if (n === MAX_STAGE) stageFinalDirect.current = true; return n; });
  }, []);

  const handleSkipToFinal = useCallback(() => {
    setIsGlitching(false); setPendingAction(false); setBtnJammed(false);
    stageFinalDirect.current = true; setStage(MAX_STAGE); setAdminOpen(false);
  }, []);

  const handleJumpToStage = useCallback((s: number) => {
    setIsGlitching(false); setPendingAction(false); setBtnJammed(false);
    if (s === MAX_STAGE) stageFinalDirect.current = true;
    setStage(s); setAdminJumpOpen(false); setAdminOpen(false);
  }, []);

  const handleAdminGlitch = useCallback(() => {
    if (isGlitching) return; glitchDoneRef.current = () => {}; setIsGlitching(true);
  }, [isGlitching]);

  const handleReset = useCallback(() => {
    setStage(1); setIsGlitching(false); setTranslate({ x: 0, y: 0 });
    setPendingAction(false); setBtnJammed(false);
    setAdminOpen(false); setAdminUnlocked(false); setAdminJumpOpen(false);
  }, []);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  const bodyFlicker = stage === 7 && stage7Phase === "claiming";

  return (
    <div className={`screen${isGlitching ? " screen--flash" : ""}`}
      onMouseMove={handlePopupMouseMove}>

      <div className="admin-trigger" onClick={handleAdminTrigger} aria-hidden="true" />

      {/* ── Admin overlay ── */}
      {adminOpen && (
        <div className="admin-popup">
          <div className="admin-popup-header">
            <span className="system-badge">SYSTEM</span>
            <button className="admin-close" onClick={() => setAdminOpen(false)}>✕</button>
          </div>
          {!adminUnlocked ? (
            <div className="admin-popup-body">
              <p className="admin-message"><span className="bracket">[SYSTEM]</span> Developer access detected.</p>
              <p className="admin-message" style={{ marginTop: 4 }}><span className="bracket">[SYSTEM]</span> Enter override key.</p>
              <div className="admin-input-row">
                <input ref={passwordInputRef} type="password"
                  className={`admin-input${adminError ? " admin-input--error" : ""}`}
                  placeholder="Enter password" value={adminPassword}
                  onChange={e => { setAdminPassword(e.target.value); setAdminError(false); }}
                  onKeyDown={handleAdminKey} />
                <button className="admin-btn" onClick={handleAdminSubmit}>ENTER</button>
              </div>
              {adminError && <p className="admin-error">&gt; ACCESS DENIED</p>}
            </div>
          ) : (
            <div className="admin-popup-body">
              <p className="admin-message admin-message--success">
                <span className="bracket">[SYSTEM]</span> Admin mode active. Stage {stage}/{MAX_STAGE}.
              </p>
              <div className="admin-controls">
                <button className="admin-btn admin-btn--full" onClick={handleSkipNext} disabled={stage >= MAX_STAGE}>Skip to Next Stage</button>
                <button className="admin-btn admin-btn--full" onClick={handleSkipToFinal} disabled={stage >= MAX_STAGE}>Skip to Final Stage</button>
                <button className="admin-btn admin-btn--full" onClick={() => setAdminJumpOpen(o => !o)}>
                  Jump to Any Stage {adminJumpOpen ? "▲" : "▼"}
                </button>
                {adminJumpOpen && (
                  <div className="admin-jump-grid">
                    {Array.from({ length: MAX_STAGE }, (_, i) => i + 1).map(s => (
                      <button key={s}
                        className={`admin-jump-btn${s === stage ? " admin-jump-btn--active" : ""}`}
                        onClick={() => handleJumpToStage(s)}>{s}</button>
                    ))}
                  </div>
                )}
                <button className="admin-btn admin-btn--full" onClick={handleAdminGlitch} disabled={isGlitching}>Trigger Glitch Effect</button>
                <button className="admin-btn admin-btn--full admin-btn--danger" onClick={handleReset}>Reset Game</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main popup ── */}
      <div className={`popup${isGlitching ? " popup--glitch" : ""}`} ref={popupRef}>
        {isGlitching && <div className="scan-bar" />}

        <div className="popup-header"><span className="system-badge">SYSTEM</span></div>

        <div className={`popup-body${bodyFlicker ? " popup-body--flicker" : ""}`}>

          {/* Stage 1 */}
          {stage === 1 && !isGlitching && (
            <p className="system-message" key="s1">
              <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
            </p>
          )}

          {/* Glitch */}
          {isGlitching && (
            <>
              <p className="system-message glitch-text" key="glitch">
                <span className="bracket">[SYSTEM]</span>{" "}
                <span className="corrupt-chars">{corruptText}</span>
              </p>
              <div className="glitch-status"><span className="glitch-label">&gt; SCANNING...</span></div>
              <div className="glitch-progress"><div className="glitch-progress-bar" /></div>
            </>
          )}

          {/* Stage 2 */}
          {stage === 2 && !isGlitching && isRecalculating && (
            <p className="system-message recalc-msg" key="s2a">
              <span className="bracket">[SYSTEM]</span> Recalculating mission difficulty...
            </p>
          )}
          {stage === 2 && !isGlitching && !isRecalculating && (
            <p className="system-message" key="s2b">
              <span className="bracket">[SYSTEM]</span> Hidden penalty activated.
            </p>
          )}

          {/* ──── Stage 3 – aggressive name input ──── */}
          {stage === 3 && (
            <div key="s3" className="stage-block">

              {/* Header label */}
              {stage3Status !== "slowpoke" && (
                <p className="system-message">
                  {stage3Status === "validating"
                    ? <><span className="bracket">[SYSTEM]</span> Validating...</>
                    : <><span className="bracket">[SYSTEM]</span> Identity verification required.</>
                  }
                </p>
              )}

              {/* Error messages */}
              {stage3Status === "invalid" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> Invalid name input.
                </p>
              )}
              {stage3Status === "expired" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> Session expired.
                </p>
              )}

              {/* ── Slowpoke popup ── */}
              {stage3Status === "slowpoke" && (
                <div className="slowpoke-wrap">
                  <p className="system-message">
                    <span className="bracket">[SYSTEM]</span> Identity verification required.
                  </p>
                  <div className="slowpoke-box">
                    <div className="slowpoke-cat-col">
                      <span className="slowpoke-cat" aria-hidden="true">/ᐠ •ヮ• ᐟ\ﾉ</span>
                      <span className="slowpoke-zzz">z z z</span>
                    </div>
                    <p className="slowpoke-msg">
                      "Damn, you type so slow that I thought about taking a nap while
                      waiting for you to finish typing your name... but oh well,
                      welcome back,&nbsp;<span className="slowpoke-name">{slowpokeName}</span>,
                      I guess."
                    </p>
                  </div>
                </div>
              )}

              {/* Input – only when typing */}
              {stage3Status === "typing" && (
                <div className="name-input-group">
                  <label className="name-label">&gt; Enter your name:</label>
                  <input className="name-input" type="text"
                    value={inputValue}
                    disabled={inputDisabled}
                    placeholder={inputDisabled ? "[ INPUT LOCKED ]" : ""}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    maxLength={40}
                    autoFocus />
                  {inputDisabled && <p className="input-warning">&gt; INPUT TEMPORARILY DISABLED</p>}
                </div>
              )}
            </div>
          )}

          {/* Stage 4 */}
          {stage === 4 && (
            <div key="s4" className="stage-block">
              <p className="system-message">
                <span className="bracket">[SYSTEM]</span>{" "}
                {stage4Phase === "error" ? "Unexpected error occurred." : "Processing request..."}
              </p>
              <div className="fake-bar-wrap"><div className={`fake-bar fake-bar--${stage4Phase}`} /></div>
              <p className={`bar-pct${stage4Phase === "error" ? " bar-pct--error" : ""}`}>
                {stage4Phase === "error" ? "ERR_0x4F2A" : stage4Phase === "stuck" ? "99%" : ""}
              </p>
            </div>
          )}

          {/* Stage 5 */}
          {stage === 5 && (
            <div key="s5" className="stage-block">
              <p className="system-message"><span className="bracket">[SYSTEM]</span> Select your reward.</p>
              {rewardInvalid ? (
                <p className="invalid-msg"><span className="bracket-red">[SYSTEM]</span> Choice invalid.</p>
              ) : (
                <div className="reward-btns">
                  {rewards.map((name, idx) => (
                    <button key={name} className="reward-btn"
                      style={{ transform: `translate(${rewardPos[idx].x}px,${rewardPos[idx].y}px)` }}
                      onMouseEnter={() => handleRewardHover(idx)}
                      onClick={handleRewardClick}>{name}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stage 6 – type verification */}
          {stage === 6 && (
            <div key="s6" className="stage-block">
              {(typeStatus === "typing" || typeStatus === "incorrect") && (
                <>
                  <p className="system-message">
                    <span className="bracket">[SYSTEM]</span> Type the following to proceed:
                  </p>
                  <div className="type-phrase-box">
                    <span className="type-phrase">{typePhrase.display}</span>
                  </div>
                </>
              )}
              {typeStatus === "incorrect" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> 1 character incorrect.
                </p>
              )}
              {typeStatus === "typing" && (
                <div className="name-input-group" style={{ marginTop: 10 }}>
                  <input className="name-input" type="text" value={typeInput}
                    onChange={handleTypeInputChange}
                    onKeyDown={e => { if (e.key === "Enter") handleTypeSubmit(); }}
                    placeholder="Type here..." autoFocus />
                </div>
              )}
              {typeStatus === "checking" && (
                <p className="system-message recalc-msg">
                  <span className="bracket">[SYSTEM]</span> Checking...
                </p>
              )}
              {typeStatus === "granted" && (
                <p className="system-message type-granted-msg">
                  <span className="bracket-green">[SYSTEM]</span> Access granted.
                </p>
              )}
              {typeStatus === "failed" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> Verification failed.
                </p>
              )}
            </div>
          )}

          {/* Stage 7 – final fake-out */}
          {stage === 7 && (
            <div key="s7" className="stage-block">
              {(stage7Phase === "granted" || stage7Phase === "claiming") && (
                <p className="system-message reward-granted-msg">
                  <span className="bracket-green">[SYSTEM]</span> Reward granted.
                </p>
              )}
              {stage7Phase === "final" && (
                <>
                  <p className="system-message">
                    <span className="bracket">[SYSTEM]</span> Reward unavailable.
                  </p>
                  <p className="retry-text">Please try again tomorrow.</p>
                </>
              )}
            </div>
          )}

        </div>

        {/* ── Footer buttons ── */}
        <div className="popup-footer">
          {stage === 1 && !isGlitching && (
            <button ref={buttonRef} className="accept-btn accept-btn--dodge"
              style={{ transform: `translate(${translate.x}px,${translate.y}px)` }}
              onClick={handleAccept}>Accept</button>
          )}

          {stage === 2 && !isGlitching && !isRecalculating && (
            <button
              className={`accept-btn${pendingAction ? " accept-btn--pending" : ""}${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={() => withDelay(() => setStage(3))}
              disabled={pendingAction || btnJammed}>
              {pendingAction ? "PROCESSING..." : "Continue"}
            </button>
          )}

          {stage === 3 && stage3Status === "typing" && (
            <button
              className={`accept-btn${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleNameSubmit} disabled={btnJammed}>
              Submit
            </button>
          )}

          {stage === 6 && typeStatus === "typing" && (
            <button
              className={`accept-btn${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleTypeSubmit} disabled={btnJammed}>
              Submit
            </button>
          )}

          {stage === 7 && stage7Phase === "granted" && (
            <button
              className={`accept-btn accept-btn--granted${pendingAction ? " accept-btn--pending" : ""}${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleClaim} disabled={pendingAction || btnJammed}>
              {pendingAction ? "PROCESSING..." : "Claim"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

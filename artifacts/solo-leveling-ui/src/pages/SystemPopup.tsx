import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import "@/styles/system.css";

const CORRUPT_CHARS = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";
const ADMIN_PASSWORD = "hunter";
const REWARD_NAMES = ["Power", "Gold", "Freedom"];

function randomCorrupt(len: number) {
  return Array.from(
    { length: len },
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

export default function SystemPopup() {

  // ── Core ─────────────────────────────────────────────────────
  const [stage, setStage] = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const glitchDoneRef = useRef<() => void>(() => {});

  // ── Stage 1 – dodge ──────────────────────────────────────────
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef  = useRef<HTMLDivElement>(null);
  const naturalPos = useRef<{ x: number; y: number } | null>(null);

  // ── Stage 2 – recalculating phase ────────────────────────────
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ── Stage 3 – input trap ─────────────────────────────────────
  const [inputValue, setInputValue]   = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);

  // ── Stage 4 – fake loading ───────────────────────────────────
  const [stage4Phase, setStage4Phase] = useState<"filling" | "stuck" | "error">("filling");

  // ── Stage 5 – reward selection ───────────────────────────────
  const [rewards, setRewards]           = useState([...REWARD_NAMES]);
  const [rewardInvalid, setRewardInvalid] = useState(false);
  const [rewardPos, setRewardPos]       = useState([
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  ]);

  // ── Admin ─────────────────────────────────────────────────────
  const [adminOpen,     setAdminOpen]     = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError,    setAdminError]    = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ────────────────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────────────────

  // Stage 1 – capture natural button position
  useLayoutEffect(() => {
    if (stage !== 1) return;
    const btn   = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup) return;
    const bR = btn.getBoundingClientRect();
    const pR = popup.getBoundingClientRect();
    naturalPos.current = { x: bR.left - pR.left, y: bR.top - pR.top };
  }, [stage]);

  // Glitch lifecycle
  useEffect(() => {
    if (!isGlitching) return;
    setCorruptText(randomCorrupt(24));
    const iv = setInterval(() =>
      setCorruptText(randomCorrupt(16 + Math.floor(Math.random() * 12))), 70);
    const t = setTimeout(() => {
      clearInterval(iv);
      setIsGlitching(false);
      glitchDoneRef.current();
    }, 1600);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [isGlitching]);

  // Stage 2 – recalculating then penalty
  useEffect(() => {
    if (stage !== 2) return;
    setIsRecalculating(true);
    const t = setTimeout(() => setIsRecalculating(false), 1700);
    return () => clearTimeout(t);
  }, [stage]);

  // Stage 3 – chaos interval + auto-advance
  useEffect(() => {
    if (stage !== 3) return;
    setInputValue("");
    setInputDisabled(false);
    const JUNK = "█▓▒!?#@∎";
    const iv = setInterval(() => {
      const r = Math.random();
      if      (r < 0.28) setInputValue(v => v.slice(0, -1));
      else if (r < 0.44) setInputValue(v => v + JUNK[Math.floor(Math.random() * JUNK.length)]);
      else if (r < 0.58) {
        setInputDisabled(true);
        setTimeout(() => setInputDisabled(false), 750);
      }
    }, 850);
    const autoAdv = setTimeout(() => setStage(4), 13000);
    return () => { clearInterval(iv); clearTimeout(autoAdv); };
  }, [stage]);

  // Stage 4 – fake loading phases
  useEffect(() => {
    if (stage !== 4) return;
    setStage4Phase("filling");
    const t1 = setTimeout(() => setStage4Phase("stuck"),  2500);
    const t2 = setTimeout(() => setStage4Phase("error"),  5100);
    const t3 = setTimeout(() => setStage(5),               6700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [stage]);

  // Stage 5 – reward shuffle + reset
  useEffect(() => {
    if (stage !== 5) return;
    setRewards([...REWARD_NAMES]);
    setRewardInvalid(false);
    setRewardPos([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
    const iv = setInterval(() => setRewards(prev => shuffle(prev)), 2800);
    return () => clearInterval(iv);
  }, [stage]);

  // Admin – auto-focus password input
  useEffect(() => {
    if (adminOpen && !adminUnlocked)
      setTimeout(() => passwordInputRef.current?.focus(), 50);
  }, [adminOpen, adminUnlocked]);

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────

  // Stage 1 – dodge
  const handleMouseEnter = useCallback(() => {
    if (stage !== 1 || isGlitching) return;
    const btn   = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup || !naturalPos.current) return;
    const bR = btn.getBoundingClientRect();
    const pR = popup.getBoundingClientRect();
    const pad = 20;
    const minX = pad, maxX = pR.width  - bR.width  - pad;
    const minY = pad, maxY = pR.height - bR.height - pad;
    let tx: number, ty: number, tries = 0;
    do {
      tx = minX + Math.random() * (maxX - minX);
      ty = minY + Math.random() * (maxY - minY);
      tries++;
    } while (
      tries < 10 &&
      Math.abs(tx - (naturalPos.current.x + translate.x)) < 60 &&
      Math.abs(ty - (naturalPos.current.y + translate.y)) < 30
    );
    setTranslate({ x: tx - naturalPos.current.x, y: ty - naturalPos.current.y });
  }, [stage, isGlitching, translate]);

  const handleAccept = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    glitchDoneRef.current = () => setStage(2);
    setIsGlitching(true);
  }, []);

  // Stage 3 – submit
  const handleNameSubmit = useCallback(() => setStage(4), []);

  // Stage 5 – reward buttons
  const handleRewardHover = useCallback((idx: number) => {
    if (rewardInvalid) return;
    setRewardPos(prev => {
      const next = [...prev];
      next[idx] = {
        x: (Math.random() - 0.5) * 44,
        y: (Math.random() - 0.5) * 20,
      };
      return next;
    });
  }, [rewardInvalid]);

  const handleRewardClick = useCallback(() => {
    if (rewardInvalid) return;
    setRewardInvalid(true);
    setTimeout(() => setStage(6), 1400);
  }, [rewardInvalid]);

  // Admin
  const handleAdminTrigger = useCallback(() => {
    setAdminOpen(true); setAdminPassword(""); setAdminError(false);
  }, []);

  const handleAdminSubmit = useCallback(() => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminUnlocked(true); setAdminError(false);
    } else {
      setAdminError(true); setAdminPassword("");
    }
  }, [adminPassword]);

  const handleAdminKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter")  handleAdminSubmit();
    if (e.key === "Escape") setAdminOpen(false);
  }, [handleAdminSubmit]);

  const handleSkipToFinal = useCallback(() => {
    setStage(6); setIsGlitching(false); setAdminOpen(false);
  }, []);

  const handleAdminGlitch = useCallback(() => {
    if (isGlitching) return;
    glitchDoneRef.current = () => {};
    setIsGlitching(true);
  }, [isGlitching]);

  const handleReset = useCallback(() => {
    setStage(1); setIsGlitching(false); setTranslate({ x: 0, y: 0 });
    setAdminOpen(false); setAdminUnlocked(false);
  }, []);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className={`screen${isGlitching ? " screen--flash" : ""}`}>

      {/* Hidden admin trigger */}
      <div className="admin-trigger" onClick={handleAdminTrigger} aria-hidden="true" />

      {/* Admin popup */}
      {adminOpen && (
        <div className="admin-popup">
          <div className="admin-popup-header">
            <span className="system-badge">SYSTEM</span>
            <button className="admin-close" onClick={() => setAdminOpen(false)}>✕</button>
          </div>
          {!adminUnlocked ? (
            <div className="admin-popup-body">
              <p className="admin-message">
                <span className="bracket">[SYSTEM]</span> Developer access detected.
              </p>
              <div className="admin-input-row">
                <input
                  ref={passwordInputRef}
                  type="password"
                  className={`admin-input${adminError ? " admin-input--error" : ""}`}
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={e => { setAdminPassword(e.target.value); setAdminError(false); }}
                  onKeyDown={handleAdminKey}
                />
                <button className="admin-btn" onClick={handleAdminSubmit}>ENTER</button>
              </div>
              {adminError && <p className="admin-error">&gt; ACCESS DENIED</p>}
            </div>
          ) : (
            <div className="admin-popup-body">
              <p className="admin-message admin-message--success">
                <span className="bracket">[SYSTEM]</span> Admin mode active.
              </p>
              <div className="admin-controls">
                <button className="admin-btn admin-btn--full" onClick={handleSkipToFinal}>Skip to Final Stage</button>
                <button className="admin-btn admin-btn--full" onClick={handleAdminGlitch} disabled={isGlitching}>Trigger Glitch Effect</button>
                <button className="admin-btn admin-btn--full admin-btn--danger" onClick={handleReset}>Reset Game</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main popup */}
      <div className={`popup${isGlitching ? " popup--glitch" : ""}`} ref={popupRef}>
        {isGlitching && <div className="scan-bar" />}

        <div className="popup-header">
          <span className="system-badge">SYSTEM</span>
        </div>

        <div className="popup-body">

          {/* Stage 1 */}
          {stage === 1 && !isGlitching && (
            <p className="system-message" key="s1">
              <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
            </p>
          )}

          {/* Glitch overlay content */}
          {isGlitching && (
            <>
              <p className="system-message glitch-text" key="glitch">
                <span className="bracket">[SYSTEM]</span>{" "}
                <span className="corrupt-chars">{corruptText}</span>
              </p>
              <div className="glitch-status">
                <span className="glitch-label">&gt; SCANNING...</span>
              </div>
              <div className="glitch-progress">
                <div className="glitch-progress-bar" />
              </div>
            </>
          )}

          {/* Stage 2 – recalculating */}
          {stage === 2 && !isGlitching && isRecalculating && (
            <p className="system-message recalc-msg" key="s2a">
              <span className="bracket">[SYSTEM]</span> Recalculating mission difficulty...
            </p>
          )}

          {/* Stage 2 – penalty */}
          {stage === 2 && !isGlitching && !isRecalculating && (
            <p className="system-message" key="s2b">
              <span className="bracket">[SYSTEM]</span> Hidden penalty activated.
            </p>
          )}

          {/* Stage 3 – input trap */}
          {stage === 3 && (
            <div key="s3" className="stage-block">
              <p className="system-message">
                <span className="bracket">[SYSTEM]</span> Identity verification required.
              </p>
              <div className="name-input-group">
                <label className="name-label">&gt; Enter your name:</label>
                <input
                  className="name-input"
                  type="text"
                  value={inputValue}
                  disabled={inputDisabled}
                  placeholder={inputDisabled ? "[ INPUT LOCKED ]" : ""}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleNameSubmit(); }}
                  maxLength={40}
                  autoFocus
                />
                {inputDisabled && (
                  <p className="input-warning">&gt; INPUT TEMPORARILY DISABLED</p>
                )}
              </div>
            </div>
          )}

          {/* Stage 4 – fake loading */}
          {stage === 4 && (
            <div key="s4" className="stage-block">
              <p className="system-message">
                <span className="bracket">[SYSTEM]</span>{" "}
                {stage4Phase === "error" ? "Unexpected error occurred." : "Processing request..."}
              </p>
              <div className="fake-bar-wrap">
                <div className={`fake-bar fake-bar--${stage4Phase}`} />
              </div>
              <p className={`bar-pct${stage4Phase === "error" ? " bar-pct--error" : ""}`}>
                {stage4Phase === "error"  ? "ERR_0x4F2A"
                 : stage4Phase === "stuck" ? "99%"
                 : ""}
              </p>
            </div>
          )}

          {/* Stage 5 – reward selection */}
          {stage === 5 && (
            <div key="s5" className="stage-block">
              <p className="system-message">
                <span className="bracket">[SYSTEM]</span> Select your reward.
              </p>
              {rewardInvalid ? (
                <p className="invalid-msg">
                  <span className="bracket-red">[SYSTEM]</span> Choice invalid.
                </p>
              ) : (
                <div className="reward-btns">
                  {rewards.map((name, idx) => (
                    <button
                      key={name}
                      className="reward-btn"
                      style={{ transform: `translate(${rewardPos[idx].x}px,${rewardPos[idx].y}px)` }}
                      onMouseEnter={() => handleRewardHover(idx)}
                      onClick={handleRewardClick}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stage 6 – final */}
          {stage === 6 && (
            <>
              <p className="system-message" key="s6">
                <span className="bracket">[SYSTEM]</span> Reward unavailable.
              </p>
              <p className="retry-text">Please try again tomorrow.</p>
            </>
          )}

        </div>

        {/* Footer buttons */}
        <div className="popup-footer">
          {stage === 1 && !isGlitching && (
            <button
              ref={buttonRef}
              className="accept-btn accept-btn--dodge"
              style={{ transform: `translate(${translate.x}px,${translate.y}px)` }}
              onMouseEnter={handleMouseEnter}
              onClick={handleAccept}
            >
              Accept
            </button>
          )}
          {stage === 2 && !isGlitching && !isRecalculating && (
            <button className="accept-btn" onClick={() => setStage(3)}>
              Continue
            </button>
          )}
          {stage === 3 && (
            <button className="accept-btn" onClick={handleNameSubmit}>
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

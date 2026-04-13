import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import "@/styles/system.css";

const CORRUPT_CHARS = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";
const ADMIN_PASSWORD = "hunter";
const REWARD_NAMES   = ["Power", "Gold", "Freedom"];
const MAX_STAGE      = 6;

// Proximity threshold (px) at which the dodge button starts fleeing
const DODGE_RADIUS   = 100;

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
  const [stage, setStage]         = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const glitchDoneRef = useRef<() => void>(() => {});

  // ── Stage 1 – proximity dodge ────────────────────────────────
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const buttonRef   = useRef<HTMLButtonElement>(null);
  const popupRef    = useRef<HTMLDivElement>(null);
  const naturalPos  = useRef<{ x: number; y: number } | null>(null);
  const dodgeCoolRef = useRef(false); // prevent rapid re-dodge

  // ── Stage 2 – recalculating ──────────────────────────────────
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ── Stage 3 – input trap ─────────────────────────────────────
  const [inputValue,    setInputValue]    = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const inputValueRef = useRef("");        // readable inside intervals

  // ── Stage 4 – fake loading ───────────────────────────────────
  const [stage4Phase, setStage4Phase] = useState<"filling" | "stuck" | "error">("filling");

  // ── Stage 5 – reward selection ───────────────────────────────
  const [rewards,       setRewards]       = useState([...REWARD_NAMES]);
  const [rewardInvalid, setRewardInvalid] = useState(false);
  const [rewardPos,     setRewardPos]     = useState([
    { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  ]);

  // ── Stage 6 – fake-out + interactive Claim ───────────────────
  const [stage6Phase, setStage6Phase] = useState<"granted" | "claiming" | "final">("granted");
  const stage6DirectRef = useRef(false);

  // ── Ragebait helpers ─────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState(false); // delayed-click state
  const [btnJammed,     setBtnJammed]     = useState(false); // cursor interference

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

  // Stage 2 – recalculating → penalty
  useEffect(() => {
    if (stage !== 2) return;
    setIsRecalculating(true);
    const t = setTimeout(() => setIsRecalculating(false), 1700);
    return () => clearTimeout(t);
  }, [stage]);

  // Stage 3 – chaos triggers NEAR COMPLETION (once ≥ 5 chars)
  useEffect(() => {
    if (stage !== 3) return;
    setInputValue("");
    inputValueRef.current = "";
    setInputDisabled(false);
    const JUNK = "█▓▒!?#@∎";

    const iv = setInterval(() => {
      const len = inputValueRef.current.length;
      if (len < 5) return; // leave them alone while typing starts
      // chaos scales with length: more chars → more aggressive
      const aggressiveness = Math.min(1, (len - 4) / 8);
      const r = Math.random();
      if (r < 0.30 * aggressiveness) {
        // delete the last 1–2 chars
        const del = Math.random() < 0.4 ? 2 : 1;
        setInputValue(v => v.slice(0, -del));
      } else if (r < 0.50 * aggressiveness) {
        // insert junk char mid-way
        setInputValue(v => v + JUNK[Math.floor(Math.random() * JUNK.length)]);
      } else if (r < 0.62 * aggressiveness) {
        // temporarily lock input
        setInputDisabled(true);
        setTimeout(() => setInputDisabled(false), 800);
      }
    }, 700);

    const autoAdv = setTimeout(() => setStage(4), 13000);
    return () => { clearInterval(iv); clearTimeout(autoAdv); };
  }, [stage]);

  // Stage 4 – fake loading: reliably stops at 98–99%
  useEffect(() => {
    if (stage !== 4) return;
    setStage4Phase("filling");
    const t1 = setTimeout(() => setStage4Phase("stuck"),  2600);
    const t2 = setTimeout(() => setStage4Phase("error"),  5300);
    const t3 = setTimeout(() => setStage(5),              6900);
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

  // Stage 6 – interactive: stays on "granted" until Claim is clicked
  useEffect(() => {
    if (stage !== 6) return;
    if (stage6DirectRef.current) {
      stage6DirectRef.current = false;
      setStage6Phase("final");
      return;
    }
    setStage6Phase("granted");
    // no auto-advance — user must click Claim
  }, [stage]);

  // Cursor interference: randomly jam footer buttons on stages 2–5
  useEffect(() => {
    if (stage < 2 || stage > 5) return;
    setBtnJammed(false);
    const iv = setInterval(() => {
      if (Math.random() < 0.45) {
        setBtnJammed(true);
        setTimeout(() => setBtnJammed(false), 420);
      }
    }, 3800);
    return () => { clearInterval(iv); setBtnJammed(false); };
  }, [stage]);

  // Admin – auto-focus password input
  useEffect(() => {
    if (adminOpen && !adminUnlocked)
      setTimeout(() => passwordInputRef.current?.focus(), 50);
  }, [adminOpen, adminUnlocked]);

  // ────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────

  // Wrap a button action with a 0.6–0.8 s visible delay
  const withDelay = useCallback((fn: () => void, ms = 700) => {
    if (pendingAction || btnJammed) return;
    setPendingAction(true);
    setTimeout(() => { setPendingAction(false); fn(); }, ms);
  }, [pendingAction, btnJammed]);

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────

  // Stage 1 – proximity dodge via onMouseMove on popup
  const handlePopupMouseMove = useCallback((e: React.MouseEvent) => {
    if (stage !== 1 || isGlitching || dodgeCoolRef.current) return;
    const btn   = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup || !naturalPos.current) return;

    const bR = btn.getBoundingClientRect();
    const pR = popup.getBoundingClientRect();

    // Button centre in viewport coords
    const btnCx = bR.left + bR.width  / 2;
    const btnCy = bR.top  + bR.height / 2;
    const dx = e.clientX - btnCx;
    const dy = e.clientY - btnCy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > DODGE_RADIUS) return; // cursor still far away

    // Dodge: pick a random position well away from the cursor
    const pad  = 20;
    const minX = pad, maxX = pR.width  - bR.width  - pad;
    const minY = pad, maxY = pR.height - bR.height - pad;
    let tx: number, ty: number, tries = 0;
    do {
      tx = minX + Math.random() * (maxX - minX);
      ty = minY + Math.random() * (maxY - minY);
      tries++;
    } while (
      tries < 12 &&
      Math.abs(tx - (naturalPos.current.x + translate.x)) < 70 &&
      Math.abs(ty - (naturalPos.current.y + translate.y)) < 35
    );
    setTranslate({ x: tx - naturalPos.current.x, y: ty - naturalPos.current.y });

    // Cooldown so the button doesn't spasm on every pixel
    dodgeCoolRef.current = true;
    setTimeout(() => { dodgeCoolRef.current = false; }, 280);
  }, [stage, isGlitching, translate]);

  const handleAccept = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    glitchDoneRef.current = () => setStage(2);
    setIsGlitching(true);
  }, []);

  // Stage 3 – keep ref in sync
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    inputValueRef.current = v;
  }, []);

  const handleNameSubmit = useCallback(() => {
    withDelay(() => setStage(4));
  }, [withDelay]);

  // Stage 5 – reward buttons
  const handleRewardHover = useCallback((idx: number) => {
    if (rewardInvalid) return;
    setRewardPos(prev => {
      const next = [...prev];
      next[idx] = { x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 22 };
      return next;
    });
  }, [rewardInvalid]);

  const handleRewardClick = useCallback(() => {
    if (rewardInvalid) return;
    setRewardInvalid(true);
    setTimeout(() => setStage(6), 1400);
  }, [rewardInvalid]);

  // Stage 6 – Claim button: delay → glitch transition → final
  const handleClaim = useCallback(() => {
    if (stage6Phase !== "granted" || pendingAction || btnJammed) return;
    setPendingAction(true);
    setTimeout(() => {
      setPendingAction(false);
      // Mini-glitch: use the body-flicker CSS, then flip to final
      setStage6Phase("claiming");
      setTimeout(() => setStage6Phase("final"), 420);
    }, 650);
  }, [stage6Phase, pendingAction, btnJammed]);

  // Admin – auth
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

  // Admin – controls
  const handleSkipNext = useCallback(() => {
    setIsGlitching(false); setPendingAction(false); setBtnJammed(false);
    setStage(prev => {
      const next = Math.min(prev + 1, MAX_STAGE);
      if (next === MAX_STAGE) stage6DirectRef.current = true;
      return next;
    });
  }, []);

  const handleSkipToFinal = useCallback(() => {
    setIsGlitching(false); setPendingAction(false); setBtnJammed(false);
    stage6DirectRef.current = true;
    setStage(MAX_STAGE);
    setAdminOpen(false);
  }, []);

  const handleJumpToStage = useCallback((s: number) => {
    setIsGlitching(false); setPendingAction(false); setBtnJammed(false);
    if (s === MAX_STAGE) stage6DirectRef.current = true;
    setStage(s);
    setAdminJumpOpen(false);
    setAdminOpen(false);
  }, []);

  const handleAdminGlitch = useCallback(() => {
    if (isGlitching) return;
    glitchDoneRef.current = () => {};
    setIsGlitching(true);
  }, [isGlitching]);

  const handleReset = useCallback(() => {
    setStage(1); setIsGlitching(false); setTranslate({ x: 0, y: 0 });
    setPendingAction(false); setBtnJammed(false);
    setAdminOpen(false); setAdminUnlocked(false); setAdminJumpOpen(false);
  }, []);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  // Which CSS classes flicker: stage 6 "claiming" phase OR btn-pending pulse
  const bodyFlicker = stage === 6 && stage6Phase === "claiming";

  return (
    <div className={`screen${isGlitching ? " screen--flash" : ""}`}
      onMouseMove={handlePopupMouseMove}>

      {/* Hidden admin trigger (top-left 48×48 invisible zone) */}
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
              <p className="admin-message" style={{ marginTop: 4 }}>
                <span className="bracket">[SYSTEM]</span> Enter override key.
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
                <span className="bracket">[SYSTEM]</span> Admin mode active. Stage {stage}/{MAX_STAGE}.
              </p>
              <div className="admin-controls">

                <button className="admin-btn admin-btn--full" onClick={handleSkipNext}
                  disabled={stage >= MAX_STAGE}>
                  Skip to Next Stage
                </button>

                <button className="admin-btn admin-btn--full" onClick={handleSkipToFinal}
                  disabled={stage >= MAX_STAGE}>
                  Skip to Final Stage
                </button>

                <button className="admin-btn admin-btn--full"
                  onClick={() => setAdminJumpOpen(o => !o)}>
                  Jump to Any Stage {adminJumpOpen ? "▲" : "▼"}
                </button>
                {adminJumpOpen && (
                  <div className="admin-jump-grid">
                    {Array.from({ length: MAX_STAGE }, (_, i) => i + 1).map(s => (
                      <button
                        key={s}
                        className={`admin-jump-btn${s === stage ? " admin-jump-btn--active" : ""}`}
                        onClick={() => handleJumpToStage(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <button className="admin-btn admin-btn--full" onClick={handleAdminGlitch}
                  disabled={isGlitching}>
                  Trigger Glitch Effect
                </button>

                <button className="admin-btn admin-btn--full admin-btn--danger" onClick={handleReset}>
                  Reset Game
                </button>

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

        <div className={`popup-body${bodyFlicker ? " popup-body--flicker" : ""}`}>

          {/* Stage 1 */}
          {stage === 1 && !isGlitching && (
            <p className="system-message" key="s1">
              <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
            </p>
          )}

          {/* Glitch overlay */}
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
                  onChange={handleInputChange}
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
                {stage4Phase === "error"   ? "ERR_0x4F2A"
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

          {/* Stage 6 – fake-out with interactive Claim */}
          {stage === 6 && (
            <div key="s6" className="stage-block">
              {(stage6Phase === "granted" || stage6Phase === "claiming") && (
                <p className="system-message reward-granted-msg">
                  <span className="bracket-green">[SYSTEM]</span> Reward granted.
                </p>
              )}
              {stage6Phase === "final" && (
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

        {/* Footer buttons */}
        <div className="popup-footer">
          {stage === 1 && !isGlitching && (
            <button
              ref={buttonRef}
              className="accept-btn accept-btn--dodge"
              style={{ transform: `translate(${translate.x}px,${translate.y}px)` }}
              onClick={handleAccept}
            >
              Accept
            </button>
          )}

          {stage === 2 && !isGlitching && !isRecalculating && (
            <button
              className={`accept-btn${pendingAction ? " accept-btn--pending" : ""}${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={() => withDelay(() => setStage(3))}
              disabled={pendingAction || btnJammed}
            >
              {pendingAction ? "PROCESSING..." : "Continue"}
            </button>
          )}

          {stage === 3 && (
            <button
              className={`accept-btn${pendingAction ? " accept-btn--pending" : ""}${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleNameSubmit}
              disabled={pendingAction || btnJammed}
            >
              {pendingAction ? "PROCESSING..." : "Submit"}
            </button>
          )}

          {stage === 6 && stage6Phase === "granted" && (
            <button
              className={`accept-btn accept-btn--granted${pendingAction ? " accept-btn--pending" : ""}${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleClaim}
              disabled={pendingAction || btnJammed}
            >
              {pendingAction ? "PROCESSING..." : "Claim"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

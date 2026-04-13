import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import "@/styles/system.css";

const CORRUPT_CHARS = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";
const ADMIN_PASSWORD = "hunter";

function randomCorrupt(len: number) {
  return Array.from(
    { length: len },
    () => CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)]
  ).join("");
}

export default function SystemPopup() {
  // ── Game state ──────────────────────────────────────────────
  const [stage, setStage] = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const glitchDoneRef = useRef<() => void>(() => setStage(2));

  // ── Admin state ──────────────────────────────────────────────
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const naturalPos = useRef<{ x: number; y: number } | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // ── Dodge natural position ────────────────────────────────────
  useLayoutEffect(() => {
    if (stage !== 1) return;
    const btn = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup) return;
    const btnRect = btn.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    naturalPos.current = {
      x: btnRect.left - popupRect.left,
      y: btnRect.top - popupRect.top,
    };
  }, [stage]);

  // ── Glitch effect lifecycle ───────────────────────────────────
  useEffect(() => {
    if (!isGlitching) return;
    setCorruptText(randomCorrupt(24));
    const interval = setInterval(() => {
      setCorruptText(randomCorrupt(16 + Math.floor(Math.random() * 12)));
    }, 70);
    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsGlitching(false);
      glitchDoneRef.current();
    }, 1600);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isGlitching]);

  // ── Focus password field when admin popup opens ───────────────
  useEffect(() => {
    if (adminOpen && !adminUnlocked) {
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [adminOpen, adminUnlocked]);

  // ── Dodge handler ─────────────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    if (stage !== 1 || isGlitching) return;
    const btn = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup || !naturalPos.current) return;

    const btnRect = btn.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const padding = 20;
    const minX = padding;
    const maxX = popupRect.width - btnRect.width - padding;
    const minY = padding;
    const maxY = popupRect.height - btnRect.height - padding;

    let targetX: number;
    let targetY: number;
    let attempts = 0;
    do {
      targetX = minX + Math.random() * (maxX - minX);
      targetY = minY + Math.random() * (maxY - minY);
      attempts++;
    } while (
      attempts < 10 &&
      Math.abs(targetX - (naturalPos.current.x + translate.x)) < 60 &&
      Math.abs(targetY - (naturalPos.current.y + translate.y)) < 30
    );

    setTranslate({
      x: targetX - naturalPos.current.x,
      y: targetY - naturalPos.current.y,
    });
  }, [stage, isGlitching, translate]);

  // ── Game handlers ─────────────────────────────────────────────
  const handleAccept = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    glitchDoneRef.current = () => setStage(2);
    setIsGlitching(true);
  }, []);

  const handleContinue = useCallback(() => {
    setStage(3);
  }, []);

  // ── Admin handlers ────────────────────────────────────────────
  const handleAdminTrigger = useCallback(() => {
    setAdminOpen(true);
    setAdminPassword("");
    setAdminError(false);
  }, []);

  const handleAdminSubmit = useCallback(() => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setAdminError(false);
    } else {
      setAdminError(true);
      setAdminPassword("");
    }
  }, [adminPassword]);

  const handleAdminKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleAdminSubmit();
      if (e.key === "Escape") setAdminOpen(false);
    },
    [handleAdminSubmit]
  );

  const handleSkipToFinal = useCallback(() => {
    setStage(3);
    setIsGlitching(false);
    setAdminOpen(false);
  }, []);

  const handleAdminGlitch = useCallback(() => {
    if (isGlitching) return;
    glitchDoneRef.current = () => {};
    setIsGlitching(true);
  }, [isGlitching]);

  const handleReset = useCallback(() => {
    setStage(1);
    setIsGlitching(false);
    setTranslate({ x: 0, y: 0 });
    setAdminOpen(false);
    setAdminUnlocked(false);
  }, []);

  return (
    <div className={`screen${isGlitching ? " screen--flash" : ""}`}>

      {/* ── Hidden admin trigger (top-left corner) ── */}
      <div
        className="admin-trigger"
        onClick={handleAdminTrigger}
        aria-hidden="true"
      />

      {/* ── Admin popup ── */}
      {adminOpen && (
        <div className="admin-popup">
          <div className="admin-popup-header">
            <span className="system-badge">SYSTEM</span>
            <button
              className="admin-close"
              onClick={() => setAdminOpen(false)}
            >
              ✕
            </button>
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
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setAdminError(false);
                  }}
                  onKeyDown={handleAdminKeyDown}
                />
                <button className="admin-btn" onClick={handleAdminSubmit}>
                  ENTER
                </button>
              </div>
              {adminError && (
                <p className="admin-error">
                  &gt; ACCESS DENIED
                </p>
              )}
            </div>
          ) : (
            <div className="admin-popup-body">
              <p className="admin-message admin-message--success">
                <span className="bracket">[SYSTEM]</span> Admin mode active.
              </p>
              <div className="admin-controls">
                <button className="admin-btn admin-btn--full" onClick={handleSkipToFinal}>
                  Skip to Final Stage
                </button>
                <button
                  className="admin-btn admin-btn--full"
                  onClick={handleAdminGlitch}
                  disabled={isGlitching}
                >
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

      {/* ── Main popup ── */}
      <div
        className={`popup${isGlitching ? " popup--glitch" : ""}`}
        ref={popupRef}
      >
        {isGlitching && <div className="scan-bar" />}

        <div className="popup-header">
          <span className="system-badge">SYSTEM</span>
        </div>

        <div className="popup-body">
          {stage === 1 && !isGlitching && (
            <p className="system-message" key="stage1">
              <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
            </p>
          )}

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

          {stage === 2 && !isGlitching && (
            <p className="system-message" key="stage2">
              <span className="bracket">[SYSTEM]</span> Hidden penalty activated.
            </p>
          )}

          {stage === 3 && (
            <>
              <p className="system-message" key="stage3">
                <span className="bracket">[SYSTEM]</span> Reward unavailable.
              </p>
              <p className="retry-text">Please try again tomorrow.</p>
            </>
          )}
        </div>

        <div className="popup-footer">
          {stage === 1 && !isGlitching && (
            <button
              ref={buttonRef}
              className="accept-btn accept-btn--dodge"
              style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}
              onMouseEnter={handleMouseEnter}
              onClick={handleAccept}
            >
              Accept
            </button>
          )}
          {stage === 2 && !isGlitching && (
            <button className="accept-btn" onClick={handleContinue}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

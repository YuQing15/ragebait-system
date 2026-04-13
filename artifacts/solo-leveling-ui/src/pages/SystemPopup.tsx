import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import "@/styles/system.css";

const CORRUPT_CHARS = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";

function randomCorrupt(len: number) {
  return Array.from(
    { length: len },
    () => CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)]
  ).join("");
}

export default function SystemPopup() {
  const [stage, setStage] = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const naturalPos = useRef<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    if (!isGlitching) return;

    setCorruptText(randomCorrupt(24));
    const interval = setInterval(() => {
      setCorruptText(randomCorrupt(16 + Math.floor(Math.random() * 12)));
    }, 70);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsGlitching(false);
      setStage(2);
    }, 1600);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isGlitching]);

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

  const handleAccept = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    setIsGlitching(true);
  }, []);

  const handleContinue = useCallback(() => {
    setStage(3);
  }, []);

  return (
    <div className={`screen${isGlitching ? " screen--flash" : ""}`}>
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

          {stage === 2 && (
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
          {stage === 2 && (
            <button className="accept-btn" onClick={handleContinue}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

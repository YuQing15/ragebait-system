import { useState, useRef, useCallback } from "react";
import "@/styles/system.css";

export default function SystemPopup() {
  const [stage, setStage] = useState(1);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (stage !== 1) return;
    const btn = buttonRef.current;
    if (!btn) return;

    const container = btn.closest(".popup") as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const maxX = containerRect.width - btnRect.width - 24;
    const maxY = containerRect.height - btnRect.height - 24;

    const randomX = Math.floor(Math.random() * maxX);
    const randomY = Math.floor(Math.random() * maxY);

    btn.style.position = "absolute";
    btn.style.left = `${randomX}px`;
    btn.style.top = `${randomY}px`;
  }, [stage]);

  const handleAccept = useCallback(() => {
    setStage(2);
    if (buttonRef.current) {
      buttonRef.current.style.position = "";
      buttonRef.current.style.left = "";
      buttonRef.current.style.top = "";
    }
  }, []);

  const handleContinue = useCallback(() => {
    setStage(3);
  }, []);

  return (
    <div className="screen">
      <div className="popup">
        <div className="popup-header">
          <span className="system-badge">SYSTEM</span>
        </div>

        <div className="popup-body">
          {stage === 1 && (
            <p className="system-message" key="stage1">
              <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
            </p>
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
          {stage === 1 && (
            <button
              ref={buttonRef}
              className="accept-btn"
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

import { useState, useRef, useCallback } from "react";
import "@/styles/system.css";

export default function SystemPopup() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [accepted, setAccepted] = useState(false);

  const handleMouseEnter = useCallback(() => {
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
  }, []);

  const handleClick = useCallback(() => {
    setAccepted(true);
  }, []);

  return (
    <div className="screen">
      <div className="popup">
        <div className="popup-header">
          <span className="system-badge">SYSTEM</span>
        </div>
        <div className="popup-body">
          <p className="system-message">
            <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
          </p>
          {accepted && (
            <p className="accepted-text">Quest accepted. Good luck, Hunter.</p>
          )}
        </div>
        <div className="popup-footer">
          <button
            ref={buttonRef}
            className="accept-btn"
            onMouseEnter={handleMouseEnter}
            onClick={handleClick}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

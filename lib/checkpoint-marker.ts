import type { Checkpoint } from "@/lib/supabase"

const CHECKPOINT_MARKER_STYLE_ID = "checkpoint-marker-theme"

const checkpointMarkerStyles = `
.checkpoint-token {
  position: relative;
  width: 46px;
  height: 58px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  pointer-events: none;
  filter: drop-shadow(0 8px 14px rgba(15, 23, 42, 0.28));
}

.checkpoint-token__pulse {
  position: absolute;
  top: 4px;
  left: 50%;
  width: 38px;
  height: 38px;
  margin-left: -19px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.28);
  border: 2px solid rgba(251, 191, 36, 0.42);
  animation: checkpoint-pulse 1.8s ease-out infinite;
}

.checkpoint-token__body {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 14px 14px 16px 16px;
  border: 2px solid rgba(255, 255, 255, 0.96);
  overflow: hidden;
  transform: rotate(45deg);
  animation: checkpoint-float 2.2s ease-in-out infinite;
}

.checkpoint-token--static .checkpoint-token__body {
  background: linear-gradient(145deg, #f97316 0%, #ef4444 55%, #b91c1c 100%);
}

.checkpoint-token--moving .checkpoint-token__body {
  background: linear-gradient(145deg, #22c55e 0%, #14b8a6 52%, #0f766e 100%);
}

.checkpoint-token__body::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.34);
}

.checkpoint-token__shine {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.4);
  transform: rotate(-35deg);
}

.checkpoint-token__core {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkpoint-token__glyph {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.96);
  border-radius: 5px;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12);
}

.checkpoint-token__glyph::before,
.checkpoint-token__glyph::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.96);
}

.checkpoint-token__glyph::before {
  width: 2px;
  height: 18px;
  top: -1px;
  left: 7px;
}

.checkpoint-token__glyph::after {
  width: 18px;
  height: 2px;
  top: 7px;
  left: -1px;
}

.checkpoint-token__level {
  position: absolute;
  top: -2px;
  left: -2px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: #111827;
  color: #f8fafc;
  font-size: 10px;
  font-weight: 800;
  line-height: 20px;
  text-align: center;
  transform: rotate(-45deg);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.35);
}

.checkpoint-token__tail {
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  background: #7f1d1d;
  transform: rotate(45deg);
  border-radius: 0 0 4px 0;
}

.checkpoint-token--moving .checkpoint-token__tail {
  background: #115e59;
}

.checkpoint-token--highlighted {
  z-index: 1000;
}

.checkpoint-token--highlighted .checkpoint-token__body {
  animation: checkpoint-highlight-bob 1s ease-in-out infinite;
}

@keyframes checkpoint-float {
  0%, 100% { transform: rotate(45deg) translateY(0); }
  50% { transform: rotate(45deg) translateY(-2px); }
}

@keyframes checkpoint-highlight-bob {
  0%, 100% { transform: rotate(45deg) translateY(0) scale(1); }
  50% { transform: rotate(45deg) translateY(-4px) scale(1.08); }
}

@keyframes checkpoint-pulse {
  0% { transform: translateZ(0) scale(0.85); opacity: 0.85; }
  100% { transform: translateZ(0) scale(1.7); opacity: 0; }
}
`

export const ensureCheckpointMarkerStyles = () => {
  if (typeof document === "undefined") {
    return
  }

  if (document.getElementById(CHECKPOINT_MARKER_STYLE_ID)) {
    return
  }

  const style = document.createElement("style")
  style.id = CHECKPOINT_MARKER_STYLE_ID
  style.textContent = checkpointMarkerStyles
  document.head.appendChild(style)
}

export const getCheckpointMarkerIconConfig = (checkpoint: Checkpoint, highlighted = false) => {
  const variantClass = checkpoint.is_moving ? "checkpoint-token--moving" : "checkpoint-token--static"
  const highlightedClass = highlighted ? "checkpoint-token--highlighted" : ""
  const badgeLabel = checkpoint.id > 99 ? "99+" : String(checkpoint.id)

  return {
    className: "checkpoint-marker-shell",
    html: `
      <div class="checkpoint-token ${variantClass} ${highlightedClass}">
        ${highlighted ? '<div class="checkpoint-token__pulse"></div>' : ""}
        <div class="checkpoint-token__body">
          <div class="checkpoint-token__shine"></div>
          <div class="checkpoint-token__core">
            <div class="checkpoint-token__glyph"></div>
          </div>
          <div class="checkpoint-token__level">${badgeLabel}</div>
        </div>
        <div class="checkpoint-token__tail"></div>
      </div>
    `,
    iconSize: [46, 58] as [number, number],
    iconAnchor: [23, 54] as [number, number],
    popupAnchor: [0, -42] as [number, number],
  }
}
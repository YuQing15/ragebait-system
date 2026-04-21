import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import "@/styles/system.css";

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────── */

const CORRUPT_CHARS = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";
const ADMIN_PASSWORD = "hunter";
const MAX_STAGE = 7;
const DODGE_RADIUS = 100;

const NEIGHBORS: Record<string, string> = {
  a: "s",
  b: "v",
  c: "x",
  d: "f",
  e: "r",
  f: "d",
  g: "h",
  h: "g",
  i: "u",
  j: "k",
  k: "j",
  l: "k",
  m: "n",
  n: "m",
  o: "p",
  p: "o",
  q: "w",
  r: "e",
  s: "a",
  t: "r",
  u: "y",
  v: "b",
  w: "s",
  x: "z",
  y: "t",
  z: "x",
};

const TYPE_PHRASES = [
  { display: "ACCESS GRANTED", internal: "ACCESS GRANTED" },
  { display: "SHADOW EXTRACTION", internal: "SHADOW EXTRACTION" },
  { display: "DUNGEON CLEAR CODE", internal: "DUNGEON CLEAR CODE" },
  { display: "RANK UP PROTOCOL", internal: "RANK UP PROTOCOL" },
  { display: "ARISE NOW HUNTER", internal: "ARISE NOW HUNTER" },
  { display: "GATE OVERRIDE SEVEN", internal: "GATE OVERRIDE SEVEN" },
  { display: "MONARCH SEAL VERIFY", internal: "MONARCH SEAL VERIFY" },
  { display: "NULL VOID CONFIRM", internal: "NULL VOID CONFIRM" },
  { display: "KXRT ZEPHYR ONLINE", internal: "KXRT ZEPHYR ONLINE" },
  { display: "VORTEX SIGNAL NULL", internal: "VORTEX SIGNAL NULL" },
];

const MATH_TAUNTS = [
  "Choose wisely.",
  "This should be easy.",
  "Why are you struggling?",
  "Just click one.",
  "It's not that hard.",
  "Correct... but why are you so slow?",
  "You got it right, eventually.",
  "Were you counting on your fingers?",
];

const MODERN_INSULTS = [
  "NPC",
  "Tryhard",
  "Skill Issue",
  "Lagging Entity",
  "Background Character",
  "Offline Brain",
  "Low Priority User",
  "Unoptimised Human",
  "AFK Thinker",
  "Beta Tester",
];

const VICTORIAN_INSULTS = [
  "Absolute Radish",
  "Overcooked Noodle",
  "Hippopotamus",
  "Walnut",
  "Goose",
  "Dusty Teapot",
  "Expired Potato",
];

const BUTTON_TAUNTS = {
  fakeHonesty: [
    "Honesty appreciated. Still not enough.",
    "That was adorable. Try again.",
    "Almost convincing. Continue.",
    "System remains unconvinced.",
  ],
  shrinking: [
    "Too slow. It got shy.",
    "You hesitated. It noticed.",
    "The button dislikes indecision.",
  ],
  multiplying: [
    "Wrong one.",
    "That decoy looked real to you?",
    "Amazing. You picked the fake one.",
  ],
  delay: [
    "Too early.",
    "Too eager.",
    "Patience was the mechanic, unfortunately.",
  ],
  hold: [
    "You let go.",
    "Commitment issues detected.",
    "Hold means hold.",
  ],
  rhythm: [
    "Off beat.",
    "No rhythm whatsoever.",
    "That click was tragic.",
  ],
  stamina: [
    "Keep going.",
    "Still weak.",
    "The button is outlasting you.",
  ],
  oneFrame: [
    "Missed it.",
    "That window was generous by my standards.",
    "Blink slower next time.",
  ],
} as const;

/* ──────────────────────────────────────────────────────────────
   TYPES
────────────────────────────────────────────────────────────── */

type MathQuestion = {
  prompt: string;
  correct: number;
  options: number[];
};

type Stage3Status =
  | "typing"
  | "validating"
  | "invalid"
  | "expired"
  | "slowpoke";

type Stage6Status =
  | "typing"
  | "checking"
  | "incorrect"
  | "granted";

type Stage1Phase = "first" | "glitching" | "second";

type ButtonBossLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type BossPhase = "idle" | "pass";

type MultiButton = {
  id: number;
  label: string;
  isReal: boolean;
};

/* ──────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────── */

function getRandomFrom<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRandomTitle() {
  if (Math.random() < 0.5) {
    return getRandomFrom(MODERN_INSULTS);
  }
  return getRandomFrom(VICTORIAN_INSULTS);
}

function randomCorrupt(len: number) {
  return Array.from(
    { length: len },
    () => CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)],
  ).join("");
}

function fullCorrupt(s: string): string {
  const out = s.split("").map((c) => {
    const r = Math.random();
    if (r < 0.35) {
      return CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
    }
    if (r < 0.55) {
      return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
    }
    return c;
  });

  for (let i = out.length - 1; i > 0; i -= 1) {
    if (Math.random() < 0.45) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }

  return out.join("");
}

function generateMathQuestion(): MathQuestion {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const patterns = [
    () => {
      const a = rand(11, 89);
      const b = rand(7, 66);
      return { prompt: `${a} + ${b}`, correct: a + b };
    },
    () => {
      const a = rand(30, 120);
      const b = rand(5, a - 1);
      return { prompt: `${a} - ${b}`, correct: a - b };
    },
    () => {
      const a = rand(4, 15);
      const b = rand(3, 12);
      return { prompt: `${a} × ${b}`, correct: a * b };
    },
    () => {
      const b = rand(2, 12);
      const correct = rand(3, 20);
      const a = b * correct;
      return { prompt: `${a} ÷ ${b}`, correct };
    },
    () => {
      const a = rand(5, 30);
      const b = rand(2, 15);
      const c = rand(1, 12);
      return { prompt: `${a} + ${b} - ${c}`, correct: a + b - c };
    },
    () => {
      const a = rand(2, 12);
      const b = rand(1, 10);
      const c = rand(2, 6);
      return { prompt: `(${a} + ${b}) × ${c}`, correct: (a + b) * c };
    },
    () => {
      const a = rand(8, 30);
      const b = rand(2, 7);
      const c = rand(3, 12);
      return { prompt: `${a} - (${b} + ${c})`, correct: a - (b + c) };
    },
    () => {
      const a = rand(2, 10);
      const b = rand(2, 10);
      const c = rand(5, 25);
      return { prompt: `${a} × ${b} + ${c}`, correct: a * b + c };
    },
    () => {
      const b = rand(2, 10);
      const base = rand(2, 12);
      const a = b * base;
      const c = rand(1, 20);
      return { prompt: `${a} ÷ ${b} + ${c}`, correct: base + c };
    },
  ];

  let question = patterns[rand(0, patterns.length - 1)]();
  while (question.correct < 0) {
    question = patterns[rand(0, patterns.length - 1)]();
  }

  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const mode = rand(1, 5);
    let candidate: number;

    if (mode === 1) candidate = question.correct + rand(1, 12);
    else if (mode === 2) candidate = question.correct - rand(1, 12);
    else if (mode === 3) candidate = question.correct + rand(13, 25);
    else if (mode === 4) candidate = question.correct - rand(13, 25);
    else {
      candidate =
        question.correct + (Math.random() < 0.5 ? -1 : 1) * rand(2, 8);
    }

    if (candidate >= 0 && candidate !== question.correct) wrongs.add(candidate);
  }

  return {
    prompt: question.prompt,
    correct: question.correct,
    options: shuffle([question.correct, ...Array.from(wrongs)]),
  };
}

function buildMultiButtons(realCount: number, totalCount: number): MultiButton[] {
  const realIndices = new Set<number>();
  while (realIndices.size < realCount) {
    realIndices.add(Math.floor(Math.random() * totalCount));
  }

  const labels = [
    "REAL",
    "CLICK",
    "THIS",
    "NOW",
    "REAL?",
    "NOPE",
    "TRY ME",
    "SAFE",
    "WIN",
    "PRESS",
    "MAYBE",
    "GOOD",
  ];

  return shuffle(
    Array.from({ length: totalCount }, (_, i) => ({
      id: i + 1 + Math.floor(Math.random() * 100000),
      label: realIndices.has(i) ? "REAL" : labels[i % labels.length],
      isReal: realIndices.has(i),
    })),
  );
}

/* ──────────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────────── */

export default function SystemPopup() {
  /* ───────── general flow ───────── */
  const [stage, setStage] = useState(1);
  const [showRewards, setShowRewards] = useState(false);

  /* ───────── admin / testing ───────── */
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [adminJumpOpen, setAdminJumpOpen] = useState(false);
  const [adminAssist, setAdminAssist] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [adminCheatAccept, setAdminCheatAccept] = useState(false);
  const [adminCheatStage7, setAdminCheatStage7] = useState(false);

  /* ───────── global annoyances ───────── */
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const [pendingAction, setPendingAction] = useState(false);
  const [btnJammed, setBtnJammed] = useState(false);
  const glitchDoneRef = useRef<() => void>(() => {});

  /* ───────── player identity ───────── */
  const [userName, setUserName] = useState("");
  const [assignedTitle, setAssignedTitle] = useState<string | null>(null);

  /* ───────── stage 1 - accept button ───────── */
  const [stage1Phase, setStage1Phase] = useState<Stage1Phase>("first");
  const [stage1ErrorText, setStage1ErrorText] = useState("");
  const [explosionPos, setExplosionPos] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const naturalPos = useRef<{ x: number; y: number } | null>(null);
  const dodgeCoolRef = useRef(false);

  /* ───────── stage 2 - recalculating ───────── */
  const [isRecalculating, setIsRecalculating] = useState(false);

  /* ───────── stage 3 - name typing ───────── */
  const [inputValue, setInputValue] = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [stage3Status, setStage3Status] = useState<Stage3Status>("typing");
  const [slowpokeName, setSlowpokeName] = useState("");
  const [nameTimer, setNameTimer] = useState(3);

  const inputValueRef = useRef("");
  const corruptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCountRef = useRef(0);
  const firstKeypressAtRef = useRef<number | null>(null);
  const backspaceUsedRef = useRef(false);
  const slowpokeShownRef = useRef(false);
  const stage3StatusRef = useRef<Stage3Status>("typing");
  const nameTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ───────── stage 4 - fake loading ───────── */
  const [stage4Phase, setStage4Phase] = useState<"filling" | "stuck" | "error">(
    "filling",
  );

  /* ───────── stage 5 - maths ───────── */
  const [mathQuestion, setMathQuestion] = useState<MathQuestion>(
    generateMathQuestion(),
  );
  const [mathStatus, setMathStatus] = useState<"playing" | "taunt" | "pass">(
    "playing",
  );
  const [stage5Mode, setStage5Mode] = useState<"math" | "skip">("math");
  const [mathTaunt, setMathTaunt] = useState("");
  const [mathOptions, setMathOptions] = useState<number[]>([]);
  const [mathOptionPos, setMathOptionPos] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const mathStartAtRef = useRef<number>(0);
  const mathTauntTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mathIdleTauntRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* ───────── stage 6 - phrase typing ───────── */
  const [typeInput, setTypeInput] = useState("");
  const [typeInputVisible, setTypeInputVisible] = useState("");
  const [typeStatus, setTypeStatus] = useState<Stage6Status>("typing");
  const [typePhrase, setTypePhrase] = useState(TYPE_PHRASES[0]);
  const [typeErrorFlash, setTypeErrorFlash] = useState(false);
  const [typeErrorText, setTypeErrorText] = useState("");

  const typeInputRef = useRef("");
  const typeCorruptRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ───────── stage 7 - button boss ───────── */
  const [buttonBossLevel, setButtonBossLevel] = useState<ButtonBossLevel>(1);
  const [buttonBossPhase, setButtonBossPhase] = useState<BossPhase>("idle");
  const [buttonBossTaunt, setButtonBossTaunt] = useState("");

  const [fakeHonestyCount, setFakeHonestyCount] = useState(0);
  const [fakeHonestyTarget, setFakeHonestyTarget] = useState(7);
  const [fakeHonestyFakeoutUsed, setFakeHonestyFakeoutUsed] = useState(false);
  const fakeHonestyLastClickRef = useRef(0);

  const [shrinkScale, setShrinkScale] = useState(1);
  const [shrinkPhase, setShrinkPhase] = useState<"first" | "fakeReset" | "second">("first");
  const [shrinkJitter, setShrinkJitter] = useState({ x: 0, y: 0 });
  const [shrinkTravelX, setShrinkTravelX] = useState(-120);
  const [shrinkLoopTick, setShrinkLoopTick] = useState(0);

  const [multiButtons, setMultiButtons] = useState<MultiButton[]>([]);
  const [multiRequiredHits, setMultiRequiredHits] = useState(0);
  const [multiHits, setMultiHits] = useState(0);

  const [delayTrapReady, setDelayTrapReady] = useState(false);
  const [delayTrapStarted, setDelayTrapStarted] = useState(false);

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHoldingBoss, setIsHoldingBoss] = useState(false);

  const [rhythmActive, setRhythmActive] = useState(false);
  const [rhythmHits, setRhythmHits] = useState(0);

  const [staminaValue, setStaminaValue] = useState(0);

  const [oneFrameVisible, setOneFrameVisible] = useState(false);
  const [oneFrameHits, setOneFrameHits] = useState(0);

  /* ───────── eye / visual stuff ───────── */
  const [eyeVisible, setEyeVisible] = useState(false);
  const [eyeIntroActive, setEyeIntroActive] = useState(false);
  const [eyeArrivalGlitch, setEyeArrivalGlitch] = useState(false);

  /* ──────────────────────────────────────
     DERIVED
  ───────────────────────────────────── */

  const displayedMathOptions =
    mathOptions.length > 0 ? mathOptions : mathQuestion.options;

  const baseName = userName.trim() ? userName : "Hunter";
  const displayName = assignedTitle ? `${baseName} the ${assignedTitle}` : baseName;

  const stage7ProgressText = `LEVEL ${buttonBossLevel}/8`;

  const buttonBossHint = useMemo(() => {
    switch (buttonBossLevel) {
      case 1:
        return "Prove your sincerity.";
      case 2:
        return "Click before it shrinks away.";
      case 3:
        return "Only the real buttons count.";
      case 4:
        return "Click only when it is truly ready.";
      case 5:
        return "Hold. Do not release early.";
      case 6:
        return "Click on-beat only.";
      case 7:
        return "Drain its stamina faster than it drains yours.";
      case 8:
        return "Watch closely. Catch every flash.";
      default:
        return "";
    }
  }, [buttonBossLevel]);

  const buttonBossLabel = useMemo(() => {
    switch (buttonBossLevel) {
      case 1:
        return "I AM HONEST";
      case 2:
        return "CATCH ME";
      case 3:
        return "REAL";
      case 4:
        return delayTrapReady ? "NOW" : delayTrapStarted ? "WAIT..." : "CLICK";
      case 5:
        return "HOLD";
      case 6:
        return rhythmActive ? "NOW" : "…";
      case 7:
        return "DRAIN";
      case 8:
        return oneFrameVisible ? "!" : "";
      default:
        return "BUTTON";
    }
  }, [buttonBossLevel, delayTrapReady, delayTrapStarted, rhythmActive, oneFrameVisible]);

  /* ──────────────────────────────────────
     SHARED HELPERS
  ───────────────────────────────────── */

  const setS3 = useCallback((s: Stage3Status) => {
    stage3StatusRef.current = s;
    setStage3Status(s);
  }, []);

  const withDelay = useCallback(
    (fn: () => void, ms = 700) => {
      if (pendingAction || btnJammed) return;
      setPendingAction(true);
      setTimeout(() => {
        setPendingAction(false);
        fn();
      }, ms);
    },
    [pendingAction, btnJammed],
  );

  const isCheatOn = adminUnlocked && adminAssist;

  const resetButtonBossLevel = useCallback((level: ButtonBossLevel) => {
    setButtonBossLevel(level);
    setButtonBossPhase("idle");
    setButtonBossTaunt("");

    setFakeHonestyCount(0);
    setFakeHonestyTarget(7);
    setFakeHonestyFakeoutUsed(false);
    fakeHonestyLastClickRef.current = 0;

    setShrinkScale(1);
    setShrinkPhase("first");
    setShrinkJitter({ x: 0, y: 0 });
    setShrinkTravelX(-120);
    setShrinkLoopTick(0);

    setMultiButtons([]);
    setMultiRequiredHits(0);
    setMultiHits(0);

    setDelayTrapReady(false);
    setDelayTrapStarted(false);

    setHoldProgress(0);
    setIsHoldingBoss(false);

    setRhythmActive(false);
    setRhythmHits(0);

    setStaminaValue(0);

    setOneFrameVisible(false);
    setOneFrameHits(0);
  }, []);

  const advanceButtonBossLevel = useCallback(() => {
    setButtonBossPhase("pass");
    setButtonBossTaunt("");

    setTimeout(() => {
      setButtonBossPhase("idle");
      setButtonBossLevel((prev) => {
        if (prev >= 8) {
          setShowRewards(true);
          return 8;
        }
        return (prev + 1) as ButtonBossLevel;
      });

      setFakeHonestyCount(0);
      setShrinkScale(1);
      setMultiButtons([]);
      setMultiRequiredHits(0);
      setMultiHits(0);
      setDelayTrapReady(false);
      setDelayTrapStarted(false);
      setHoldProgress(0);
      setIsHoldingBoss(false);
      setRhythmActive(false);
      setRhythmHits(0);
      setStaminaValue(0);
      setOneFrameVisible(false);
      setOneFrameHits(0);
    }, 700);
  }, []);

  /* ──────────────────────────────────────
     LAYOUT / EFFECTS
  ───────────────────────────────────── */

  useLayoutEffect(() => {
    if (stage !== 1) return;
    const btn = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup) return;

    const bR = btn.getBoundingClientRect();
    const pR = popup.getBoundingClientRect();
    naturalPos.current = { x: bR.left - pR.left, y: bR.top - pR.top };
  }, [stage, stage1Phase]);

  useEffect(() => {
    if (!isGlitching) return;

    setCorruptText(randomCorrupt(24));
    const iv = setInterval(() => {
      setCorruptText(randomCorrupt(16 + Math.floor(Math.random() * 12)));
    }, 70);

    const t = setTimeout(() => {
      clearInterval(iv);
      setIsGlitching(false);
      glitchDoneRef.current();
    }, 1600);

    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [isGlitching]);

  useEffect(() => {
    if (stage !== 2) return;
    setIsRecalculating(true);
    const t = setTimeout(() => setIsRecalculating(false), 1700);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 3) return;

    setInputValue("");
    inputValueRef.current = "";
    setInputDisabled(false);
    setS3("typing");
    submitCountRef.current = 0;
    firstKeypressAtRef.current = null;
    backspaceUsedRef.current = false;
    slowpokeShownRef.current = false;
    setNameTimer(3);

    if (corruptTimerRef.current) {
      clearTimeout(corruptTimerRef.current);
      corruptTimerRef.current = null;
    }

    if (nameTimerIntervalRef.current) {
      clearInterval(nameTimerIntervalRef.current);
      nameTimerIntervalRef.current = null;
    }

    const triggerSlowpoke = () => {
      if (slowpokeShownRef.current) return;
      if (stage3StatusRef.current !== "typing") return;

      slowpokeShownRef.current = true;

      const finalName = inputValueRef.current.trim() || "???";
      setSlowpokeName(finalName);
      setUserName(finalName);
      setInputValue(finalName);
      inputValueRef.current = finalName;
      setInputDisabled(true);
      setS3("slowpoke");
    };

    nameTimerIntervalRef.current = setInterval(() => {
      setNameTimer((prev) => {
        if (prev <= 1) {
          if (nameTimerIntervalRef.current) {
            clearInterval(nameTimerIntervalRef.current);
            nameTimerIntervalRef.current = null;
          }
          triggerSlowpoke();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (corruptTimerRef.current) {
        clearTimeout(corruptTimerRef.current);
        corruptTimerRef.current = null;
      }
      if (nameTimerIntervalRef.current) {
        clearInterval(nameTimerIntervalRef.current);
        nameTimerIntervalRef.current = null;
      }
    };
  }, [stage, setS3]);

  useEffect(() => {
    if (stage !== 4) return;
    setStage4Phase("filling");
    const t1 = setTimeout(() => setStage4Phase("stuck"), 2600);
    const t2 = setTimeout(() => setStage4Phase("error"), 5300);
    const t3 = setTimeout(() => setStage(5), 6900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [stage]);

  useEffect(() => {
    if (stage < 5) {
      setEyeVisible(false);
      setEyeIntroActive(false);
      setEyeArrivalGlitch(false);
      return;
    }
    
    setStage5Mode("math");

    if (stage === 5) {
      setEyeVisible(false);
      setEyeIntroActive(true);
      setEyeArrivalGlitch(true);

      const glitchTimer = setTimeout(() => setEyeVisible(true), 1100);
      const glitchEndTimer = setTimeout(() => setEyeArrivalGlitch(false), 1800);
      const introEndTimer = setTimeout(() => setEyeIntroActive(false), 5000);

      return () => {
        clearTimeout(glitchTimer);
        clearTimeout(glitchEndTimer);
        clearTimeout(introEndTimer);
      };
    }

    setEyeVisible(true);
    setEyeIntroActive(false);
    setEyeArrivalGlitch(false);
  }, [stage]);

  useEffect(() => {
    if (stage !== 5) return;

    const q = generateMathQuestion();
    setMathQuestion(q);
    setMathOptions(q.options);
    setMathStatus("playing");
    setMathTaunt("");
    setMathOptionPos([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);

    mathStartAtRef.current = Date.now();

    if (mathTauntTimerRef.current) clearTimeout(mathTauntTimerRef.current);
    if (mathIdleTauntRef.current) clearTimeout(mathIdleTauntRef.current);

    const shuffleIv = setInterval(() => {
      setMathOptions((prev) => shuffle(prev));
    }, isCheatOn ? 999999 : 2600);

    if (!isCheatOn) {
      mathIdleTauntRef.current = setTimeout(() => {
        setMathTaunt(getRandomFrom(MATH_TAUNTS));
      }, 2500);
    }

    return () => {
      clearInterval(shuffleIv);
      if (mathTauntTimerRef.current) clearTimeout(mathTauntTimerRef.current);
      if (mathIdleTauntRef.current) clearTimeout(mathIdleTauntRef.current);
    };
  }, [stage, isCheatOn]);

  useEffect(() => {
    if (stage !== 6) return;

    const idx = Math.floor(Math.random() * TYPE_PHRASES.length);
    setTypePhrase(TYPE_PHRASES[idx]);
    setTypeInput("");
    setTypeInputVisible("");
    typeInputRef.current = "";
    setTypeStatus("typing");
    setTypeErrorFlash(false);
    setTypeErrorText("");

    if (typeCorruptRef.current) {
      clearTimeout(typeCorruptRef.current);
      typeCorruptRef.current = null;
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== 7) return;

    resetButtonBossLevel(1);

    const cheatMode = adminUnlocked && adminCheatStage7;
    setFakeHonestyTarget(cheatMode ? 2 : 6 + Math.floor(Math.random() * 4)); // 6–9
  }, [stage, resetButtonBossLevel, adminUnlocked, adminCheatStage7]);

  useEffect(() => {
    if (stage !== 7 || buttonBossLevel !== 2) return;

    setShrinkScale(1);
    setShrinkPhase("first");
    setShrinkJitter({ x: 0, y: 0 });
    setShrinkTravelX(-120);

    if (isCheatOn) {
      const cheatShrinkIv = setInterval(() => {
        setShrinkScale((prev) => {
          const next = prev - 0.018;
          if (next <= 0.72) {
            clearInterval(cheatShrinkIv);
            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.shrinking));
            setTimeout(() => {
              setShrinkScale(1);
              setButtonBossTaunt("");
              setShrinkTravelX(-120);
            }, 500);
            return 1;
          }
          return next;
        });
      }, 260);

      return () => clearInterval(cheatShrinkIv);
    }

    let cancelled = false;
    let shrinkIv: ReturnType<typeof setInterval> | null = null;
    let jitterIv: ReturnType<typeof setInterval> | null = null;
    let travelIv: ReturnType<typeof setInterval> | null = null;
    let phaseSwapTimer: ReturnType<typeof setTimeout> | null = null;
    let loopRestartTimer: ReturnType<typeof setTimeout> | null = null;

    const startBluePhase = () => {
      if (cancelled) return;

      setShrinkPhase("first");
      setShrinkScale(1);
      setShrinkTravelX(-120);
      setShrinkJitter({ x: 14, y: 0 });
      setButtonBossTaunt("");

      if (travelIv) clearInterval(travelIv);
      if (jitterIv) clearInterval(jitterIv);
      if (shrinkIv) clearInterval(shrinkIv);

      travelIv = setInterval(() => {
        setShrinkTravelX((prev) => {
          const next = prev + 14;
          return next > 120 ? -120 : next;
        });
      }, 65);

      jitterIv = setInterval(() => {
        setShrinkJitter((prev) => {
          const direction = prev.x >= 0 ? -1 : 1;
          return {
            x: direction * (12 + Math.random() * 10),
            y: (Math.random() - 0.5) * 6,
          };
        });
      }, 48);

      shrinkIv = setInterval(() => {
        setShrinkScale((prev) => {
          const next = prev - 0.07;

          if (next <= 0.28) {
            if (shrinkIv) clearInterval(shrinkIv);
            setButtonBossTaunt("Too slow.");

            phaseSwapTimer = setTimeout(() => {
              startRedPhase();
            }, 240);

            return 0.28;
          }

          return next;
        });
      }, 120);
    };

    const startRedPhase = () => {
      if (cancelled) return;

      setShrinkPhase("second");
      setShrinkScale(0.92);
      setShrinkTravelX(-120);
      setShrinkJitter({ x: 24, y: 0 });
      setButtonBossTaunt("It came back worse.");

      if (travelIv) clearInterval(travelIv);
      if (jitterIv) clearInterval(jitterIv);
      if (shrinkIv) clearInterval(shrinkIv);

      travelIv = setInterval(() => {
        setShrinkTravelX((prev) => {
          const next = prev + 22;
          return next > 120 ? -120 : next;
        });
      }, 42);

      jitterIv = setInterval(() => {
        setShrinkJitter((prev) => {
          const direction = prev.x >= 0 ? -1 : 1;
          return {
            x: direction * (20 + Math.random() * 18),
            y: (Math.random() - 0.5) * 10,
          };
        });
      }, 28);

      shrinkIv = setInterval(() => {
        setShrinkScale((prev) => {
          const next = prev - 0.1;

          if (next <= 0.12) {
            if (shrinkIv) clearInterval(shrinkIv);
            if (travelIv) clearInterval(travelIv);
            if (jitterIv) clearInterval(jitterIv);

            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.shrinking));

            loopRestartTimer = setTimeout(() => {
              setShrinkLoopTick((v) => v + 1);
            }, 420);

            return 0.12;
          }

          return next;
        });
      }, 85);
    };

    startBluePhase();

    return () => {
      cancelled = true;
      if (shrinkIv) clearInterval(shrinkIv);
      if (jitterIv) clearInterval(jitterIv);
      if (travelIv) clearInterval(travelIv);
      if (phaseSwapTimer) clearTimeout(phaseSwapTimer);
      if (loopRestartTimer) clearTimeout(loopRestartTimer);
    };
  }, [stage, buttonBossLevel, isCheatOn, shrinkLoopTick]);

  useEffect(() => {
    if (stage !== 7 || buttonBossLevel !== 3) return;

    const total = isCheatOn ? 6 : 9;
    const required = isCheatOn ? 1 : 2;

    setMultiRequiredHits(required);
    setMultiHits(0);
    setMultiButtons(buildMultiButtons(1, total));
  }, [stage, buttonBossLevel, isCheatOn]);
  
  useEffect(() => {
    if (stage !== 7 || buttonBossLevel !== 6) return;

    let cancelled = false;
    let onTimer: ReturnType<typeof setTimeout> | null = null;
    let offTimer: ReturnType<typeof setTimeout> | null = null;

    const onDuration = isCheatOn ? 450 : 160;
    const offDuration = isCheatOn ? 950 : 700;

    const cycle = () => {
      if (cancelled) return;
      setRhythmActive(true);

      onTimer = setTimeout(() => {
        setRhythmActive(false);

        offTimer = setTimeout(() => {
          cycle();
        }, offDuration);
      }, onDuration);
    };

    cycle();

    return () => {
      cancelled = true;
      if (onTimer) clearTimeout(onTimer);
      if (offTimer) clearTimeout(offTimer);
    };
  }, [stage, buttonBossLevel, isCheatOn]);

  useEffect(() => {
    if (stage !== 7 || buttonBossLevel !== 7) return;

    const decay = setInterval(() => {
      setStaminaValue((prev) => Math.max(0, prev - (isCheatOn ? 1 : 6)));
    }, isCheatOn ? 300 : 180);

    return () => clearInterval(decay);
  }, [stage, buttonBossLevel, isCheatOn]);

  useEffect(() => {
    if (stage !== 7 || buttonBossLevel !== 8) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const visibleMs = isCheatOn ? 950 : 110;
    const everyMs = isCheatOn ? 1200 : 1300;

    setOneFrameVisible(false);

    intervalId = setInterval(() => {
      if (cancelled) return;
      setOneFrameVisible(true);

      setTimeout(() => {
        if (!cancelled) setOneFrameVisible(false);
      }, visibleMs);
    }, everyMs);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [stage, buttonBossLevel, isCheatOn]);

  useEffect(() => {
    if (stage !== 7 || buttonBossLevel !== 5 || !isHoldingBoss) return;

    const need = isCheatOn ? 100 : 100;
    const tick = isCheatOn ? 12 : 4;
    const speed = isCheatOn ? 50 : 80;

    const iv = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + tick;
        if (next >= need) {
          clearInterval(iv);
          setIsHoldingBoss(false);
          setHoldProgress(100);
          setTimeout(() => advanceButtonBossLevel(), 250);
          return 100;
        }
        return next;
      });
    }, speed);

    return () => clearInterval(iv);
  }, [stage, buttonBossLevel, isHoldingBoss, isCheatOn, advanceButtonBossLevel]);

  useEffect(() => {
    if (stage < 2 || stage > 7) return;

    setBtnJammed(false);
    const iv = setInterval(() => {
      if (Math.random() < (isCheatOn ? 0.08 : 0.45)) {
        setBtnJammed(true);
        setTimeout(() => setBtnJammed(false), isCheatOn ? 120 : 420);
      }
    }, isCheatOn ? 7000 : 3800);

    return () => {
      clearInterval(iv);
      setBtnJammed(false);
    };
  }, [stage, isCheatOn]);

  useEffect(() => {
    if (adminOpen && !adminUnlocked) {
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [adminOpen, adminUnlocked]);

  /* ──────────────────────────────────────
     STAGE 1 - ACCEPT BUTTON
  ───────────────────────────────────── */

  const handlePopupMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (stage !== 1 || isGlitching) return;
      if (dodgeCoolRef.current) return;
      if (stage1Phase === "explode") return;

      const btn = buttonRef.current;
      const popup = popupRef.current;
      if (!btn || !popup || !naturalPos.current) return;

      const cheatMode = adminUnlocked && adminCheatAccept;

      if (cheatMode) return;

      const bR = btn.getBoundingClientRect();
      const pR = popup.getBoundingClientRect();
      const btnCx = bR.left + bR.width / 2;
      const btnCy = bR.top + bR.height / 2;

      const radius = stage1Phase === "second" ? 145 : DODGE_RADIUS;
      const dist = Math.sqrt(
        (e.clientX - btnCx) ** 2 + (e.clientY - btnCy) ** 2,
      );

      if (dist > radius) return;

      const pad = 20;
      const minX = pad;
      const maxX = pR.width - bR.width - pad;
      const minY = pad;
      const maxY = pR.height - bR.height - pad;

      let tx: number;
      let ty: number;
      let tries = 0;

      do {
        tx = minX + Math.random() * (maxX - minX);
        ty = minY + Math.random() * (maxY - minY);
        tries++;
      } while (
        tries < 16 &&
        Math.abs(tx - (naturalPos.current.x + translate.x)) <
          (stage1Phase === "second" ? 110 : 70) &&
        Math.abs(ty - (naturalPos.current.y + translate.y)) <
          (stage1Phase === "second" ? 60 : 35)
      );

      setTranslate({
        x: tx - naturalPos.current.x,
        y: ty - naturalPos.current.y,
      });

      dodgeCoolRef.current = true;
      setTimeout(() => {
        dodgeCoolRef.current = false;
      }, stage1Phase === "second" ? 120 : 280);
    },
    [stage, isGlitching, translate, stage1Phase, adminUnlocked, adminCheatAccept],
  );

  const handleAccept = useCallback(() => {
    const cheatMode = adminUnlocked && adminCheatAccept;

    if (cheatMode) {
      setTranslate({ x: 0, y: 0 });
    }

    if (stage1Phase === "first") {
      const btn = buttonRef.current;
      const popup = popupRef.current;

      if (btn && popup) {
        const bR = btn.getBoundingClientRect();
        const pR = popup.getBoundingClientRect();

        setExplosionPos({
          x: bR.left - pR.left + bR.width / 2,
          y: bR.top - pR.top + bR.height / 2,
        });
      }

      setStage1ErrorText("ERROR // ACCEPT OVERRIDE");
      setStage1Phase("glitching");

      setTimeout(() => {
        setStage1ErrorText("SECOND CONFIRMATION REQUIRED");
      }, 260);

      setTimeout(() => {
        setTranslate({ x: 0, y: 0 });
        setStage1Phase("second");
        setStage1ErrorText("");
      }, 820);

      return;
    }

    if (stage1Phase === "second") {
      setTranslate({ x: 0, y: 0 });
      glitchDoneRef.current = () => setStage(2);
      setIsGlitching(true);
    }
  }, [stage1Phase, adminUnlocked, adminCheatAccept]);

  /* ──────────────────────────────────────
     STAGE 3 - NAME
  ───────────────────────────────────── */

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (stage3StatusRef.current !== "typing") return;

    const newVal = e.target.value;

    if (!firstKeypressAtRef.current && newVal.length > 0) {
      firstKeypressAtRef.current = Date.now();
    }

    setInputValue(newVal);
    inputValueRef.current = newVal;

    if (isCheatOn || newVal.length < 2) return;

    if (Math.random() > 0.15) {
      if (corruptTimerRef.current) clearTimeout(corruptTimerRef.current);
      const delay = 55 + Math.random() * 110;

      corruptTimerRef.current = setTimeout(() => {
        corruptTimerRef.current = null;
        const cur = inputValueRef.current;
        if (!cur.length) return;

        const r = Math.random();
        let next: string;

        if (r < 0.3) {
          const pos = Math.floor(Math.random() * cur.length);
          next = cur.slice(0, pos) + cur.slice(pos + 1);
        } else if (r < 0.44) {
          next = "";
        } else if (r < 0.64) {
          const pos = Math.floor(Math.random() * cur.length);
          const rep =
            Math.random() < 0.55
              ? CORRUPT_CHARS[
                  Math.floor(Math.random() * CORRUPT_CHARS.length)
                ]
              : String.fromCharCode(97 + Math.floor(Math.random() * 26));
          next = cur.slice(0, pos) + rep + cur.slice(pos + 1);
        } else if (r < 0.82) {
          next = fullCorrupt(cur);
        } else {
          next = cur.split("").sort(() => Math.random() - 0.5).join("");
        }

        setInputValue(next);
        inputValueRef.current = next;
      }, delay);
    }
  }, [isCheatOn]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") backspaceUsedRef.current = true;
      if (e.key === "Enter") handleNameSubmit();
    },
    [],
  );

  const handleNameSubmit = useCallback(() => {
    if (stage3StatusRef.current !== "typing") return;

    if (isCheatOn) {
      const finalName = inputValueRef.current.trim() || "Admin";
      setUserName(finalName);
      setSlowpokeName(finalName);
      setStage(4);
      return;
    }

    if (corruptTimerRef.current) {
      clearTimeout(corruptTimerRef.current);
      corruptTimerRef.current = null;
    }

    if (nameTimerIntervalRef.current) {
      clearInterval(nameTimerIntervalRef.current);
      nameTimerIntervalRef.current = null;
    }

    const timeSinceFirst = firstKeypressAtRef.current
      ? Date.now() - firstKeypressAtRef.current
      : Infinity;

    if (
      timeSinceFirst < 500 &&
      !backspaceUsedRef.current &&
      inputValueRef.current.length > 0
    ) {
      setInputDisabled(true);
      setS3("validating");
      setTimeout(() => setStage(4), 900);
      return;
    }

    setInputDisabled(true);
    setS3("validating");
    submitCountRef.current += 1;

    setTimeout(() => {
      setS3("invalid");
      const shouldExpire = submitCountRef.current < 3 && Math.random() < 0.35;

      setTimeout(() => {
        if (shouldExpire) {
          setS3("expired");
          setInputValue("");
          inputValueRef.current = "";
          setTimeout(() => {
            setInputDisabled(false);
            setS3("typing");
          }, 2000);
        } else {
          setStage(4);
        }
      }, 1400);
    }, 1100);
  }, [setS3, isCheatOn]);

  const handleSlowpokeNext = useCallback(() => {
    setStage(4);
  }, []);

  /* ──────────────────────────────────────
     STAGE 5 - MATHS
  ───────────────────────────────────── */

  const handleMathMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mathStatus !== "playing" || isCheatOn) return;

      rewardRefs.current.forEach((btn, idx) => {
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);

        if (dist < 85) {
          setMathOptionPos((prev) => {
            const next = [...prev];
            next[idx] = {
              x: (Math.random() - 0.5) * 38,
              y: (Math.random() - 0.5) * 18,
            };
            return next;
          });
        }
      });
    },
    [mathStatus, isCheatOn],
  );

  const handleMathMouseDown = useCallback(() => {
    if (mathStatus !== "playing" || isCheatOn) return;
    if (Math.random() < 0.35) {
      setMathOptions((prev) => shuffle(prev));
    }
  }, [mathStatus, isCheatOn]);

  const handleMathOptionClick = useCallback(
    (value: number) => {
      if (mathStatus !== "playing") return;

      if (mathIdleTauntRef.current) {
        clearTimeout(mathIdleTauntRef.current);
        mathIdleTauntRef.current = null;
      }

      if (isCheatOn) {
        if (value === mathQuestion.correct) {
          setMathStatus("pass");
          setMathTaunt("");
          setTimeout(() => setStage(6), 350);
        }
        return;
      }

      const elapsed = Date.now() - mathStartAtRef.current;
      const isCorrect = value === mathQuestion.correct;
      const isFast = elapsed <= 1000;

      setPendingAction(true);

      setTimeout(() => {
        setPendingAction(false);

        if (isCorrect && isFast) {
          setMathStatus("pass");
          setMathTaunt("");
          setTimeout(() => setStage(6), 800);
          return;
        }

        if (isCorrect && !isFast) {
          setMathStatus("taunt");
          setMathTaunt(
            Math.random() < 0.5
              ? "Correct... but why are you so slow?"
              : getRandomFrom(MATH_TAUNTS),
          );

          const nextQ = generateMathQuestion();
          mathTauntTimerRef.current = setTimeout(() => {
            setMathQuestion(nextQ);
            setMathOptions(nextQ.options);
            setMathOptionPos([
              { x: 0, y: 0 },
              { x: 0, y: 0 },
              { x: 0, y: 0 },
              { x: 0, y: 0 },
            ]);
            setMathStatus("playing");
            setMathTaunt("");
            mathStartAtRef.current = Date.now();
          }, 1200);
          return;
        }

        setMathStatus("taunt");
        setMathTaunt(getRandomFrom(MATH_TAUNTS));

        const nextQ = generateMathQuestion();
        mathTauntTimerRef.current = setTimeout(() => {
          setMathQuestion(nextQ);
          setMathOptions(nextQ.options);
          setMathOptionPos([
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ]);
          setMathStatus("playing");
          setMathTaunt("");
          mathStartAtRef.current = Date.now();
        }, 1200);
      }, 500);
    },
    [mathStatus, mathQuestion, isCheatOn],
  );

  const handleSkipMathStage = useCallback(() => {
    setAssignedTitle(getRandomTitle());
    setStage5Mode("skip");
  }, []);

  const handleSkipMathPopupNext = useCallback(() => {
    setStage5Mode("math");
    setStage(6);
  }, []);

  /* ──────────────────────────────────────
     STAGE 6 - TYPE VERIFICATION
  ───────────────────────────────────── */

  const handleTypeInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (typeStatus !== "typing") return;

      if (typeCorruptRef.current) {
        clearTimeout(typeCorruptRef.current);
        typeCorruptRef.current = null;
      }

      const raw = e.target.value;

      if (isCheatOn) {
        setTypeInput(raw);
        setTypeInputVisible(raw);
        typeInputRef.current = raw;
        return;
      }

      const r = Math.random();

      const commit = (v: string) => {
        setTypeInput(v);
        setTypeInputVisible(v);
        typeInputRef.current = v;

        if (v.length >= 3 && Math.random() < 0.38) {
          typeCorruptRef.current = setTimeout(() => {
            typeCorruptRef.current = null;
            const cur = typeInputRef.current;
            if (!cur.length) return;

            const mode = Math.random();
            let next = cur;

            if (mode < 0.22) {
              next = cur.slice(0, -1);
            } else if (mode < 0.45) {
              const pos = Math.floor(Math.random() * cur.length);
              const junk =
                CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
              next = cur.slice(0, pos) + junk + cur.slice(pos + 1);
            } else if (mode < 0.7) {
              const last = cur[cur.length - 1];
              const lower = last.toLowerCase();
              const rep = NEIGHBORS[lower] ?? "x";
              const replaced =
                last === last.toUpperCase() ? rep.toUpperCase() : rep;
              next = cur.slice(0, -1) + replaced;
            } else {
              next = fullCorrupt(cur);
            }

            setTypeInput(next);
            setTypeInputVisible(next);
            typeInputRef.current = next;
          }, 90 + Math.random() * 120);
        }
      };

      if (r < 0.05) return;
      if (r < 0.16) {
        setTimeout(() => commit(raw), 60 + Math.random() * 80);
      } else {
        commit(raw);
      }
    },
    [typeStatus, isCheatOn],
  );

  const handleTypeSubmit = useCallback(() => {
    if (typeStatus !== "typing") return;

    if (typeCorruptRef.current) {
      clearTimeout(typeCorruptRef.current);
      typeCorruptRef.current = null;
    }

    setTypeStatus("checking");

    const submitted = typeInputRef.current.trim();
    const expected = typePhrase.internal.trim();

    setTimeout(() => {
      if (isCheatOn || submitted === expected) {
        setTypeStatus("granted");
        setTypeErrorText("");
        setTimeout(() => setStage(7), isCheatOn ? 250 : 900);
        return;
      }

      setTypeStatus("incorrect");
      setTypeErrorFlash(true);
      setTypeErrorText(
        getRandomFrom([
          "Verification mismatch.",
          "Phrase does not match.",
          "Input rejected.",
          "Wrong sequence detected.",
          "Access string invalid.",
        ]),
      );

      const corrupted = fullCorrupt(submitted || "NULL");
      setTypeInput(corrupted);
      setTypeInputVisible(corrupted);
      typeInputRef.current = corrupted;

      setTimeout(() => {
        setTypeErrorFlash(false);
        setTypeInput("");
        setTypeInputVisible("");
        typeInputRef.current = "";
        setTypeStatus("typing");
      }, 1400);
    }, 900);
  }, [typeStatus, typePhrase, isCheatOn]);

  /* ──────────────────────────────────────
     STAGE 7 - BUTTON BOSS
  ───────────────────────────────────── */

  const handleButtonBossClick = useCallback(
    (isReal = true) => {
      if (buttonBossPhase === "pass") return;

      switch (buttonBossLevel) {
        case 1: {
          const cheatMode = adminUnlocked && adminCheatStage7;
          const now = Date.now();

          if (!cheatMode && now - fakeHonestyLastClickRef.current < 280) {
            setButtonBossTaunt("Desperation clicking detected.");
            break;
          }

          fakeHonestyLastClickRef.current = now;

          let next = fakeHonestyCount + 1;

          // fake near-success once
          if (
            !cheatMode &&
            !fakeHonestyFakeoutUsed &&
            next === fakeHonestyTarget - 1
          ) {
            setFakeHonestyCount(next);
            setFakeHonestyFakeoutUsed(true);
            setButtonBossPhase("pass");
            setButtonBossTaunt("");

            setTimeout(() => {
              setButtonBossPhase("idle");
              setFakeHonestyCount((prev) => Math.max(0, prev - 2));
              setButtonBossTaunt("Rechecking sincerity... score reduced.");
            }, 650);

            break;
          }

          // occasional suspicion penalty
          if (!cheatMode && next >= 3 && Math.random() < 0.35) {
            next = Math.max(0, next - 2);
            setFakeHonestyCount(next);
            setButtonBossTaunt("Suspicion detected. Honesty score reduced.");
            break;
          }

          if (next >= fakeHonestyTarget) {
            advanceButtonBossLevel();
          } else {
            setFakeHonestyCount(next);
            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.fakeHonesty));
          }
          break;
        }

        case 2: {
          if (!isCheatOn && shrinkPhase === "second") {
            setButtonBossTaunt("You actually caught it.");
          }
          advanceButtonBossLevel();
          break;
        }

        case 3: {
          if (isReal) {
            const nextHits = multiHits + 1;
            if (nextHits >= multiRequiredHits) {
              advanceButtonBossLevel();
            } else {
              setMultiHits(nextHits);
              setButtonBossTaunt("One real button found. Again.");
              setMultiButtons(buildMultiButtons(1, isCheatOn ? 6 : 9));
            }
          } else {
            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.multiplying));
            setMultiHits(0);
            setMultiButtons(buildMultiButtons(1, isCheatOn ? 6 : 9));
          }
          break;
        }

        case 4: {
          if (!delayTrapStarted) {
            setDelayTrapStarted(true);
            setButtonBossTaunt("Not yet.");

            setTimeout(() => {
              setDelayTrapReady(true);
              setButtonBossTaunt("Now.");
            }, isCheatOn ? 280 : 1200);

            setTimeout(() => {
              setDelayTrapReady(false);
              setDelayTrapStarted(false);
              setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.delay));
            }, isCheatOn ? 1900 : 1450);

            return;
          }

          if (delayTrapReady) {
            advanceButtonBossLevel();
          } else {
            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.delay));
          }
          break;
        }

        case 6: {
          if (rhythmActive) {
            const need = isCheatOn ? 1 : 4;
            const nextHits = rhythmHits + 1;
            setRhythmHits(nextHits);

            if (nextHits >= need) {
              advanceButtonBossLevel();
            }
          } else {
            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.rhythm));
            setRhythmHits(0);
          }
          break;
        }

        case 7: {
          setStaminaValue((prev) => {
            const gain = isCheatOn ? 50 : 11;
            const next = Math.min(100, prev + gain);

            if (next >= 100) {
              setTimeout(() => advanceButtonBossLevel(), 200);
            } else {
              setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.stamina));
            }

            return next;
          });
          break;
        }

        case 8: {
          if (oneFrameVisible) {
            const need = isCheatOn ? 1 : 2;
            const nextHits = oneFrameHits + 1;
            setOneFrameHits(nextHits);

            if (nextHits >= need) {
              advanceButtonBossLevel();
            } else {
              setButtonBossTaunt("Again.");
              setOneFrameVisible(false);
            }
          } else {
            setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.oneFrame));
          }
          break;
        }

        default:
          break;
      }
    },
    [
      buttonBossLevel,
      buttonBossPhase,
      shrinkPhase,
      fakeHonestyCount,
      fakeHonestyTarget,
      fakeHonestyFakeoutUsed,
      advanceButtonBossLevel,
      adminUnlocked,
      adminCheatStage7,
      isCheatOn,
      multiHits,
      multiRequiredHits,
      delayTrapStarted,
      delayTrapReady,
      rhythmActive,
      rhythmHits,
      oneFrameVisible,
      oneFrameHits,
    ],
  );

  const handleButtonBossHoldStart = useCallback(() => {
    if (buttonBossLevel !== 5) return;
    setButtonBossTaunt("");
    setIsHoldingBoss(true);
  }, [buttonBossLevel]);

  const handleButtonBossHoldEnd = useCallback(() => {
    if (buttonBossLevel !== 5) return;
    if (holdProgress < 100) {
      setIsHoldingBoss(false);
      setHoldProgress(0);
      setButtonBossTaunt(getRandomFrom(BUTTON_TAUNTS.hold));
    }
  }, [buttonBossLevel, holdProgress]);

  /* ──────────────────────────────────────
     REWARDS PAGE
  ───────────────────────────────────── */

  const handleClaimRewards = useCallback(() => {
    setShowRewards(true);
  }, []);

  /* ──────────────────────────────────────
     ADMIN
  ───────────────────────────────────── */

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

  const handleAdminKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleAdminSubmit();
      if (e.key === "Escape") setAdminOpen(false);
    },
    [handleAdminSubmit],
  );

  const handleSkipNext = useCallback(() => {
    setIsGlitching(false);
    setPendingAction(false);
    setBtnJammed(false);
    setStage((prev) => Math.min(prev + 1, MAX_STAGE));
  }, []);

  const handleSkipToRewards = useCallback(() => {
    setIsGlitching(false);
    setPendingAction(false);
    setBtnJammed(false);
    setShowRewards(true);
    setAdminOpen(false);
  }, []);

  const handleJumpToStage = useCallback((s: number) => {
    setIsGlitching(false);
    setPendingAction(false);
    setBtnJammed(false);
    setShowRewards(false);
    setStage(s);
    setAdminJumpOpen(false);
    setAdminOpen(false);
  }, []);

  const handleAdminGlitch = useCallback(() => {
    if (isGlitching) return;
    glitchDoneRef.current = () => {};
    setIsGlitching(true);
  }, [isGlitching]);

  const handleAdminSkipBossLevel = useCallback(() => {
    if (stage !== 7) return;
    if (buttonBossLevel >= 8) {
      setShowRewards(true);
      return;
    }
    resetButtonBossLevel((buttonBossLevel + 1) as ButtonBossLevel);
  }, [stage, buttonBossLevel, resetButtonBossLevel]);

  const handleReset = useCallback(() => {
    setStage(1);
    setShowRewards(false);

    setAdminOpen(false);
    setAdminUnlocked(false);
    setAdminJumpOpen(false);
    setAdminPassword("");
    setAdminError(false);
    setAdminAssist(false);

    setIsGlitching(false);
    setCorruptText("");
    setPendingAction(false);
    setBtnJammed(false);

    setUserName("");
    setAssignedTitle(null);

    setStage1Phase("first");
    setExplosionPos({ x: 0, y: 0 });
    setTranslate({ x: 0, y: 0 });

    setIsRecalculating(false);

    setInputValue("");
    setInputDisabled(false);
    setStage3Status("typing");
    setSlowpokeName("");
    setNameTimer(3);

    setStage4Phase("filling");

    setMathQuestion(generateMathQuestion());
    setMathStatus("playing");
    setMathTaunt("");
    setMathOptions([]);
    setMathOptionPos([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);

    setTypeInput("");
    setTypeInputVisible("");
    setTypeStatus("typing");
    setTypePhrase(TYPE_PHRASES[0]);
    setTypeErrorFlash(false);
    setTypeErrorText("");

    setEyeVisible(false);
    setEyeIntroActive(false);
    setEyeArrivalGlitch(false);

    resetButtonBossLevel(1);
  }, [resetButtonBossLevel]);

  /* ──────────────────────────────────────
     REWARDS PAGE RENDER
  ───────────────────────────────────── */

  if (showRewards) {
    return (
      <div className="screen">
        <div className="popup">
          <div className="popup-header">
            <span className="system-badge">SYSTEM</span>
          </div>

          <div className="popup-body">
            <p className="system-message reward-granted-msg" style={{ opacity: 1 }}>
              <span className="bracket-green">[SYSTEM]</span> Reward granted.
            </p>
            <p className="system-message" style={{ opacity: 1, marginTop: 14 }}>
              Reward? idk go study {displayName}.
            </p>
            <p className="retry-text" style={{ opacity: 1 }}>
              HA you got tricked! Was it worth it? Hope you got rage baited
              𓂁𓂄 ‿ 𓂁𓂄.
            </p>
          </div>

          <div className="popup-footer">
            <button className="accept-btn" onClick={handleReset}>
              Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────── */

  return (
    <div
      className={`screen${isGlitching ? " screen--flash" : ""}${
        eyeArrivalGlitch ? " screen--eye-arrival" : ""
      }`}
      onMouseMove={handlePopupMouseMove}
    >
      <div className="floating-cat floating-cat--one" aria-hidden="true">
        /ᐠ - ˕ -マ
      </div>
      <div className="floating-cat floating-cat--two" aria-hidden="true">
        ₍^. .^₎⟆
      </div>

      <div className="cat-sparkle cat-sparkle--one" aria-hidden="true">
        Err ⃝or⃟⃤
      </div>
      <div className="cat-sparkle cat-sparkle--two" aria-hidden="true">
        ✧
      </div>
      <div className="cat-sparkle cat-sparkle--three" aria-hidden="true">
        ⋆
      </div>

      <div className="system-orb system-orb--one" aria-hidden="true" />
      <div className="system-orb system-orb--two" aria-hidden="true" />

      <div className="data-particle data-particle--one" aria-hidden="true">
        01
      </div>
      <div className="data-particle data-particle--two" aria-hidden="true">
        ◇
      </div>
      <div className="data-particle data-particle--three" aria-hidden="true">
        Х̶̿̀͊̍̈́͑̓̈́̃̆́
      </div>

      <div className="admin-trigger" onClick={handleAdminTrigger} aria-hidden="true" />

      {adminOpen && (
        <div className="admin-popup">
          <div className="admin-popup-header">
            <span className="system-badge">SYSTEM</span>
            <button className="admin-close" onClick={() => setAdminOpen(false)}>
              ✕
            </button>
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
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setAdminError(false);
                  }}
                  onKeyDown={handleAdminKey}
                />
                <button className="admin-btn" onClick={handleAdminSubmit}>
                  ENTER
                </button>
              </div>

              {adminError && <p className="admin-error">&gt; ACCESS DENIED</p>}
            </div>
          ) : (
            <div className="admin-popup-body">
              <p className="admin-message admin-message--success">
                <span className="bracket">[SYSTEM]</span> Admin mode active. Stage{" "}
                {stage}/{MAX_STAGE}.
              </p>

              <div className="admin-controls">
                <button
                  className="admin-btn admin-btn--full"
                  onClick={() => setAdminAssist((v) => !v)}
                >
                  Testing Assist: {adminAssist ? "ON" : "OFF"}
                </button>

                <button
                  className={`admin-btn admin-btn--full ${
                    adminCheatAccept ? "admin-btn--active" : ""
                  }`}
                  onClick={() => setAdminCheatAccept((prev) => !prev)}
                >
                  {adminCheatAccept
                    ? "[TEST MODE: ACCEPT EASY]"
                    : "[TEST MODE: ACCEPT HARD]"}
                </button>

                <button
                  className="admin-btn admin-btn--full"
                  onClick={handleSkipNext}
                  disabled={stage >= MAX_STAGE}
                >
                  Skip to Next Stage
                </button>

                {stage === 7 && (
                  <button
                    className="admin-btn admin-btn--full"
                    onClick={handleAdminSkipBossLevel}
                  >
                    Next level for Stage 7
                  </button>
                )}

                <button className="admin-btn admin-btn--full" onClick={handleSkipToRewards}>
                  Skip to Rewards Page
                </button>

                <button
                  className="admin-btn admin-btn--full"
                  onClick={() => setAdminJumpOpen((o) => !o)}
                >
                  Jump to Any Stage {adminJumpOpen ? "▲" : "▼"}
                </button>

                {adminJumpOpen && (
                  <div className="admin-jump-grid">
                    {Array.from({ length: MAX_STAGE }, (_, i) => i + 1).map((s) => (
                      <button
                        key={s}
                        className={`admin-jump-btn${
                          s === stage ? " admin-jump-btn--active" : ""
                        }`}
                        onClick={() => handleJumpToStage(s)}
                      >
                        {s}
                      </button>

                    
                    ))}
                  </div>
                )}

                <button
                  className="admin-btn admin-btn--full"
                  onClick={handleAdminGlitch}
                  disabled={isGlitching}
                >
                  Trigger Glitch Effect
                </button>

                <button
                  className="admin-btn admin-btn--full admin-btn--danger"
                  onClick={handleReset}
                >
                  Reset Game
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`popup${isGlitching ? " popup--glitch" : ""}`} ref={popupRef}>
        {isGlitching && <div className="scan-bar" />}

        <div className="popup-header">
          <span className="system-badge">SYSTEM</span>
        </div>

        <div className="popup-body">
          {stage >= 5 && eyeVisible && (
            <div className={`ai-eye${eyeIntroActive ? " ai-eye--intro" : ""}`} aria-hidden="true">
              <div className="ai-eye-shape" />
              <div className="ai-eye-outline" />
              <div className="ai-eye-pupil" />
            </div>
          )}

          {/* Stage 1 - Accept button */}
          {stage === 1 && !isGlitching && (
            <p className="system-message" style={{ opacity: 1 }}>
              <span className="bracket">[SYSTEM]</span> Daily quest unlocked.
            </p>
          )}

          {/* Glitch overlay content */}
          {isGlitching && (
            <>
              <p className="system-message glitch-text" style={{ opacity: 1 }}>
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

          {/* Stage 2 - Recalculating */}
          {stage === 2 && !isGlitching && isRecalculating && (
            <p className="system-message recalc-msg" style={{ opacity: 1 }}>
              <span className="bracket">[SYSTEM]</span> Recalculating mission difficulty...
            </p>
          )}

          {stage === 2 && !isGlitching && !isRecalculating && (
            <p className="system-message" style={{ opacity: 1 }}>
              <span className="bracket">[SYSTEM]</span> Hidden penalty activated.
            </p>
          )}

          {/* Stage 3 - Name typing */}
          {stage === 3 && (
            <div className="stage-block">
              {stage3Status !== "slowpoke" && (
                <p className="system-message" style={{ opacity: 1 }}>
                  {stage3Status === "validating" ? (
                    <>
                      <span className="bracket">[SYSTEM]</span> Validating...
                    </>
                  ) : (
                    <>
                      <span className="bracket">[SYSTEM]</span> Identity verification required.
                    </>
                  )}
                </p>
              )}

              {stage3Status === "invalid" && (
                <p className="s3-status-msg s3-status-msg--error" style={{ opacity: 1 }}>
                  <span className="bracket-red">[SYSTEM]</span> Invalid name input.
                </p>
              )}

              {stage3Status === "expired" && (
                <p className="s3-status-msg s3-status-msg--error" style={{ opacity: 1 }}>
                  <span className="bracket-red">[SYSTEM]</span> Session expired.
                </p>
              )}

              {stage3Status === "slowpoke" && (
                <div className="slowpoke-wrap">
                  <p className="system-message slowpoke-title" style={{ opacity: 1 }}>
                    <span className="bracket">[SYSTEM]</span> Identity verification required.
                  </p>

                  <div className="slowpoke-box">
                    <div className="slowpoke-cat-col">
                      <span className="slowpoke-cat" aria-hidden="true">
                        zᶻ ≽₍^_ ‸ _ ^₎≼⟆
                      </span>
                      <span className="slowpoke-zzz">z z z</span>
                    </div>

                    <div className="slowpoke-content">
                      <p className="slowpoke-msg">
                        Damn, you type so slow that I thought about taking a nap while
                        waiting for you to finish typing your name... but oh well,
                        welcome, <span className="slowpoke-name">{slowpokeName}</span>, I
                        guess.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {stage3Status === "typing" && (
                <div className="name-input-group">
                  <p className="bar-pct" style={{ marginTop: 10, textAlign: "left" }}>
                    TIME REMAINING: {nameTimer}s
                  </p>
                  <label className="name-label">&gt; Enter your name:</label>
                  <input
                    className="name-input"
                    type="text"
                    value={inputValue}
                    disabled={inputDisabled}
                    placeholder={inputDisabled ? "[ INPUT LOCKED ]" : ""}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    maxLength={40}
                    autoFocus
                  />
                  {inputDisabled && (
                    <p className="input-warning">&gt; INPUT TEMPORARILY DISABLED</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage 4 - Fake loading */}
          {stage === 4 && (
            <div className="stage-block">
              <p className="system-message" style={{ opacity: 1 }}>
                <span className="bracket">[SYSTEM]</span>{" "}
                {stage4Phase === "error"
                  ? `Unexpected error occurred, ${displayName}.`
                  : `Processing request for ${displayName}...`}
              </p>
              <div className="fake-bar-wrap">
                <div className={`fake-bar fake-bar--${stage4Phase}`} />
              </div>
              <p className={`bar-pct${stage4Phase === "error" ? " bar-pct--error" : ""}`}>
                {stage4Phase === "error"
                  ? "ERR_0x4F2A"
                  : stage4Phase === "stuck"
                    ? "99%"
                    : ""}
              </p>
            </div>
          )}

          {/* Stage 5 - Maths */}
          {stage === 5 && (
            <div className="stage-block">
              {stage5Mode === "skip" ? (
                <>
                  <p className="system-message" style={{ opacity: 1 }}>
                    <span className="bracket">[SYSTEM]</span> Shortcut detected.
                  </p>

                  <div className="slowpoke-wrap">
                    <div className="slowpoke-box">
                      <div className="slowpoke-cat-col">
                        <span className="slowpoke-cat">⚠ (·•᷄‎ࡇ•᷅ )</span>
                      </div>

                      <div className="slowpoke-content">
                        <p className="slowpoke-msg">
                          You skipped a basic maths challenge.
                          <br />
                          That was... disappointing.
                          <br />
                          <br />
                          You have received the title,
                          <br />
                          <span className="slowpoke-name">{displayName}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="system-message" style={{ opacity: 1 }}>
                    <span className="bracket">[SYSTEM]</span> Solve this, {displayName}.
                  </p>

                  <div className="type-phrase-box">
                    <span className="type-phrase">{mathQuestion.prompt} = ?</span>
                  </div>

                  {mathTaunt && (
                    <p className="invalid-msg">
                      <span className="bracket-red">[SYSTEM]</span> {mathTaunt}
                    </p>
                  )}

                  {mathStatus === "pass" ? (
                    <p className="system-message type-granted-msg" style={{ opacity: 1 }}>
                      <span className="bracket-green">[SYSTEM]</span> Correct. Proceeding...
                    </p>
                  ) : (
                    <>
                      <div className="reward-btns" onMouseMove={handleMathMouseMove}>
                        {displayedMathOptions.map((value, idx) => {
                          const showCorrectHint =
                            isCheatOn &&
                            mathStatus === "playing" &&
                            value === mathQuestion.correct;

                          return (
                            <button
                              key={`${mathQuestion.prompt}-${idx}-${value}`}
                              ref={(el) => {
                                rewardRefs.current[idx] = el;
                              }}
                              className={`reward-btn${showCorrectHint ? " reward-btn--correct" : ""}`}
                              style={{
                                transform: `translate(${mathOptionPos[idx]?.x ?? 0}px, ${
                                  mathOptionPos[idx]?.y ?? 0
                                }px)`,
                              }}
                              onMouseDown={handleMathMouseDown}
                              onClick={() => handleMathOptionClick(value)}
                            >
                              {pendingAction ? "..." : value}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        className="skip-stage-btn"
                        onClick={handleSkipMathStage}
                        type="button"
                      >
                        Skip this stage
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Stage 6 - Phrase typing */}
          {stage === 6 && (
            <div className="stage-block">
              {(typeStatus === "typing" || typeStatus === "incorrect") && (
                <>
                  <p className="system-message" style={{ opacity: 1 }}>
                    <span className="bracket">[SYSTEM]</span> Type the following to
                    proceed, {displayName}:
                  </p>

                  <div className="type-phrase-box">
                    <span className="type-phrase">{typePhrase.display}</span>
                  </div>

                  {isCheatOn && (
                    <p className="retry-text" style={{ opacity: 1 }}>
                      Exact phrase: {typePhrase.internal}
                    </p>
                  )}
                </>
              )}

              {typeStatus === "incorrect" && (
                <p
                  className={`s3-status-msg s3-status-msg--error${
                    typeErrorFlash ? " s3-status-msg--violent" : ""
                  }`}
                  style={{ opacity: 1 }}
                >
                  <span className="bracket-red">[SYSTEM]</span>{" "}
                  {typeErrorText || "Verification mismatch."}
                </p>
              )}

              {typeStatus === "typing" && (
                <div className="name-input-group" style={{ marginTop: 10 }}>
                  <input
                    className={`name-input${typeErrorFlash ? " name-input--type-error" : ""}`}
                    type="text"
                    value={typeInputVisible}
                    onChange={handleTypeInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTypeSubmit();
                    }}
                    placeholder="Type here..."
                    autoFocus
                  />
                </div>
              )}

              {typeStatus === "checking" && (
                <p className="system-message recalc-msg" style={{ opacity: 1 }}>
                  <span className="bracket">[SYSTEM]</span> Checking...
                </p>
              )}

              {typeStatus === "granted" && (
                <p className="system-message type-granted-msg" style={{ opacity: 1 }}>
                  <span className="bracket-green">[SYSTEM]</span> Access granted.
                </p>
              )}
            </div>
          )}

          {/* Stage 7 - Button boss */}
          {stage === 7 && (
            <div className="stage-block">
              <p className="system-message" style={{ opacity: 1 }}>
                <span className="bracket">[SYSTEM]</span> It's just a button, {displayName}.
              </p>

              <p className="bar-pct" style={{ textAlign: "left", marginTop: 10 }}>
                {stage7ProgressText}
              </p>

              <div className="type-phrase-box" style={{ marginTop: 10 }}>
                <span className="type-phrase">{buttonBossHint}</span>
              </div>

              {buttonBossTaunt && (
                <p className="invalid-msg">
                  <span className="bracket-red">[SYSTEM]</span> {buttonBossTaunt}
                </p>
              )}

              {buttonBossPhase === "pass" && (
                <p className="system-message type-granted-msg" style={{ opacity: 1 }}>
                  <span className="bracket-green">[SYSTEM]</span> Level cleared.
                </p>
              )}

              {buttonBossLevel === 1 && (
                <div className="button-boss-area">
                  <button className="button-boss-btn" onClick={() => handleButtonBossClick()}>
                    {buttonBossLabel}
                  </button>
                  <p className="retry-text" style={{ opacity: 1 }}>
                    Honesty submissions: {fakeHonestyCount}/{fakeHonestyTarget}
                  </p>
                </div>
              )}

              {buttonBossLevel === 2 && (
                <div className="button-boss-lane">
                  <button
                    className={`button-boss-btn${
                      shrinkPhase === "second" ? " button-boss-btn--danger" : ""
                    }`}
                    style={{
                      transform: `translate(${shrinkTravelX + shrinkJitter.x}px, ${shrinkJitter.y}px) scale(${shrinkScale})`,
                    }}
                    onClick={() => handleButtonBossClick()}
                  >
                    {shrinkPhase === "second" ? "CATCH ME" : buttonBossLabel}
                  </button>
                </div>
              )}

              {buttonBossLevel === 3 && (
                <div className="button-boss-grid">
                  {(multiButtons.length > 0 ? multiButtons : buildMultiButtons(1, isCheatOn ? 6 : 9)).map((btn) => (
                    <button
                      key={btn.id}
                      className="button-boss-btn button-boss-btn--small"
                      style={{
                        outline:
                          isCheatOn && btn.isReal
                            ? "1px solid rgba(90,255,140,0.95)"
                            : undefined,
                      }}
                      onClick={() => handleButtonBossClick(btn.isReal)}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <p className="retry-text" style={{ gridColumn: "1 / -1", opacity: 1 }}>
                    Real hits: {multiHits}/{multiRequiredHits || (isCheatOn ? 1 : 2)}
                  </p>
                </div>
              )}

              {buttonBossLevel === 4 && (
                <div className="button-boss-area">
                  <button className="button-boss-btn" onClick={() => handleButtonBossClick()}>
                    {buttonBossLabel}
                  </button>
                </div>
              )}

              {buttonBossLevel === 5 && (
                <div className="button-boss-area">
                  <button
                    className="button-boss-btn"
                    onMouseDown={handleButtonBossHoldStart}
                    onMouseUp={handleButtonBossHoldEnd}
                    onMouseLeave={handleButtonBossHoldEnd}
                  >
                    {buttonBossLabel}
                  </button>

                  <div className="boss-meter">
                    <div className="boss-meter-fill" style={{ width: `${holdProgress}%` }} />
                  </div>
                </div>
              )}

              {buttonBossLevel === 6 && (
                <div className="button-boss-area">
                  <button
                    className={`button-boss-btn${rhythmActive ? " button-boss-btn--pulse" : ""}`}
                    onClick={() => handleButtonBossClick()}
                  >
                    {buttonBossLabel}
                  </button>
                  <p className="retry-text" style={{ opacity: 1 }}>
                    Rhythm hits: {rhythmHits}/{isCheatOn ? 1 : 4}
                  </p>
                </div>
              )}

              {buttonBossLevel === 7 && (
                <div className="button-boss-area">
                  <button className="button-boss-btn" onClick={() => handleButtonBossClick()}>
                    {buttonBossLabel}
                  </button>
                  <div className="boss-meter">
                    <div className="boss-meter-fill" style={{ width: `${staminaValue}%` }} />
                  </div>
                </div>
              )}

              {buttonBossLevel === 8 && (
                <div className="button-boss-area">
                  <div className="one-frame-wrap">
                    {oneFrameVisible ? (
                      <button
                        className="button-boss-btn button-boss-btn--flash"
                        onClick={() => handleButtonBossClick()}
                      >
                        {buttonBossLabel}
                      </button>
                    ) : (
                      <div className="one-frame-placeholder" />
                    )}
                  </div>
                  <p className="retry-text" style={{ opacity: 1 }}>
                    Flash catches: {oneFrameHits}/{isCheatOn ? 1 : 2}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="popup-footer">
          {/* Stage 1 */}
          {stage === 1 && !isGlitching && (
            <>
              {stage1Phase === "first" && (
                <button
                  ref={buttonRef}
                  className="accept-btn accept-btn--dodge"
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px)`,
                  }}
                  onClick={handleAccept}
                >
                  Accept
                </button>
              )}

              {stage1Phase === "glitching" && (
                <div
                  className="accept-transition-wrap"
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px)`,
                  }}
                >
                  <div className="accept-btn accept-btn--glitching">
                    <span className="accept-btn-glitch-text">A̸C̷C̶E̷P̷T̶</span>
                  </div>

                  <div className="accept-transition-error">
                    {stage1ErrorText}
                  </div>
                </div>
              )}

              {stage1Phase === "second" && (
                <button
                  ref={buttonRef}
                  className="accept-btn accept-btn--dodge accept-btn--second accept-btn--second-small"
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px)`,
                  }}
                  onClick={handleAccept}
                >
                  ACCEPT NOW
                </button>
              )}
            </>
          )}

          {/* Stage 2 */}
          {stage === 2 && !isGlitching && !isRecalculating && (
            <button
              className={`accept-btn${pendingAction ? " accept-btn--pending" : ""}${
                btnJammed ? " accept-btn--jammed" : ""
              }`}
              onClick={() => withDelay(() => setStage(3))}
              disabled={pendingAction || btnJammed}
            >
              {pendingAction ? "PROCESSING..." : "Continue"}
            </button>
          )}

          {/* Stage 3 */}
          {stage === 3 && stage3Status === "typing" && (
            <button
              className={`accept-btn${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleNameSubmit}
              disabled={btnJammed}
            >
              Submit
            </button>
          )}

          {stage === 3 && stage3Status === "slowpoke" && (
            <button className="accept-btn" onClick={handleSlowpokeNext}>
              Next
            </button>
          )}
          
          {/* Stage 5 */}
          {stage === 5 && stage5Mode === "skip" && (
            <button className="accept-btn" onClick={handleSkipMathPopupNext}>
              Next
            </button>
          )}

          {/* Stage 6 */}
          {stage === 6 && typeStatus === "typing" && (
            <button
              className={`accept-btn${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleTypeSubmit}
              disabled={btnJammed}
            >
              Submit
            </button>
          )}

          {/* Stage 7 */}
          {stage === 7 && buttonBossLevel === 8 && buttonBossPhase === "pass" && (
            <button className="accept-btn" onClick={handleClaimRewards}>
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
import {
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useEffect,
} from "react";
import "@/styles/system.css";

const CORRUPT_CHARS = "!@#$%^&*<>[]{}|;:?/\\~`▓▒░█▄▀■□◆◇";
const ADMIN_PASSWORD = "hunter";
const MAX_STAGE = 7;
const DODGE_RADIUS = 100;
const [stage5Mode, setStage5Mode] = useState<"math" | "skip">("math");
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
  { display: "ACCESS GRANTED", internal: "ACCESS\u200bGRANTED" },
  { display: "SHADOW EXTRACTION", internal: "SHADOW\u200bEXTRACTION" },
  { display: "DUNGEON CLEAR CODE", internal: "DUNGEON\u200bCLEAR CODE" },
  { display: "RANK UP PROTOCOL", internal: "RANK\u200bUP PROTOCOL" },
  { display: "ARISE NOW HUNTER", internal: "ARISE\u200bNOW HUNTER" },
  { display: "GATE OVERRIDE SEVEN", internal: "GATE\u200bOVERRIDE SEVEN" },
  { display: "MONARCH SEAL VERIFY", internal: "MONARCH\u200bSEAL VERIFY" },
  { display: "NULL VOID CONFIRM", internal: "NULL\u200bVOID CONFIRM" },
  { display: "KXRT ZEPHYR ONLINE", internal: "KXRT\u200bZEPHYR ONLINE" },
  { display: "VORTEX SIGNAL NULL", internal: "VORTEX\u200bSIGNAL NULL" },
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
  "Feeble-Minded Wretch",
  "Dullard",
  "Imbecilic Creature",
  "Hopeless Simpleton",
  "Pathetic Degenerate",
  "Laughable Specimen",
  "Unremarkable Fool",
  "Cognitively Deficient Being",
  "Miserable Halfwit",
  "Tragic Buffoon",
];

const SKIP_TITLES = [
  ...MODERN_INSULTS,
  ...VICTORIAN_INSULTS,
];

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

type Stage6Status = "typing" | "checking" | "incorrect" | "granted" | "failed";

function getRandomTitle() {
  const roll = Math.random();

  if (roll < 0.5) {
    return MODERN_INSULTS[Math.floor(Math.random() * MODERN_INSULTS.length)];
  }

  if (roll < 0.9) {
    return VICTORIAN_INSULTS[Math.floor(Math.random() * VICTORIAN_INSULTS.length)];
  }

  const modern =
    MODERN_INSULTS[Math.floor(Math.random() * MODERN_INSULTS.length)];
  const victorian =
    VICTORIAN_INSULTS[Math.floor(Math.random() * VICTORIAN_INSULTS.length)];

  return `${victorian} (${modern})`;
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
    else candidate = question.correct + (Math.random() < 0.5 ? -1 : 1) * rand(2, 8);

    if (candidate >= 0 && candidate !== question.correct) {
      wrongs.add(candidate);
    }
  }

  const options = shuffle([question.correct, ...Array.from(wrongs)]);

  return {
    prompt: question.prompt,
    correct: question.correct,
    options,
  };
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

  for (let i = out.length - 1; i > 0; i--) {
    if (Math.random() < 0.45) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  }

  return out.join("");
}

function corruptForSlowpoke(s: string): string {
  if (!s.trim()) return "ERROR_NULL_PLAYER";

  const upper = s.toUpperCase().split("");
  const out = upper.map((c) => {
    const r = Math.random();
    if (r < 0.22) {
      return CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
    }
    if (r < 0.38) return "?";
    return c;
  });

  return out.sort(() => Math.random() - 0.5).join("") + "_??";
}

function randomCorrupt(len: number) {
  return Array.from(
    { length: len },
    () => CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)],
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
  const [stage, setStage] = useState(1);
  const [isGlitching, setIsGlitching] = useState(false);
  const [corruptText, setCorruptText] = useState("");
  const glitchDoneRef = useRef<() => void>(() => {});

  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const naturalPos = useRef<{ x: number; y: number } | null>(null);
  const dodgeCoolRef = useRef(false);

  const [isRecalculating, setIsRecalculating] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [inputDisabled, setInputDisabled] = useState(false);
  const [stage3Status, setStage3Status] = useState<Stage3Status>("typing");
  const [slowpokeName, setSlowpokeName] = useState("");
  const [userName, setUserName] = useState("");

  const inputValueRef = useRef("");
  const corruptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitCountRef = useRef(0);
  const firstKeypressAtRef = useRef<number | null>(null);
  const backspaceUsedRef = useRef(false);
  const slowpokeShownRef = useRef(false);
  const stage3StatusRef = useRef<Stage3Status>("typing");
  const [nameTimer, setNameTimer] = useState(3);
  const nameTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setS3 = useCallback((s: Stage3Status) => {
    stage3StatusRef.current = s;
    setStage3Status(s);
  }, []);

  const [stage4Phase, setStage4Phase] = useState<"filling" | "stuck" | "error">(
    "filling",
  );

  const [mathQuestion, setMathQuestion] = useState<MathQuestion>(
    generateMathQuestion(),
  );
  const [mathStatus, setMathStatus] = useState<"playing" | "taunt" | "pass">(
    "playing",
  );
  const [mathTaunt, setMathTaunt] = useState("");
  const [mathOptions, setMathOptions] = useState<number[]>([]);
  const [mathOptionPos, setMathOptionPos] = useState([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const [assignedTitle, setAssignedTitle] = useState<string | null>(null);
  const [skipPopupOpen, setSkipPopupOpen] = useState(false);

  const mathStartAtRef = useRef<number>(0);
  const mathTauntTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mathIdleTauntRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rewardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [typeInput, setTypeInput] = useState("");
  const [typeStatus, setTypeStatus] = useState<Stage6Status>("typing");
  const [typePhrase, setTypePhrase] = useState(TYPE_PHRASES[0]);
  const [typeAttempts, setTypeAttempts] = useState(0);
  const typeInputRef = useRef("");
  const typeCorruptRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stage7Phase, setStage7Phase] = useState<
    "granted" | "claiming" | "final"
  >("granted");
  const stageFinalDirect = useRef(false);

  const [pendingAction, setPendingAction] = useState(false);
  const [btnJammed, setBtnJammed] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState(false);
  const [adminJumpOpen, setAdminJumpOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (stage !== 1) return;
    const btn = buttonRef.current;
    const popup = popupRef.current;
    if (!btn || !popup) return;

    const bR = btn.getBoundingClientRect();
    const pR = popup.getBoundingClientRect();
    naturalPos.current = { x: bR.left - pR.left, y: bR.top - pR.top };
  }, [stage]);

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

    const fallback = setTimeout(() => setStage(4), 60000);

    return () => {
      clearTimeout(fallback);

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
    setSkipPopupOpen(false);
    setStage5Mode("math");

    mathStartAtRef.current = Date.now();

    if (mathTauntTimerRef.current) clearTimeout(mathTauntTimerRef.current);
    if (mathIdleTauntRef.current) clearTimeout(mathIdleTauntRef.current);

    const shuffleIv = setInterval(() => {
      setMathOptions((prev) => shuffle(prev));
    }, 2600);

    mathIdleTauntRef.current = setTimeout(() => {
      if (!skipPopupOpen) {
        setMathTaunt(
          MATH_TAUNTS[Math.floor(Math.random() * MATH_TAUNTS.length)],
        );
      }
    }, 2500);

    return () => {
      clearInterval(shuffleIv);
      if (mathTauntTimerRef.current) clearTimeout(mathTauntTimerRef.current);
      if (mathIdleTauntRef.current) clearTimeout(mathIdleTauntRef.current);
    };
  }, [stage, skipPopupOpen]);

  useEffect(() => {
    if (stage !== 6) return;

    const idx = Math.floor(Math.random() * TYPE_PHRASES.length);
    setTypePhrase(TYPE_PHRASES[idx]);
    setTypeInput("");
    typeInputRef.current = "";
    setTypeStatus("typing");
    setTypeAttempts(0);

    if (typeCorruptRef.current) {
      clearTimeout(typeCorruptRef.current);
      typeCorruptRef.current = null;
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== 7) return;
    if (stageFinalDirect.current) {
      stageFinalDirect.current = false;
      setStage7Phase("final");
      return;
    }
    setStage7Phase("granted");
  }, [stage]);

  useEffect(() => {
    if (stage < 2 || stage > 6) return;

    setBtnJammed(false);
    const iv = setInterval(() => {
      if (Math.random() < 0.45) {
        setBtnJammed(true);
        setTimeout(() => setBtnJammed(false), 420);
      }
    }, 3800);

    return () => {
      clearInterval(iv);
      setBtnJammed(false);
    };
  }, [stage]);

  useEffect(() => {
    if (adminOpen && !adminUnlocked) {
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [adminOpen, adminUnlocked]);

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

  const handlePopupMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (stage !== 1 || isGlitching || dodgeCoolRef.current) return;

      const btn = buttonRef.current;
      const popup = popupRef.current;
      if (!btn || !popup || !naturalPos.current) return;

      const bR = btn.getBoundingClientRect();
      const pR = popup.getBoundingClientRect();
      const btnCx = bR.left + bR.width / 2;
      const btnCy = bR.top + bR.height / 2;
      const dist = Math.sqrt(
        (e.clientX - btnCx) ** 2 + (e.clientY - btnCy) ** 2,
      );

      if (dist > DODGE_RADIUS) return;

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
        tries < 12 &&
        Math.abs(tx - (naturalPos.current.x + translate.x)) < 70 &&
        Math.abs(ty - (naturalPos.current.y + translate.y)) < 35
      );

      setTranslate({
        x: tx - naturalPos.current.x,
        y: ty - naturalPos.current.y,
      });

      dodgeCoolRef.current = true;
      setTimeout(() => {
        dodgeCoolRef.current = false;
      }, 280);
    },
    [stage, isGlitching, translate],
  );

  const handleAccept = useCallback(() => {
    setTranslate({ x: 0, y: 0 });
    glitchDoneRef.current = () => setStage(2);
    setIsGlitching(true);
  }, []);

  const handleSlowpokeNext = useCallback(() => {
    setStage(4);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (stage3StatusRef.current !== "typing") return;

      const newVal = e.target.value;

      if (!firstKeypressAtRef.current && newVal.length > 0) {
        firstKeypressAtRef.current = Date.now();
      }

      setInputValue(newVal);
      inputValueRef.current = newVal;

      if (newVal.length < 2) return;

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
            next = cur
              .split("")
              .sort(() => Math.random() - 0.5)
              .join("");
          }

          setInputValue(next);
          inputValueRef.current = next;
        }, delay);
      }
    },
    [],
  );

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") backspaceUsedRef.current = true;
    if (e.key === "Enter") handleNameSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSubmit = useCallback(() => {
    if (stage3StatusRef.current !== "typing") return;

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
  }, [setS3]);

  const handleMathMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mathStatus !== "playing" || skipPopupOpen) return;

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
    [mathStatus, skipPopupOpen],
  );

  const handleMathMouseDown = useCallback(() => {
    if (mathStatus !== "playing" || skipPopupOpen) return;

    if (Math.random() < 0.35) {
      setMathOptions((prev) => shuffle(prev));
    }
  }, [mathStatus, skipPopupOpen]);

  const handleMathOptionClick = useCallback(
    (value: number) => {
      if (mathStatus !== "playing" || skipPopupOpen) return;

      if (mathIdleTauntRef.current) {
        clearTimeout(mathIdleTauntRef.current);
        mathIdleTauntRef.current = null;
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
              : MATH_TAUNTS[Math.floor(Math.random() * MATH_TAUNTS.length)],
          );

          const nextQ = generateMathQuestion();

          mathTauntTimerRef.current = setTimeout(() => {
            setMathQuestion(nextQ);
            setMathOptions((prev) => {
              const preserved = value;
              const filtered = nextQ.options.filter((n) => n !== preserved);
              return shuffle([preserved, ...filtered.slice(0, 3)]);
            });
            setMathOptionPos([
              { x: 0, y: 0 },
              { x: 0, y: 0 },
              { x: 0, y: 0 },
              { x: 0, y: 0 },
            ]);
            setMathStatus("playing");
            setMathTaunt("");
            mathStartAtRef.current = Date.now();

            mathIdleTauntRef.current = setTimeout(() => {
              setMathTaunt(
                MATH_TAUNTS[Math.floor(Math.random() * MATH_TAUNTS.length)],
              );
            }, 2500);
          }, 1200);

          return;
        }

        setMathStatus("taunt");
        setMathTaunt(MATH_TAUNTS[Math.floor(Math.random() * MATH_TAUNTS.length)]);

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

          mathIdleTauntRef.current = setTimeout(() => {
            setMathTaunt(
              MATH_TAUNTS[Math.floor(Math.random() * MATH_TAUNTS.length)],
            );
          }, 2500);
        }, 1200);
      }, 500);
    },
    [mathStatus, mathQuestion, skipPopupOpen],
  );

  const handleSkipMathStage = useCallback(() => {
    setAssignedTitle(getRandomTitle());
    setStage5Mode("skip");

    const idx = Math.floor(Math.random() * SKIP_TITLES.length);
    setAssignedTitle(SKIP_TITLES[idx]);
  }, []);

  const handleSkipPopupNext = useCallback(() => {
    setSkipPopupOpen(false);
    setStage(6);
  }, []);

  const handleTypeInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (typeStatus !== "typing") return;

      if (typeCorruptRef.current) {
        clearTimeout(typeCorruptRef.current);
        typeCorruptRef.current = null;
      }

      const newVal = e.target.value;
      const r = Math.random();

      const commit = (v: string) => {
        setTypeInput(v);
        typeInputRef.current = v;

        if (v.length >= 4 && Math.random() < 0.2) {
          typeCorruptRef.current = setTimeout(() => {
            typeCorruptRef.current = null;
            const cur = typeInputRef.current;
            if (!cur.length) return;

            if (Math.random() < 0.55) {
              const next = cur.slice(0, -1);
              setTypeInput(next);
              typeInputRef.current = next;
            } else {
              const last = cur[cur.length - 1];
              const lower = last.toLowerCase();
              const rep = NEIGHBORS[lower] ?? "x";
              const replaced =
                last === last.toUpperCase() ? rep.toUpperCase() : rep;
              const next = cur.slice(0, -1) + replaced;
              setTypeInput(next);
              typeInputRef.current = next;
            }
          }, 150 + Math.random() * 200);
        }
      };

      if (r < 0.04) return;
      if (r < 0.12) {
        setTimeout(() => commit(newVal), 70 + Math.random() * 90);
      } else {
        commit(newVal);
      }
    },
    [typeStatus],
  );

  const handleTypeSubmit = useCallback(() => {
    if (typeStatus !== "typing") return;

    if (typeCorruptRef.current) {
      clearTimeout(typeCorruptRef.current);
      typeCorruptRef.current = null;
    }

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
        setTimeout(() => {
          setTypeInput("");
          typeInputRef.current = "";
          setTypeStatus("typing");
        }, 1600);
      }
    }, 900);
  }, [typeStatus, typeAttempts]);

  const handleClaim = useCallback(() => {
    if (stage7Phase !== "granted" || pendingAction || btnJammed) return;

    setPendingAction(true);
    setTimeout(() => {
      setPendingAction(false);
      setStage7Phase("claiming");
      setTimeout(() => setStage7Phase("final"), 420);
    }, 650);
  }, [stage7Phase, pendingAction, btnJammed]);

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
    setStage((prev) => {
      const n = Math.min(prev + 1, MAX_STAGE);
      if (n === MAX_STAGE) stageFinalDirect.current = true;
      return n;
    });
  }, []);

  const handleSkipToFinal = useCallback(() => {
    setIsGlitching(false);
    setPendingAction(false);
    setBtnJammed(false);
    stageFinalDirect.current = true;
    setStage(MAX_STAGE);
    setAdminOpen(false);
  }, []);

  const handleJumpToStage = useCallback((s: number) => {
    setIsGlitching(false);
    setPendingAction(false);
    setBtnJammed(false);
    if (s === MAX_STAGE) stageFinalDirect.current = true;
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
    setStage(1);
    setIsGlitching(false);
    setTranslate({ x: 0, y: 0 });
    setPendingAction(false);
    setBtnJammed(false);
    setAdminOpen(false);
    setAdminUnlocked(false);
    setAdminJumpOpen(false);
    setUserName("");
    setSlowpokeName("");
    setAssignedTitle(null);
    setSkipPopupOpen(false);
  }, []);

  const bodyFlicker = stage === 7 && stage7Phase === "claiming";
  const baseName = userName.trim() ? userName : "Hunter";
  const displayName = assignedTitle ? `${baseName} the ${assignedTitle}` : baseName;

  return (
    <div
      className={`screen${isGlitching ? " screen--flash" : ""}`}
      onMouseMove={handlePopupMouseMove}
    >
      <div
        className="admin-trigger"
        onClick={handleAdminTrigger}
        aria-hidden="true"
      />

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
                <span className="bracket">[SYSTEM]</span> Developer access
                detected.
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
                <span className="bracket">[SYSTEM]</span> Admin mode active.
                Stage {stage}/{MAX_STAGE}.
              </p>

              <div className="admin-controls">
                <button
                  className="admin-btn admin-btn--full"
                  onClick={handleSkipNext}
                  disabled={stage >= MAX_STAGE}
                >
                  Skip to Next Stage
                </button>

                <button
                  className="admin-btn admin-btn--full"
                  onClick={handleSkipToFinal}
                  disabled={stage >= MAX_STAGE}
                >
                  Skip to Final Stage
                </button>

                <button
                  className="admin-btn admin-btn--full"
                  onClick={() => setAdminJumpOpen((o) => !o)}
                >
                  Jump to Any Stage {adminJumpOpen ? "▲" : "▼"}
                </button>

                {adminJumpOpen && (
                  <div className="admin-jump-grid">
                    {Array.from({ length: MAX_STAGE }, (_, i) => i + 1).map(
                      (s) => (
                        <button
                          key={s}
                          className={`admin-jump-btn${s === stage ? " admin-jump-btn--active" : ""}`}
                          onClick={() => handleJumpToStage(s)}
                        >
                          {s}
                        </button>
                      ),
                    )}
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

      <div
        className={`popup${isGlitching ? " popup--glitch" : ""}`}
        ref={popupRef}
      >
        {isGlitching && <div className="scan-bar" />}

        <div className="popup-header">
          <span className="system-badge">SYSTEM</span>
        </div>

        <div
          className={`popup-body${bodyFlicker ? " popup-body--flicker" : ""}`}
        >
          {stage === 1 && !isGlitching && (
            <p className="system-message" key="s1">
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

          {stage === 2 && !isGlitching && isRecalculating && (
            <p className="system-message recalc-msg" key="s2a">
              <span className="bracket">[SYSTEM]</span> Recalculating mission
              difficulty...
            </p>
          )}

          {stage === 2 && !isGlitching && !isRecalculating && (
            <p className="system-message" key="s2b">
              <span className="bracket">[SYSTEM]</span> Hidden penalty
              activated.
            </p>
          )}

          {stage === 3 && (
            <div key="s3" className="stage-block">
              {stage3Status !== "slowpoke" && (
                <p className="system-message">
                  {stage3Status === "validating" ? (
                    <>
                      <span className="bracket">[SYSTEM]</span> Validating...
                    </>
                  ) : (
                    <>
                      <span className="bracket">[SYSTEM]</span> Identity
                      verification required.
                    </>
                  )}
                </p>
              )}

              {stage3Status === "invalid" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> Invalid name
                  input.
                </p>
              )}

              {stage3Status === "expired" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> Session expired.
                </p>
              )}

              {stage3Status === "slowpoke" && (
                <div className="slowpoke-wrap">
                  <p className="system-message slowpoke-title">
                    <span className="bracket">[SYSTEM]</span> Identity
                    verification required.
                  </p>

                  <div className="slowpoke-box">
                    <div className="slowpoke-cat-col">
                      <span className="slowpoke-cat" aria-hidden="true">
                        zᶻ
                        ≽₍^_ ‸ _ ^₎≼⟆
                      </span>
                      <span className="slowpoke-zzz">z z z</span>
                    </div>

                    <div className="slowpoke-content">
                      <p className="slowpoke-msg">
                        Damn, you type so slow that I thought about taking a nap
                        while waiting for you to finish typing your name... but
                        oh well, welcome,{" "}
                        <span className="slowpoke-name">{slowpokeName}</span>, I
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
                    <p className="input-warning">
                      &gt; INPUT TEMPORARILY DISABLED
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {stage === 4 && (
            <div key="s4" className="stage-block">
              <p className="system-message">
                <span className="bracket">[SYSTEM]</span>{" "}
                {stage4Phase === "error"
                  ? `Unexpected error occurred, ${displayName}.`
                  : `Processing request for ${displayName}...`}
              </p>
              <div className="fake-bar-wrap">
                <div className={`fake-bar fake-bar--${stage4Phase}`} />
              </div>
              <p
                className={`bar-pct${stage4Phase === "error" ? " bar-pct--error" : ""}`}
              >
                {stage4Phase === "error"
                  ? "ERR_0x4F2A"
                  : stage4Phase === "stuck"
                    ? "99%"
                    : ""}
              </p>
            </div>
          )}

          {stage === 5 && (
            <div key="s5" className="stage-block">

              {/* 🔥 SKIP MODE (acts like slowpoke) */}
              {stage5Mode === "skip" && (
                <>
                  <p className="system-message">
                    <span className="bracket">[SYSTEM]</span> Shortcut detected.
                  </p>

                  <div className="slowpoke-wrap">
                    <div className="slowpoke-box">
                      <div className="slowpoke-cat-col">
                        <span className="slowpoke-cat">⚠</span>
                      </div>

                      <div className="slowpoke-content">
                        <p className="slowpoke-msg">
                          You skipped a basic maths challenge.
                          <br />
                          That was… disappointing.
                          <br /><br />
                          Welcome,
                          <br />
                          <span className="slowpoke-name">
                            {displayName}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 🔥 NORMAL MATH MODE */}
              {stage5Mode === "math" && (
                <>
                  <p className="system-message">
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
                    <p className="system-message type-granted-msg">
                      <span className="bracket-green">[SYSTEM]</span> Correct. Proceeding...
                    </p>
                  ) : (
                    <>
                      <div className="reward-btns" onMouseMove={handleMathMouseMove}>
                        {mathOptions.map((value, idx) => (
                          <button
                            key={`${mathQuestion.prompt}-${idx}-${value}`}
                            ref={(el) => {
                              rewardRefs.current[idx] = el;
                            }}
                            className="reward-btn"
                            style={{
                              transform: `translate(${mathOptionPos[idx]?.x ?? 0}px, ${mathOptionPos[idx]?.y ?? 0}px)`,
                            }}
                            onMouseDown={handleMathMouseDown}
                            onClick={() => handleMathOptionClick(value)}
                          >
                            {pendingAction ? "..." : value}
                          </button>
                        ))}
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

          {stage === 6 && (
            <div key="s6" className="stage-block">
              {(typeStatus === "typing" || typeStatus === "incorrect") && (
                <>
                  <p className="system-message">
                    <span className="bracket">[SYSTEM]</span> Type the following
                    to proceed, {displayName}:
                  </p>

                  <div className="type-phrase-box">
                    <span className="type-phrase">{typePhrase.display}</span>
                  </div>
                </>
              )}

              {typeStatus === "incorrect" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> 1 character
                  incorrect.
                </p>
              )}

              {typeStatus === "typing" && (
                <div className="name-input-group" style={{ marginTop: 10 }}>
                  <input
                    className="name-input"
                    type="text"
                    value={typeInput}
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
                <p className="system-message recalc-msg">
                  <span className="bracket">[SYSTEM]</span> Checking...
                </p>
              )}

              {typeStatus === "granted" && (
                <p className="system-message type-granted-msg">
                  <span className="bracket-green">[SYSTEM]</span> Access
                  granted.
                </p>
              )}

              {typeStatus === "failed" && (
                <p className="s3-status-msg s3-status-msg--error">
                  <span className="bracket-red">[SYSTEM]</span> Verification
                  failed.
                </p>
              )}
            </div>
          )}

          {stage === 7 && (
            <div key="s7" className="stage-block">
              {(stage7Phase === "granted" || stage7Phase === "claiming") && (
                <p className="system-message reward-granted-msg">
                  <span className="bracket-green">[SYSTEM]</span> Reward
                  granted.
                </p>
              )}

              {stage7Phase === "final" && (
                <>
                  <p className="system-message">
                    <span className="bracket">[SYSTEM]</span> HAHA You got
                    tricked. There is no reward.
                  </p>
                  <p className="retry-text">Hope you got ragebaited ;P.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="popup-footer">
          {stage === 1 && !isGlitching && (
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

          {stage === 2 && !isGlitching && !isRecalculating && (
            <button
              className={`accept-btn${pendingAction ? " accept-btn--pending" : ""}${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={() => withDelay(() => setStage(3))}
              disabled={pendingAction || btnJammed}
            >
              {pendingAction ? "PROCESSING..." : "Continue"}
            </button>
          )}

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

          {stage === 5 && stage5Mode === "skip" && (
            <button className="accept-btn" onClick={handleSkipPopupNext}>
              Next
            </button>
          )}

          {stage === 6 && typeStatus === "typing" && (
            <button
              className={`accept-btn${btnJammed ? " accept-btn--jammed" : ""}`}
              onClick={handleTypeSubmit}
              disabled={btnJammed}
            >
              Submit
            </button>
          )}

          {stage === 7 && stage7Phase === "granted" && (
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
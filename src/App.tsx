import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AppKey =
  | "signals"
  | "lab"
  | "market"
  | "skills"
  | "research"
  | "dreams"
  | "companion"
  | "greenhouse";

type Mode = "off" | "booting" | "desktop";

type Application = {
  id: AppKey;
  title: string;
  code: string;
  hotkey: string;
  sprite: number;
};

type PushRecord = {
  id: string;
  repository: string;
  message: string;
  commits: number;
  createdAt: string;
};

type ActivityState = {
  loading: boolean;
  live: boolean;
  commitCount: number;
  pushes: PushRecord[];
};

const applications: Application[] = [
  { id: "signals", title: "Active Signals", code: "SIGNALS", hotkey: "1", sprite: 0 },
  { id: "lab", title: "Technical Lab", code: "LAB_07", hotkey: "2", sprite: 1 },
  { id: "market", title: "The Market", code: "MARKET", hotkey: "3", sprite: 2 },
  { id: "skills", title: "AI Skill Deck", code: "SKILLS", hotkey: "4", sprite: 3 },
  { id: "research", title: "Research Archive", code: "RESEARCH", hotkey: "5", sprite: 4 },
  { id: "dreams", title: "Dream Cache", code: "DREAMS", hotkey: "6", sprite: 5 },
  { id: "companion", title: "Companion.exe", code: "PET.EXE", hotkey: "7", sprite: 6 },
  { id: "greenhouse", title: "Commit Greenhouse", code: "GROWTH", hotkey: "8", sprite: 7 },
];

const bootLines = [
  "FIELD TERMINAL 17-B // BIOS 5.04",
  "CHECKING MEMORY..................OK",
  "RECOVERING ARCHIVE SECTORS.......OK",
  "BIOACTIVITY DETECTED.............YES",
  "ESTABLISHING SIGNAL @ELCHRYSAKI...",
];

const fallbackPushes: PushRecord[] = [
  {
    id: "fallback-1",
    repository: "offmap-hub",
    message: "Archive expired OffMap opportunities",
    commits: 1,
    createdAt: "2026-08-08T03:01:02Z",
  },
  {
    id: "fallback-2",
    repository: "euroavia-app",
    message: "Export complete EUROAVIA app source",
    commits: 3,
    createdAt: "2026-08-11T00:07:06Z",
  },
  {
    id: "fallback-3",
    repository: "aeropet",
    message: "Revise AeroPet project details",
    commits: 4,
    createdAt: "2026-07-13T13:05:20Z",
  },
];

function spritePosition(index: number, rows: number): CSSProperties {
  const col = index % 4;
  const row = Math.floor(index / 4);
  const x = col === 0 ? 0 : col === 3 ? 100 : (col / 3) * 100;
  const y = rows === 2 ? row * 100 : row === 0 ? 0 : row === 2 ? 100 : 50;

  return {
    "--sprite-x": `${x}%`,
    "--sprite-y": `${y}%`,
  } as CSSProperties;
}

function AppIcon({ index, small = false }: { index: number; small?: boolean }) {
  return (
    <span
      className={`app-sprite${small ? " app-sprite--small" : ""}`}
      style={spritePosition(index, 2)}
      aria-hidden="true"
    />
  );
}

function PlantSprite({ stage }: { stage: number }) {
  return (
    <span
      className="plant-sprite"
      style={spritePosition(Math.max(0, Math.min(11, stage)), 3)}
      aria-hidden="true"
    />
  );
}

function useLiveActivity(): ActivityState {
  const [activity, setActivity] = useState<ActivityState>({
    loading: true,
    live: false,
    commitCount: fallbackPushes.reduce((total, push) => total + push.commits, 0),
    pushes: fallbackPushes,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadActivity() {
      try {
        const response = await fetch(
          "https://api.github.com/users/elchrysaki/events/public?per_page=100",
          {
            headers: { Accept: "application/vnd.github+json" },
            signal: controller.signal,
          },
        );

        if (!response.ok) throw new Error("Activity signal unavailable");

        const events = (await response.json()) as Array<{
          id: string;
          type: string;
          created_at: string;
          repo?: { name?: string };
          payload?: {
            size?: number;
            commits?: Array<{ message?: string }>;
            head?: string;
          };
        }>;

        const pushes = events
          .filter((event) => event.type === "PushEvent")
          .map((event) => {
            const commits = event.payload?.commits ?? [];
            return {
              id: event.id,
              repository: event.repo?.name?.replace("elchrysaki/", "") ?? "unknown-node",
              message: commits.at(-1)?.message?.split("\n")[0] ?? "Encrypted commit received",
              commits: Math.max(commits.length, event.payload?.size ?? 1),
              createdAt: event.created_at,
            } satisfies PushRecord;
          });

        if (pushes.length === 0) throw new Error("No public pushes in signal window");

        setActivity({
          loading: false,
          live: true,
          commitCount: pushes.reduce((total, push) => total + push.commits, 0),
          pushes: pushes.slice(0, 8),
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setActivity((current) => ({ ...current, loading: false, live: false }));
      }
    }

    loadActivity();
    return () => controller.abort();
  }, []);

  return activity;
}

function relativeTime(date: string) {
  const difference = Date.now() - new Date(date).getTime();
  const days = Math.max(0, Math.floor(difference / 86_400_000));
  if (days === 0) return "TODAY";
  if (days === 1) return "1 DAY AGO";
  if (days < 30) return `${days} DAYS AGO`;
  return new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }).toUpperCase();
}

function ProjectCard({
  eyebrow,
  title,
  description,
  tags,
  href,
  privacy = "PUBLIC",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  href?: string;
  privacy?: "PUBLIC" | "PRIVATE BUILD" | "INCOMING";
}) {
  return (
    <article className="project-card">
      <div className="project-card__topline">
        <span>{eyebrow}</span>
        <span className={`privacy privacy--${privacy.toLowerCase().replace(" ", "-")}`}>{privacy}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="tag-row" aria-label="Technologies">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {href ? (
        <a className="terminal-link" href={href} target="_blank" rel="noreferrer">
          OPEN TRANSMISSION <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <span className="terminal-link terminal-link--disabled">ACCESS RESTRICTED</span>
      )}
    </article>
  );
}

function EmptySlot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="empty-slot">
      <span className="empty-slot__cross" aria-hidden="true">+</span>
      <div>
        <strong>{label}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function AboutPanel({ open }: { open: (app: AppKey) => void }) {
  return (
    <div className="about-panel">
      <div className="operator-id">
        <span className="operator-id__portrait">EC</span>
        <span className="operator-id__signal" />
      </div>
      <div className="about-copy">
        <p className="eyebrow">RECOVERED OPERATOR PROFILE // NODE 17</p>
        <h1>ELENA<br />CHRYSAKI</h1>
        <p className="about-copy__lead">
          I build useful systems, unusual interfaces and small pieces of technology that feel alive.
        </p>
        <div className="about-actions">
          <button onClick={() => open("signals")}>OPEN ACTIVE WORK</button>
          <a href="mailto:helenachrysaki@gmail.com">SEND A SIGNAL</a>
        </div>
      </div>
      <dl className="operator-stats">
        <div><dt>CLASS</dt><dd>DESIGNER / BUILDER</dd></div>
        <div><dt>FOCUS</dt><dd>PRODUCTS + EXPERIMENTS</dd></div>
        <div><dt>BASE</dt><dd>EARTH // REMOTE</dd></div>
        <div><dt>STATUS</dt><dd className="status-online">MAKING THINGS</dd></div>
      </dl>
    </div>
  );
}

function ApplicationPanel({ app, activity }: { app: AppKey; activity: ActivityState }) {
  switch (app) {
    case "signals":
      return (
        <div className="panel-stack">
          <header className="panel-intro">
            <p className="eyebrow">ACTIVE TRANSMISSIONS // PRODUCTS IN THE FIELD</p>
            <h2>Things currently alive.</h2>
          </header>
          <div className="project-grid">
            <ProjectCard
              eyebrow="SIGNAL 01 // COMMUNITY INFRASTRUCTURE"
              title="OffMap"
              description="A student-powered opportunity map rescuing worthwhile programs from forgotten newsletters, private group chats and scattered feeds."
              tags={["OPEN SOURCE", "AUTOMATION", "COMMUNITY"]}
              href="https://github.com/elchrysaki/offmap-hub"
            />
            <ProjectCard
              eyebrow="SIGNAL 02 // AEROSPACE COMMUNITY"
              title="EUROAVIA App"
              description="A member platform with onboarding, profiles, local groups, privacy controls and an interactive community forum."
              tags={["REACT", "SUPABASE", "PRODUCT DESIGN"]}
              privacy="PRIVATE BUILD"
            />
          </div>
        </div>
      );

    case "lab":
      return (
        <div className="panel-stack">
          <header className="panel-intro">
            <p className="eyebrow">HARDWARE / SOFTWARE HYBRIDS</p>
            <h2>Technical specimens.</h2>
          </header>
          <div className="project-grid project-grid--single">
            <ProjectCard
              eyebrow="SPECIMEN 01 // FLIGHT-TRACKING CREATURE"
              title="AeroPet"
              description="A rechargeable IoT keychain where live aviation telemetry changes the mood of a digital pet. Custom PCB, OLED, BLE handshake and a Flutter companion app."
              tags={["ESP32-C3", "BLE", "FLUTTER", "OPENSKY"]}
              privacy="PRIVATE BUILD"
            />
            <EmptySlot label="LAB BAY 02">Awaiting the next technical creature.</EmptySlot>
          </div>
        </div>
      );

    case "market":
      return (
        <div className="panel-stack">
          <header className="panel-intro">
            <p className="eyebrow">THE MARKET // COMMISSIONED WORLDS</p>
            <h2>Useful work for real people.</h2>
          </header>
          <p className="manifesto-copy">
            This stall will hold websites, portfolios and digital spaces built for other people—each displayed as an artifact with its own story, not a generic client logo.
          </p>
          <div className="slot-grid">
            <EmptySlot label="STALL 01">Portfolio transmission pending.</EmptySlot>
            <EmptySlot label="STALL 02">Website transmission pending.</EmptySlot>
            <EmptySlot label="STALL 03">Open for a future commission.</EmptySlot>
          </div>
          <a className="large-contact" href="mailto:helenachrysaki@gmail.com?subject=Project%20signal">REQUEST A BUILD ↗</a>
        </div>
      );

    case "skills":
      return (
        <div className="panel-stack">
          <header className="panel-intro">
            <p className="eyebrow">PORTABLE INTELLIGENCE // SKILL CARTRIDGES</p>
            <h2>AI that knows how to do things.</h2>
          </header>
          <p className="manifesto-copy">
            Reusable AI skills will appear here as physical cartridges: what each one knows, the workflow it encodes and where it becomes useful.
          </p>
          <div className="cartridge-rack" aria-label="Future AI skill slots">
            {["RESEARCH", "DESIGN", "AUTOMATION", "UNKNOWN"].map((label, index) => (
              <div className="cartridge" key={label}>
                <span>0{index + 1}</span>
                <strong>{label}</strong>
                <small>NO DATA</small>
              </div>
            ))}
          </div>
        </div>
      );

    case "research":
      return (
        <div className="panel-stack research-panel">
          <header className="panel-intro">
            <p className="eyebrow">FIELD NOTES / STUDIES / LONG-FORM SIGNALS</p>
            <h2>Research archive.</h2>
          </header>
          <div className="radar" aria-hidden="true"><span /></div>
          <div className="research-copy">
            <strong>SCANNING FOR DOCUMENTS...</strong>
            <p>The archive is ready for papers, investigations, technical notes and unfinished questions.</p>
          </div>
        </div>
      );

    case "dreams":
      return (
        <div className="panel-stack dream-panel">
          <header className="panel-intro">
            <p className="eyebrow">UNSTABLE VISUAL EXPERIMENTS</p>
            <h2>Dream cache.</h2>
          </header>
          <div className="dream-frame">
            <span className="dream-orb" />
            <p>Artistic web projects will live here as places to enter, not thumbnails to scroll past.</p>
            <strong>CACHE SLOT EMPTY // READY</strong>
          </div>
        </div>
      );

    case "companion":
      return (
        <div className="panel-stack companion-panel">
          <header className="panel-intro">
            <p className="eyebrow">COMPANION PROCESS // FRIENDLY DAEMON</p>
            <h2>A creature lives in the machine.</h2>
          </header>
          <div className="companion-card">
            <AppIcon index={6} />
            <div>
              <p>The future desktop pet will patrol this archive, react to visitors and occasionally sleep on important controls.</p>
              <dl>
                <div><dt>MOOD</dt><dd>CURIOUS</dd></div>
                <div><dt>POWER</dt><dd>87%</dd></div>
                <div><dt>STATUS</dt><dd>PROTOTYPE</dd></div>
              </dl>
            </div>
          </div>
        </div>
      );

    case "greenhouse": {
      const stage = Math.min(11, Math.floor(activity.commitCount / 2));
      return (
        <div className="panel-stack greenhouse-panel">
          <header className="panel-intro greenhouse-heading">
            <div>
              <p className="eyebrow">PUBLIC COMMIT BIOACTIVITY</p>
              <h2>The code is growing.</h2>
            </div>
            <span className={`live-badge${activity.live ? "" : " live-badge--cached"}`}>
              {activity.loading ? "TUNING SIGNAL" : activity.live ? "LIVE FEED" : "CACHED FEED"}
            </span>
          </header>
          <div className="greenhouse-layout">
            <div className="plant-chamber">
              <PlantSprite stage={stage} />
              <div className="plant-meter">
                <span style={{ width: `${((stage + 1) / 12) * 100}%` }} />
              </div>
              <strong>GROWTH STAGE {String(stage + 1).padStart(2, "0")} / 12</strong>
              <p>Every recent public commit advances the organism.</p>
            </div>
            <div className="commit-feed">
              <div className="commit-feed__summary">
                <strong>{activity.commitCount}</strong>
                <span>PUBLIC COMMITS DETECTED<br />IN THE CURRENT SIGNAL WINDOW</span>
              </div>
              <ol>
                {activity.pushes.slice(0, 5).map((push) => (
                  <li key={push.id}>
                    <span className="commit-seed" />
                    <div><strong>{push.repository}</strong><p>{push.message}</p></div>
                    <time dateTime={push.createdAt}>{relativeTime(push.createdAt)}</time>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      );
    }
  }
}

function ArchiveWindow({
  active,
  onClose,
  open,
  activity,
}: {
  active: "about" | AppKey;
  onClose: () => void;
  open: (app: AppKey) => void;
  activity: ActivityState;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => setPosition({ x: 0, y: 0 }), [active]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const maxX = window.innerWidth * 0.3;
    const maxY = window.innerHeight * 0.22;
    setPosition({
      x: Math.max(-maxX, Math.min(maxX, drag.current.originX + event.clientX - drag.current.x)),
      y: Math.max(-maxY, Math.min(maxY, drag.current.originY + event.clientY - drag.current.y)),
    });
  };

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  const application = applications.find((item) => item.id === active);
  const title = active === "about" ? "OPERATOR_PROFILE.SYS" : `${application?.code}.EXE`;

  return (
    <section
      className={`os-window os-window--${active}`}
      style={{ "--window-x": `${position.x}px`, "--window-y": `${position.y}px` } as CSSProperties}
      aria-label={active === "about" ? "About Elena Chrysaki" : application?.title}
    >
      <div
        className="window-bar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <span className="window-bar__signal" aria-hidden="true" />
        <strong>{title}</strong>
        <span className="window-bar__path">A:\\ARCHIVE\\{active.toUpperCase()}</span>
        <div className="window-controls">
          <button onClick={onClose} aria-label="Minimize window">_</button>
          <button onClick={onClose} aria-label="Close window">×</button>
        </div>
      </div>
      <div className="window-content">
        {active === "about" ? <AboutPanel open={open} /> : <ApplicationPanel app={active} activity={activity} />}
      </div>
      <div className="window-status">
        <span>ARCHIVE NODE 17</span>
        <span>DRAG WINDOW // ESC TO CLOSE</span>
      </div>
    </section>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>("off");
  const [active, setActive] = useState<"about" | AppKey | null>(null);
  const [sound, setSound] = useState(false);
  const [clock, setClock] = useState(new Date());
  const audioContext = useRef<AudioContext | null>(null);
  const activity = useLiveActivity();

  const beep = useCallback(
    (frequency = 520, length = 0.06) => {
      if (!sound) return;
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + length);
    },
    [sound],
  );

  const boot = useCallback(() => {
    if (mode !== "off") return;
    setMode("booting");
    beep(180, 0.12);
    window.setTimeout(() => {
      setMode("desktop");
      setActive("about");
    }, 2200);
  }, [beep, mode]);

  const openApp = useCallback(
    (app: AppKey) => {
      beep(660, 0.045);
      setActive(app);
    },
    [beep],
  );

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (mode === "off" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        boot();
        return;
      }
      if (mode !== "desktop") return;
      if (event.key === "Escape") {
        setActive(null);
        return;
      }
      const selected = applications.find((item) => item.hotkey === event.key);
      if (selected) openApp(selected.id);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [boot, mode, openApp]);

  const timeLabel = useMemo(
    () => clock.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
    [clock],
  );

  return (
    <main className={`archive archive--${mode}`}>
      <a className="skip-link" href="#archive-window">Skip to archive window</a>

      {mode !== "desktop" && (
        <section className="terminal-stage" aria-label="Field terminal power screen">
          <div className="terminal-machine">
            <img src="./assets/field-terminal.png" alt="An overgrown dystopian field computer with a cracked display" />
            {mode === "off" && (
              <>
                <button className="power-hitbox" onClick={boot} aria-label="Boot the field terminal">
                  <span />
                </button>
                <div className="terminal-label">ELENA.OS // FIELD UNIT 17-B</div>
              </>
            )}
          </div>
          <div className="terminal-stage__shadow" />
          {mode === "off" ? (
            <>
              <button className="boot-callout" onClick={boot}>
                <span className="boot-callout__light" />
                PRESS POWER TO ENTER
                <small>or press Enter</small>
              </button>
            </>
          ) : (
            <div className="boot-sequence" role="status" aria-live="polite">
              <strong>ELENA.OS</strong>
              {bootLines.map((line, index) => (
                <span key={line} style={{ animationDelay: `${index * 0.28}s` }}>{line}</span>
              ))}
              <i />
            </div>
          )}
        </section>
      )}

      {mode === "desktop" && (
        <section className="desktop-shell">
          <img className="city-background" src="./assets/archive-city.png" alt="" />
          <div className="rain-layer" aria-hidden="true" />
          <div className="crt-overlay" aria-hidden="true" />

          <header className="system-bar">
            <button className="system-home" onClick={() => setActive("about")} aria-label="Open operator profile">
              <span>EC</span>
              ELENA.OS
            </button>
            <div className="system-status">
              <span className="status-pip" />
              ARCHIVE ONLINE
              <span className="system-status__divider">//</span>
              NODE 17-B
            </div>
            <div className="system-actions">
              <a href="https://github.com/elchrysaki" target="_blank" rel="noreferrer">GITHUB ↗</a>
              <button
                className={sound ? "is-active" : ""}
                onClick={() => setSound((value) => !value)}
                aria-label={sound ? "Turn sound off" : "Turn sound on"}
              >
                {sound ? "SOUND ON" : "SOUND OFF"}
              </button>
              <time>{timeLabel}</time>
              <button
                className="shutdown"
                onClick={() => {
                  setMode("off");
                  setActive(null);
                }}
                aria-label="Shut down archive"
              >
                ⏻
              </button>
            </div>
          </header>

          <nav className="app-dock" aria-label="Archive applications">
            {applications.map((application) => (
              <button
                key={application.id}
                className={active === application.id ? "is-open" : ""}
                onClick={() => openApp(application.id)}
                aria-label={`Open ${application.title}`}
                aria-pressed={active === application.id}
              >
                <AppIcon index={application.sprite} small />
                <span>{application.code}</span>
                <kbd>{application.hotkey}</kbd>
              </button>
            ))}
          </nav>

          {active && (
            <div id="archive-window">
              <ArchiveWindow active={active} onClose={() => setActive(null)} open={openApp} activity={activity} />
            </div>
          )}

          {!active && (
            <button className="desktop-message" onClick={() => setActive("about")}>
              <strong>NO WINDOW ACTIVE</strong>
              <span>Select an archive application or reopen the operator profile.</span>
            </button>
          )}

          <button className="roaming-pet" onClick={() => openApp("companion")} aria-label="Open Companion.exe">
            <AppIcon index={6} small />
          </button>

          <footer className="system-footer">
            <span>1—8 OPEN APPS</span>
            <span>DRAG WINDOWS</span>
            <span>ESC CLOSES</span>
            <a href="mailto:helenachrysaki@gmail.com">CONTACT OPERATOR ↗</a>
          </footer>
        </section>
      )}
    </main>
  );
}

export default App;

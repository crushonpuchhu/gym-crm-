"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowUpRight, Check, Copy, Pause, Play, Volume2, VolumeX } from "lucide-react";
import {
  beyond,
  brand,
  contact,
  customers,
  milestones,
  modules,
  nav,
  product,
  stats,
  work,
} from "./content";
import { createWorld, type World } from "./world";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "./landing.css";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function Split({
  text,
  className,
  fill = false,
}: {
  text: string;
  className?: string;
  fill?: boolean;
}) {
  let index = 0;
  return (
    <span className={className} aria-label={text} data-fill={fill ? "1" : undefined}>
      {text.split(" ").map((word, w) => (
        <Fragment key={`${word}-${w}`}>
          <span className="w" aria-hidden="true">
            {Array.from(word).map((char) => (
              <span
                className="c"
                key={`${char}-${index}`}
                style={{ ["--i" as string]: index++ }}
              >
                {char}
              </span>
            ))}
          </span>
          {w < text.split(" ").length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

function MilestoneIcon({ kind }: { kind: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "layers") {
    return (
      <svg viewBox="0 0 84 72" aria-hidden="true" {...common}>
        <rect x="10" y="10" width="64" height="16" />
        <rect x="10" y="30" width="64" height="16" />
        <rect x="10" y="50" width="64" height="14" />
        <path d="M18 18h6M18 38h6M18 57h6" />
      </svg>
    );
  }
  if (kind === "board") {
    return (
      <svg viewBox="0 0 84 72" aria-hidden="true" {...common}>
        <rect x="8" y="8" width="68" height="56" />
        <path d="M31 8v56M54 8v56" />
        <rect x="13" y="16" width="13" height="10" />
        <rect x="36" y="16" width="13" height="18" />
        <rect x="59" y="16" width="12" height="8" />
        <rect x="36" y="40" width="13" height="12" />
      </svg>
    );
  }
  if (kind === "flow") {
    return (
      <svg viewBox="0 0 84 72" aria-hidden="true" {...common}>
        <circle cx="14" cy="18" r="6" />
        <circle cx="42" cy="36" r="6" />
        <circle cx="70" cy="54" r="6" />
        <path d="M20 20l16 12M48 38l16 12M14 24v34h22" />
      </svg>
    );
  }
  if (kind === "spark") {
    return (
      <svg viewBox="0 0 84 72" aria-hidden="true" {...common}>
        <path d="M42 6l7 25 25 7-25 7-7 25-7-25-25-7 25-7z" />
        <path d="M64 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 84 72" aria-hidden="true" {...common}>
      <path d="M42 6l26 10v18c0 16-11 27-26 32-15-5-26-16-26-32V16z" />
      <path d="M31 36l8 8 16-16" />
    </svg>
  );
}

function VideoPanel() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [time, setTime] = useState("0:00 / 0:00");
  const [duration, setDuration] = useState(0);

  const format = (value: number) => {
    const total = Math.max(0, Math.floor(value || 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };

  const sync = () => {
    const el = video.current;
    if (!el) return;
    const d = el.duration || 0;
    const p = d ? el.currentTime / d : 0;
    setProgress(p);
    setDuration(d);
    setTime(`${format(el.currentTime)} / ${format(d)}`);
  };

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    el.addEventListener("timeupdate", sync);
    el.addEventListener("loadedmetadata", sync);
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    return () => {
      el.removeEventListener("timeupdate", sync);
      el.removeEventListener("loadedmetadata", sync);
    };
  }, []);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  return (
    <figure className="prod-shot">
      <div className={`prod-vid${playing ? " playing" : ""}`} id="prod-vid">
        <video
          ref={video}
          src={product.video}
          poster={product.poster}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onClick={toggle}
        />
        <button
          type="button"
          className="prod-big"
          onClick={toggle}
          aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}
        >
          <Play size={26} fill="currentColor" />
        </button>
      </div>
      <div className="prod-bar">
        <button
          type="button"
          className="prod-ic"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(progress * 1000)}
          onChange={(event) => {
            const el = video.current;
            const next = Number(event.target.value) / 1000;
            setProgress(next);
            if (el?.duration) el.currentTime = next * el.duration;
          }}
          aria-label="Video timeline"
          style={{ ["--pct" as string]: `${(progress * 100).toFixed(2)}%` }}
        />
        <span className="prod-time">{time}</span>
        <button
          type="button"
          className="prod-ic"
          onClick={() => {
            const el = video.current;
            if (!el) return;
            el.muted = !el.muted;
            setMuted(el.muted);
          }}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={!muted}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
      <figcaption className="prod-meta mono">
        {product.meta}
        {duration > 0 ? ` · ${format(duration)}` : ""}
      </figcaption>
    </figure>
  );
}

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    worldRef.current = createWorld(root);
    return () => {
      worldRef.current?.destroy();
      worldRef.current = null;
    };
  }, []);

  const go = useCallback((id: string) => {
    setMenuOpen(false);
    const world = worldRef.current;
    if (world) {
      world.goTo(id);
      return;
    }
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const range = document.createRange();
      const node = document.getElementById("ct-mail");
      if (node) {
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  const customer = active === null ? null : customers[active];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="sfx" ref={rootRef}>
        <header className="sf-bar">
          <button
            className="mark"
            type="button"
            onClick={() => go("hero")}
            aria-label={`${brand.first}${brand.second} — back to start`}
          >
            {brand.first}
            <span>{brand.second}</span>
          </button>
          <div className="bar-right">
            <a className="bar-link mono" href="/login">
              Sign in
            </a>
            <button
              className="burger"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="sf-menu"
              onClick={() => setMenuOpen(true)}
            >
              <span className="mono">Menu</span>
              <i aria-hidden="true" />
            </button>
          </div>
        </header>

        <canvas id="cv" aria-hidden="true" />

        <main className="world">
          <section
            className="st"
            id="hero"
            data-label="Home"
            data-gap="0"
            data-hold=".45"
            data-a="0.455,0.0"
            data-ma="0.46,-0.04"
          >
            <div className="el" data-p="0,-0.06" data-mp="0,-0.06" data-z="0" data-f="0,0.05">
              <h1 className="d bb h-name intro split">
                <Split text={`${brand.first} ${brand.second}`} />
              </h1>
            </div>
            <div
              className="el"
              data-p="-0.31,0.34"
              data-mp="-0.02,0.24"
              data-z="-.12"
              data-f="-.1,.1"
            >
              <div className="h-cap">
                <span className="mono">{brand.kicker}</span>
                <p className="lede">{brand.lede}</p>
              </div>
            </div>
            <div
              className="el"
              data-p="0.4,0.36"
              data-mp="0.3,0.38"
              data-z="-.2"
              data-f="0,0"
            >
              <button
                type="button"
                className="h-cue"
                onClick={() => go("about")}
                aria-label="Scroll to explore"
              >
                <i aria-hidden="true" />
                <span className="mono">
                  Scroll <span className="cue-x">to explore</span>
                </span>
              </button>
            </div>
          </section>

          <section
            className="st"
            id="about"
            data-label="About"
            data-gap="3.2"
            data-hold=".85"
            data-a="-0.06,-0.36"
            data-ma="0.38,-0.36"
          >
            <div
              className="el"
              data-p="-0.15,0.02"
              data-mp="0,-0.19"
              data-z=".35"
              data-f="-.35,.05"
              data-r="28"
            >
              <figure className="ab-fig pose">
                <img
                  src="/media/pose-dither.png"
                  alt="Portrait of a GymFlow membership advisor"
                  width={720}
                  height={1350}
                />
              </figure>
            </div>
            <div
              className="el"
              data-p="0.15,-0.06"
              data-mp="0,0.2"
              data-z="-.08"
              data-f=".3,0"
              data-r="-22"
            >
              <div className="ab-txt">
                <span className="mono">About</span>
                <p className="d bb ab-big split">
                  <Split text="One platform. Every club." />
                </p>
                <p className="lede">
                  GymFlow is a multi-tenant member CRM for gym brands. Prospects, members,
                  membership contracts, check-ins, tickets and reports share one record set,
                  so the front desk, the advisors and the owner read the same numbers. Built
                  for clubs that sell memberships and for the people who report on retention.
                </p>
              </div>
            </div>
          </section>

          <section
            className="st"
            id="numbers"
            data-dark="1"
            data-label="By the numbers"
            data-gap="3"
            data-hold=".7"
            data-a="0,0.36"
            data-ma="-0.4,0.42"
          >
            <div
              className="el"
              data-p="-0.3,-0.04"
              data-mp="-0.12,-0.27"
              data-z=".55"
              data-f="-.2,-.1"
            >
              <div className="num">
                <span className="mono">{stats[0].label}</span>
                <p className="d t1">{stats[0].value}</p>
              </div>
            </div>
            <div
              className="el"
              data-p="0.04,0.12"
              data-mp="0.08,0.0"
              data-z="0"
              data-f="0,.15"
            >
              <div className="num">
                <span className="mono">{stats[1].label}</span>
                <p className="d b7">
                  <span data-count-to={stats[1].countTo}>{stats[1].value}</span>
                  {stats[1].suffix}
                </p>
              </div>
            </div>
            <div
              className="el"
              data-p="0.33,-0.14"
              data-mp="-0.12,0.27"
              data-z="-.22"
              data-f=".25,-.1"
            >
              <div className="num">
                <span className="mono">{stats[2].label}</span>
                <p className="d t1">
                  {stats[2].value}
                  <span className="pct">{stats[2].suffix}</span>
                </p>
              </div>
            </div>
          </section>

          <section
            className="st"
            id="journey"
            data-label="Journey"
            data-gap="3"
            data-hold=".5"
            data-a="0,0.3"
            data-ma="-0.38,0.3"
          >
            <div className="el" data-p="0,-0.06" data-mp="0,-0.08" data-z="0" data-f="0,.1">
              <p className="d bb jr-h split">
                <Split text="The journey" fill />
              </p>
            </div>
            <div
              className="el"
              data-p="0.12,0.15"
              data-mp="0.05,0.12"
              data-z="-.15"
              data-f=".1,0"
            >
              <p className="d bb jr-sub">so far</p>
            </div>
          </section>

          {milestones.map((milestone, index) => {
            const flip = index % 2 === 1;
            return (
              <section
                className="st ms-st"
                id={`ms-${index + 1}`}
                key={milestone.year}
                data-label="Journey"
                data-gap="1.35"
                data-hold=".32"
                data-ease=".55"
                data-a="0,0.3"
                data-ma="-0.38,-0.03"
              >
                <div
                  className="el"
                  data-p="0,0.3"
                  data-mp="-0.38,-0.03"
                  data-z="0"
                  data-f="0,0"
                >
                  <i className="node" aria-hidden="true" />
                </div>
                <div
                  className="el"
                  data-p={flip ? "0.2,-0.05" : "-0.2,-0.05"}
                  data-mp="0.08,-0.12"
                  data-z=".25"
                  data-f="0.25,0"
                >
                  <p className="d yr">{milestone.year}</p>
                </div>
                <div
                  className="el"
                  data-p={flip ? "-0.2,0.04" : "0.2,0.04"}
                  data-mp="0.08,0.165"
                  data-z="-.1"
                  data-f="-0.2,0"
                >
                  <div className="ms">
                    <span className="mono">{milestone.tag}</span>
                    <div className="ms-row">
                      <span className="ms-icon">
                        <MilestoneIcon kind={milestone.icon} />
                      </span>
                      <p>{milestone.text}</p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          <section
            className="st"
            id="beyond"
            data-label="Beyond the pipeline"
            data-gap="1.8"
            data-hold=".85"
            data-a="0,0.44"
            data-ma="-0.44,0.42"
          >
            <div
              className="el"
              data-p="-0.27,-0.02"
              data-mp="-0.24,-0.22"
              data-z=".2"
              data-f="-.2,0"
              data-r="12"
            >
              <figure className="beyond-fig">
                <img src={beyond.image} alt="A sales team reviewing a pipeline together" />
              </figure>
            </div>
            <div
              className="el"
              data-p="0.13,0.02"
              data-mp="0,0.05"
              data-z="-.05"
              data-f=".15,0"
            >
              <div className="beyond">
                <span className="mono">Beyond the pipeline</span>
                {beyond.lines.map((line, index) => (
                  <p
                    className={`d ${index === beyond.lines.length - 1 ? "beyond-acc" : ""}`}
                    key={line}
                  >
                    {line}
                  </p>
                ))}
                <p className="small">{beyond.note}</p>
              </div>
            </div>
          </section>

          <section
            className="st svc-st"
            id="services"
            data-dark="1"
            data-label="What it does"
            data-gap="3"
            data-hold="1.1"
            data-a="0.46,-0.21"
            data-ma="0.46,-0.25"
          >
            <div className="el" data-p="0,-0.33" data-mp="0,-0.37" data-z=".35" data-f="0,-.1">
              <p className="d bb svc-h split">
                <Split text="What it does" />
              </p>
            </div>
            {modules.map((module) => (
              <div
                className="el"
                key={module.name}
                data-p={`${module.x},${module.y}`}
                data-mp={`${module.mx},${module.my}`}
                data-mz={module.mz}
                data-z={module.z}
                data-f="0,0"
                data-abs="1"
              >
                <button className="svc-star" type="button" aria-label={`${module.name} features`}>
                  <span className="d svc-nm">{module.name}</span>
                  <span className="svc-det">
                    {module.detail.map((detail) => (
                      <span key={detail}>{detail}</span>
                    ))}
                  </span>
                </button>
              </div>
            ))}
          </section>

          <section
            className="st"
            id="work"
            data-label="Customers"
            data-gap="3"
            data-hold=".55"
            data-a="0.4,0.26"
            data-ma="0.4,0.3"
          >
            <div
              className="el"
              data-p="-0.12,-0.13"
              data-mp="-0.05,-0.064"
              data-z=".3"
              data-f="-.15,0"
            >
              <p className="d bb wk-h split">
                <Split text={work.heading1} />
              </p>
            </div>
            <div
              className="el"
              data-p="0.14,0.11"
              data-mp="0.04,0.064"
              data-z="0"
              data-f=".15,0"
            >
              <p className="d bb wk-h split">
                <Split text={work.heading2} />
              </p>
            </div>
            <div
              className="el"
              data-p="-0.3,0.4"
              data-mp="0,0.3"
              data-z="-.15"
              data-f="0,0"
            >
              <span className="mono">{work.note}</span>
            </div>
          </section>

          {customers.map((entry, index) => {
            const left = index % 2 === 0;
            const shapes = [
              { w: "clamp(260px,30vw,560px)", ar: "4/3", ax: 0.05, ay: 0.3 },
              { w: "clamp(260px,30vw,560px)", ar: "4/3", ax: -0.02, ay: -0.3 },
              { w: "clamp(280px,34vw,640px)", ar: "16/9", ax: 0.26, ay: 0.34 },
              { w: "clamp(280px,34vw,640px)", ar: "16/9", ax: 0, ay: 0.32 },
              { w: "clamp(230px,25vw,460px)", ar: "3/2", ax: 0.04, ay: -0.3 },
              { w: "clamp(230px,25vw,460px)", ar: "3/2", ax: -0.12, ay: 0.36 },
            ];
            const shape = shapes[index];
            return (
              <section
                className="st"
                id={`work-${index + 1}`}
                key={entry.name}
                data-label="Customers"
                data-gap={index ? "1.55" : "2.2"}
                data-hold=".38"
                data-ease=".5"
                data-a={`${shape.ax},${shape.ay}`}
                data-ma={`${left ? -0.43 : 0.43},0.36`}
              >
                <div
                  className="el"
                  data-p={`${left ? -0.22 : 0.21},${index % 2 ? 0.05 : -0.02}`}
                  data-mp="0,-0.02"
                  data-z="0"
                  data-f={`${left ? -0.25 : 0.25},0`}
                  data-r={left ? 18 : -18}
                >
                  <button
                    type="button"
                    className={`card ${left ? "l" : "r"}`}
                    style={{ width: shape.w }}
                    onClick={() => setActive(index)}
                    aria-label={`Open ${entry.name} customer story`}
                  >
                    <span className="fig" style={{ ["--ar" as string]: shape.ar }}>
                      <img src={entry.cover} alt={`${entry.name} team`} loading="lazy" />
                    </span>
                    <span className="meta">
                      <span className="mono">
                        {String(index + 1).padStart(2, "0")} / 06
                      </span>
                      <span className="mono">{entry.industry}</span>
                    </span>
                    <span className="d card-title">{entry.name}</span>
                    <span className="small">{entry.summary}</span>
                    <span className="open mono">
                      Read story
                      <i aria-hidden="true" />
                    </span>
                  </button>
                </div>
              </section>
            );
          })}

          <section id="product" aria-label="The product">
            <div className="panel">
              <div className="prod-in">
                <div className="prod-copy">
                  <div className="prod-top fly">
                    <span className="prod-badge">The product</span>
                    <span className="prod-logo">
                      {brand.first}
                      <span>{brand.second}</span>
                    </span>
                  </div>
                  <h2 className="prod-h fly">
                    {product.headline[0]} <em>{product.headline[1]}</em>
                  </h2>
                  <p className="prod-body fly">{product.body}</p>
                  <div className="prod-acts fly">
                    <a className="prod-cta" href={product.cta.href}>
                      {product.cta.label}
                    </a>
                    <div className="prod-steps">
                      {product.steps.map((step) => (
                        <span key={step}>{step}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="fly">
                  <VideoPanel />
                </div>
              </div>
            </div>
          </section>

          <section
            className="st"
            id="product-stop"
            data-label="The product"
            data-gap="3"
            data-hold="3.1"
            data-ease="1"
            data-a="0,0"
            data-ma="0,0"
            data-product="1"
          />

          <section
            className="st"
            id="contact"
            data-label="Contact"
            data-gap="3.4"
            data-hold="1.2"
            data-ease="1"
            data-a="0.44,-0.07"
            data-ma="0.47,-0.07"
            data-end="1"
          >
            <div className="el" data-p="0,-0.06" data-mp="0,-0.06" data-z="0" data-f="0,0">
              <div className="ct-wrap">
                <h2 className="d bb ct-one split">
                  <Split text={contact.headline} />
                </h2>
              </div>
            </div>
            <div
              className="el"
              data-p="0,0.13"
              data-mp="0,0.1"
              data-z="-.12"
              data-f="0,.1"
            >
              <div className="ct-row">
                <span className="ct-mail" id="ct-mail">
                  {contact.email}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ct-copy"
                      onClick={copyEmail}
                      aria-live="polite"
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy email"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copies {contact.email}</TooltipContent>
                </Tooltip>
                <Button asChild size="sm" className="ct-cta">
                  <a href={contact.links[0].href}>
                    {contact.links[0].label}
                    <ArrowUpRight size={14} />
                  </a>
                </Button>
              </div>
            </div>
            <div
              className="el"
              data-p="0,0.36"
              data-mp="0,0.34"
              data-z="-.2"
              data-f="0,.1"
            >
              <div className="ct-foot mono">
                {contact.links.slice(1).map((link) => (
                  <a href={link.href} key={link.label}>
                    {link.label}
                  </a>
                ))}
                <span>{contact.copyright}</span>
              </div>
            </div>
          </section>
        </main>

        <div id="spacer" aria-hidden="true" />


        <div id="hud" className="mono" aria-hidden="true">
          <div className="trk">
            <i />
          </div>
          <div id="hud-ticks" />
          <i className="hd" />
          <div className="lb">
            <span id="hud-n">01</span>
            <b id="hud-l">Home</b>
          </div>
        </div>

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogContent className="sf-menu" hideClose>
            <DialogTitle className="sr-only">Main menu</DialogTitle>
            <DialogDescription className="sr-only">
              Jump to a section of the GymFlow landing page.
            </DialogDescription>
            <div className="menu-head">
              <span className="mark">
                {brand.first}
                <span>{brand.second}</span>
              </span>
              <DialogClose className="burger close" aria-label="Close menu">
                <span className="mono">Close</span>
                <i aria-hidden="true" />
              </DialogClose>
            </div>
            <nav id="sf-menu" aria-label="Main">
              <ol>
                {nav.map((item) => (
                  <li key={item.label}>
                    <button type="button" onClick={() => go(item.target)}>
                      <span className="mono">{item.n}</span>
                      <span className="d">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="menu-sub mono">
              <a href="/login">Sign in</a>
              <a href="/register">Create workspace</a>
              <a href={contact.email ? `mailto:${contact.email}` : "#contact"}>
                {contact.email}
              </a>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
          <DialogContent className="story">
            {customer && (
              <>
                <DialogTitle className="story-title">{customer.name}</DialogTitle>
                <DialogDescription className="story-summary">
                  {customer.summary}
                </DialogDescription>
                <div className="story-grid">
                  <div className="story-media">
                    <img src={customer.cover} alt={`${customer.name} team`} />
                    <div className="story-meta mono">
                      <span>{customer.industry}</span>
                      <span>{customer.seats}</span>
                    </div>
                  </div>
                  <div className="story-body">
                    <div>
                      <span className="story-label">Challenge</span>
                      <p>{customer.challenge}</p>
                    </div>
                    <div>
                      <span className="story-label">What changed</span>
                      <p>{customer.change}</p>
                    </div>
                    <div className="story-metrics">
                      {customer.metrics.map((metric) => (
                        <div key={metric.label}>
                          <span className="story-label">{metric.label}</span>
                          <b>{metric.value}</b>
                        </div>
                      ))}
                    </div>
                    <div className="story-modules">
                      {customer.modules.map((module) => (
                        <span key={module}>{module}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="story-foot">
                  <Button asChild size="sm">
                    <a href="/login">
                      Open the demo workspace
                      <ArrowUpRight size={14} />
                    </a>
                  </Button>
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">
                      Back to stories
                    </Button>
                  </DialogClose>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

(function () {
  "use strict";

  const cfg = window.WEDDING_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const html = document.documentElement;

  /* ---------------------------------------------------------------
     The invitation: seal gives, flap opens, envelope slips away, scene appears
  --------------------------------------------------------------- */
  const invite = $("#invite");
  const behind = $$("header, main, footer");
  const revealHero = () => {
    html.classList.add("is-revealed");
    html.classList.remove("invite-lock");
    behind.forEach((el) => el.removeAttribute("inert"));
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "auto" });
  };

  /* A little music with the envelope: the first bars of "Sunsetz", swelling as the flap lifts,
     settling low as the valley appears, and fading away on its own. Web Audio does the fades
     (iPhones ignore element volume); if it is unavailable the clip simply plays with its own fades. */
  const audio = $("#inviteAudio");
  const chip = $("#musicChip");
  let actx = null, gain = null;
  const music = {
    ramp(v, s) {
      if (gain && actx) {
        const t = actx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(v, t + s);
      } else if (audio) {
        try { audio.volume = v; } catch (e) { /* iOS */ }
      }
    },
    started: false,
    start() {
      if (!audio) return;
      this.started = true;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        const tapped = !navigator.userActivation || navigator.userActivation.isActive;
        // iPhones and iPads mute Web Audio when the ringer is on silent, but let plain media play: skip the fades there.
        const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (AC && !actx && tapped && !ios) {
          actx = new AC();
          gain = actx.createGain();
          gain.gain.value = 0;
          actx.createMediaElementSource(audio).connect(gain).connect(actx.destination);
        }
        if (actx && actx.state === "suspended") actx.resume();
      } catch (e) { actx = null; gain = null; }
      try { audio.currentTime = 0; } catch (e) { /* not loaded yet */ }
      const p = audio.play();
      if (p && p.catch) p.catch(() => {      // no tap yet, so the browser refuses: offer a ♪ button after the reveal
        this.started = false;
        if (chip) { chip.hidden = false; }
      });
      if (chip) chip.hidden = true;
      this.ramp(0.7, 1.8);                   // swells as the seal gives and the flap lifts
    },
    settle() { this.ramp(0.32, 3); },        // eases down as the valley appears, then the clip's own fade ends it
    stop(s = 0.6) { if (!audio) return; this.ramp(0, s); setTimeout(() => audio.pause(), s * 1000 + 60); }
  };

  if (invite && html.classList.contains("has-invite")) {
    html.classList.add("invite-lock");
    behind.forEach((el) => el.setAttribute("inert", ""));
    invite.focus({ preventScroll: true });
    if (audio) { audio.src = "media/music/sunsetz-intro.mp3"; audio.preload = "auto"; audio.load(); }
    document.addEventListener("visibilitychange", () => { if (document.hidden) music.stop(0.3); });
    // The first touch anywhere unlocks sound (a silent play/pause), so an envelope that opens by itself can still sing.
    const unlock = () => {
      ["pointerdown", "touchstart", "keydown"].forEach((t) => document.removeEventListener(t, unlock, true));
      if (!audio || music.started) return;
      audio.muted = true;
      const p = audio.play();
      if (p && p.then) p.then(() => {
        if (!music.started) { audio.pause(); try { audio.currentTime = 0; } catch (e) { /* fine */ } }
        audio.muted = false;
      }).catch(() => { audio.muted = false; });
    };
    ["pointerdown", "touchstart", "keydown"].forEach((t) => document.addEventListener(t, unlock, true));
    chip?.addEventListener("click", () => { music.start(); music.settle(); });
    audio?.addEventListener("ended", () => { if (chip) chip.hidden = true; });
    const env = $("#env");
    let opened = false;
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finish = () => {
      invite.classList.add("is-done");
      revealHero();
      music.settle();
      later(() => invite.remove(), 1100);
    };
    const open = () => {
      if (opened) return;
      opened = true;
      music.start();
      invite.classList.add("is-opening");
      env.classList.add("is-open");                      // the seal gives, the flap lifts, the inside shows
      later(() => env.classList.add("is-out"), 950);     // the envelope slips away, the card lifts
      later(() => env.classList.add("is-zoom"), 4300);   // after a proper look at it, the card comes towards you
      later(finish, 4650);                               // and the valley appears behind it
    };
    const skip = () => {
      timers.forEach(clearTimeout);
      timers = [];
      opened = true;
      music.stop();
      invite.classList.add("is-done");
      revealHero();
      setTimeout(() => invite.remove(), 1000);
    };
    $("#seal")?.addEventListener("click", (e) => { e.stopPropagation(); open(); });
    $("#inviteSkip")?.addEventListener("click", (e) => { e.stopPropagation(); skip(); });
    invite.addEventListener("click", () => { if (!opened) open(); });
    document.addEventListener("keydown", (e) => {
      if (!invite.isConnected) return;
      if (e.key === "Escape") { skip(); return; }
      // Focused controls (seal, Skip) activate natively through their click handlers.
      if (e.target instanceof Element && e.target.closest("button, a, input, select, textarea")) return;
      if ((e.key === "Enter" || e.key === " ") && !opened) { e.preventDefault(); open(); }
    });
    later(open, reduceMotion ? 8000 : 3800); // open by itself if nobody taps (longer when motion is reduced, since it opens without animation)
  } else {
    revealHero();
  }

  /* ---------------------------------------------------------------
     Hero parallax (desktop only): the valley drifts slower than the page
  --------------------------------------------------------------- */
  const heroArt = $(".hero__art");
  const fine = window.matchMedia("(min-width: 761px) and (pointer: fine)").matches;
  if (heroArt && fine && !reduceMotion) {
    let raf = false;
    const move = () => {
      raf = false;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.2) return;
      heroArt.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
    };
    window.addEventListener("scroll", () => { if (!raf) { raf = true; requestAnimationFrame(move); } }, { passive: true });
  }

  /* ---------------------------------------------------------------
     Counting down to the 27th
  --------------------------------------------------------------- */
  const countdown = $("#countdown");
  const daysToGo = (() => {
    const target = new Date("2027-01-27T00:00:00+05:30");
    return Math.ceil((target - Date.now()) / 864e5);
  })();
  function countdownText(n) {
    if (n > 1) return `${n} days to go`;
    if (n === 1) return "Tomorrow";
    if (n >= -2) return "It’s happening";
    return "27–28 January 2027";
  }
  if (countdown) countdown.textContent = countdownText(daysToGo);
  function tickCountdown() {
    if (!countdown || daysToGo <= 1 || reduceMotion) return;
    const start = performance.now();
    const dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      countdown.textContent = `${Math.round(daysToGo * eased)} days to go`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------------
     Navigation: appears once the hero scrolls away
  --------------------------------------------------------------- */
  const nav = $("#nav");
  const hero = $(".hero");
  const navToggle = $("#navToggle");

  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver(
      ([entry]) => {
        nav.classList.toggle("is-visible", entry.intersectionRatio < 0.35);
        hero.classList.toggle("is-away", !entry.isIntersecting);
      },
      { threshold: [0, 0.35, 1] }
    ).observe(hero);
  } else {
    nav.classList.add("is-visible");
  }

  const menuIsOpen = () => nav.classList.contains("menu-open");
  const setMenu = (open) => { nav.classList.toggle("menu-open", open); navToggle?.setAttribute("aria-expanded", String(open)); };
  let menuScrollY = 0;
  navToggle?.addEventListener("click", () => { setMenu(!menuIsOpen()); menuScrollY = window.scrollY; });
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", (e) => { if (menuIsOpen() && !nav.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !menuIsOpen()) return;
    setMenu(false);
    if (nav.contains(document.activeElement)) navToggle?.focus();
  });
  window.addEventListener("scroll", () => { if (menuIsOpen() && Math.abs(window.scrollY - menuScrollY) > 24) setMenu(false); }, { passive: true });

  /* ---------------------------------------------------------------
     Section-head reveals (deliberately only on heads and art)
  --------------------------------------------------------------- */
  const reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            if (e.target.contains(countdown)) tickCountdown();
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------
     Days: an animated grid-row open/close
  --------------------------------------------------------------- */
  $$(".day").forEach((day) => {
    const summary = $(".day__summary", day);
    const content = $(".day__content", day);
    const sync = () => {
      const open = day.classList.contains("is-open");
      summary.setAttribute("aria-expanded", String(open));
      content.toggleAttribute("inert", !open);
      content.setAttribute("aria-hidden", String(!open));
    };
    summary.addEventListener("click", () => {
      day.classList.toggle("is-open");
      sync();
      // the timeline markers depend on layout that is now changing
      let n = 0;
      const tick = () => { updateTimeline(); if (n++ < 45) requestAnimationFrame(tick); };
      tick();
    });
    sync();
  });

  /* ---------------------------------------------------------------
     Wedding-day timeline: the line draws as you scroll
  --------------------------------------------------------------- */
  const timeline = $("#timeline");
  const tlLine = $(".timeline__line", timeline);
  const tlEvents = timeline ? $$(".event", timeline) : [];

  function updateTimeline() {
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    const focus = vh * 0.62; // the "now" line sits a little below centre
    const total = rect.height;
    const p = Math.min(1, Math.max(0, (focus - rect.top) / total));
    const past = tlEvents.map((ev) => reduceMotion || ev.getBoundingClientRect().top + 28 < focus); // read…
    tlLine.style.setProperty("--p", reduceMotion ? 1 : p.toFixed(4));                              // …then write
    tlEvents.forEach((ev, i) => ev.classList.toggle("is-past", past[i]));
  }
  // Only measure while the timeline is near the viewport
  let tlNear = !("IntersectionObserver" in window);
  if (timeline && !tlNear) {
    new IntersectionObserver(([e]) => { tlNear = e.isIntersecting; if (tlNear) updateTimeline(); }, { rootMargin: "25% 0px" }).observe(timeline);
  }
  let ticking = false;
  const onScroll = () => {
    if (ticking || !tlNear) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateTimeline();
      ticking = false;
    });
  };
  if (timeline && !reduceMotion) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
  updateTimeline();

  /* ---------------------------------------------------------------
     Forms: RSVP and notes → Google Apps Script (or demo mode)
  --------------------------------------------------------------- */
  const live = Boolean(cfg.SCRIPT_URL);

  async function send(payload) {
    if (!live) {
      await new Promise((r) => setTimeout(r, 700));
      return { ok: true, demo: true };
    }
    // text/plain avoids the CORS preflight that Apps Script can't answer.
    const res = await fetch(cfg.SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  }

  function wireForm({ form, button, status, thanks, type, validate, build, onSuccess }) {
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (button.getAttribute("aria-disabled") === "true") return;
      status.textContent = "";
      status.classList.remove("is-error");
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.ref_code) return; // honeypot
      const problem = validate(form, data);
      if (problem) {
        status.textContent = problem.message;
        status.classList.add("is-error");
        const f = problem.field;
        if (f) {
          f.setAttribute("aria-invalid", "true");
          f.setAttribute("aria-describedby", status.id);
          f.addEventListener("input", () => { f.removeAttribute("aria-invalid"); f.removeAttribute("aria-describedby"); }, { once: true });
          f.focus();
        }
        return;
      }
      button.setAttribute("aria-disabled", "true");
      button.classList.add("is-busy");
      status.textContent = "Sending…";
      try {
        const payload = Object.assign({ type, page: location.href, userAgent: navigator.userAgent }, build(form, data));
        const result = await send(payload);
        if (result && result.ok === false) throw new Error(result.error || "Something went wrong");
        form.classList.add("is-done");
        thanks.classList.add("is-visible");
        thanks.focus({ preventScroll: true });
        onSuccess?.(payload, result);
      } catch (err) {
        console.error(err);
        status.textContent = "That didn’t go through. Please try again in a moment.";
        status.classList.add("is-error");
      } finally {
        button.removeAttribute("aria-disabled");
        button.classList.remove("is-busy");
        if (!form.classList.contains("is-done")) status.textContent = status.textContent === "Sending…" ? "" : status.textContent;
      }
    });
  }

  // RSVP (with an optional note for the couple)
  wireForm({
    form: $("#rsvpForm"),
    button: $("#rsvpSubmit"),
    status: $("#rsvpStatus"),
    thanks: $("#rsvpThanks"),
    type: "rsvp",
    validate(form, d) {
      if (!d.name?.trim()) return { message: "Please tell us your name.", field: $("#rsvpName") };
      if (!d.phone?.trim()) return { message: "A phone number helps us reach you.", field: $("#rsvpPhone") };
      return null;
    },
    build(form, d) {
      return {
        name: d.name.trim(),
        phone: d.phone.trim(),
        guests: d.guests,
        details: d.details || "",
        wishes: (d.wishes || "").trim(),
      };
    },
    onSuccess(payload) {
      const first = payload.name.split(" ")[0];
      $("#rsvpThanksText").textContent = `We’ve got your reply, ${first}, and can’t wait to see you in Ajabgarh.`;
      // Show the note locally straight away; it appears for everyone once approved in the Sheet.
      if (payload.wishes) prependNote({ name: payload.name, message: payload.wishes });
    },
  });

  /* ---------------------------------------------------------------
     Guestbook wall
  --------------------------------------------------------------- */
  const wall = $("#wall");
  const track = $("#wallTrack");
  let notes = [];

  function noteEl(n, i, clone) {
    const art = document.createElement("article");
    art.className = "note note--" + (i % 3) + (clone ? " note--clone" : "");
    art.style.setProperty("--tilt", `${((i % 3) - 1) * 0.6}deg`);
    if (clone) art.setAttribute("aria-hidden", "true");
    const orn = document.createElement("span");
    orn.className = "note__orn";
    orn.setAttribute("aria-hidden", "true");
    orn.innerHTML = '<svg viewBox="0 0 60 14" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M2 7h18M40 7h18"/><path d="M30 2c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z"/><circle cx="30" cy="7" r="1.2" fill="currentColor" stroke="none"/></svg>';
    art.appendChild(orn);
    const p = document.createElement("p");
    p.textContent = n.message;
    const f = document.createElement("footer");
    f.textContent = n.name;
    art.append(p, f);
    return art;
  }

  function renderWall() {
    track.innerHTML = "";
    if (!notes.length) {
      const empty = document.createElement("p");
      empty.className = "wall__empty";
      empty.textContent = "Be the first to leave a note.";
      track.replaceWith(empty);
      empty.id = "wallTrack";
      return;
    }
    // ensure track exists (it may have been replaced by the empty state)
    let t = $("#wallTrack");
    if (!t.classList.contains("wall__track")) {
      const fresh = document.createElement("div");
      fresh.className = "wall__track";
      fresh.id = "wallTrack";
      t.replaceWith(fresh);
      t = fresh;
    }
    const list = notes.length < 4 ? notes.concat(notes, notes) : notes;
    list.forEach((n, i) => t.appendChild(noteEl(n, i, false)));
    list.forEach((n, i) => t.appendChild(noteEl(n, i, true)));
    t.style.setProperty("--dur", `${Math.max(40, list.length * 9)}s`);
  }

  function prependNote(n) {
    notes.unshift(n);
    renderWall();
  }

  async function loadNotes() {
    if (!live) {
      notes = Array.isArray(cfg.SAMPLE_NOTES) ? cfg.SAMPLE_NOTES.slice() : [];
      renderWall();
      return;
    }
    try {
      const res = await fetch(`${cfg.SCRIPT_URL}?type=notes&_=${Date.now()}`);
      const data = await res.json();
      notes = Array.isArray(data.notes) ? data.notes : [];
    } catch (err) {
      console.warn("Could not load notes", err);
      notes = [];
    }
    renderWall();
  }
  if (wall) loadNotes();
})();

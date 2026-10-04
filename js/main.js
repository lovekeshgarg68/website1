(function () {
  "use strict";

  const cfg = window.WEDDING_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------------------------------------------
     Navigation: appears once the hero scrolls away
  --------------------------------------------------------------- */
  const nav = $("#nav");
  const hero = $(".hero");
  const navToggle = $("#navToggle");

  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver(
      ([entry]) => nav.classList.toggle("is-visible", entry.intersectionRatio < 0.35),
      { threshold: [0, 0.35, 1] }
    ).observe(hero);
  } else {
    nav.classList.add("is-visible");
  }

  navToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  $$("#navLinks a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("menu-open");
      navToggle?.setAttribute("aria-expanded", "false");
    })
  );

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
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------
     Days: <details> with an animated grid-row open/close
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
    tlLine.style.setProperty("--p", reduceMotion ? 1 : p.toFixed(4));
    tlEvents.forEach((ev) => {
      const r = ev.getBoundingClientRect();
      ev.classList.toggle("is-past", reduceMotion || r.top + 28 < focus);
    });
  }
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateTimeline();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
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
      status.textContent = "";
      status.classList.remove("is-error");
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) return; // honeypot
      const problem = validate(form, data);
      if (problem) {
        status.textContent = problem.message;
        status.classList.add("is-error");
        problem.field?.focus();
        return;
      }
      button.disabled = true;
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
        status.textContent = "That didn't go through. Please try again, or message us directly.";
        status.classList.add("is-error");
      } finally {
        button.disabled = false;
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
      $("#rsvpThanksText").textContent = `We've got your reply, ${first}, and can't wait to see you in Ajabgarh.`;
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

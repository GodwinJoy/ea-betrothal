/* =====================================================================
   CONFIGURATION & CONSTANTS
===================================================================== */
const BETROTHAL_DATE_ISO = "2026-10-21T15:30:00+05:30"; // Wednesday, 21 Oct 2026, 3:00 PM IST
const BETROTHAL_TIMESTAMP = new Date(BETROTHAL_DATE_ISO).getTime();

const isMobile = window.innerWidth < 768;
const isSmallMobile = window.innerWidth < 480;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Low-end / constrained-network detection — used to further scale back
// decorative particle counts on top of the isMobile breakpoint, since a
// narrow viewport alone doesn't tell us whether the device is a
// mid/low-tier Android with a weak GPU.
const saveData = Boolean(navigator.connection && navigator.connection.saveData);
const isLowEndDevice = saveData
    || (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4)
    || (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4);

if (saveData) {
    document.documentElement.classList.add("save-data");
}

const gsapAvailable = typeof gsap !== "undefined";
if (gsapAvailable && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    // Fewer forced full-page recalculations; we don't rely on rapid
    // in-between refreshes anywhere in this codebase.
    ScrollTrigger.config({ ignoreMobileResize: true });
}

/* =====================================================================
   DOM REFERENCES
===================================================================== */
const dom = {
    body: document.body,
    intro: document.getElementById("intro"),
    enterBtn: document.getElementById("enterWebsite"),
    websiteContent: document.getElementById("websiteContent"),
    music: document.getElementById("bgMusic"),
    musicBtn: document.getElementById("musicToggle"),
    cursor: document.getElementById("custom-cursor"),
    follower: document.getElementById("cursor-follower"),
    flowerContainer: document.getElementById("flowerContainer"),
    flowerGlow: document.getElementById("flowerGlow"),
    scrollCircle: document.getElementById("scroll-circle"),
    scrollPercent: document.getElementById("scroll-percent"),
    petalCard: document.getElementById("petalRevealCard"),
    petalLayer: document.getElementById("petalLayer"),
    petalField: document.getElementById("petalField"),
    petalHint: document.getElementById("petalHint"),
    petalFallbackBtn: document.getElementById("petalRevealFallback"),
    saveDateContent: document.getElementById("saveDateContent"),
    countdownSection: document.getElementById("countdownSection"),
    countdownSrText: document.getElementById("countdownSrText"),
    days: document.getElementById("days"),
    hours: document.getElementById("hours"),
    minutes: document.getElementById("minutes"),
    seconds: document.getElementById("seconds"),

    countdownCelebration: document.getElementById("countdownCelebration"),
closeCountdownCelebration: document.getElementById("closeCountdownCelebration"),
celebrationEmblem: document.getElementById("celebrationEmblem"),
celebrationLabel: document.getElementById("celebrationLabel"),
celebrationTitle: document.getElementById("celebrationTitle"),
celebrationMessage: document.getElementById("celebrationMessage"),
celebrationDate: document.getElementById("celebrationDate"),
};

/* =====================================================================
   UTILITY FUNCTIONS
===================================================================== */
function pad(num) {
    return String(num).padStart(2, "0");
}

function safeGsapTo(target, vars) {
    if (!gsapAvailable) return;
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    gsap.to(el, vars);
}

/* =====================================================================
   BODY LOCK (released once the intro is dismissed)
===================================================================== */
dom.body.style.overflow = "hidden";

/* =====================================================================
   CUSTOM CURSOR — desktop, fine-pointer only, single rAF-driven loop
===================================================================== */
function initCustomCursor() {
    if (!dom.cursor || !dom.follower) return;
    if (isMobile || prefersReducedMotion || !hasFinePointer) return;

    dom.body.classList.add("has-fine-pointer");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    const setCursor = gsapAvailable ? gsap.quickSetter(dom.cursor, "css") : null;
    const followerX = gsapAvailable ? gsap.quickTo(dom.follower, "x", { duration: 0.3, ease: "power2.out" }) : null;
    const followerY = gsapAvailable ? gsap.quickTo(dom.follower, "y", { duration: 0.3, ease: "power2.out" }) : null;

    window.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (setCursor) {
            setCursor({ transform: `translate(${mouseX - 5}px, ${mouseY - 5}px)` });
        }
        if (followerX && followerY) {
            followerX(mouseX - 19);
            followerY(mouseY - 19);
        }
    }, { passive: true });

    window.addEventListener("mouseleave", () => {
        gsap.to([dom.cursor, dom.follower], { opacity: 0, duration: 0.3 });
    });

    window.addEventListener("mouseenter", () => {
        gsap.to([dom.cursor, dom.follower], { opacity: 1, duration: 0.3 });
    });
}

/* =====================================================================
   MUSIC CONTROLLER
===================================================================== */
const MusicController = (() => {
    let playing = false;
    let wasPlayingBeforeHidden = false;

    function updateButton() {
        if (!dom.musicBtn) return;
        dom.musicBtn.innerHTML = playing
            ? '<i class="fa-solid fa-pause" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-music" aria-hidden="true"></i>';
        dom.musicBtn.setAttribute("aria-pressed", String(playing));
        dom.musicBtn.setAttribute("aria-label", playing ? "Pause background music" : "Play background music");
    }

    function play() {
        if (!dom.music) return;
        dom.music.volume = 0.4;
        dom.music.play()
            .then(() => {
                playing = true;
                updateButton();
            })
            .catch((err) => {
                console.warn("Playback could not start automatically:", err);
            });
    }

    function pause() {
        if (!dom.music) return;
        dom.music.pause();
        playing = false;
        updateButton();
    }

    function toggle() {
        playing ? pause() : play();
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            wasPlayingBeforeHidden = playing;
            if (playing) dom.music.pause();
        } else if (wasPlayingBeforeHidden) {
            play();
        }
    }

    function init() {
        if (!dom.music || !dom.musicBtn) return;
        dom.musicBtn.addEventListener("click", toggle);
        document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return { init, play, pause, isPlaying: () => playing };
})();

/* =====================================================================
   INTRO INITIALIZATION
===================================================================== */
function initIntroAnimation() {
    if (!gsapAvailable) {
        // GSAP failed to load — reveal content immediately rather than trap the user.
        document.querySelectorAll(".intro-kicker, #betrothalText, #enterWebsite").forEach((el) => {
            el.style.opacity = 1;
            el.style.transform = "none";
        });
        return;
    }

    if (prefersReducedMotion) {
        gsap.set([".intro-kicker", "#betrothalText", "#enterWebsite"], { opacity: 1, y: 0 });
        gsap.set(["#leftRing", "#rightRing"], { opacity: 1, x: 0, rotate: 0, scale: 1 });
        return;
    }

    gsap.timeline({ defaults: { ease: "power3.out" } })
        .to(".intro-kicker", { opacity: 1, y: 0, duration: 0.7 })
        .to("#leftRing", { opacity: 1, x: 78, rotate: 15, scale: 1, duration: 1.15 }, "-=0.1")
        .to("#rightRing", { opacity: 1, x: -78, rotate: -15, scale: 1, duration: 1.15 }, "<")
        .to("#leftRing", { rotate: 375, x: 50, duration: 0.9, ease: "power2.inOut" })
        .to("#rightRing", { rotate: -375, x: -50, duration: 0.9, ease: "power2.inOut" }, "<")
        .to("#ringBurst", { scale: 2.8, opacity: 1, duration: 0.35, ease: "power2.out" })
        .to("#ringBurst", { scale: 3.7, opacity: 0, duration: 0.55 })
        .to("#betrothalText", { opacity: 1, y: 0, duration: 0.85 }, "-=0.35")
        .to("#enterWebsite", { opacity: 1, y: 0, duration: 0.65 }, "-=0.3");
}

let introDismissed = false;
function dismissIntro() {
    if (introDismissed) return;
    introDismissed = true;

    FlowerController.start();
    if (!MusicController.isPlaying()) MusicController.play();

    const duration = prefersReducedMotion ? 0.2 : (isMobile ? 0.6 : 0.9);

    const onComplete = () => {
        dom.intro.style.display = "none";
        dom.intro.setAttribute("aria-hidden", "true");
        dom.intro.setAttribute("inert", "");
        dom.body.style.overflowY = "auto";
        dom.body.style.overflow = "";

        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();

        HeroController.animate();
        VenueController.animate();
        PetalController.init();
    };

    if (gsapAvailable) {
        const tl = gsap.timeline({ onComplete });
        tl.to(dom.intro, { opacity: 0, duration });
        tl.to(dom.websiteContent, { opacity: 1, duration: 0.6, pointerEvents: "auto" }, prefersReducedMotion ? 0 : "-=0.3");
        gsap.to(dom.musicBtn, {
            opacity: 1,
            duration: 0.8,
            delay: 0.3,
            onStart: () => { dom.musicBtn.style.pointerEvents = "auto"; },
        });
    } else {
        dom.intro.style.opacity = 0;
        dom.websiteContent.style.opacity = 1;
        dom.websiteContent.style.pointerEvents = "auto";
        dom.musicBtn.style.opacity = 1;
        dom.musicBtn.style.pointerEvents = "auto";
        onComplete();
    }
}

function initIntro() {
    if (!dom.enterBtn || !dom.intro) {
        // Entry gate is missing entirely — don't trap the user behind a broken intro.
        if (dom.websiteContent) {
            dom.websiteContent.style.opacity = 1;
            dom.websiteContent.style.pointerEvents = "auto";
        }
        dom.body.style.overflow = "";
        return;
    }

    initIntroAnimation();
    dom.enterBtn.addEventListener("click", dismissIntro);
}

/* =====================================================================
   HERO ANIMATION
===================================================================== */
const HeroController = (() => {
    let hasAnimated = false;

    function animate() {
        if (hasAnimated || !gsapAvailable) return;
        const card = document.getElementById("hero-card-reveal");
        if (!card) return;
        hasAnimated = true;

        gsap.set(card, { visibility: "visible" });

        if (prefersReducedMotion) {
            gsap.set(card, { opacity: 1, scale: 1, y: 0 });
            gsap.set(".hero-stagger", { opacity: 1, y: 0 });
            return;
        }

        const tl = gsap.timeline();
        tl.fromTo(card,
            { scale: 1.08, y: 60, opacity: 0 },
            { scale: 1, y: 0, opacity: 1, duration: 1.1, ease: "power3.out", clearProps: "transform" }
        )
        .fromTo(card.querySelector("img"),
            { scale: 1.15, filter: "blur(8px)" },
            { scale: 1.02, filter: "blur(0px)", duration: 1.1, ease: "power3.out" },
            "-=0.9"
        )
        .from(".hero-stagger", { y: 40, opacity: 0, stagger: 0.1, duration: 0.9, ease: "power4.out", clearProps: "transform" }, "-=0.9");
    }

    return { animate };
})();

/* =====================================================================
   SCROLL REVEAL — story & venue
===================================================================== */
function initScrollReveals() {
    if (!gsapAvailable || typeof ScrollTrigger === "undefined") return;

    const revealDistance = prefersReducedMotion ? 0 : (isMobile ? 40 : 100);
    const revealDuration = prefersReducedMotion ? 0.01 : 1.1;

    gsap.utils.toArray(".story-image").forEach((el) => {
        gsap.from(el, {
            x: isMobile ? 0 : -revealDistance,
            y: isMobile ? 30 : 0,
            opacity: 0,
            duration: revealDuration,
            clearProps: "transform",
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
    });

    gsap.utils.toArray(".story-content").forEach((el) => {
        gsap.from(el, {
            x: isMobile ? 0 : revealDistance,
            y: isMobile ? 30 : 0,
            opacity: 0,
            duration: revealDuration,
            clearProps: "transform",
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
        });
    });
}

const VenueController = (() => {
    let hasAnimated = false;

    function animate() {
        if (hasAnimated || !gsapAvailable) return;
        const heading = document.querySelector(".venue-heading");
        const cards = document.querySelectorAll(".venue-card");
        if (!heading && !cards.length) return;
        hasAnimated = true;

        const trigger = { trigger: "#venue", start: "top 75%", once: true };

        if (heading) {
            gsap.from(heading, {
                y: prefersReducedMotion ? 0 : 30,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out",
                clearProps: "transform",
                scrollTrigger: trigger,
            });
        }

        if (cards.length) {
            gsap.from(cards, {
                y: prefersReducedMotion ? 0 : 50,
                opacity: 0,
                stagger: 0.15,
                duration: 0.9,
                ease: "power3.out",
                scrollTrigger: trigger,
                clearProps: "all",
            });
        }
    }

    return { animate };
})();

/* =====================================================================
   SCROLL PROGRESS INDICATOR (desktop only, throttled via rAF)
===================================================================== */
function initScrollProgress() {
    if (!dom.scrollCircle || !dom.scrollPercent || isMobile) return;

    let ticking = false;
    const CIRCUMFERENCE = 176;

    function update() {
        const totalHeight = document.body.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
        const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

        dom.scrollCircle.style.strokeDashoffset = String(offset);
        dom.scrollPercent.textContent = `${Math.round(progress)}%`;
        ticking = false;
    }

    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });

    update();
}


/* =====================================================================
   COUNTDOWN COMPLETION CELEBRATION
===================================================================== */
const CountdownCelebrationController = (() => {
    let hasShown = false;

    function open() {
        if (hasShown || !dom.countdownCelebration) return;
        hasShown = true;

        dom.countdownCelebration.classList.remove("hidden");
        dom.countdownCelebration.classList.add("flex");
        dom.countdownCelebration.setAttribute("aria-hidden", "false");

        const previousOverflow = dom.body.style.overflow;
        dom.countdownCelebration.dataset.previousOverflow = previousOverflow;
        dom.body.style.overflow = "hidden";

        FlowerController.start();

        if (!gsapAvailable || prefersReducedMotion) {
            [
                dom.celebrationEmblem,
                dom.celebrationLabel,
                dom.celebrationTitle,
                dom.celebrationMessage,
                dom.celebrationDate,
                dom.closeCountdownCelebration,
            ].forEach((element) => {
                if (!element) return;
                element.style.opacity = "1";
                element.style.transform = "none";
            });

            dom.closeCountdownCelebration?.focus();
            return;
        }

        gsap.set(dom.countdownCelebration, {
            opacity: 0,
        });

        const timeline = gsap.timeline({
            defaults: {
                ease: "power3.out",
            },
        });

        timeline
            .to(dom.countdownCelebration, {
                opacity: 1,
                duration: 0.7,
            })
            .to(dom.celebrationEmblem, {
                opacity: 1,
                scale: 1,
                duration: 0.7,
            }, "-=0.25")
            .to(dom.celebrationLabel, {
                opacity: 1,
                y: 0,
                duration: 0.6,
            }, "-=0.35")
            .to(dom.celebrationTitle, {
                opacity: 1,
                y: 0,
                duration: 0.9,
            }, "-=0.35")
            .to(dom.celebrationMessage, {
                opacity: 1,
                y: 0,
                duration: 0.7,
            }, "-=0.45")
            .to(dom.celebrationDate, {
                opacity: 1,
                y: 0,
                duration: 0.6,
            }, "-=0.35")
            .to(dom.closeCountdownCelebration, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                onComplete: () => {
                    dom.closeCountdownCelebration?.focus();
                },
            }, "-=0.3");
    }

    function close() {
        if (!dom.countdownCelebration) return;

        const finishClosing = () => {
            dom.countdownCelebration.classList.add("hidden");
            dom.countdownCelebration.classList.remove("flex");
            dom.countdownCelebration.setAttribute("aria-hidden", "true");

            dom.body.style.overflow =
                dom.countdownCelebration.dataset.previousOverflow || "";
        };

        if (!gsapAvailable || prefersReducedMotion) {
            finishClosing();
            return;
        }

        gsap.to(dom.countdownCelebration, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: finishClosing,
        });
    }

    function init() {
        if (!dom.countdownCelebration) return;

        dom.closeCountdownCelebration?.addEventListener("click", close);

        document.addEventListener("keydown", (event) => {
            if (
                event.key === "Escape" &&
                dom.countdownCelebration.getAttribute("aria-hidden") === "false"
            ) {
                close();
            }
        });
    }

    return {
        init,
        open,
        close,
    };
})();

/* =====================================================================
   COUNTDOWN CONTROLLER
===================================================================== */
const CountdownController = (() => {
    let intervalId = null;

    function render(distance) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (dom.days) dom.days.textContent = pad(days);
        if (dom.hours) dom.hours.textContent = pad(hours);
        if (dom.minutes) dom.minutes.textContent = pad(minutes);
        if (dom.seconds) dom.seconds.textContent = pad(seconds);

        return { days, hours, minutes, seconds };
    }

    function tick() {
        const distance = BETROTHAL_TIMESTAMP - Date.now();

        if (distance <= 0) {
    render(0);

    if (dom.countdownSrText) {
        dom.countdownSrText.textContent =
            "The Betrothal ceremony has begun.";
    }

    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    CountdownCelebrationController.open();
    return;
}

        const parts = render(distance);

        // Announce to screen readers only once a minute, not every second.
        if (dom.countdownSrText && parts.seconds === 0) {
            dom.countdownSrText.textContent = `${parts.days} days, ${parts.hours} hours and ${parts.minutes} minutes until the Betrothal.`;
        }
    }

    function init() {
        if (!dom.days || !dom.hours || !dom.minutes || !dom.seconds) return;
        tick(); // update immediately, don't wait a second
        intervalId = setInterval(tick, 1000);
    }

    return { init };
})();

/* =====================================================================
   LUXURY FLOWER CONTROLLER — brief celebratory burst, capped & paused
===================================================================== */
const FlowerController = (() => {
    const flowerSvgs = [
        `<svg width="36" height="36" viewBox="0 0 64 64" fill="none"><path d="M32 10C36 20 48 20 50 32C48 44 36 44 32 54C28 44 16 44 14 32C16 20 28 20 32 10Z" fill="#f4dbb0"/></svg>`,
        `<svg width="32" height="32" viewBox="0 0 64 64" fill="none"><path d="M32 8C38 18 52 20 54 32C52 44 38 46 32 56C26 46 12 44 10 32C12 20 26 18 32 8Z" fill="#eccb92"/></svg>`,
        `<svg width="28" height="28" viewBox="0 0 64 64" fill="none"><path d="M32 12C36 20 46 22 48 32C46 42 36 44 32 52C28 44 18 42 16 32C18 22 28 20 32 12Z" fill="#fff3df"/></svg>`,
    ];

    // Parse each template once; every spawned flower gets a cheap clone
    // instead of re-parsing an HTML string on the hot path.
    const flowerTemplates = flowerSvgs.map((svg) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = svg;
        return wrapper.firstElementChild;
    });

    const MAX_ACTIVE_FLOWERS = isMobile ? (isLowEndDevice ? 4 : 8) : 24;
    const CADENCE_MS = isMobile ? (isLowEndDevice ? 5200 : 3800) : 900;
    let activeCount = 0;
    let burstTimeouts = [];
    let intervalId = null;
    let stopTimeoutId = null;
    let paused = false;

    function createFlower() {
        if (!dom.flowerContainer || activeCount >= MAX_ACTIVE_FLOWERS) return;
        activeCount++;

        const flower = document.createElement("div");
        flower.classList.add("flower");

        const depthRandom = Math.random();
        flower.classList.add(depthRandom < 0.33 ? "depth-far" : depthRandom < 0.66 ? "depth-mid" : "depth-near");
        flower.appendChild(flowerTemplates[Math.floor(Math.random() * flowerTemplates.length)].cloneNode(true));
        dom.flowerContainer.appendChild(flower);

        const startX = Math.random() * window.innerWidth;
        const startY = -150 - Math.random() * 200;
        const size = isMobile ? Math.random() * 12 + 14 : Math.random() * 30 + 20;
        const duration = isMobile ? Math.random() * 7 + 14 : Math.random() * 8 + 12;
        const drift = isMobile ? (Math.random() - 0.5) * 120 : (Math.random() - 0.5) * 350;
        const rotate = Math.random() * 360;
        const scale = Math.random() * 0.6 + 0.7;

        flower.style.width = `${size}px`;
        flower.style.height = `${size}px`;

        const remove = () => {
            flower.remove();
            activeCount--;
        };

        if (!gsapAvailable) {
            setTimeout(remove, duration * 1000);
            return;
        }

        gsap.set(flower, { x: startX, y: startY, scale, rotation: rotate, opacity: 0, force3D: true });

        gsap.fromTo(flower,
            { opacity: 0, scale: scale * 0.7 },
            { opacity: 1, scale, duration: 1.4, ease: "power3.out" }
        );

        gsap.to(flower, {
            y: window.innerHeight + 250,
            x: startX + drift,
            rotation: rotate + (Math.random() > 0.5 ? 720 : -720),
            duration,
            ease: "none",
            force3D: true,
            onComplete: remove,
        });

        if (!isMobile) {
            createFlowerGlow(startX);
        }
    }

    function createFlowerGlow(x) {
        if (!dom.flowerGlow || !gsapAvailable) return;
        const glow = document.createElement("div");
        glow.classList.add("flower-glow");
        dom.flowerGlow.appendChild(glow);

        const size = Math.random() * 8 + 4;
        glow.style.width = `${size}px`;
        glow.style.height = `${size}px`;

        gsap.set(glow, { x, y: -50, opacity: Math.random() * 0.6 + 0.2 });
        gsap.to(glow, {
            y: window.innerHeight + 100,
            x: x + (Math.random() - 0.5) * 150,
            duration: Math.random() * 10 + 10,
            ease: "none",
            onComplete: () => glow.remove(),
        });
    }

    function start() {
        if (!dom.flowerContainer || prefersReducedMotion) return;

        const totalFlowers = isMobile ? (isLowEndDevice ? 4 : 6) : 20;
        const delayStep = isMobile ? 650 : 300;

        for (let i = 0; i < totalFlowers; i++) {
            burstTimeouts.push(setTimeout(createFlower, i * delayStep));
        }

        clearInterval(intervalId);
        intervalId = setInterval(createFlower, CADENCE_MS);

        // Celebratory burst only — stop generating new flowers after ~20s.
        clearTimeout(stopTimeoutId);
        stopTimeoutId = setTimeout(stop, 20000);

        document.addEventListener("visibilitychange", handleVisibility);
    }

    function stop() {
        clearInterval(intervalId);
        intervalId = null;
    }

    function handleVisibility() {
        if (document.hidden) {
            paused = Boolean(intervalId);
            stop();
        } else if (paused) {
            intervalId = setInterval(createFlower, CADENCE_MS);
            paused = false;
        }
    }

    return { start, stop };
})();

/* =====================================================================
   PETAL REVEAL CONTROLLER
===================================================================== */
const PetalController = (() => {
    let removedPetals = 0;
    let totalPetals = 110;
    let revealDone = false;
    const COMPLETION_THRESHOLD = 0.68;

    // Cached list of not-yet-touched petals + their bounding rects, kept
    // in memory instead of re-running querySelectorAll + getBoundingClientRect
    // on every single pointermove (that pattern was forcing a synchronous
    // layout for up to 110 elements per event — the single biggest jank
    // source while dragging on mobile).
    let livePetals = [];
    let rectsDirty = true;

    function buildField() {
        if (!dom.petalField || !dom.petalCard || !dom.saveDateContent) return;

        dom.petalField.innerHTML = "";
        removedPetals = 0;
        revealDone = false;
        livePetals = [];
        rectsDirty = true;
        totalPetals = isSmallMobile ? 30 : (isMobile ? (isLowEndDevice ? 40 : 55) : 110);

        if (gsapAvailable) {
            gsap.set(dom.saveDateContent, { opacity: 0, scale: 0.92, filter: "blur(8px)" });
        }

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < totalPetals; i++) {
            const petal = document.createElement("div");
            petal.className = "mini-petal";

            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const rotate = Math.random() * 360;
            const scale = Math.random() * 0.5 + 0.65;

            petal.style.left = `${x}%`;
            petal.style.top = `${y}%`;

            if (gsapAvailable) {
                gsap.set(petal, { xPercent: -50, yPercent: -50, rotate, scale, opacity: 1 });
            }

            fragment.appendChild(petal);
            livePetals.push(petal);

            if (gsapAvailable && !isMobile && !prefersReducedMotion) {
                gsap.to(petal, {
                    y: "+=5",
                    rotate: `+=${Math.random() > 0.5 ? 7 : -7}`,
                    duration: Math.random() * 2 + 2,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                });
            }
        }

        // Single DOM write instead of `totalPetals` individual appends.
        dom.petalField.appendChild(fragment);
        rectsDirty = true;
    }

    function refreshRectsIfNeeded() {
        if (!rectsDirty) return;
        // One batched read pass for every live petal — far cheaper than
        // a read per pointer event.
        for (const petal of livePetals) {
            const rect = petal.getBoundingClientRect();
            petal._cx = rect.left + rect.width / 2;
            petal._cy = rect.top + rect.height / 2;
        }
        rectsDirty = false;
    }

    function removeOne(petal) {
        if (!petal || petal.classList.contains("touched") || revealDone) return;

        petal.classList.add("touched");
        removedPetals++;

        const idx = livePetals.indexOf(petal);
        if (idx !== -1) livePetals.splice(idx, 1);

        if (gsapAvailable) {
            gsap.to(petal, {
                scale: 0, opacity: 0, rotate: "+=140", y: "-=45",
                duration: 0.4, ease: "back.in(1.7)",
                onComplete: () => petal.remove(),
            });
        } else {
            petal.remove();
        }

        if (dom.petalHint && removedPetals > 8) {
            dom.petalHint.classList.add("hint-hidden");
        }

        if (removedPetals / totalPetals >= COMPLETION_THRESHOLD) {
            finish();
        }
    }

    function finish() {
        if (revealDone) return;
        revealDone = true;

        const remaining = livePetals.slice();
        livePetals = [];

        if (gsapAvailable) {
            gsap.to(".mini-petal", {
                scale: 0, opacity: 0, y: "-=60", rotate: "+=180",
                stagger: 0.006, duration: 0.5, ease: "power3.in",
                onComplete: () => { if (dom.petalLayer) dom.petalLayer.style.display = "none"; },
            });

            gsap.to(dom.saveDateContent, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1, ease: "power3.out" });

            gsap.to(dom.countdownSection, {
                opacity: 1, y: 0, duration: 1.1, delay: 1, ease: "power4.out",
            });
        } else {
            remaining.forEach((p) => p.remove());
            if (dom.petalLayer) dom.petalLayer.style.display = "none";
            dom.saveDateContent.style.opacity = 1;
            dom.saveDateContent.style.transform = "none";
            dom.saveDateContent.style.filter = "none";
            if (dom.countdownSection) {
                dom.countdownSection.style.opacity = 1;
                dom.countdownSection.style.transform = "none";
            }
        }
    }

    function handleMove(clientX, clientY, radius) {
        if (revealDone) return;
        refreshRectsIfNeeded();

        const radiusSq = radius * radius;
        // Iterate a snapshot since removeOne() mutates livePetals mid-loop.
        for (const petal of livePetals.slice()) {
            const dx = clientX - petal._cx;
            const dy = clientY - petal._cy;
            if (dx * dx + dy * dy < radiusSq) {
                removeOne(petal);
            }
        }
    }

    let initialized = false;

    function init() {
        if (initialized || !dom.petalCard || !dom.petalField) return;
        initialized = true;
        buildField();

        let touchActive = false;
        let pendingMove = null;
        let rafId = null;

        function flushMove() {
            rafId = null;
            if (!pendingMove) return;
            const { x, y, radius } = pendingMove;
            pendingMove = null;
            handleMove(x, y, radius);
        }

        function queueMove(x, y, radius) {
            pendingMove = { x, y, radius };
            if (rafId === null) {
                rafId = requestAnimationFrame(flushMove);
            }
        }

        dom.petalCard.addEventListener("pointerdown", () => {
            touchActive = true;
            rectsDirty = true; // card may have settled into place since layout; refresh once.
        }, { passive: true });

        dom.petalCard.addEventListener("pointerup", () => { touchActive = false; }, { passive: true });
        dom.petalCard.addEventListener("pointercancel", () => { touchActive = false; }, { passive: true });

        dom.petalCard.addEventListener("pointermove", (e) => {
            const radius = e.pointerType === "touch" ? 50 : 42;
            if (e.pointerType === "touch" && !touchActive) return;
            queueMove(e.clientX, e.clientY, radius);
        }, { passive: true });

        dom.petalCard.addEventListener("pointerdown", (e) => {
            handleMove(e.clientX, e.clientY, 55);
        }, { passive: true });

        // Rects only need recomputing if the card's on-page position could
        // have changed (scroll/orientation change) — not on every touch.
        window.addEventListener("scroll", () => { rectsDirty = true; }, { passive: true });
        window.addEventListener("resize", () => { rectsDirty = true; }, { passive: true });

        // Keyboard / accessible fallback — always available, never leaves the date hidden.
        if (dom.petalFallbackBtn) {
            dom.petalFallbackBtn.addEventListener("click", finish);
        }
    }

    return { init };
})();

/* =====================================================================
   CLEANUP & VISIBILITY HANDLING
===================================================================== */
function initGlobalVisibilityHandling() {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && gsapAvailable) {
            gsap.globalTimeline.pause();
        } else if (gsapAvailable) {
            gsap.globalTimeline.resume();
        }
    });
}

/* =====================================================================
   MAIN INITIALIZATION
===================================================================== */
const runWhenIdle = (fn) => {
    if ("requestIdleCallback" in window) {
        requestIdleCallback(fn, { timeout: 1500 });
    } else {
        setTimeout(fn, 0);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    // Critical path only: gets the entry gate interactive and the
    // countdown numbers correct on first paint.
    initIntro();
    MusicController.init();
    CountdownController.init();
    initGlobalVisibilityHandling();

    // Everything below is cosmetic/progressive-enhancement and can wait
    // a tick so it doesn't compete with the intro animation for the
    // main thread on low-end devices.
    runWhenIdle(() => {
        initCustomCursor();
        initScrollReveals();
        initScrollProgress();
        CountdownCelebrationController.init();
    });
});

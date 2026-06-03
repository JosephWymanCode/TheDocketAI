const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReducedMotion) {
  document.body.classList.add("no-motion");
}

const progressBar = document.getElementById("progress-bar");
const navbar = document.getElementById("navbar");
const floatBtn = document.getElementById("float-btn");
const heroSection = document.getElementById("home");

function updateScrollUi() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = docHeight > 0 ? `${(scrollTop / docHeight) * 100}%` : "0%";
  navbar.classList.toggle("scrolled", scrollTop > 48);
  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
  floatBtn.classList.toggle("visible", scrollTop > heroBottom - 160);
}

window.addEventListener("scroll", updateScrollUi, { passive: true });
updateScrollUi();

const revealEls = document.querySelectorAll(".reveal");
if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
  revealEls.forEach((el) => revealObserver.observe(el));
}

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    const id = link.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 82;
    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
});

// After completing Beehiiv + Cloudflare Worker setup (see worker.js and README.md),
// replace the WORKER_URL value below with your deployed worker URL.
// Example: "https://docket-subscribe.yourname.workers.dev"
const WORKER_URL = "https://docket-subscribe.joewyman1.workers.dev/";

async function handleSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector("input[type='email']");
  const email = input.value.trim();
  if (!email) return;

  if (localStorage.getItem("docket_subscribed") === "true") {
    showToast("You're already subscribed! See you Tuesday.", "info");
    return;
  }

  setFormState(form, "loading");

  if (WORKER_URL) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json();

      if (res.ok && data.success) {
        setFormState(form, "success");
        localStorage.setItem("docket_subscribed", "true");
        showToast("🎉 Welcome to The Docket! First issue lands Tuesday.", "success");
      } else if (res.status === 409 || data.code === "already_subscribed") {
        setFormState(form, "reset");
        showToast("You're already on the list — see you Tuesday!", "info");
      } else {
        throw new Error(data.message || "Unexpected error");
      }
    } catch (err) {
      clearTimeout(timer);
      console.error("Subscription error:", err);
      const msg =
        err.name === "AbortError"   ? "Request timed out — please check your connection and try again."
        : err instanceof TypeError  ? "Network error — please check your connection."
        :                             "Subscription failed — please try again.";
      setFormState(form, "reset");
      showToast(msg, "error");
    }
  } else {
    // Fallback: redirect to Beehiiv subscribe page when WORKER_URL is not set
    setFormState(form, "success");
    localStorage.setItem("docket_subscribed", "true");
    showToast("Redirecting to complete your subscription…", "info");
    setTimeout(() => {
      window.open(
        `https://thedocket.beehiiv.com/subscribe?email=${encodeURIComponent(email)}`,
        "_blank",
        "noopener,noreferrer"
      );
      setFormState(form, "reset");
    }, 900);
  }
}

function setFormState(form, state) {
  const input  = form.querySelector("input[type='email']");
  const button = form.querySelector("button");
  const states = {
    loading: { text: "Subscribing…",    disabled: true,  bg: "",         color: "",          inputDisabled: true  },
    success: { text: "✓ Subscribed!",   disabled: true,  bg: "#237A4B",  color: "#FFFFFF",   inputDisabled: true  },
    error:   { text: "Try again →",     disabled: false, bg: "#B91C1C",  color: "#FFFFFF",   inputDisabled: false },
    reset:   { text: "Subscribe Free →",disabled: false, bg: "",         color: "",          inputDisabled: false },
  };
  const s = states[state] || states.reset;
  button.textContent      = s.text;
  button.disabled         = s.disabled;
  button.style.background = s.bg;
  button.style.color      = s.color;
  input.disabled          = s.inputDisabled;
  form.setAttribute("aria-busy", state === "loading" ? "true" : "false");
  if (state === "reset") input.value = "";
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const colors = { success: "#237A4B", info: "#1B2A4A", error: "#B91C1C" };
  toast.textContent = message;
  toast.style.background = colors[type] || colors.success;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4500);
}

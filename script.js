/* ============================================================
   Mission in Cambodia — Landing Page Script
   ============================================================ */

/* ---------- CONFIG (사용자가 배포 전 채울 값) ---------- */
const CONFIG = {
  // 배포 절대 URL — 카카오/SNS 공유 시 OG 메타가 이 도메인을 가리킴
  // 비워두면 location.origin을 자동 사용 (로컬 테스트 시 그대로 동작)
  SITE_URL: "https://valueinfomaker-lab.github.io/cambodia-mission-letter/",

  // OG 공유 썸네일 (기본: 표지 이미지)
  OG_IMAGE_PATH: "extracted_images/slide_001/img_01.jpeg",

  // 후원 계좌 정보 (한 줄로 합쳐서 복사됨)
  BANK_ACCOUNT: {
    bank: "[은행명]",
    number: "[계좌번호]",
    holder: "[예금주]"
  },

  // 연락처 (값이 없으면 해당 줄은 자동 숨김)
  CONTACT: {
    email: "",       // 예: "missionary@example.com"
    kakaoId: "",     // 예: "namgisun" (카카오 ID)
    phoneKr: "",     // 한국 연락처 (선택)
    phoneKh: ""      // 캄보디아 연락처 (선택)
  },

  // 발행일 (예: "2026년 5월 9일")
  PUBLISHED_AT: "2026년 새해",

  // 공유 시 사용할 본문 정보 (Web Share API / OG 메타에서 사용)
  SHARE: {
    title: "MISSION IN CAMBODIA — 남기선 · 임소리 선교사",
    description: "캄보디아 프놈펜에서 보내는 2026 새해 사역 편지. 사역 소식과 기도제목을 함께 나눠 주세요."
  }
};

/* ---------- Utilities ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const siteUrl = () => (CONFIG.SITE_URL || location.origin + location.pathname).replace(/\/$/, "");
const absoluteUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return siteUrl() + "/" + path.replace(/^\//, "");
};

/* ---------- 1. Hydrate placeholders from CONFIG ---------- */
function hydrateConfig() {
  // Bank account
  $$('[data-bind="bank"]').forEach(el => el.textContent = CONFIG.BANK_ACCOUNT.bank);
  $$('[data-bind="number"]').forEach(el => el.textContent = CONFIG.BANK_ACCOUNT.number);
  $$('[data-bind="holder"]').forEach(el => el.textContent = CONFIG.BANK_ACCOUNT.holder);

  // Contact
  hydrateContact("email", CONFIG.CONTACT.email);
  hydrateContact("kakaoId", CONFIG.CONTACT.kakaoId);

  // Published date
  $$('[data-bind="publishedAt"]').forEach(el => el.textContent = CONFIG.PUBLISHED_AT);

  // Footer URL
  const urlEl = $("#footerUrl");
  if (urlEl) urlEl.textContent = siteUrl();

  // Update OG meta + canonical with actual URL
  $$('meta[property="og:url"]').forEach(el => el.setAttribute("content", siteUrl()));
  $$('meta[property="og:image"]').forEach(el => el.setAttribute("content", absoluteUrl(CONFIG.OG_IMAGE_PATH)));
  $$('meta[name="twitter:image"]').forEach(el => el.setAttribute("content", absoluteUrl(CONFIG.OG_IMAGE_PATH)));
}

function hydrateContact(key, value) {
  const el = document.querySelector(`[data-bind="${key}"]`);
  if (!el) return;
  if (!value) {
    el.parentElement && (el.parentElement.style.display = "none");
    return;
  }
  const prefix = el.getAttribute("data-bind-prefix") || "";
  el.textContent = prefix + value;
}

/* ---------- 2. Share (Web Share API + clipboard fallback) ---------- */
async function shareLetter() {
  // 1) Web Share API (모바일 OS 공유 시트 — 카카오톡 포함 모든 앱)
  if (navigator.share) {
    try {
      await navigator.share({
        title: CONFIG.SHARE.title,
        text:  CONFIG.SHARE.description,
        url:   siteUrl()
      });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return; // 사용자 취소
      console.error("[share] navigator.share failed:", err);
    }
  }

  // 2) Clipboard fallback
  const ok = await copyText(siteUrl());
  if (ok) {
    showToast("링크가 복사되었습니다 — 원하는 곳에 붙여넣어 주세요");
  } else {
    showToast("공유에 실패했습니다. URL을 직접 복사해 주세요.");
  }
}

/* ---------- 3. Copy account ---------- */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }

  // Fallback: hidden textarea
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error("[copy] failed:", err);
    return false;
  }
}

async function copyAccount(btn) {
  const { bank, number, holder } = CONFIG.BANK_ACCOUNT;
  const line = `${bank} ${number} (예금주: ${holder})`;
  const ok = await copyText(line);

  if (ok) {
    showToast("계좌가 복사되었습니다");
    if (btn) {
      const span = btn.querySelector("span");
      const original = span ? span.textContent : "";
      btn.classList.add("is-copied");
      if (span) span.textContent = "복사됨";
      setTimeout(() => {
        btn.classList.remove("is-copied");
        if (span) span.textContent = original;
      }, 1500);
    }
  } else {
    showToast("복사에 실패했습니다");
  }
}

/* ---------- 4. Toast ---------- */
let _toastTimer = null;
function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

/* ---------- 5. Sticky Header (show/hide on scroll) ---------- */
function initStickyHeader() {
  const header = $("#siteHeader");
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const delta = y - lastY;
    if (y < 80) {
      header.classList.remove("is-hidden");
    } else if (delta > 6) {
      header.classList.add("is-hidden");
    } else if (delta < -6) {
      header.classList.remove("is-hidden");
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}

/* ---------- 6. Back to top ---------- */
function initBackToTop() {
  const btn = $(".back-to-top");
  if (!btn) return;

  function toggle() {
    btn.classList.toggle("is-visible", window.scrollY > 600);
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => { toggle(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  toggle();
}

/* ---------- 7. Reveal on scroll ---------- */
function initReveal() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const targets = $$(".section, .gallery figure, .prayer-card, .big-card, .kg-card, .mini-card, .timeline li");
  targets.forEach(el => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(el => io.observe(el));
}

/* ---------- 8. Lightbox ---------- */
const lightbox = {
  el: null,
  imgEl: null,
  capEl: null,
  group: [],
  index: 0,
  touchStartX: 0,

  init() {
    this.el = $("#lightbox");
    this.imgEl = $("#lightboxImg");
    this.capEl = $("#lightboxCaption");
    if (!this.el) return;

    // Wire all gallery/photo images
    const triggers = $$('[data-gallery]');
    triggers.forEach(el => {
      const target = el.tagName === "FIGURE" ? el.querySelector("img") : el;
      if (!target) return;

      const gallery = el.getAttribute("data-gallery");
      target.addEventListener("click", (e) => {
        e.preventDefault();
        this.openFromTrigger(target, gallery);
      });
    });

    // Also wire single photo-frame imgs (greeting, prayer-2)
    $$('.photo-frame img').forEach(img => {
      if (img.closest('[data-gallery]')) return; // already wired
      img.addEventListener("click", () => {
        const single = [{ src: img.src, alt: img.alt }];
        this.open(single, 0);
      });
    });

    $(".lightbox-close").addEventListener("click", () => this.close());
    $(".lightbox-prev").addEventListener("click", () => this.prev());
    $(".lightbox-next").addEventListener("click", () => this.next());

    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.close();
    });

    // Touch swipe
    this.el.addEventListener("touchstart", (e) => {
      this.touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    this.el.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 50) {
        dx < 0 ? this.next() : this.prev();
      }
    }, { passive: true });

    document.addEventListener("keydown", (e) => {
      if (!this.isOpen()) return;
      if (e.key === "Escape") this.close();
      else if (e.key === "ArrowLeft") this.prev();
      else if (e.key === "ArrowRight") this.next();
    });
  },

  openFromTrigger(imgEl, galleryKey) {
    const items = $$(`[data-gallery="${galleryKey}"]`).map(el => {
      const t = el.tagName === "FIGURE" ? el.querySelector("img") : el;
      return t ? { src: t.src, alt: t.alt } : null;
    }).filter(Boolean);

    const idx = items.findIndex(x => x.src === imgEl.src);
    this.open(items, idx >= 0 ? idx : 0);
  },

  open(items, index) {
    if (!this.el || !items.length) return;
    this.group = items;
    this.index = index;
    this.render();
    if (typeof this.el.showModal === "function") {
      try { this.el.showModal(); }
      catch (_) { this.el.setAttribute("open", ""); }
    } else {
      this.el.setAttribute("open", "");
    }
    document.body.style.overflow = "hidden";
  },

  close() {
    if (!this.el) return;
    if (typeof this.el.close === "function") {
      try { this.el.close(); } catch (_) { this.el.removeAttribute("open"); }
    } else {
      this.el.removeAttribute("open");
    }
    document.body.style.overflow = "";
  },

  isOpen() {
    return this.el && this.el.hasAttribute("open");
  },

  prev() {
    if (this.group.length < 2) return;
    this.index = (this.index - 1 + this.group.length) % this.group.length;
    this.render();
  },

  next() {
    if (this.group.length < 2) return;
    this.index = (this.index + 1) % this.group.length;
    this.render();
  },

  render() {
    const item = this.group[this.index];
    if (!item) return;
    this.imgEl.src = item.src;
    this.imgEl.alt = item.alt || "";
    this.capEl.textContent = item.alt || "";

    const single = this.group.length < 2;
    $(".lightbox-prev").style.display = single ? "none" : "flex";
    $(".lightbox-next").style.display = single ? "none" : "flex";
  }
};

/* ---------- 9. Wire actions ---------- */
function initActions() {
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");

    if (action === "share") {
      e.preventDefault();
      shareLetter();
    } else if (action === "copy-account") {
      e.preventDefault();
      copyAccount(target);
    }
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  hydrateConfig();
  initStickyHeader();
  initBackToTop();
  initReveal();
  initActions();
  lightbox.init();
});

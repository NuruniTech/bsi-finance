'use strict';

// ─── Utilities ───────────────────────────────────────────────────
function fmtTSh(n) {
  return 'TSh ' + Math.round(n).toLocaleString('en-US');
}
function fmtShort(n) {
  if (n >= 1_000_000) return 'TSh ' + (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + 'M';
  if (n >= 1_000) return 'TSh ' + Math.round(n / 1_000) + 'K';
  return 'TSh ' + n;
}
function loanCalc(amount, months, annualRate) {
  const r = annualRate / 12;
  const m = amount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return { monthly: Math.round(m), total: Math.round(m * months) };
}

// ─── Language ────────────────────────────────────────────────────
let lang = localStorage.getItem('bsi-lang') || 'en';

function setLang(l) {
  lang = l;
  localStorage.setItem('bsi-lang', l);
  document.querySelectorAll('[data-sw][data-en]').forEach(el => {
    el.innerHTML = el.dataset[l];
  });
  document.querySelectorAll('[data-sw-ph]').forEach(el => {
    el.placeholder = l === 'sw' ? el.dataset.swPh : el.dataset.enPh;
  });
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.langBtn === l);
  });
  if (calcReady) updateCalc();
}

// ─── Navigation ──────────────────────────────────────────────────
function initNav() {
  const header = document.getElementById('main-header');
  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  // Active link
  const cur = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mob-nav a').forEach(a => {
    if (a.getAttribute('href') === cur) a.classList.add('active');
  });

  // Mobile drawer
  const hamburger = document.getElementById('nav-hamburger');
  const overlay   = document.getElementById('mob-overlay');
  const drawer    = document.getElementById('mob-nav');
  const closeBtn  = document.getElementById('mob-close');

  const open  = () => { overlay?.classList.add('open'); drawer?.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay?.classList.remove('open'); drawer?.classList.remove('open'); document.body.style.overflow = ''; };

  hamburger?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

  // Lang buttons (all instances)
  document.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.langBtn));
  });
}

// ─── Loan Calculator ─────────────────────────────────────────────
const SEGS = {
  wafanyakazi:    { rate: 0.16, min: 500_000,    max: 80_000_000,  def: 5_000_000  },
  wafanyabiashara:{ rate: 0.18, min: 2_000_000,  max: 200_000_000, def: 10_000_000 },
  kanisa:         { rate: 0.14, min: 5_000_000,  max: 300_000_000, def: 20_000_000 },
};
let calcState = { seg: 'wafanyabiashara', amount: 10_000_000, months: 12 };
let calcReady = false;

function updateCalc() {
  const cfg = SEGS[calcState.seg];
  const { monthly, total } = loanCalc(calcState.amount, calcState.months, cfg.rate);
  const $ = id => document.getElementById(id);

  const $monthly = $('calc-monthly'), $total = $('calc-total'), $rate = $('calc-rate');
  const $amt = $('calc-amount'), $slider = $('calc-slider');
  const $min = $('calc-min'), $max = $('calc-max');
  const $term = $('calc-term-display');

  if ($monthly) $monthly.textContent = fmtTSh(monthly);
  if ($total)   $total.textContent   = fmtTSh(total);
  if ($rate)    $rate.textContent    = (cfg.rate * 100).toFixed(0) + '% p.a.';
  if ($amt)     $amt.textContent     = fmtTSh(calcState.amount);
  if ($min)     $min.textContent     = fmtShort(cfg.min);
  if ($max)     $max.textContent     = fmtShort(cfg.max);
  if ($term) {
    $term.textContent = calcState.months + ' ' + (calcState.months === 1
      ? (lang === 'sw' ? 'mwezi' : 'month')
      : (lang === 'sw' ? 'miezi' : 'months'));
  }
  if ($slider) {
    const pct = ((calcState.amount - cfg.min) / (cfg.max - cfg.min)) * 100;
    $slider.style.background = `linear-gradient(to right, var(--coral-500) ${pct}%, var(--sand-300) ${pct}%)`;
  }
}

function initCalc() {
  const card = document.getElementById('calc-card');
  if (!card) return;
  calcReady = true;

  card.querySelectorAll('[data-seg]').forEach(btn => {
    btn.addEventListener('click', () => {
      calcState.seg    = btn.dataset.seg;
      calcState.amount = SEGS[btn.dataset.seg].def;
      card.querySelectorAll('[data-seg]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const s = document.getElementById('calc-slider');
      if (s) { s.min = SEGS[calcState.seg].min; s.max = SEGS[calcState.seg].max; s.value = calcState.amount; }
      updateCalc();
    });
  });

  const slider = document.getElementById('calc-slider');
  if (slider) {
    slider.min   = SEGS[calcState.seg].min;
    slider.max   = SEGS[calcState.seg].max;
    slider.value = calcState.amount;
    slider.step  = 100_000;
    slider.addEventListener('input', () => { calcState.amount = +slider.value; updateCalc(); });
  }

  card.querySelectorAll('[data-months]').forEach(btn => {
    btn.addEventListener('click', () => {
      calcState.months = +btn.dataset.months;
      card.querySelectorAll('[data-months]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateCalc();
    });
  });

  updateCalc();
}

// ─── Scroll reveal (one-way) ─────────────────────────────────────
function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

// ─── Bidirectional scroll reveal (appear + disappear) ────────────
function initBidirectional() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      } else {
        e.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal-bi').forEach(el => io.observe(el));
}

// ─── Counter animation ───────────────────────────────────────────
function animateCount(el) {
  const raw = el.dataset.count;
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return;
  const suffix = raw.replace(/^[\d,.]+/, '');
  const dur = 1700, start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    const v = Math.round((1 - Math.pow(1 - p, 3)) * num);
    el.textContent = v.toLocaleString('en-US') + suffix;
    if (p < 1) requestAnimationFrame(tick); else el.textContent = raw;
  };
  requestAnimationFrame(tick);
}
function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.45 });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}

// ─── Requirements tabs ───────────────────────────────────────────
function initReqTabs() {
  const items = document.querySelectorAll('.req-sitem');
  if (!items.length) return;

  function activate(tab) {
    items.forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.req-panel').forEach(p => p.classList.add('req-panel--hidden'));
    const item = document.querySelector(`.req-sitem[data-req-tab="${tab}"]`);
    const panel = document.getElementById('req-panel-' + tab);
    if (item)  item.classList.add('active');
    if (panel) panel.classList.remove('req-panel--hidden');
  }

  items.forEach(item => item.addEventListener('click', () => activate(item.dataset.reqTab)));

  const hash = location.hash.replace('#', '');
  if (['wafanyakazi','wafanyabiashara','kanisa'].includes(hash)) activate(hash);
}

// ─── Team accordion (tc3) ────────────────────────────────────────
function initTeamAccordion() {
  document.querySelectorAll('.tc3-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.tc3-card');
      const isOpen = card.classList.contains('open');
      document.querySelectorAll('.tc3-card.open').forEach(c => {
        c.classList.remove('open');
        c.querySelector('.tc3-toggle')?.setAttribute('aria-expanded', 'false');
        const lbl = c.querySelector('.tc3-toggle-label');
        if (lbl) lbl.textContent = lang === 'sw' ? lbl.dataset.sw : lbl.dataset.en;
      });
      if (!isOpen) {
        card.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        const lbl = btn.querySelector('.tc3-toggle-label');
        if (lbl) lbl.textContent = lang === 'sw' ? 'Funga' : 'Close';
      }
    });
  });
}

// ─── FAQ accordion ───────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q')?.addEventListener('click', () => {
      const was = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!was) item.classList.add('open');
    });
  });
}

// ─── Marquee ─────────────────────────────────────────────────────
function initMarquee() {
  document.querySelectorAll('.marquee-wrap').forEach(wrap => {
    const track = wrap.querySelector('.marquee-track');
    if (!track) return;
    wrap.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    wrap.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  });
}

// ─── Toast ───────────────────────────────────────────────────────
function showToast(msg) {
  const old = document.getElementById('bsi-toast');
  if (old) old.remove();
  const el = Object.assign(document.createElement('div'), { id: 'bsi-toast', innerHTML:
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg> ${msg}`
  });
  Object.assign(el.style, {
    position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
    zIndex:'99', background:'var(--navy-900)', color:'#fff',
    padding:'14px 22px', borderRadius:'14px', boxShadow:'0 24px 48px -20px rgba(11,31,58,.4)',
    display:'flex', gap:'10px', alignItems:'center',
    fontSize:'14px', fontFamily:'Lato,sans-serif',
    animation:'fadeUp .3s ease both', whiteSpace:'nowrap',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── Contact form ────────────────────────────────────────────────
function initForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const btn = form.querySelector('[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>${lang === 'sw' ? 'Inatuma...' : 'Sending…'}</span>`;

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        showToast(lang === 'sw' ? 'Asante! Tutarudi kwako hivi karibuni.' : "Thanks! We'll be in touch shortly.");
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = (data.errors || []).map(e => e.message).join(', ') ||
                    (lang === 'sw' ? 'Hitilafu. Tafadhali jaribu tena.' : 'Something went wrong. Please try again.');
        showToast(msg);
      }
    } catch {
      showToast(lang === 'sw' ? 'Hitilafu ya mtandao. Tafadhali jaribu tena.' : 'Network error. Please try again.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  });
}

// ─── Photo carousel (generic) ────────────────────────────────────
function initCarousel(carouselId, dotsId, counterId, slideClass, dotClass) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;
  const slides = carousel.querySelectorAll('.' + slideClass);
  const dots   = document.querySelectorAll('#' + dotsId + ' .' + dotClass);
  const counter = document.getElementById(counterId);
  let current = 0, timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    if (counter) counter.textContent = current + 1;
  }

  function autoplay() { timer = setInterval(() => goTo(current + 1), 4200); }

  dots.forEach(dot => dot.addEventListener('click', () => {
    clearInterval(timer);
    goTo(+dot.dataset.idx);
    autoplay();
  }));

  carousel.addEventListener('mouseenter', () => clearInterval(timer));
  carousel.addEventListener('mouseleave', autoplay);

  autoplay();
}

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCalc();
  initReveal();
  initBidirectional();
  initCounters();
  initReqTabs();
  initTeamAccordion();
  initFAQ();
  initMarquee();
  initForm();
  initCarousel('empCarousel', 'empDots', 'empCurrent', 'emp-slide', 'emp-dot');
  initCarousel('bizCarousel', 'bizDots', 'bizCurrent', 'biz-slide', 'biz-dot');
  initCarousel('churchCarousel', 'churchDots', 'churchCurrent', 'church-slide', 'church-dot');
  setLang(lang);
});

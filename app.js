
/* ============================================
   LIGHT / DARK MODE TOGGLE
   How it works, step by step:
   1. The <html> tag has an attribute: data-theme="dark".
   2. All our CSS colours are written as var(--something),
      and we defined TWO sets of those variables above —
      one for [data-theme="dark"] and one for [data-theme="light"].
   3. So flipping ONE attribute on the page instantly
      swaps every colour, everywhere, with no extra CSS rules.
   4. We save the choice in localStorage so it's remembered
      the next time this person visits the site.
      
   ============================================ */
   
const root = document.documentElement;          // the <html> tag
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('jnautos-theme', theme);
  // show a sun icon when we're in dark mode (click it to go light)
  // show a moon icon when we're in light mode (click it to go dark)
  themeIcon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// on page load, use whatever the visitor picked last time (default: dark)
applyTheme(localStorage.getItem('jnautos-theme') || 'dark');

if (themeToggle) {
  themeToggle.addEventListener('click', function () {
    const current = root.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

/* ============================================
   HERO SLIDER
   Step by step:
   1. "heroSlides" is an array — a numbered list — of slide objects.
      Each object is a little bundle of data: {img, line1, line2, text}.
   2. "currentSlide" is just a counter, starting at 0 (arrays count from 0).
   3. renderSlide(i) reads slide number "i" out of the array and pushes
      its text/image onto the page.
   4. setInterval runs a function again and again, every 6000ms (6 sec).
      Each time, we move the counter forward by 1 — and the "% " (modulo)
      wraps it back to 0 once it reaches the end, the same way a clock
      wraps from 12 back to 1.
   ============================================ */
const heroSlides = [
  {
    img: "./images/hero_bg.jpg",
    line1: "Premium Parts.",
    line2: "Peak Performance.",
    text: "High-quality auto parts & accessories for every machine and every journey."
  },
  {
    img: "./images/brakes.jpg",
    line1: "Genuine Parts.",
    line2: "Zero Compromise.",
    text: "Sourced from trusted brands, fitted right the very first time."
  },
  {
    img: "./images/turbo.jpg",
    line1: "Built For",
    line2: "Every Journey.",
    text: "From the daily commute to the toughest terrain — we've got you covered."
  }
];

let currentSlide = 0;
const heroBg = document.getElementById('heroBg');
const heroHeading = document.getElementById('heroHeading');
const heroHeadingRed = document.getElementById('heroHeadingRed');
const heroText = document.getElementById('heroText');
const slideCurrent = document.getElementById('slideCurrent');
const slideFill = document.getElementById('slideFill');

function renderSlide(index) {
  if (!heroBg || !heroHeading || !heroHeadingRed || !heroText || !slideCurrent || !slideFill) return;
  const slide = heroSlides[index];
  heroBg.style.backgroundImage = "url('" + slide.img + "')";
  heroHeading.firstChild.textContent = slide.line1;
  heroHeadingRed.textContent = slide.line2;
  heroText.textContent = slide.text;
  slideCurrent.textContent = String(index + 1).padStart(2, '0');
  slideFill.style.width = ((index + 1) / heroSlides.length * 100) + '%';
}

if (heroBg && heroHeading) {
  renderSlide(0); // show the first slide immediately on page load

  setInterval(function () {
    currentSlide = (currentSlide + 1) % heroSlides.length; // wrap back to 0 after the last slide
    renderSlide(currentSlide);
  }, 6000);
}

/* ============================================
   MOBILE MENU TOGGLE
   ============================================ */
const mobileBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileBtn && mobileMenu) {
  mobileBtn.addEventListener('click', function () {
    mobileMenu.style.display = (mobileMenu.style.display === 'none' || !mobileMenu.style.display) ? 'flex' : 'none';
  });
}

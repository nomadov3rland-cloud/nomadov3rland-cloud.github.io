(() => {
  'use strict';

  // ---- Services menu: hover / focus / click changes the tone + photo ----
  const servicesSection = document.getElementById('services');
  const serviceButtons = Array.from(document.querySelectorAll('.service-btn'));
  const serviceFigs = Array.from(document.querySelectorAll('.service-fig'));
  const serviceMedia = document.querySelector('.service-media');
  const SERVICE_BG = {
    polish: '#b6c2ac',
    correction: '#a9b6c2',
    ceramic: '#b0bac2',
    interior: '#dcb099',
    wheel: '#cf9f8a',
    wash: '#cdb48f'
  };

  function setService(key) {
    if (!key || !SERVICE_BG[key]) return;
    if (servicesSection) servicesSection.style.setProperty('--svc-bg', SERVICE_BG[key]);
    let activeName = key;
    for (const b of serviceButtons) {
      const active = b.dataset.service === key;
      b.setAttribute('aria-pressed', String(active));
      const item = b.closest ? b.closest('.service-item') : null;
      if (item) item.classList.toggle('is-active', active);
      if (active) {
        const nameEl = b.querySelector ? b.querySelector('.service-name') : null;
        if (nameEl) activeName = nameEl.textContent.trim();
      }
    }
    for (const f of serviceFigs) {
      f.classList.toggle('is-active', f.dataset.media === key);
    }
    if (serviceMedia) serviceMedia.setAttribute('aria-label', 'Preview for ' + activeName);
    positionServiceMedia();
  }

  function positionServiceMedia() {
    if (!serviceMedia) return;
    const layout = serviceMedia.parentElement;
    const activeItem = document.querySelector('.service-item.is-active');
    if (!layout || !activeItem) return;
    const label = activeItem.querySelector('.service-name') || activeItem;
    const layoutRect = layout.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const mediaH = serviceMedia.offsetHeight || 0;
    let top = labelRect.top - layoutRect.top - 10;
    top = Math.max(0, Math.min(Math.max(0, layoutRect.height - mediaH), top));
    serviceMedia.style.top = top + 'px';
  }

  for (const b of serviceButtons) {
    const key = b.dataset.service;
    b.addEventListener('pointerenter', () => setService(key));
    b.addEventListener('focus', () => setService(key));
    b.addEventListener('click', () => setService(key));
  }

  if (serviceMedia) {
    positionServiceMedia();
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(positionServiceMedia, 120);
    });
  }

  // ---- Reveal slider (before/after comparison) ----
  const range = document.getElementById('reveal-range');
  const scene = document.getElementById('comparison-scene');
  const value = document.getElementById('reveal-value');
  function updateReveal() {
    const percent = Math.max(0, Math.min(100, Number(range.value) || 0));
    scene.style.setProperty('--split', `${percent}%`);
    value.textContent = `${percent}% after`;
  }
  if (range && scene && value) {
    range.addEventListener('input', updateReveal);
    updateReveal();

    // Draggable comparison: pointer-captured drag on the image (no selection).
    let dragging = false;
    let grabOffset = 0;
    const splitFromPointer = (e) => {
      const rect = scene.getBoundingClientRect();
      if (!rect.width) return Number(range.value);
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left - grabOffset) / rect.width));
      return Math.round((1 - frac) * 100);
    };
    scene.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const rect = scene.getBoundingClientRect();
      const seamX = rect.width ? (1 - Number(range.value) / 100) * rect.width : 0;
      grabOffset = e.clientX - rect.left - seamX;
      dragging = true;
      if (scene.setPointerCapture) { try { scene.setPointerCapture(e.pointerId); } catch (err) {} }
      range.value = String(splitFromPointer(e));
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    scene.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      range.value = String(splitFromPointer(e));
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      if (scene.hasPointerCapture && e.pointerId != null) {
        try { if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };
    scene.addEventListener('pointerup', endDrag);
    scene.addEventListener('pointercancel', endDrag);
    scene.addEventListener('lostpointercapture', () => { dragging = false; });
  }

  // ---- Interactive hero: reversible opening (video scrub) ----
  const video = document.getElementById('patina-video');
  const stage = document.getElementById('patina-stage');
  if (video && stage) {
    const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = 0;
    let target = 0;
    let rafId = null;
    let hoverOpen = false;
    let toggled = false;

    function ensureLoaded() {
      // Lazy-load the car video: don't pull the full clip until a user actually
      // interacts with the hero (mobile bandwidth, faster first paint).
      if (reduced) return;
      if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
    }
    function canSeek() {
      return Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 3 && video.seekable && video.seekable.length > 0;
    }
    function setCurrent(p) {
      if (canSeek()) video.currentTime = p * video.duration;
    }
    function open() {
      return hoverOpen || toggled;
    }
    // The static "open" frame (patina-hero-open.webp) is the guaranteed visible
    // path: shown whenever the car is open but the video can't yet display the
    // open frame (still lazy-loading, or a device without seekable video). It
    // crossfades out once the video has caught up to the open state.
    function updateStatic() {
      stage.classList.toggle('is-open', open() && !canSeek());
    }
    function paint() {
      if (!canSeek()) { rafId = null; updateStatic(); return; }
      current += (target - current) * 0.35;
      if (Math.abs(target - current) < 0.0015) current = target;
      setCurrent(current);
      updateStatic();
      if (Math.abs(target - current) > 0.0005) {
        rafId = requestAnimationFrame(paint);
      } else {
        current = target;
        setCurrent(current);
        updateStatic();
        rafId = null;
      }
    }
    function go(to) {
      target = Math.max(0, Math.min(1, to));
      if (reduced) { current = target; setCurrent(current); updateStatic(); return; }
      if (canSeek() && rafId === null) rafId = requestAnimationFrame(paint);
    }
    // When the lazy video becomes seekable, sync it to the current state: snap
    // straight to the open frame if open (the static frame then crossfades out),
    // or re-apply the closed position — no closed→open flash.
    video.addEventListener('canplay', () => {
      if (open()) { current = 1; target = 1; }
      setCurrent(current);
      updateStatic();
      if (canSeek() && rafId === null && Math.abs(target - current) > 0.0005) rafId = requestAnimationFrame(paint);
    });

    function sync() {
      go(open() ? 1 : 0);
      updateStatic();
    }
    function setToggled(v) {
      toggled = v;
      if (stage.setAttribute) stage.setAttribute('aria-pressed', String(v));
      sync();
    }

    // Desktop: hover to open (plants emerge), leave to reverse.
    stage.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') { ensureLoaded(); hoverOpen = true; sync(); }
    });
    stage.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') { hoverOpen = false; sync(); }
    });

    // Tap / click toggles open↔closed. This is the ONLY touch interaction.
    stage.addEventListener('click', () => { ensureLoaded(); setToggled(!toggled); });

    // Keyboard: Enter / Space toggles open↔closed (stage is focusable via role=button).
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ensureLoaded();
        setToggled(!toggled);
      }
    });
  }
})();

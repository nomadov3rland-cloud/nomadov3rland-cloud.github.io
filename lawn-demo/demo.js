/* Local-only interactions for a fictional portfolio concept. No requests, storage or submissions. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const front = $('front-yard');
  const back = $('back-yard');
  const pets = $('pets-yard');
  const area = $('yard-area');
  const currency = (amount) => `$${amount.toLocaleString('en-US')}`;

  function updateQuote() {
    const squareFeet = Number(area.value);
    $('yard-area-value').textContent = `${squareFeet.toLocaleString('en-US')} sq ft`;
    if (!front.checked && !back.checked) {
      $('quote-result').textContent = 'Select a yard area';
      $('quote-detail').textContent = 'Choose front or back to see a range.';
      return;
    }
    const base = 35 + squareFeet * 0.018 + (back.checked ? 12 : 0) + (pets.checked ? 8 : 0);
    const roundFive = (amount) => Math.round(amount / 5) * 5;
    $('quote-result').textContent = `${currency(roundFive(base * 0.8))}–${currency(roundFive(base * 1.2))}`;
    const sections = [front.checked && 'Front yard', back.checked && 'Back yard', pets.checked && 'Pets in yard'].filter(Boolean);
    $('quote-detail').textContent = `${sections.join(' · ')} · ${squareFeet.toLocaleString('en-US')} sq ft`;
  }
  for (const input of [front, back, pets, area]) {
    input.addEventListener('input', updateQuote);
    input.addEventListener('change', updateQuote);
  }
  updateQuote();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let chosenDate = null;
  let timeOfDay = 'Flexible';
  const longDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  function updatePreference() {
    $('date-preference').textContent = chosenDate
      ? `${longDate.format(chosenDate)} · ${timeOfDay} preference. Availability not checked; no reservation.`
      : 'Select a date from today onward to explore a preference.';
    updateBooking();
  }

  function updateBooking() {
    const summary = $('bk-date-summary');
    if (summary) {
      summary.textContent = chosenDate
        ? `Selected: ${longDate.format(chosenDate)} · ${timeOfDay}`
        : 'No date selected — choose one on the calendar.';
    }
  }

  function renderCalendar() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    $('calendar-month').textContent = monthName.format(visibleMonth);
    $('prev-month').disabled = year === today.getFullYear() && month === today.getMonth();
    const days = $('calendar-days');
    days.replaceChildren();
    const offset = new Date(year, month, 1).getDay();
    for (let i = 0; i < offset; i += 1) {
      const blank = document.createElement('span');
      blank.setAttribute('aria-hidden', 'true');
      days.append(blank);
    }
    const count = new Date(year, month + 1, 0).getDate();
    const selectedHere = chosenDate && chosenDate.getFullYear() === year && chosenDate.getMonth() === month;
    const firstFocusDay = selectedHere ? chosenDate.getDate() :
      (year === today.getFullYear() && month === today.getMonth() ? today.getDate() : 1);
    for (let day = 1; day <= count; day += 1) {
      const date = new Date(year, month, day);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(day);
      button.dataset.dateKey = dateKey(date);
      button.tabIndex = day === firstFocusDay ? 0 : -1;
      button.setAttribute('aria-label', `${longDate.format(date)}; date preference`);
      button.setAttribute('aria-pressed', String(Boolean(chosenDate && dateKey(chosenDate) === dateKey(date))));
      button.disabled = date < today;
      if (dateKey(date) === dateKey(today)) button.classList.add('is-today');
      button.addEventListener('click', () => {
        chosenDate = date;
        renderCalendar();
        days.querySelector('[aria-pressed="true"]')?.focus();
        updatePreference();
      });
      button.addEventListener('keydown', (event) => {
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = new Date(year, month, day + step);
        if (next < today) return;
        visibleMonth = new Date(next.getFullYear(), next.getMonth(), 1);
        renderCalendar();
        const target = Array.from(days.children).find((item) => item.dataset.dateKey === dateKey(next));
        if (target) { target.tabIndex = 0; target.focus(); }
      });
      days.append(button);
    }
  }

  $('prev-month').addEventListener('click', () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  $('next-month').addEventListener('click', () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  document.querySelectorAll('[data-time]').forEach((button) => {
    button.addEventListener('click', () => {
      timeOfDay = button.dataset.time;
      document.querySelectorAll('[data-time]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      updatePreference();
    });
  });
  $('clear-date').addEventListener('click', () => {
    chosenDate = null;
    timeOfDay = 'Flexible';
    document.querySelectorAll('[data-time]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.time === timeOfDay)));
    renderCalendar();
    updatePreference();
    $('calendar-month').focus();
  });

  /* ---------- Booking request (mock) ---------- */
  const bkName = $('bk-name');
  const bkEmail = $('bk-email');
  const bkMessage = $('bk-message');
  const bkSend = $('bk-send');
  const bkConfirm = $('bk-confirm');
  if (bkSend && bkName && bkEmail) {
    const canSend = () => bkName.value.trim() !== '' && bkEmail.value.trim() !== '' && chosenDate !== null;
    const refreshSend = () => {
      bkSend.disabled = !canSend();
      bkConfirm.hidden = true;
      bkSend.textContent = 'Send request';
    };
    [bkName, bkEmail, bkMessage].forEach((el) => {
      el.addEventListener('input', refreshSend);
      el.addEventListener('change', refreshSend);
    });
    bkSend.addEventListener('click', () => {
      if (!canSend()) return;
      const dateStr = chosenDate ? `${longDate.format(chosenDate)} · ${timeOfDay}` : 'no date selected';
      const name = bkName.value.trim();
      const message = bkMessage.value.trim();
      bkConfirm.replaceChildren();
      const line = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = 'Request previewed. ';
      line.appendChild(strong);
      line.appendChild(document.createTextNode(
        `Thanks, ${name}! Your request for ${dateStr} would be emailed to Northwest Lawn Care.`
      ));
      bkConfirm.appendChild(line);
      if (message) {
        const msgLine = document.createElement('p');
        msgLine.textContent = `"${message}"`;
        bkConfirm.appendChild(msgLine);
      }
      const note = document.createElement('p');
      note.textContent = 'Concept mockup — no email is sent and no visit is booked.';
      bkConfirm.appendChild(note);
      bkConfirm.hidden = false;
      bkSend.textContent = 'Preview sent ✓';
    });
    refreshSend();
  }

  renderCalendar();
})();

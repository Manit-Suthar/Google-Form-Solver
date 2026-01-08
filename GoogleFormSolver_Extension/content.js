// GoogleFormSolver/extension/content.js
// ─────────────────────────────────────────────
// Version 19 — Fixed Dropdown Race Condition & Grid Selectors
// ─────────────────────────────────────────────

function simulateHumanClick(element) {
  if (!element) return;
  const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  events.forEach(e => element.dispatchEvent(new PointerEvent(e, { bubbles: true, cancelable: true, view: window })));
}

function fillTextInput(el, value) {
  if (!el) return;
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
}

function isPersonalInfoQuestion(q) {
  return ['name', 'email', 'enrollment', 'roll', 'id', 'contact', 'phone']
    .some(k => q.toLowerCase().includes(k));
}

// ─────────────────────────────────────────────
// MAIN LISTENER
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {

  // ========== SCRAPE QUESTIONS ==========
  if (req.action === 'getQuestions') {
    console.log('🧠 Scraping (v19)...');
    const questionsData = [];
    const dropdownPromises = []; // To handle asynchronous dropdown scraping

    document.querySelectorAll('.geS5n').forEach((block, index) => {
      const qEl = block.querySelector('.M7eMe');
      if (!qEl) return;
      const qText = qEl.innerText.trim();
      const blockId = `gfs-block-${index}`;
      block.setAttribute('data-gfs-id', blockId);

      let options = [];
      let type = 'text';
      let gridData = {};
      let isGrid = false;

      // === Radio / Checkbox ===
      const choiceOpts = [...block.querySelectorAll('.ulDsOb span')].map(o => o.innerText.trim());
      if (choiceOpts.length > 0) {
        options = choiceOpts;
        type = block.querySelector('div[role="checkbox"]') ? 'checkbox' : 'radio';
      }

      // === DROPDOWN (FIXED) ===
      const dropdownBtn = block.querySelector('div[role="listbox"]');
      if (dropdownBtn) {
        type = 'dropdown';
        // --- FIX 1: Use a Promise and setTimeout to handle the async nature of dropdowns ---
        const dropdownPromise = new Promise(resolve => {
            simulateHumanClick(dropdownBtn);
            setTimeout(() => {
                const tempOpts = [...document.querySelectorAll('div[role="option"] .vRMGwf')]
                    .map(o => o.innerText.trim())
                    .filter(t => t);
                simulateHumanClick(document.body); // Close dropdown
                resolve(tempOpts); // Resolve promise with the extracted options
            }, 300); // 300ms delay to allow menu to render
        });
        dropdownPromises.push(dropdownPromise.then(opts => {
            // Find the question this belongs to and update its options
            const questionToUpdate = questionsData.find(q => q.blockId === blockId);
            if (questionToUpdate) {
                questionToUpdate.options = opts;
            }
        }));
      }

      // === LINEAR SCALE ===
      const scaleLabels = block.querySelectorAll('.oyXaNc');
      if (scaleLabels.length >= 2) {
        type = 'linear_scale';
        options = [...scaleLabels].map(l => l.textContent.trim());
      }

      // === GRID (FIXED) ===
      // --- FIX 2: Updated class selectors for rows and columns ---
      const rows = [...block.querySelectorAll('.T5pScc')]
        .map(r => r.textContent.trim()).filter(Boolean);
      const cols = [...block.querySelectorAll('.HbaRDe')]
        .map(c => c.textContent.trim()).filter(Boolean);
      
      if (rows.length && cols.length) {
        gridData = { rows, columns: cols };
        type = 'grid';
        isGrid = true;
      }

      // === DATE / TIME ===
      if (block.querySelector('input[type="date"]')) type = 'date';
      if (block.querySelector('input[type="time"]')) type = 'time';

      // === TEXT / PARAGRAPH ===
      if (block.querySelector('textarea')) type = 'paragraph';
      else if (block.querySelector('input[type="text"]')) type = 'short_text';

      questionsData.push({
        blockId,
        question: qText,
        type,
        isPersonalInfo: isPersonalInfoQuestion(qText),
        options,
        isGrid,
        gridData
      });
    });

    // Wait for all dropdowns to be scraped before sending the response
    Promise.all(dropdownPromises).then(() => {
        console.log('Scraping complete:', questionsData);
        sendResponse({ questions: questionsData });
    });

    // We must return true because we are sending the response asynchronously
    return true; 
  }

  // ========== AUTOFILL ==========
  if (req.action === 'autofillForm') {
    // ... (Your autofill code remains the same and should work with the corrected data)
    console.log('✍️ Autofilling (v19)...');

    req.answers.forEach(ansObj => {
      const block = document.querySelector(`[data-gfs-id="${ansObj.blockId}"]`);
      if (!block) return;
      const answer = ansObj.answer.trim();

      // TEXT
      const textInput = block.querySelector('input[type="text"], textarea');
      if (textInput) { fillTextInput(textInput, answer); return; }

      // DATE / TIME
      const dateInput = block.querySelector('input[type="date"]');
      if (dateInput) { fillTextInput(dateInput, answer); return; }
      const timeInput = block.querySelector('input[type="time"]');
      if (timeInput) { fillTextInput(timeInput, answer); return; }

      // DROPDOWN
      const dropdownBtn = block.querySelector('div[role="listbox"]');
      if (dropdownBtn) {
        simulateHumanClick(dropdownBtn);
        setTimeout(() => {
          const optionsInMenu = document.querySelectorAll('div[role="option"] .vRMGwf');
          for (const opt of optionsInMenu) {
            if (opt.textContent.trim().toLowerCase() === answer.toLowerCase()) {
              simulateHumanClick(opt);
              break;
            }
          }
        }, 600);
        return;
      }

      // GRID
      if (answer.includes(':')) {
        const pairs = answer.split('\n');
        pairs.forEach(line => {
          const [rowLabel, colChoice] = line.split(':').map(s => s.trim());
          const rows = block.querySelectorAll('.MzaqHf'); // Row container
          rows.forEach(row => {
            const rowHeader = row.querySelector('.T5pScc');
            if (rowHeader && rowHeader.textContent.trim() === rowLabel) {
              const cols = [...block.querySelectorAll('.HbaRDe')];
              cols.forEach((col, i) => {
                if (col.textContent.trim() === colChoice) {
                  const radios = row.querySelectorAll('div[role="radio"], div[role="checkbox"]');
                  simulateHumanClick(radios[i]);
                }
              });
            }
          });
        });
        return;
      }

      // CHECKBOX
      if (answer.includes(',')) {
        const selections = answer.split(',').map(s => s.trim().toLowerCase());
        const options = block.querySelectorAll('.ulDsOb span');
        options.forEach(o => {
          if (selections.includes(o.innerText.trim().toLowerCase())) {
            simulateHumanClick(o.closest('label'));
          }
        });
        return;
      }

      // RADIO
      const radios = block.querySelectorAll('.ulDsOb span');
      for (const r of radios) {
        if (r.innerText.trim().toLowerCase() === answer.toLowerCase()) {
          simulateHumanClick(r.closest('label'));
          break;
        }
      }

      // LINEAR SCALE
      const scaleChoices = block.querySelectorAll('div[role="radio"]');
      for (const sc of scaleChoices) {
        const label = sc.getAttribute('aria-label') || sc.textContent.trim();
        if (label === answer) { simulateHumanClick(sc); break; }
      }
    });

    sendResponse({ status: '✅ Autofill complete! Verify before submitting.' });
  }

  return true;
});
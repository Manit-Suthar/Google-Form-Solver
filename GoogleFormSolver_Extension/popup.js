// GoogleFormSolver/extension/popup.js (Version 10.0 - The Orchestrator)

// UI Elements
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const userEnrollmentInput = document.getElementById('userEnrollment');
const saveInfoBtn = document.getElementById('saveInfoBtn');
const extractBtn = document.getElementById('extractBtn');
const solveBtn = document.getElementById('solveBtn');
const autofillBtn = document.getElementById('autofillBtn');
const resultsContainer = document.getElementById('resultsContainer');
const statusEl = document.getElementById('status');

let extractedQuestions = [];
let finalAnswersForAutofill = [];

function setStatus(text) { statusEl.textContent = "Status: " + text; }

// --- USER INFO HANDLING ---
saveInfoBtn.addEventListener('click', () => {
  const userInfo = { name: userNameInput.value, email: userEmailInput.value, enrollment: userEnrollmentInput.value };
  chrome.storage.local.set({ gfsUserInfo: userInfo }, () => { setStatus('User info saved!'); });
});

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('gfsUserInfo', (data) => {
    if (data.gfsUserInfo) {
      userNameInput.value = data.gfsUserInfo.name || '';
      userEmailInput.value = data.gfsUserInfo.email || '';
      userEnrollmentInput.value = data.gfsUserInfo.enrollment || '';
    }
  });
});

// --- CORE WORKFLOW ---
extractBtn.addEventListener('click', () => {
  setStatus("extracting questions...");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "getQuestions" }, (response) => {
      if (!response || !response.questions) { setStatus('Failed to extract.'); return; }
      extractedQuestions = response.questions;
      // Display logic (same as before)
      resultsContainer.innerHTML = extractedQuestions.map((q, i) => `<div class="question-item">${i+1}. ${q.question}</div>`).join('');
      solveBtn.disabled = false;
      setStatus(`Extracted ${extractedQuestions.length} questions.`);
    });
  });
});

solveBtn.addEventListener('click', async () => {
  if (extractedQuestions.length === 0) return;
  setStatus("getting answers...");
  solveBtn.disabled = true;

  const userInfo = (await chrome.storage.local.get('gfsUserInfo')).gfsUserInfo || {};
  const questionsForBackend = [];
  finalAnswersForAutofill = [];

  extractedQuestions.forEach(q => {
    let personalAnswer = null;
    if (q.isPersonalInfo) {
      if (q.question.toLowerCase().includes('name')) personalAnswer = userInfo.name;
      else if (q.question.toLowerCase().includes('email')) personalAnswer = userInfo.email;
      else if (q.question.toLowerCase().includes('enrollment')) personalAnswer = userInfo.enrollment;
    }
    
    if (personalAnswer) {
      finalAnswersForAutofill.push({ blockId: q.blockId, answer: personalAnswer });
    } else {
      questionsForBackend.push(q);
    }
  });
  
  if (questionsForBackend.length === 0) { // Only personal questions were found
    autofillBtn.disabled = false;
    setStatus('Ready to autofill personal info.');
    return;
  }
  
  const resp = await fetch("http://localhost:5000/solve", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions: questionsForBackend })
  });
  const data = await resp.json();
  
  let aiAnswerIndex = 0;
  questionsForBackend.forEach(q => {
    finalAnswersForAutofill.push({ blockId: q.blockId, answer: data.answers[aiAnswerIndex] });
    aiAnswerIndex++;
  });
  
  // Display all answers...
  resultsContainer.innerHTML = finalAnswersForAutofill.map((ans, i) => {
      const q = extractedQuestions.find(q => q.blockId === ans.blockId);
      return `<div class="result-item"><p>${i+1}. ${q.question}</p><div class="answer"><strong>Answer:</strong> ${ans.answer}</div></div>`
  }).join('');
  
  autofillBtn.disabled = false;
  setStatus('Ready to autofill!');
});

autofillBtn.addEventListener('click', () => {
  if (finalAnswersForAutofill.length === 0) return;
  setStatus('Autofilling form...');
  autofillBtn.disabled = true;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'autofillForm', answers: finalAnswersForAutofill }, (response) => {
      setStatus(response.status);
    });
  });
});
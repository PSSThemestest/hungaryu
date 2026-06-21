import { FOOD_DICTIONARY, PHRASES, TRAVEL_INFO } from './dictionary.js';

// ==========================================
// Application State
// ==========================================
const state = {
  theme: 'dark',
  activeTab: 'calculator',
  // Default exchange rate: 100 HUF = 1.50 RON
  rate100HufToRon: 1.5000,
  lastUpdated: null,
  isManualRate: false,
  manualRate: 1.5000,
  
  // Dictionary filtering
  dictSearchQuery: '',
  dictActiveCategory: 'all',
  
  // Phrasebook filtering
  phraseSearchQuery: ''
};

// API Endpoint for exchange rates
const EXCHANGE_RATE_API = 'https://api.frankfurter.app/latest?from=HUF&to=RON';

// ==========================================
// DOM Elements
// ==========================================
let elements = {};

function initDOMElements() {
  elements = {
    themeToggle: document.getElementById('theme-toggle'),
    navItems: document.querySelectorAll('.nav-item'),
    tabViews: document.querySelectorAll('.tab-view'),
    
    // Currency Converter
    inputHuf: document.getElementById('currency-huf'),
    inputRon: document.getElementById('currency-ron'),
    btnQuickAdds: document.querySelectorAll('.btn-quick-add'),
    btnQuickAddsRon: document.querySelectorAll('.btn-quick-add-ron'),
    btnClear: document.getElementById('btn-clear'),
    displayCurrentRate: document.getElementById('current-rate-display'),
    displayRateLastUpdated: document.getElementById('rate-last-updated'),
    btnToggleRateSettings: document.getElementById('btn-toggle-rate-settings'),
    panelRateSettings: document.getElementById('rate-settings-panel'),
    chkManualRate: document.getElementById('chk-manual-rate'),
    containerManualRate: document.getElementById('manual-rate-container'),
    inputManualRate: document.getElementById('input-manual-rate'),
    
    // Cheat sheet elements
    cheat200: document.getElementById('cheat-200'),
    cheat500: document.getElementById('cheat-500'),
    cheat1000: document.getElementById('cheat-1000'),
    cheat2000: document.getElementById('cheat-2000'),
    cheat5000: document.getElementById('cheat-5000'),
    cheat10000: document.getElementById('cheat-10000'),
    cheat20000: document.getElementById('cheat-20000'),

    // Dictionary
    inputDictSearch: document.getElementById('dict-search'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    categoryPills: document.querySelectorAll('.category-filters .pill'),
    containerDictResults: document.getElementById('dict-results-container'),
    
    // Text Translator
    btnSwapLanguages: document.getElementById('btn-swap-languages'),
    lblSourceLang: document.getElementById('lbl-source-lang'),
    lblTargetLang: document.getElementById('lbl-target-lang'),
    inputTranslate: document.getElementById('translate-input'),
    btnPasteTranslate: document.getElementById('btn-paste-translate'),
    btnRunTranslation: document.getElementById('btn-run-translation'),
    wrapperTranslateOutput: document.getElementById('translation-output-wrapper'),
    textTranslateOutput: document.getElementById('translation-output-text'),
    btnCopyTranslation: document.getElementById('btn-copy-translation'),
    
    // Guide / Info
    inputPhrasesSearch: document.getElementById('phrases-search-input'),
    containerPhrases: document.getElementById('phrases-container'),
    containerTips: document.getElementById('tips-container'),
    containerEmergency: document.getElementById('emergency-container')
  };
}

// ==========================================
// PWA Service Worker Registration
// ==========================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker înregistrat cu succes:', reg.scope))
        .catch(err => console.error('Eroare înregistrare Service Worker:', err));
    });
  }
}

// ==========================================
// Theme Management
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  state.theme = savedTheme;
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
  });
}

// ==========================================
// Tab Routing Management
// ==========================================
function initNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Update Bottom Nav
  elements.navItems.forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Update Views
  elements.tabViews.forEach(view => {
    const viewId = view.getAttribute('id');
    if (viewId === `view-${tabId}`) {
      view.classList.add('active');
      
      // Auto-focus logic when switching tabs
      if (tabId === 'menu') {
        setTimeout(() => elements.inputDictSearch.focus(), 150);
      } else if (tabId === 'translator') {
        setTimeout(() => elements.inputTranslate.focus(), 150);
      }
    } else {
      view.classList.remove('active');
    }
  });
  
  // Scroll to top when switching view
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// Currency Converter Logic
// ==========================================
async function fetchExchangeRate() {
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    if (!response.ok) throw new Error('API network response was not ok');
    const data = await response.json();
    
    // Frankfurter returns "rates": { "RON": value } where value is for 1 HUF.
    const hufToRonUnit = data.rates.RON;
    // Calculate rate for 100 HUF
    const fetchedRate = hufToRonUnit * 100;
    
    state.rate100HufToRon = fetchedRate;
    state.lastUpdated = new Date();
    
    // Save to cache
    localStorage.setItem('cached_rate_100huf', fetchedRate.toString());
    localStorage.setItem('cached_rate_time', state.lastUpdated.toISOString());
    
    console.log(`Curs actualizat de pe API: 100 HUF = ${fetchedRate.toFixed(4)} RON`);
    updateRateUI();
  } catch (error) {
    console.warn('Nu s-a putut descărca cursul valutar, se folosește cache-ul sau rata implicită:', error);
    loadCachedExchangeRate();
  }
}

function loadCachedExchangeRate() {
  const cachedRate = localStorage.getItem('cached_rate_100huf');
  const cachedTime = localStorage.getItem('cached_rate_time');
  
  if (cachedRate) {
    state.rate100HufToRon = parseFloat(cachedRate);
  }
  if (cachedTime) {
    state.lastUpdated = new Date(cachedTime);
  }
  updateRateUI();
}

function getActiveRate() {
  return state.isManualRate ? state.manualRate : state.rate100HufToRon;
}

function updateRateUI() {
  const activeRate = getActiveRate();
  elements.displayCurrentRate.textContent = `100 HUF = ${activeRate.toFixed(2)} RON`;
  
  if (state.isManualRate) {
    elements.displayRateLastUpdated.textContent = 'Curs setat manual de către utilizator';
    elements.displayRateLastUpdated.style.color = 'var(--accent-gold)';
  } else if (state.lastUpdated) {
    const formattedTime = state.lastUpdated.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = state.lastUpdated.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' });
    elements.displayRateLastUpdated.textContent = `Actualizat: ${formattedDate} la ${formattedTime}`;
    elements.displayRateLastUpdated.style.color = '';
  } else {
    elements.displayRateLastUpdated.textContent = 'Actualizat: Offline / Implicit';
  }
  
  // Re-run any existing inputs & update cheat sheet
  convertHufToRon();
  updateCheatSheet();
}

function convertHufToRon() {
  const hufVal = parseFloat(elements.inputHuf.value);
  if (isNaN(hufVal) || hufVal < 0) {
    elements.inputRon.value = '';
    return;
  }
  const rate = getActiveRate();
  const ronVal = hufVal * (rate / 100);
  elements.inputRon.value = ronVal.toFixed(2);
}

function convertRonToHuf() {
  const ronVal = parseFloat(elements.inputRon.value);
  if (isNaN(ronVal) || ronVal < 0) {
    elements.inputHuf.value = '';
    return;
  }
  const rate = getActiveRate();
  const hufVal = ronVal / (rate / 100);
  // HUF does not use cents, round to integer
  elements.inputHuf.value = Math.round(hufVal);
}

function updateCheatSheet() {
  const rate = getActiveRate() / 100;
  
  const points = [200, 500, 1000, 2000, 5000, 10000, 20000];
  points.forEach(pt => {
    const ronEquivalent = pt * rate;
    const element = document.getElementById(`cheat-${pt}`);
    if (element) {
      element.textContent = `${ronEquivalent.toFixed(2)} RON`;
    }
  });
}

function initCalculator() {
  // Input Listeners
  elements.inputHuf.addEventListener('input', () => {
    convertHufToRon();
  });
  
  elements.inputRon.addEventListener('input', () => {
    convertRonToHuf();
  });
  
  // Quick Add HUF Buttons
  elements.btnQuickAdds.forEach(btn => {
    btn.addEventListener('click', () => {
      const amountToAdd = parseInt(btn.getAttribute('data-amount'));
      let currentVal = parseInt(elements.inputHuf.value) || 0;
      elements.inputHuf.value = currentVal + amountToAdd;
      convertHufToRon();
    });
  });
  
  // Quick Add RON Buttons
  elements.btnQuickAddsRon.forEach(btn => {
    btn.addEventListener('click', () => {
      const amountToAdd = parseInt(btn.getAttribute('data-amount'));
      let currentVal = parseFloat(elements.inputRon.value) || 0;
      elements.inputRon.value = (currentVal + amountToAdd).toFixed(2);
      convertRonToHuf();
    });
  });
  
  // Clear Button
  elements.btnClear.addEventListener('click', () => {
    elements.inputHuf.value = '';
    elements.inputRon.value = '';
  });
  
  // Rate Settings Toggle
  elements.btnToggleRateSettings.addEventListener('click', () => {
    elements.panelRateSettings.classList.toggle('hidden');
  });
  
  // Manual Rate Checkbox
  const savedIsManual = localStorage.getItem('is_manual_rate') === 'true';
  state.isManualRate = savedIsManual;
  elements.chkManualRate.checked = savedIsManual;
  
  const savedManualRate = localStorage.getItem('manual_rate_val');
  if (savedManualRate) {
    state.manualRate = parseFloat(savedManualRate);
    elements.inputManualRate.value = savedManualRate;
  }
  
  if (savedIsManual) {
    elements.containerManualRate.classList.remove('hidden');
  }
  
  elements.chkManualRate.addEventListener('change', (e) => {
    state.isManualRate = e.target.checked;
    localStorage.setItem('is_manual_rate', state.isManualRate.toString());
    
    if (state.isManualRate) {
      elements.containerManualRate.classList.remove('hidden');
    } else {
      elements.containerManualRate.classList.add('hidden');
    }
    updateRateUI();
  });
  
  elements.inputManualRate.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      state.manualRate = val;
      localStorage.setItem('manual_rate_val', val.toString());
      updateRateUI();
    }
  });

  // Load Initial Rate Cache & Fetch Live
  loadCachedExchangeRate();
  fetchExchangeRate();
  
  // Periodically refresh currency (every 10 minutes when online)
  setInterval(() => {
    if (navigator.onLine && !state.isManualRate) {
      fetchExchangeRate();
    }
  }, 10 * 60 * 1000);
}

// ==========================================
// Dictionary / Menu Search Logic
// ==========================================
function getCategoryLabel(cat) {
  const mapping = {
    'supe-ciorbe': 'Supă/Ciorbă',
    'feluri-principale': 'Fel principal',
    'aperitive-garnituri': 'Gustare/Garnitură',
    'deserturi': 'Desert',
    'bauturi': 'Băutură',
    'ingrediente-altele': 'Ingrediente/Altele'
  };
  return mapping[cat] || cat;
}

function renderDictionary() {
  const container = elements.containerDictResults;
  container.innerHTML = '';
  
  // Filter items
  const filtered = FOOD_DICTIONARY.filter(item => {
    const matchesCategory = state.dictActiveCategory === 'all' || item.cat === state.dictActiveCategory;
    
    const query = state.dictSearchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;
    
    // Simple accent normalization for basic Romanian/Hungarian search matching
    const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const normalizedQuery = normalize(query);
    const matchesHu = normalize(item.hu).includes(normalizedQuery);
    const matchesRo = normalize(item.ro).includes(normalizedQuery);
    const matchesDesc = normalize(item.desc).includes(normalizedQuery);
    
    return matchesCategory && (matchesHu || matchesRo || matchesDesc);
  });
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">Nu s-a găsit niciun preparat în dicționar.</div>';
    return;
  }
  
  filtered.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'dict-item';
    
    itemEl.innerHTML = `
      <div class="dict-header">
        <span class="dict-hu">${escapeHTML(item.hu)}</span>
        <span class="dict-ro">${escapeHTML(item.ro)}</span>
      </div>
      <div class="dict-desc">${escapeHTML(item.desc)}</div>
      <span class="dict-cat-tag">${escapeHTML(getCategoryLabel(item.cat))}</span>
    `;
    container.appendChild(itemEl);
  });
}

function initDictionary() {
  // Search Input
  elements.inputDictSearch.addEventListener('input', (e) => {
    state.dictSearchQuery = e.target.value;
    toggleClearSearchBtn();
    renderDictionary();
  });
  
  // Clear Search button
  elements.btnClearSearch.addEventListener('click', () => {
    elements.inputDictSearch.value = '';
    state.dictSearchQuery = '';
    toggleClearSearchBtn();
    renderDictionary();
    elements.inputDictSearch.focus();
  });
  
  // Category Pills
  elements.categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      
      state.dictActiveCategory = pill.getAttribute('data-cat');
      renderDictionary();
    });
  });
  
  toggleClearSearchBtn();
  renderDictionary();
}

function toggleClearSearchBtn() {
  if (state.dictSearchQuery.length > 0) {
    elements.btnClearSearch.style.display = 'block';
  } else {
    elements.btnClearSearch.style.display = 'none';
  }
}

// ==========================================
// Online Text Translator Logic
// ==========================================
let translationDirection = 'hu|ro'; // Hungarian to Romanian

function swapLanguages() {
  if (translationDirection === 'hu|ro') {
    translationDirection = 'ro|hu';
    elements.lblSourceLang.textContent = 'Română';
    elements.lblTargetLang.textContent = 'Maghiară';
    elements.inputTranslate.placeholder = 'Scrie sau lipește textul în română...';
  } else {
    translationDirection = 'hu|ro';
    elements.lblSourceLang.textContent = 'Maghiară';
    elements.lblTargetLang.textContent = 'Română';
    elements.inputTranslate.placeholder = 'Scrie sau lipește textul în maghiară...';
  }
  // Clear previous output when swapping languages
  elements.wrapperTranslateOutput.classList.add('hidden');
}

async function runTextTranslation() {
  const text = elements.inputTranslate.value.trim();
  if (!text) return;
  
  elements.btnRunTranslation.textContent = 'Se traduce...';
  elements.btnRunTranslation.disabled = true;
  
  try {
    // Check network status
    if (!navigator.onLine) {
      throw new Error('Ești offline. Traducerea liberă necesită internet.');
    }
    
    // MyMemory Translation API (Free tier, no keys required, 1000 words/day quota)
    const apiURL = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${translationDirection}`;
    const response = await fetch(apiURL);
    if (!response.ok) throw new Error('Translator API error');
    
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      let translated = data.responseData.translatedText;
      // Clean up potential html entities returned by MyMemory
      translated = decodeHTMLEntities(translated);
      
      elements.textTranslateOutput.textContent = translated;
      elements.wrapperTranslateOutput.classList.remove('hidden');
      
      // Scroll output into view
      elements.wrapperTranslateOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      throw new Error('Nu s-a primit un rezultat valid de la traducător.');
    }
  } catch (error) {
    alert(error.message || 'Eroare la traducere. Verifică conexiunea la internet.');
  } finally {
    elements.btnRunTranslation.textContent = 'Traduce online';
    elements.btnRunTranslation.disabled = false;
  }
}

function initTranslator() {
  elements.btnSwapLanguages.addEventListener('click', swapLanguages);
  
  elements.btnRunTranslation.addEventListener('click', runTextTranslation);
  
  // Clipboard Paste helper
  elements.btnPasteTranslate.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        elements.inputTranslate.value = text;
        elements.inputTranslate.dispatchEvent(new Event('input'));
      } else {
        // Fallback warning if browser blocks API
        alert('Te rugăm să lipești manual în caseta de text (apăsare lungă în câmpul de text).');
      }
    } catch (err) {
      console.warn('Nu s-a putut accesa clipboard-ul automat:', err);
      alert('Te rugăm să lipești manual în caseta de text (apăsare lungă în câmpul de text).');
    }
  });
  
  // Copy to clipboard translation result
  elements.btnCopyTranslation.addEventListener('click', async () => {
    const textToCopy = elements.textTranslateOutput.textContent;
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Feedback button state
      const originalSVG = elements.btnCopyTranslation.innerHTML;
      elements.btnCopyTranslation.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => {
        elements.btnCopyTranslation.innerHTML = originalSVG;
      }, 1500);
    } catch (err) {
      console.error('Eroare la copiere text:', err);
    }
  });
}

// ==========================================
// Guide / Phrases & Info Panel Logic
// ==========================================
function renderPhrases() {
  const container = elements.containerPhrases;
  container.innerHTML = '';
  
  const query = state.phraseSearchQuery.toLowerCase().trim();
  const filtered = PHRASES.filter(phrase => {
    if (!query) return true;
    const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedQuery = normalize(query);
    
    return normalize(phrase.hu).includes(normalizedQuery) || 
           normalize(phrase.ro).includes(normalizedQuery) || 
           (phrase.context && normalize(phrase.context).includes(normalizedQuery));
  });
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="no-results">Nu s-au găsit expresii.</div>';
    return;
  }
  
  filtered.forEach(phrase => {
    const phraseEl = document.createElement('div');
    phraseEl.className = 'phrase-item';
    
    phraseEl.innerHTML = `
      <div class="phrase-top">
        <span class="phrase-hu">${escapeHTML(phrase.hu)}</span>
        <span class="phrase-ro">${escapeHTML(phrase.ro)}</span>
      </div>
      <div class="phrase-pron">Pronunție: "${escapeHTML(phrase.pron)}"</div>
      ${phrase.context ? `<div class="phrase-context">${escapeHTML(phrase.context)}</div>` : ''}
    `;
    container.appendChild(phraseEl);
  });
}

function renderGuide() {
  // Render phrases list
  renderPhrases();
  
  // Render travel tips accordion
  const tipsContainer = elements.containerTips;
  tipsContainer.innerHTML = '';
  
  TRAVEL_INFO.tips.forEach((tip, idx) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'accordion-item';
    
    // Markdown-like bold formatting parsed simply (**text** -> <strong>text</strong>)
    const formattedText = tip.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    itemEl.innerHTML = `
      <div class="accordion-header" data-index="${idx}">
        <span>${escapeHTML(tip.title)}</span>
        <svg class="accordion-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="accordion-content">
        <p>${formattedText}</p>
      </div>
    `;
    
    // Accordion Toggle Click
    itemEl.querySelector('.accordion-header').addEventListener('click', () => {
      const isOpen = itemEl.classList.contains('open');
      
      // Close all others first
      document.querySelectorAll('.accordion-item').forEach(acc => acc.classList.remove('open'));
      
      if (!isOpen) {
        itemEl.classList.add('open');
      }
    });
    
    tipsContainer.appendChild(itemEl);
  });
  
  // Render Emergency Numbers
  const emergencyContainer = elements.containerEmergency;
  emergencyContainer.innerHTML = '';
  
  TRAVEL_INFO.emergency.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'emergency-item';
    
    // Clean numeric value for telephone link
    const telValue = item.value.replace(/\s+/g, '');
    const isLocalNumber = item.value.length <= 4; // Local shortcodes like 112, 104
    
    itemEl.innerHTML = `
      <span class="emergency-label">${escapeHTML(item.name)}</span>
      <a href="tel:${isLocalNumber ? telValue : telValue}" class="emergency-phone">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        ${escapeHTML(item.value)}
      </a>
    `;
    emergencyContainer.appendChild(itemEl);
  });
}

function initGuide() {
  elements.inputPhrasesSearch.addEventListener('input', (e) => {
    state.phraseSearchQuery = e.target.value;
    renderPhrases();
  });
  
  renderGuide();
}

// ==========================================
// Helper Utility Functions
// ==========================================
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function decodeHTMLEntities(text) {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

// ==========================================
// Initialization Entry Point
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initDOMElements();
  initTheme();
  initNavigation();
  initCalculator();
  initDictionary();
  initTranslator();
  initGuide();
  registerServiceWorker();
});

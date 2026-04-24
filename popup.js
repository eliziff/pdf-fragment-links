// Default settings
const DEFAULT_SETTINGS = {
  linkFormat: 'justUrl',
  customText: '',
  bold: false,
  italic: false,
  underline: false,
  textColor: '#000000',
  clipboardQuotes: false,  // For "Use clipboard text" option
  withQuotes: false,        // For "Append [Link]" option
  optionsExpanded: false    // Whether options menu is expanded
};

// Load settings from storage
async function loadSettings() {
  try {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      console.error('chrome.storage.sync not available');
      return DEFAULT_SETTINGS;
    }
    const result = await chrome.storage.sync.get('linkSettings');
    console.log('Settings loaded from storage:', result.linkSettings);
    return result.linkSettings || DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to storage
async function saveSettings(settings) {
  try {
    if (!chrome || !chrome.storage || !chrome.storage.sync) {
      console.error('chrome.storage.sync not available');
      return;
    }
    await chrome.storage.sync.set({ linkSettings: settings });
    console.log('Settings saved to storage:', settings);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Get current settings from UI
function getCurrentSettings() {
  const settings = {
    linkFormat: document.querySelector('input[name="linkFormat"]:checked').value,
    customText: document.getElementById('customTextInput').value,
    bold: document.querySelector('[data-format="bold"]').classList.contains('active'),
    italic: document.querySelector('[data-format="italic"]').classList.contains('active'),
    underline: document.querySelector('[data-format="underline"]').classList.contains('active'),
    textColor: document.getElementById('textColor').value,
    clipboardQuotes: document.getElementById('clipboardQuotes').checked,
    withQuotes: document.getElementById('withQuotes').checked,
    optionsExpanded: document.getElementById('optionsToggle').classList.contains('expanded')
  };
  return settings;
}

// Apply settings to UI
function applySettingsToUI(settings) {
  // Set radio button
  const radio = document.querySelector(`input[name="linkFormat"][value="${settings.linkFormat}"]`);
  if (radio) radio.checked = true;

  // Set custom text
  document.getElementById('customTextInput').value = settings.customText || '';

  // Set format buttons
  document.querySelector('[data-format="bold"]').classList.toggle('active', settings.bold);
  document.querySelector('[data-format="italic"]').classList.toggle('active', settings.italic);
  document.querySelector('[data-format="underline"]').classList.toggle('active', settings.underline);

  // Set color
  document.getElementById('textColor').value = settings.textColor || '#000000';

  // Set quotes checkboxes
  document.getElementById('clipboardQuotes').checked = settings.clipboardQuotes || false;
  document.getElementById('withQuotes').checked = settings.withQuotes || false;

  // Set options expanded state
  const isExpanded = settings.optionsExpanded || false;
  document.getElementById('optionsToggle').classList.toggle('expanded', isExpanded);
  document.getElementById('optionsContent').classList.toggle('expanded', isExpanded);

  // Show/hide relevant sections
  updateVisibleSections(settings.linkFormat);
}

// Update which sections are visible based on selected option
function updateVisibleSections(selectedOption) {
  document.getElementById('customTextSection').classList.toggle('visible', selectedOption === 'customText');
  document.getElementById('clipboardTextOptions').classList.toggle('visible', selectedOption === 'clipboardText');
  document.getElementById('linkTagOptions').classList.toggle('visible', selectedOption === 'withLinkTag');
}

// Show status message
function showStatus(message, type = 'success') {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 2500);
}

// Initialize popup
async function init() {
  // Load and apply saved settings
  const settings = await loadSettings();
  applySettingsToUI(settings);

  // Options toggle functionality
  const optionsToggle = document.getElementById('optionsToggle');
  const optionsContent = document.getElementById('optionsContent');

  optionsToggle.addEventListener('click', async () => {
    const isExpanded = optionsToggle.classList.toggle('expanded');
    optionsContent.classList.toggle('expanded', isExpanded);

    // Save the expanded state
    const newSettings = getCurrentSettings();
    await saveSettings(newSettings);
  });

  // Radio button change handler
  document.querySelectorAll('input[name="linkFormat"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      updateVisibleSections(e.target.value);
      const newSettings = getCurrentSettings();
      await saveSettings(newSettings);
    });
  });

  // Format button handlers
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.classList.toggle('active');
      const newSettings = getCurrentSettings();
      await saveSettings(newSettings);
    });
  });

  // Custom text input handler
  document.getElementById('customTextInput').addEventListener('input', async () => {
    const newSettings = getCurrentSettings();
    await saveSettings(newSettings);
  });

  // Color picker handler
  document.getElementById('textColor').addEventListener('change', async () => {
    const newSettings = getCurrentSettings();
    await saveSettings(newSettings);
  });

  // Quotes checkboxes handlers
  document.getElementById('clipboardQuotes').addEventListener('change', async () => {
    const newSettings = getCurrentSettings();
    await saveSettings(newSettings);
  });

  document.getElementById('withQuotes').addEventListener('change', async () => {
    const newSettings = getCurrentSettings();
    await saveSettings(newSettings);
  });

  // Reset button handler
  document.getElementById('resetBtn').addEventListener('click', async () => {
    await saveSettings(DEFAULT_SETTINGS);
    applySettingsToUI(DEFAULT_SETTINGS);
    showStatus('Settings reset to default', 'success');
  });

  // Build Link button handler
  document.getElementById('buildLinkBtn').addEventListener('click', async () => {
    try {
      // Send message to background script to build the link
      const response = await chrome.runtime.sendMessage({ action: 'buildLink' });

      if (response.success) {
        showStatus('Link copied to clipboard!', 'success');
      } else {
        showStatus(response.error || 'Failed to build link', 'error');
      }
    } catch (error) {
      console.error('Error building link:', error);
      showStatus('Error: ' + error.message, 'error');
    }
  });
}

// Run initialization when popup opens
init();

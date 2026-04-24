// Text fragment encoding function (ported from Fragger.html)
function encodeTextFragment(text) {
  return encodeURIComponent(text)
    .replace(/-/g, '%2D')
    .replace(/&/g, '%26')
    .replace(/,/g, '%2C');
}

// Get text from clipboard using execCommand
async function readClipboard(tabId) {
  try {
    console.log('[DEBUG] Reading clipboard using execCommand paste');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Read from clipboard using execCommand
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);

        textarea.focus();
        const pasteSuccess = document.execCommand('paste');
        const clipboardText = textarea.value;
        document.body.removeChild(textarea);

        console.log('[DEBUG] execCommand paste success:', pasteSuccess, 'text length:', clipboardText ? clipboardText.length : 0);

        if (pasteSuccess && clipboardText) {
          return clipboardText;
        } else {
          // Last resort: prompt user
          return prompt('Paste your copied text here (Ctrl+V):');
        }
      }
    });

    console.log('[DEBUG] Clipboard read results:', results);
    if (results && results[0] && results[0].result) {
      return results[0].result;
    }

    throw new Error('User cancelled or no text provided');
  } catch (error) {
    console.error('[DEBUG] Clipboard read error:', error.message);
    throw new Error(`Failed to read clipboard: ${error.message}`);
  }
}

// Trim text to complete words by checking if the phrase has word boundaries at both ends
async function trimToCompleteWords(tabId, text) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (textToTrim) => {
        const trimmed = textToTrim.trim();
        const pageText = document.body.innerText || document.body.textContent;
        let words = trimmed.split(/\s+/);

        if (words.length === 0) {
          return trimmed;
        }

        // Helper function to check if the phrase appears with proper word boundaries on the page
        const phraseHasWordBoundaries = (phrase) => {
          const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Check if phrase appears with word boundaries (non-letter or start/end) on both sides
          const boundaryRegex = new RegExp('(?<![a-zA-Z])' + escaped + '(?![a-zA-Z])', 'i');
          return boundaryRegex.test(pageText);
        };

        const currentPhrase = words.join(' ');

        // If the current phrase has word boundaries, it's good
        if (phraseHasWordBoundaries(currentPhrase)) {
          console.log('[DEBUG] Phrase has word boundaries on page');
          return currentPhrase;
        }

        console.log('[DEBUG] Phrase lacks word boundaries, trimming...');

        // Trim from both ends until we find a phrase with word boundaries
        // Try removing from start first, then end, then both
        let startIdx = 0;
        let endIdx = words.length;

        // Try removing words from the start
        for (let i = 1; i < words.length; i++) {
          const candidate = words.slice(i).join(' ');
          if (phraseHasWordBoundaries(candidate)) {
            console.log('[DEBUG] Found word boundary after removing', i, 'word(s) from start');
            return candidate;
          }
        }

        // Try removing words from the end
        for (let i = words.length - 1; i > 0; i--) {
          const candidate = words.slice(0, i).join(' ');
          if (phraseHasWordBoundaries(candidate)) {
            console.log('[DEBUG] Found word boundary after removing', words.length - i, 'word(s) from end');
            return candidate;
          }
        }

        // If nothing works, remove one word from each end and try again
        if (words.length > 2) {
          const candidate = words.slice(1, -1).join(' ');
          console.log('[DEBUG] Removing first and last words');
          return candidate;
        }

        // Last resort: return original
        return currentPhrase;
      },
      args: [text]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }

    // Fallback to original text if script fails
    return text.trim();
  } catch (error) {
    console.error('[DEBUG] Error trimming to complete words:', error);
    return text.trim();
  }
}

// Write to clipboard using execCommand('copy') - supports both plain text and HTML
async function writeClipboard(tabId, content) {
  console.log('[DEBUG] Writing to clipboard:', {
    contentType: typeof content,
    hasHtml: typeof content === 'object' && content.html ? 'yes' : 'no'
  });

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (contentToWrite) => {
        // Create a hidden div that we can copy HTML from
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '-9999px';
        div.style.left = '-9999px';
        // Use nearly transparent instead of fully transparent to avoid inheriting dark backgrounds
        div.style.backgroundColor = 'rgba(255, 255, 255, 0.01)';
        div.style.color = '#000000';
        div.contentEditable = 'true';

        // Set the HTML content
        if (typeof contentToWrite === 'object' && contentToWrite.html) {
          console.log('[DEBUG] Setting HTML content:', contentToWrite.html);
          div.innerHTML = contentToWrite.html;
        } else {
          console.log('[DEBUG] Setting plain text content');
          div.textContent = contentToWrite;
        }

        document.body.appendChild(div);

        // Select the content
        const range = document.createRange();
        range.selectNodeContents(div);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        // Copy using execCommand
        let success = false;
        try {
          success = document.execCommand('copy');
          console.log('[DEBUG] execCommand copy result:', success);
        } catch (e) {
          console.error('[DEBUG] execCommand failed:', e);
        }

        // Clean up
        selection.removeAllRanges();
        document.body.removeChild(div);

        if (success) {
          // Show brief success message
          const msg = document.createElement('div');
          msg.textContent = '✓ Link copied to clipboard!';
          msg.style.position = 'fixed';
          msg.style.top = '20px';
          msg.style.right = '20px';
          msg.style.padding = '12px 20px';
          msg.style.background = '#4caf50';
          msg.style.color = 'white';
          msg.style.borderRadius = '4px';
          msg.style.fontWeight = 'bold';
          msg.style.zIndex = '999999';
          msg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          document.body.appendChild(msg);
          setTimeout(() => {
            document.body.removeChild(msg);
          }, 2000);
        } else {
          alert('Could not copy automatically. The link is in your clipboard.');
        }
      },
      args: [content]
    });
  } catch (error) {
    console.error('[DEBUG] Write clipboard failed:', error);
    throw new Error(`Failed to write clipboard: ${error.message}`);
  }
}

// Load settings from storage
async function loadSettings() {
  const defaultSettings = {
    linkFormat: 'justUrl',
    customText: '',
    bold: false,
    italic: false,
    underline: false,
    textColor: '#000000',
    clipboardQuotes: false,
    withQuotes: false
  };

  try {
    const result = await chrome.storage.sync.get('linkSettings');
    console.log('[DEBUG] Raw storage result:', result);
    const settings = result.linkSettings || defaultSettings;
    console.log('[DEBUG] Settings loaded:', settings);
    return settings;
  } catch (error) {
    console.error('[DEBUG] Error loading settings:', error);
    return defaultSettings;
  }
}

// Convert double quotes to single quotes in text
function convertQuotes(text) {
  return text.replace(/"/g, "'");
}

// Escape HTML entities (service worker compatible)
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Create Google Docs formatted HTML link - NO inline styles by default
function createFormattedLink(url, displayText, formatting) {
  let style = '';

  if (formatting) {
    const styles = [];
    if (formatting.bold) styles.push('font-weight: bold');
    if (formatting.italic) styles.push('font-style: italic');
    if (formatting.underline) styles.push('text-decoration: underline');
    if (formatting.textColor && formatting.textColor !== '#000000') {
      styles.push(`color: ${formatting.textColor}`);
    }

    if (styles.length > 0) {
      style = ` style="${styles.join('; ')}"`;
    }
  }

  // Escape the display text to prevent HTML injection
  const escapedText = escapeHtml(displayText);

  // Return clean HTML link with NO background styling
  return `<a href="${url}"${style}>${escapedText}</a>`;
}

// Apply formatting based on settings
function applyFormatting(fragmentLink, originalText, settings) {
  console.log('[DEBUG] applyFormatting called with:', {
    linkFormat: settings.linkFormat,
    fragmentLink: fragmentLink,
    originalText: originalText.substring(0, 50) + '...',
    settings: settings
  });

  switch (settings.linkFormat) {
    case 'justUrl':
      // Just return the plain URL
      console.log('[DEBUG] Returning plain URL');
      return fragmentLink;

    case 'clipboardText':
      // Use clipboard text as hyperlink display
      let displayText = originalText;
      let htmlOutput;

      if (settings.clipboardQuotes) {
        // Convert double quotes to single quotes in the display text
        displayText = convertQuotes(originalText);
        // Put quotes inside the link to avoid background issues
        htmlOutput = createFormattedLink(fragmentLink, `"${displayText}"`);
      } else {
        htmlOutput = createFormattedLink(fragmentLink, displayText);
      }

      console.log('[DEBUG] Created clipboardText HTML:', htmlOutput);
      return {
        html: htmlOutput,
        text: fragmentLink // Fallback plain text
      };

    case 'customText':
      // Use custom text with formatting
      if (!settings.customText || !settings.customText.trim()) {
        // Fallback to plain URL if no custom text
        console.log('[DEBUG] No custom text provided, returning plain URL');
        return fragmentLink;
      }
      const customHtml = createFormattedLink(fragmentLink, settings.customText, {
        bold: settings.bold,
        italic: settings.italic,
        underline: settings.underline,
        textColor: settings.textColor
      });
      console.log('[DEBUG] Created customText HTML:', customHtml);
      return {
        html: customHtml,
        text: fragmentLink // Fallback plain text
      };

    case 'withLinkTag':
      // Append [Link] to clipboard text
      let textForDisplay = originalText;
      let htmlWithLink;

      if (settings.withQuotes) {
        // Convert double quotes to single quotes in the display text
        textForDisplay = convertQuotes(originalText);
        // Create: quoted plain text + space + [Link] hyperlink
        // Don't escape - let it be plain text like the working clipboard option
        htmlWithLink = `"${textForDisplay}" ${createFormattedLink(fragmentLink, '[Link]')}`;
      } else {
        // Create: plain text + space + [Link] hyperlink
        htmlWithLink = `${textForDisplay} ${createFormattedLink(fragmentLink, '[Link]')}`;
      }

      console.log('[DEBUG] Created withLinkTag HTML:', htmlWithLink);
      return {
        html: htmlWithLink,
        text: fragmentLink // Fallback plain text
      };

    default:
      console.log('[DEBUG] Unknown linkFormat, returning plain URL');
      return fragmentLink;
  }
}

// Main function to create fragment link from clipboard
async function createFragmentLink(tab) {
  try {
    console.log('[DEBUG] Starting createFragmentLink for tab:', tab.id, 'URL:', tab.url);

    // Load user settings
    const settings = await loadSettings();
    console.log('[DEBUG] Loaded settings:', settings);

    // Read current clipboard content
    const clipboardText = await readClipboard(tab.id);

    console.log('[DEBUG] Clipboard text received:', clipboardText === null ? 'NULL' : clipboardText === undefined ? 'UNDEFINED' : `length ${clipboardText.length}`);

    if (!clipboardText || !clipboardText.trim()) {
      console.error('[DEBUG] Clipboard is empty or whitespace only. Raw value:', JSON.stringify(clipboardText));
      console.error('Clipboard is empty');
      return { success: false, error: 'Clipboard is empty' };
    }

    // Clean up the text (normalize whitespace only)
    let cleanedText = clipboardText.trim().replace(/\s+/g, ' ');
    // Disabled because it was too aggressive and shortened user selections.
    // cleanedText = await trimToCompleteWords(tab.id, cleanedText);

    // Get current tab URL (remove any existing fragment)
    const baseUrl = tab.url.split('#')[0];

    // Create the fragment link - ALWAYS from clipboard text, never from custom text
    const fragmentLink = `${baseUrl}#:~:text=${encodeTextFragment(cleanedText)}`;
    console.log('[DEBUG] Fragment link built from clipboard text:', cleanedText);

    // Apply formatting based on settings (custom text only affects display, not URL)
    const formattedOutput = applyFormatting(fragmentLink, cleanedText, settings);

    // Write the formatted output to clipboard
    await writeClipboard(tab.id, formattedOutput);

    console.log('Fragment link created and copied to clipboard:', fragmentLink);
    console.log('Format applied:', settings.linkFormat);

    return { success: true };

  } catch (error) {
    console.error('[DEBUG] Error in createFragmentLink:', error);
    console.error('Error creating fragment link:', error);
    return { success: false, error: error.message };
  }
}

// Create context menu on extension install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'create-fragment-link',
    title: 'Link to Text Copied in Clipboard',
    contexts: ['page', 'selection', 'link', 'image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'create-fragment-link') {
    // Always query for the active tab to ensure we have valid tab information
    // The tab parameter from context menu can be unreliable (id: -1 in some cases)
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!activeTab || !activeTab.id || !activeTab.url) {
        console.error('Could not determine active tab or tab information incomplete');
        return;
      }

      createFragmentLink(activeTab);
    } catch (error) {
      console.error('Error querying active tab:', error);
    }
  }
});

// Handle keyboard shortcut (Ctrl+Shift+F)
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'create-fragment-link') {
    createFragmentLink(tab);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'buildLink') {
    // Get the active tab and build the link
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const result = await createFragmentLink(tabs[0]);
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

// Note: Toolbar icon click now opens popup.html
// The popup handles the fragment link creation and formatting options

/**
 * MeetRec Content Script
 * Injects a Record button into Google Meet's toolbar.
 */

function injectRecordButton() {
    if (document.getElementById('meetrec-btn-container')) return;

    console.log('MeetRec: Attempting to find toolbar...');

    // Try multiple ways to find the meeting control bar
    const selectors = [
        'div[jsname="p297S"]', // Main button group
        'div[role="group"]',   // Generic ARIA group
        '.cC4eCc',             // Newer toolbar class
        '.R5Y7lb',             // Older toolbar class
        '.x3998b',             // Another variation
        '.fS74vd'              // Yet another variation
    ];

    let buttonGroup = null;
    for (const selector of selectors) {
        buttonGroup = document.querySelector(selector);
        if (buttonGroup) {
            console.log(`MeetRec: Found toolbar using selector: ${selector}`);
            break;
        }
    }

    if (!buttonGroup) {
        // Fallback: search for the microphone button and find its group parent
        const micBtn = document.querySelector('div[data-is-muted]');
        if (micBtn) {
            buttonGroup = micBtn.closest('div[role="group"]') || micBtn.parentElement?.parentElement;
            if (buttonGroup) console.log('MeetRec: Found toolbar via Mic button parent.');
        }
    }

    if (!buttonGroup) {
        console.warn('MeetRec: Could not find Google Meet toolbar.');
        return;
    }

    const btnContainer = document.createElement('div');
    btnContainer.id = 'meetrec-btn-container';
    btnContainer.className = 'meetrec-toolbar-btn-wrapper';

    const btn = document.createElement('button');
    btn.id = 'meetrec-record-btn';
    btn.className = 'meetrec-btn native-style';
    btn.innerHTML = `
        <div class="meetrec-icon-wrapper">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <circle cx="12" cy="12" r="8" class="outer-circle" fill="none" stroke="currentColor" stroke-width="2"></circle>
                <circle cx="12" cy="12" r="5" class="inner-dot"></circle>
            </svg>
        </div>
    `;
    btn.title = "Start MeetRec Recording";

    btn.onclick = () => {
        if (btn.classList.contains('recording')) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    btnContainer.appendChild(btn);
    // 3. Inject at the beginning of the control bar
    buttonGroup.prepend(btnContainer);
    console.log('MeetRec: Button injected successfully.');
}

function startRecording() {
    const btn = document.getElementById('meetrec-record-btn');
    if (btn) btn.classList.add('recording');

    // Message background script to start recording
    chrome.runtime.sendMessage({ action: 'START_RECORDING' });
}

function stopRecording() {
    const btn = document.getElementById('meetrec-record-btn');
    if (btn) btn.classList.remove('recording');

    // Message background script to stop recording
    chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((request) => {
    const btn = document.getElementById('meetrec-record-btn');
    if (!btn) return;

    if (request.action === 'UPDATE_UI_START') {
        btn.classList.add('recording');
    } else if (request.action === 'UPDATE_UI_STOP') {
        btn.classList.remove('recording');
    }
});

// Observe DOM changes to keep the button injected
const observer = new MutationObserver(() => injectRecordButton());
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
injectRecordButton();

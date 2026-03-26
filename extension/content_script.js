/**
 * MeetRec Content Script
 * Injects a Record button into Google Meet's toolbar.
 */

function injectRecordButton() {
    if (document.getElementById('meetrec-btn-container')) return;

    // Search for a container that looks like the meeting control bar
    let buttonGroup = null;

    // Method 1: Use specific jsname attribute (very stable for Meet)
    buttonGroup = document.querySelector('div[jsname="p297S"]');

    // Method 2: Find Hangup button and look at its siblings/parent
    if (!buttonGroup) {
        const hangupBtn = document.querySelector('button[aria-label*="leave"], button[aria-label*="Leave"]')?.closest('div');
        if (hangupBtn) {
            // The toolbar is usually the parent of the div containing the hangup button
            buttonGroup = hangupBtn.parentElement;
        }
    }

    // Method 3: Find Mic/Cam buttons and look at their group
    if (!buttonGroup) {
        const anyMeetingBtn = document.querySelector('div[data-is-muted], div[jscontroller="N6Nf8b"]');
        buttonGroup = anyMeetingBtn?.closest('div[role="group"]');
    }

    // Method 4: Common class fallbacks
    if (!buttonGroup) {
        const commonClasses = ['.cC4eCc', '.R5Y7lb', '.x3998b'];
        for (const cls of commonClasses) {
            buttonGroup = document.querySelector(cls);
            if (buttonGroup) break;
        }
    }

    if (!buttonGroup) {
        // If we still can't find it, don't log too much (avoid spam)
        return;
    }

    console.log('MeetRec: Found toolbar. Injecting...');

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
const observer = new MutationObserver(() => {
    try {
        // Simple check to see if context is still valid
        if (chrome.runtime?.id) {
            injectRecordButton();
        } else {
            console.log('MeetRec: Context invalidated. Stopping observer.');
            observer.disconnect();
            const btn = document.getElementById('meetrec-btn-container');
            if (btn) btn.remove();
        }
    } catch (e) {
        observer.disconnect();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
try {
    injectRecordButton();
} catch (e) {
    console.warn('MeetRec: Initial injection failed (likely context invalidated)');
}

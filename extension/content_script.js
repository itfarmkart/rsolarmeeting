/**
 * MeetRec Content Script
 * Injects a Record button into Google Meet's toolbar.
 */

function injectRecordButton() {
    if (document.getElementById('meetrec-btn-container')) return;

    // Use a more stable selector for the main meeting control bar
    // jsname="p297S" is the standard container for Meet toolbar buttons
    const buttonGroup = document.querySelector('div[jsname="p297S"]') ||
        document.querySelector('div[role="group"]') ||
        document.querySelector('.R5Y7lb');

    if (!buttonGroup) return;

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
    buttonContainer.prepend(btnContainer);
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

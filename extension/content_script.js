/**
 * MeetRec Content Script
 * Injects a Record button into Google Meet's toolbar.
 */

function injectRecordButton() {
    // Look for the main meeting control bar
    const toolbar = document.querySelector('div[data-is-muted]')?.closest('.R5Y7lb')?.parentElement;
    if (!toolbar || document.getElementById('meetrec-btn-container')) return;

    // Alternative: find the container of all circular buttons
    const buttonGroup = document.querySelector('.R5Y7lb');
    if (!buttonGroup) return;

    const btnContainer = document.createElement('div');
    btnContainer.id = 'meetrec-btn-container';
    btnContainer.className = 'meetrec-toolbar-btn-wrapper';

    const btn = document.createElement('button');
    btn.id = 'meetrec-record-btn';
    btn.className = 'meetrec-btn';
    btn.innerHTML = `
        <div class="meetrec-dot"></div>
        <span class="meetrec-text">REC</span>
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
    // Use prepend to put it at the beginning of the button group to avoid overlap with right-side controls
    buttonGroup.prepend(btnContainer);
}

function startRecording() {
    const btn = document.getElementById('meetrec-record-btn');
    btn.classList.add('recording');
    btn.querySelector('.meetrec-text').innerText = 'STOP';

    // Message background script to start recording
    chrome.runtime.sendMessage({ action: 'START_RECORDING' });
}

function stopRecording() {
    const btn = document.getElementById('meetrec-record-btn');
    btn.classList.remove('recording');
    btn.querySelector('.meetrec-text').innerText = 'REC';

    // Message background script to stop recording
    chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
}

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((request) => {
    const btn = document.getElementById('meetrec-record-btn');
    if (!btn) return;

    if (request.action === 'UPDATE_UI_START') {
        btn.classList.add('recording');
        btn.querySelector('.meetrec-text').innerText = 'STOP';
    } else if (request.action === 'UPDATE_UI_STOP') {
        btn.classList.remove('recording');
        btn.querySelector('.meetrec-text').innerText = 'REC';
    }
});

// Observe DOM changes to keep the button injected
const observer = new MutationObserver(() => injectRecordButton());
observer.observe(document.body, { childList: true, subtree: true });

// Initial injection
injectRecordButton();

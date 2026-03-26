/**
 * MeetRec Background Service Worker
 * Coordinates between content scripts and offscreen document.
 */

let isRecording = false;

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_RECORDING') {
        if (isRecording) {
            sendResponse({ status: 'already_recording' });
            return;
        }

        startRecordingSequence(sender.tab.id);
        sendResponse({ status: 'starting' });
    }

    else if (request.action === 'STOP_RECORDING') {
        chrome.runtime.sendMessage({ action: 'OFFSCREEN_STOP_CAPTURE' });
        isRecording = false;
        updateAllTabsUI('UPDATE_UI_STOP');
        sendResponse({ status: 'stopping' });
    }

    else if (request.action === 'GET_STATUS') {
        sendResponse({ isRecording });
    }

    return true; // Keep channel open
});

async function startRecordingSequence(tabId) {
    try {
        // 1. Create Offscreen Document
        await setupOffscreen();

        // 2. Request stream ID using desktopCapture
        chrome.desktopCapture.chooseDesktopMedia(['tab'], (streamId) => {
            if (!streamId) {
                console.error('Recording cancelled by user');
                isRecording = false;
                updateAllTabsUI('UPDATE_UI_STOP');
                return;
            }

            // 3. Inform offscreen to start
            // Give it a tiny bit of time to ensure listener is ready
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: 'OFFSCREEN_START_CAPTURE',
                    streamId: streamId
                });
                isRecording = true;
                updateAllTabsUI('UPDATE_UI_START');
            }, 500);
        });
    } catch (err) {
        console.error('Failed to start recording sequence:', err);
    }
}

async function setupOffscreen() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) return;

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA', 'DISPLAY_MEDIA'],
        justification: 'To record and mix meeting audio and microphone.'
    });
}

function updateAllTabsUI(action) {
    chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action });
        });
    });
}

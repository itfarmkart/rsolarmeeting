/**
 * MeetRec Background Service Worker
 * Coordinates between content scripts and offscreen document.
 */

let isRecording = false;

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'START_RECORDING') {
        if (isRecording) return;

        // 1. Create Offscreen Document
        await setupOffscreen();

        // 2. Request stream ID using desktopCapture (Reliable for MV3)
        // This will show a picker but it resolves the "Extension not invoked" error
        chrome.desktopCapture.chooseDesktopMedia(['tab'], sender.tab, (streamId) => {
            if (!streamId) {
                console.error('Recording cancelled: No stream ID');
                return;
            }

            chrome.runtime.sendMessage({
                action: 'OFFSCREEN_START_CAPTURE',
                streamId: streamId
            });
            isRecording = true;
            updateAllTabsUI('UPDATE_UI_START');
        });
    }

    else if (request.action === 'STOP_RECORDING') {
        chrome.runtime.sendMessage({ action: 'OFFSCREEN_STOP_CAPTURE' });
        isRecording = false;
        updateAllTabsUI('UPDATE_UI_STOP');
    }

    else if (request.action === 'GET_STATUS') {
        sendResponse({ isRecording });
    }
});

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

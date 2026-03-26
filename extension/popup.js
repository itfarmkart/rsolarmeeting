/**
 * MeetRec Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusText = document.getElementById('statusText');
    const indicator = document.getElementById('recordingIndicator');
    const timer = document.getElementById('timer');

    let startTime;
    let timerInterval;

    // Check current status
    const status = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    updateUI(status.isRecording);

    toggleBtn.onclick = async () => {
        const { isRecording } = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });

        if (isRecording) {
            chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
            updateUI(false);
        } else {
            // Check if we are on a Google Meet tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url?.includes('meet.google.com')) {
                chrome.runtime.sendMessage({ action: 'START_RECORDING' });
                updateUI(true);
            } else {
                alert('Please open a Google Meet tab to start recording.');
            }
        }
    };

    function updateUI(recording) {
        if (recording) {
            toggleBtn.innerText = 'Stop Recording';
            toggleBtn.classList.add('danger');
            toggleBtn.classList.remove('primary');
            statusText.innerText = 'Recording...';
            indicator.classList.add('active');
            startTimer();
        } else {
            toggleBtn.innerText = 'Start Recording';
            toggleBtn.classList.remove('danger');
            toggleBtn.classList.add('primary');
            statusText.innerText = 'Ready';
            indicator.classList.remove('active');
            stopTimer();
        }
    }

    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const diff = Date.now() - startTime;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            timer.innerText = `${h}:${m}:${s}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timer.innerText = '00:00:00';
    }
});

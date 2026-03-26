/**
 * MeetRec Offscreen Script
 * Handles the actual audio capture, mixing, and recording.
 */

let mediaRecorder;
let audioChunks = [];
let audioContext;
let mixedStream;

chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === 'OFFSCREEN_START_CAPTURE') {
        startRecording(request.streamId);
    } else if (request.action === 'OFFSCREEN_STOP_CAPTURE') {
        stopRecording();
    }
});

async function startRecording(streamId) {
    try {
        // 1. Get Tab Audio Stream via StreamId
        const tabStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: false
        });

        // 2. Get Microphone Stream
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 3. Mix streams using Web Audio API
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();

        const tabSource = audioContext.createMediaStreamSource(tabStream);
        const micSource = audioContext.createMediaStreamSource(micStream);

        tabSource.connect(destination);
        micSource.connect(destination);

        mixedStream = destination.stream;

        // 4. Start MediaRecorder
        mediaRecorder = new MediaRecorder(mixedStream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);

            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `MeetRec_Recording_${date}.webm`;
            a.click();

            audioChunks = [];
            cleanup();
        };

        mediaRecorder.start();

    } catch (err) {
        console.error('Offscreen recording error:', err);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function cleanup() {
    if (audioContext) audioContext.close();
    if (mixedStream) mixedStream.getTracks().forEach(t => t.stop());
}

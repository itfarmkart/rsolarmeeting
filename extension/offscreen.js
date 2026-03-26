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
    console.log('Offscreen: Starting recording with streamId:', streamId);
    try {
        // 1. Get Tab Audio Stream via StreamId (from DesktopCapture)
        const tabStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId
                }
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: streamId
                }
            }
        });

        // We only want the audio track from the desktop stream
        const tabAudioTrack = tabStream.getAudioTracks()[0];
        if (!tabAudioTrack) throw new Error('No audio track found in tab stream');

        // Stop the video track immediately as we don't need it
        tabStream.getVideoTracks().forEach(t => t.stop());

        const tabAudioStream = new MediaStream([tabAudioTrack]);

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
        console.error('Core Offscreen Recording Error:', err);
        // Fallback or more info
        if (err.name === 'NotAllowedError') {
            console.error('Microphone or Tab capture permission denied.');
        }
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

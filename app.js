document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusText = document.getElementById('statusText');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const audioPlaybackContainer = document.getElementById('audioPlaybackContainer');
    const audioPlayback = document.getElementById('audioPlayback');

    let mediaRecorder;
    let audioChunks = [];
    let stream;

    startBtn.addEventListener('click', async () => {
        try {
            // Request display media (screen/tab sharing)
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: "browser", // Prefer tab sharing
                },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                }
            });

            // Verify if audio track was actually shared
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio track detected! Please make sure to check "Share tab audio" in the Chrome dialog when selecting the tab.');
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            // Create a new stream with only the audio track, dropping the video
            const audioStream = new MediaStream(audioTracks);

            // Setup MediaRecorder
            mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);

                // Format the download name with current date/time
                const date = new Date();
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

                downloadBtn.href = audioUrl;
                downloadBtn.download = `Meeting_Audio_${formattedDate}.webm`;
                downloadBtn.style.display = 'inline-flex';

                // Set the preview player source and show it
                audioPlayback.src = audioUrl;
                audioPlaybackContainer.style.display = 'block';

                audioChunks = []; // Clear for next recording
            };

            // Setup 'ended' listener on video track to stop recording if user clicks "Stop sharing" on system banner
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                videoTracks[0].addEventListener('ended', () => {
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        stopRecording();
                    }
                });
            }

            // Start recording
            mediaRecorder.start();

            // Update UI
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
            downloadBtn.style.display = 'none';
            audioPlaybackContainer.style.display = 'none'; // Hide preview when re-recording
            statusText.innerText = 'Recording in progress... (Meeting Audio)';
            statusText.style.color = 'var(--text-primary)';
            recordingIndicator.classList.add('active');

        } catch (err) {
            console.error('Error starting recording:', err);
            if (err.name === 'NotAllowedError') {
                alert('Permission denied or you cancelled the request.');
            } else {
                alert('Could not start recording. ' + err.message);
            }
        }
    });

    stopBtn.addEventListener('click', () => {
        stopRecording();
    });

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // Stop all tracks to remove the "Currently sharing" browser indicator
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Update UI
        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        startBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8"></circle>
            </svg>
            Record Another Meeting
        `;
        statusText.innerText = 'Recording saved! Click to download.';
        statusText.style.color = 'var(--success)';
        recordingIndicator.classList.remove('active');
    }
});

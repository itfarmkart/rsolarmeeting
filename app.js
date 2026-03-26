document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusText = document.getElementById('statusText');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const audioPlaybackContainer = document.getElementById('audioPlaybackContainer');
    const audioPlayback = document.getElementById('audioPlayback');
    const visualizerContainer = document.getElementById('visualizerContainer');
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    let mediaRecorder;
    let audioChunks = [];
    let displayStream;
    let micStream;
    let audioContext;
    let animationId;

    startBtn.addEventListener('click', async () => {
        try {
            // 1. Request Microphone Media
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (micErr) {
                console.error('Microphone access denied:', micErr);
                alert('Microphone access is required for recording your voice. Please allow it and try again.');
                return;
            }

            // 2. Request Display Media (Screen/Tab)
            try {
                displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { displaySurface: "browser" },
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    }
                });
            } catch (displayErr) {
                console.error('Display media denied:', displayErr);
                micStream.getTracks().forEach(t => t.stop());
                return;
            }

            // Verify if tab audio was actually shared
            const displayAudioTracks = displayStream.getAudioTracks();
            if (displayAudioTracks.length === 0) {
                alert('No tab audio detected! Please make sure to check "Share tab audio" in the selection dialog.');
                stopAllTracks();
                return;
            }

            // 3. Setup Web Audio API for mixing
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const destination = audioContext.createMediaStreamDestination();

            // Create sources
            const micSource = audioContext.createMediaStreamSource(micStream);
            const displaySource = audioContext.createMediaStreamSource(displayStream);

            // Analyser for visualization
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Connect everything
            micSource.connect(destination);
            displaySource.connect(destination);

            // Connect to analyser too
            micSource.connect(analyser);
            displaySource.connect(analyser);

            // 4. Setup MediaRecorder with the mixed destination stream
            mediaRecorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);

                const date = new Date();
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;

                downloadBtn.href = audioUrl;
                downloadBtn.download = `Meeting_Mixed_Audio_${formattedDate}.webm`;
                downloadBtn.style.display = 'inline-flex';

                audioPlayback.src = audioUrl;
                audioPlaybackContainer.style.display = 'block';
                audioChunks = [];
            };

            // Stop recording if display sharing is ended by user
            displayStream.getVideoTracks()[0].addEventListener('ended', () => {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    stopRecording();
                }
            });

            // 5. Start Visualizer
            visualizerContainer.style.display = 'block';
            function draw() {
                animationId = requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);

                canvas.width = visualizerContainer.offsetWidth;
                canvas.height = visualizerContainer.offsetHeight;

                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

                const barWidth = (canvas.width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2;

                    // Premium gradient look
                    const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
                    gradient.addColorStop(0, '#6366f1');
                    gradient.addColorStop(1, '#a5b4fc');

                    canvasCtx.fillStyle = gradient;
                    canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                    x += barWidth + 1;
                }
            }
            draw();

            // Start recording
            mediaRecorder.start();

            // Update UI
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';
            downloadBtn.style.display = 'none';
            audioPlaybackContainer.style.display = 'none';
            statusText.innerText = 'Recording Mixed Audio (Mic + Tab)...';
            statusText.style.color = 'var(--text-primary)';
            recordingIndicator.classList.add('active');

        } catch (err) {
            console.error('Error starting recording:', err);
            alert('Could not start recording: ' + err.message);
            stopAllTracks();
        }
    });

    stopBtn.addEventListener('click', () => {
        stopRecording();
    });

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        cancelAnimationFrame(animationId);
        stopAllTracks();

        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }

        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        startBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8"></circle>
            </svg>
            Record Another Meeting
        `;
        statusText.innerText = 'Recording saved! Check the preview below.';
        statusText.style.color = 'var(--success)';
        recordingIndicator.classList.remove('active');
    }

    function stopAllTracks() {
        if (displayStream) {
            displayStream.getTracks().forEach(track => track.stop());
        }
        if (micStream) {
            micStream.getTracks().forEach(track => track.stop());
        }
    }
});

// Screen Share Implementation
class ScreenShare {
    constructor() {
        this.isSharing = false;
        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.isTransitioning = false;
        this.currentTool = 'pen';
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this._events = {
            onStart: null,
            onStop: null,
            onRecordingChange: null,
            buttons: {},
            canvas: {}
        };
        this.initializeEventListeners();
    }

    async startScreenShare() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        try {
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: false
            });
            
            this.isSharing = true;
            this.initializeAnnotationCanvas();

            // Call onStart callback if defined
            if (this._events.onStart) {
                this._events.onStart();
            }
        } catch (error) {
            console.error('Error starting screen share:', error);
        } finally {
            this.isTransitioning = false;
        }
    }

    stopScreenShare() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        try {
            // Stop recording if active
            if (this.isRecording) {
                this.stopRecording();
            }

            // Cleanup MediaRecorder
            if (this.mediaRecorder) {
                if (this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
                this.mediaRecorder.ondataavailable = null;
                this.mediaRecorder.onstop = null;
                this.mediaRecorder = null;
            }

            // Clear recorded chunks
            this.recordedChunks = [];

            // Stop all tracks and clear stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }

            this.isSharing = false;
            this.isRecording = false;

            // Cleanup canvas and its event listeners
            this.cleanupAnnotationCanvas();
            this.removeAllEventListeners();

            // Call onStop callback if defined
            if (this._events.onStop) {
                this._events.onStop();
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    toggleRecording() {
        if (!this.isSharing || this.isTransitioning) return;

        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }

        // Call recording change callback if defined
        if (this._events.onRecordingChange) {
            this._events.onRecordingChange(this.isRecording);
        }
    }

    startRecording() {
        if (!this.stream) return;

        this.mediaRecorder = new MediaRecorder(this.stream);
        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            // Safely check event data before processing
            if (event && event.data && typeof event.data.size === 'number' && event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            if (this.recordedChunks.length > 0) {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                
                // Cleanup the Blob URL after download
                const a = document.createElement('a');
                a.href = url;
                a.download = 'screen-recording.webm';
                a.click();
                
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 100);
            }
        };

        this.mediaRecorder.start();
        this.isRecording = true;
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }

    initializeAnnotationCanvas() {
        const canvas = document.getElementById('annotationCanvas');
        if (!canvas) return;

        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Store event listeners for cleanup
        this._events.canvas = {
            mousedown: this.startDrawing.bind(this),
            mousemove: this.draw.bind(this),
            mouseup: this.stopDrawing.bind(this)
        };

        // Add event listeners
        Object.entries(this._events.canvas).forEach(([event, handler]) => {
            canvas.addEventListener(event, handler);
        });
    }

    cleanupAnnotationCanvas() {
        const canvas = document.getElementById('annotationCanvas');
        if (!canvas) return;

        // Remove event listeners
        if (this._events.canvas) {
            Object.entries(this._events.canvas).forEach(([event, handler]) => {
                canvas.removeEventListener(event, handler);
            });
        }

        canvas.style.display = 'none';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    startDrawing(e) {
        this.isDrawing = true;
        [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const canvas = document.getElementById('annotationCanvas');
        const ctx = canvas.getContext('2d');
        
        switch (this.currentTool) {
            case 'pen':
                ctx.beginPath();
                ctx.moveTo(this.lastX, this.lastY);
                ctx.lineTo(e.offsetX, e.offsetY);
                ctx.stroke();
                break;
                
            case 'arrow':
                this.drawArrow(this.lastX, this.lastY, e.offsetX, e.offsetY);
                break;
                
            case 'rectangle':
                const width = e.offsetX - this.lastX;
                const height = e.offsetY - this.lastY;
                ctx.strokeRect(this.lastX, this.lastY, width, height);
                break;
                
            case 'highlight':
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fillRect(this.lastX, this.lastY, e.offsetX - this.lastX, e.offsetY - this.lastY);
                ctx.globalAlpha = 1.0;
                break;
        }
        
        [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
    }

    drawArrow(fromX, fromY, toX, toY) {
        const canvas = document.getElementById('annotationCanvas');
        const ctx = canvas.getContext('2d');
        const headLength = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    setAnnotationTool(tool) {
        this.currentTool = tool;
    }

    setAnnotationColor(color) {
        const canvas = document.getElementById('annotationCanvas');
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
    }

    clearAnnotations() {
        const canvas = document.getElementById('annotationCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    initializeEventListeners() {
        // Store bound event handlers for proper cleanup
        this._events.buttons = {
            start: () => this.startScreenShare(),
            stop: () => this.stopScreenShare(),
            record: () => this.toggleRecording()
        };

        const startBtn = document.getElementById('startScreenShare');
        const stopBtn = document.getElementById('stopScreenShare');
        const recordBtn = document.getElementById('toggleRecording');

        if (startBtn) startBtn.addEventListener('click', this._events.buttons.start);
        if (stopBtn) stopBtn.addEventListener('click', this._events.buttons.stop);
        if (recordBtn) recordBtn.addEventListener('click', this._events.buttons.record);
    }

    removeAllEventListeners() {
        // Only clear canvas event listeners, keep button listeners
        if (this._events.canvas) {
            const canvas = document.getElementById('annotationCanvas');
            if (canvas) {
                Object.entries(this._events.canvas).forEach(([event, handler]) => {
                    canvas.removeEventListener(event, handler);
                });
            }
            delete this._events.canvas;
        }
    }
}

// Initialize screen share functionality
window.screenShare = new ScreenShare();
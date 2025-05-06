// Screen Share Testing Suite

const screenShareTests = {
    // Track test results
    results: [],
    
    // Initialize tests
    async init() {
        console.log('Starting Screen Share Tests...');
        this.results = [];
        
        // Reset screen share instance for clean state
        if (window.screenShare) {
            window.screenShare.stopScreenShare();
        }
        window.screenShare = new ScreenShare();
        
        // Reset mocks
        window.MediaRecorder = MockMediaRecorder;
        window.MediaStream = MockMediaStream;
        window.MediaStreamTrack = MockMediaStreamTrack;
        
        await new Promise(r => setTimeout(r, 500)); // Allow cleanup to complete
    },

    // Test event listener cleanup
    async testEventListenerCleanup() {
        console.log('Testing Event Listener Cleanup...');
        
        // Store initial event listener count
        const initialListeners = getEventListeners(window);
        
        // Start screen sharing
        await document.getElementById('startScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Stop screen sharing
        await document.getElementById('stopScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Check final event listener count
        const finalListeners = getEventListeners(window);
        
        // Compare counts
        const result = {
            name: 'Event Listener Cleanup',
            passed: JSON.stringify(initialListeners) === JSON.stringify(finalListeners),
            details: `Initial listeners: ${Object.keys(initialListeners).length}, Final listeners: ${Object.keys(finalListeners).length}`
        };
        
        this.results.push(result);
        return result;
    },

    // Test memory management during screen sharing cycles
    async testMemoryManagement() {
        console.log('Testing Memory Management...');
        
        // Take initial memory snapshot
        const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 'N/A';
        
        // Perform multiple start/stop cycles
        for (let i = 0; i < 5; i++) {
            await document.getElementById('startScreenShare').click();
            await new Promise(r => setTimeout(r, 1000));
            await document.getElementById('stopScreenShare').click();
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Take final memory snapshot
        const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 'N/A';
        
        const result = {
            name: 'Memory Management',
            passed: finalMemory === 'N/A' || (finalMemory - initialMemory) < 10000000, // Less than 10MB increase
            details: `Initial memory: ${initialMemory}, Final memory: ${finalMemory}`
        };
        
        this.results.push(result);
        return result;
    },

    // Test MediaRecorder cleanup
    async testMediaRecorderCleanup() {
        console.log('Testing MediaRecorder Cleanup...');
        
        // Start screen sharing and recording
        await document.getElementById('startScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        await document.getElementById('toggleRecording').click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Stop recording and screen sharing
        await document.getElementById('toggleRecording').click();
        await new Promise(r => setTimeout(r, 1000));
        await document.getElementById('stopScreenShare').click();
        
        // Check if mediaRecorder is properly cleaned up
        const result = {
            name: 'MediaRecorder Cleanup',
            passed: !window.mediaRecorder || window.mediaRecorder.state === 'inactive',
            details: 'Checking MediaRecorder cleanup after stopping'
        };
        
        this.results.push(result);
        return result;
    },

    // Test annotation tool event listeners
    async testAnnotationToolsCleanup() {
        console.log('Testing Annotation Tools Cleanup...');
        
        const annotationCanvas = document.getElementById('annotationCanvas');
        const initialListeners = getEventListeners(annotationCanvas);
        
        // Start screen sharing
        await document.getElementById('startScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Use annotation tools
        const tools = ['pen', 'arrow', 'rectangle', 'highlight'];
        for (const tool of tools) {
            document.querySelector(`[data-tool="${tool}"]`).click();
            await new Promise(r => setTimeout(r, 500));
        }
        
        // Stop screen sharing
        await document.getElementById('stopScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        const finalListeners = getEventListeners(annotationCanvas);
        
        const result = {
            name: 'Annotation Tools Cleanup',
            passed: JSON.stringify(initialListeners) === JSON.stringify(finalListeners),
            details: `Testing annotation tool event listener cleanup`
        };
        
        this.results.push(result);
        return result;
    },

    // Test race conditions with rapid start/stop
    async testRaceConditions() {
        console.log('Testing Race Conditions...');
        
        let errors = 0;
        const startBtn = document.getElementById('startScreenShare');
        const stopBtn = document.getElementById('stopScreenShare');
        
        // Rapidly toggle screen sharing
        for (let i = 0; i < 10; i++) {
            try {
                await startBtn.click();
                await new Promise(r => setTimeout(r, 100));
                await stopBtn.click();
            } catch (e) {
                errors++;
                console.error('Race condition error:', e);
            }
        }
        
        const result = {
            name: 'Race Conditions',
            passed: errors === 0,
            details: `Errors encountered: ${errors}`
        };
        
        this.results.push(result);
        return result;
    },

    // Run all tests
    async runAllTests() {
        await this.init();
        
        await this.testEventListenerCleanup();
        await this.testMemoryManagement();
        await this.testMediaRecorderCleanup();
        await this.testAnnotationToolsCleanup();
        await this.testRaceConditions();
        
        this.displayResults();
    },

    // Display test results
    displayResults() {
        console.log('\n=== Screen Share Test Results ===\n');
        
        this.results.forEach(result => {
            console.log(`${result.name}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log(`Details: ${result.details}\n`);
        });
        
        const passedTests = this.results.filter(r => r.passed).length;
        console.log(`${passedTests}/${this.results.length} tests passed`);
    }
};

// Mock MediaRecorder
class MockMediaRecorder {
    constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
    }

    start() {
        this.state = 'recording';
        if (this.ondataavailable) {
            const mockBlob = new Blob(['mock-data']);
            const mockEvent = {
                data: mockBlob
            };
            this.ondataavailable(mockEvent);
        }
    }

    stop() {
        this.state = 'inactive';
        if (this.onstop) {
            this.onstop();
        }
    }
}

// Mock MediaStream
class MockMediaStream {
    constructor() {
        this.active = true;
        this.tracks = [];
    }

    addTrack(track) {
        this.tracks.push(track);
    }

    getTracks() {
        return this.tracks;
    }
}

// Mock MediaStreamTrack
class MockMediaStreamTrack {
    constructor() {
        this.kind = 'video';
        this.enabled = true;
    }

    stop() {
        this.enabled = false;
    }
}

// Helper to count event listeners
function getEventListeners(element) {
    if (!element) return {};
    if (element === window) {
        // For window, only count button event listeners
        return window.screenShare && window.screenShare._events && window.screenShare._events.buttons
            ? { click: Object.keys(window.screenShare._events.buttons).length }
            : { click: 0 };
    }
    // For other elements, return canvas event listeners
    return window.screenShare && window.screenShare._events && window.screenShare._events.canvas
        ? { mouse: Object.keys(window.screenShare._events.canvas).length }
        : { mouse: 0 };
}

// Mock global objects
window.MediaRecorder = MockMediaRecorder;
window.MediaStream = MockMediaStream;
window.MediaStreamTrack = MockMediaStreamTrack;

// Export for browser console use
window.screenShareTests = screenShareTests;
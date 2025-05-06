// Screen Share Integration Testing Suite

const screenShareIntegrationTests = {
    // Track test results
    results: [],
    
    // Initialize tests
    async init() {
        console.log('Starting Screen Share Integration Tests...');
        this.results = [];
        
        // Reset screen share instance and UI state
        if (window.screenShare) {
            window.screenShare.stopScreenShare();
        }
        window.screenShare = new ScreenShare();
        
        // Reset mocks
        window.MediaRecorder = MockMediaRecorder;
        window.MediaStream = MockMediaStream;
        window.MediaStreamTrack = MockMediaStreamTrack;
        
        // Reset UI state
        document.getElementById('screenShareModal').style.display = 'none';
        document.getElementById('annotationTools').style.display = 'none';
        document.getElementById('recordingControls').style.display = 'none';
        
        await new Promise(r => setTimeout(r, 500)); // Allow cleanup to complete
    },
    
    // Test sidebar button state management
    async testSidebarButtonStates() {
        console.log('Testing Sidebar Button States...');
        
        const startBtn = document.getElementById('startScreenShare');
        const stopBtn = document.getElementById('stopScreenShare');
        const recordBtn = document.getElementById('toggleRecording');
        
        // Initial state
        const initialState = {
            startEnabled: !startBtn.disabled,
            stopDisabled: stopBtn.disabled,
            recordDisabled: recordBtn.disabled
        };
        
        // Start screen sharing
        await startBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Check active state
        const activeState = {
            startDisabled: startBtn.disabled,
            stopEnabled: !stopBtn.disabled,
            recordEnabled: !recordBtn.disabled
        };
        
        // Stop screen sharing
        await stopBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Check final state matches initial
        const finalState = {
            startEnabled: !startBtn.disabled,
            stopDisabled: stopBtn.disabled,
            recordDisabled: recordBtn.disabled
        };
        
        const result = {
            name: 'Sidebar Button States',
            passed: initialState.startEnabled && 
                   initialState.stopDisabled && 
                   initialState.recordDisabled &&
                   activeState.startDisabled &&
                   activeState.stopEnabled &&
                   activeState.recordEnabled &&
                   JSON.stringify(initialState) === JSON.stringify(finalState),
            details: 'Testing button state transitions during screen share lifecycle'
        };
        
        this.results.push(result);
        return result;
    },
    
    // Test modal visibility handling
    async testModalVisibility() {
        console.log('Testing Modal Visibility...');
        
        const modal = document.getElementById('screenShareModal');
        const initialDisplay = modal.style.display;
        
        // Start screen sharing
        await document.getElementById('startScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        const activeDisplay = modal.style.display;
        
        // Stop screen sharing
        await document.getElementById('stopScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        const finalDisplay = modal.style.display;
        
        const result = {
            name: 'Modal Visibility',
            passed: initialDisplay === 'none' &&
                   activeDisplay === 'block' &&
                   finalDisplay === 'none',
            details: `Modal visibility transitions: ${initialDisplay} -> ${activeDisplay} -> ${finalDisplay}`
        };
        
        this.results.push(result);
        return result;
    },
    
    // Test recording controls state
    async testRecordingControls() {
        console.log('Testing Recording Controls State...');
        
        const controls = document.getElementById('recordingControls');
        const recordBtn = document.getElementById('toggleRecording');
        
        // Start screen sharing
        await document.getElementById('startScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Toggle recording
        const initialState = {
            controlsVisible: controls.style.display === 'block',
            recordBtnText: recordBtn.textContent
        };
        
        await recordBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const recordingState = {
            controlsVisible: controls.style.display === 'block',
            recordBtnText: recordBtn.textContent
        };
        
        // Stop recording
        await recordBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const stoppedState = {
            controlsVisible: controls.style.display === 'block',
            recordBtnText: recordBtn.textContent
        };
        
        const result = {
            name: 'Recording Controls State',
            passed: !initialState.controlsVisible &&
                   recordingState.controlsVisible &&
                   recordingState.recordBtnText.includes('Stop') &&
                   stoppedState.recordBtnText.includes('Start'),
            details: 'Testing recording controls visibility and button state transitions'
        };
        
        this.results.push(result);
        return result;
    },
    
    // Test annotation tools initialization
    async testAnnotationToolsInit() {
        console.log('Testing Annotation Tools Initialization...');
        
        const tools = document.getElementById('annotationTools');
        const canvas = document.getElementById('annotationCanvas');
        
        // Start screen sharing
        await document.getElementById('startScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        const activeState = {
            toolsVisible: tools.style.display === 'block',
            canvasVisible: canvas.style.display === 'block',
            canvasWidth: canvas.width === window.innerWidth,
            canvasHeight: canvas.height === window.innerHeight
        };
        
        // Test tool selection
        const toolButtons = tools.getElementsByTagName('button');
        let toolTransitions = true;
        for (const button of toolButtons) {
            button.click();
            await new Promise(r => setTimeout(r, 100));
            toolTransitions = toolTransitions && (window.screenShare.currentTool === button.dataset.tool);
        }
        
        // Stop screen sharing
        await document.getElementById('stopScreenShare').click();
        await new Promise(r => setTimeout(r, 1000));
        
        const finalState = {
            toolsVisible: tools.style.display === 'none',
            canvasVisible: canvas.style.display === 'none'
        };
        
        const result = {
            name: 'Annotation Tools Initialization',
            passed: activeState.toolsVisible &&
                   activeState.canvasVisible &&
                   activeState.canvasWidth &&
                   activeState.canvasHeight &&
                   toolTransitions &&
                   !finalState.toolsVisible &&
                   !finalState.canvasVisible,
            details: 'Testing annotation tools visibility, canvas setup, and tool selection'
        };
        
        this.results.push(result);
        return result;
    },
    
    // Test browser compatibility handling
    async testBrowserCompatibility() {
        console.log('Testing Browser Compatibility Handling...');
        
        const userAgent = navigator.userAgent.toLowerCase();
        const browser = {
            isChrome: userAgent.includes('chrome'),
            isFirefox: userAgent.includes('firefox'),
            isSafari: userAgent.includes('safari') && !userAgent.includes('chrome')
        };
        
        // Test permission handling
        let permissionError = false;
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = async () => {
            throw new Error('Permission denied');
        };
        
        try {
            await document.getElementById('startScreenShare').click();
        } catch (e) {
            permissionError = true;
        }
        
        // Restore original method
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
        
        const result = {
            name: 'Browser Compatibility',
            passed: permissionError, // Should handle permission denial gracefully
            details: `Testing on ${Object.entries(browser).find(([, v]) => v)?.[0] || 'unknown browser'}`
        };
        
        this.results.push(result);
        return result;
    },
    
    // Run all integration tests
    async runAllTests() {
        await this.init();
        
        await this.testSidebarButtonStates();
        await this.testModalVisibility();
        await this.testRecordingControls();
        await this.testAnnotationToolsInit();
        await this.testBrowserCompatibility();
        
        this.displayResults();
    },
    
    // Display test results
    displayResults() {
        console.log('\n=== Screen Share Integration Test Results ===\n');
        
        this.results.forEach(result => {
            console.log(`${result.name}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log(`Details: ${result.details}\n`);
        });
        
        const passedTests = this.results.filter(r => r.passed).length;
        console.log(`${passedTests}/${this.results.length} tests passed`);
    }
};

// Export for browser console use
window.screenShareIntegrationTests = screenShareIntegrationTests;
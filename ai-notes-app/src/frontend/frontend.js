/* global marked */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const notesUl = document.getElementById('notes-ul');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentInput = document.getElementById('note-content-input');
    const noteContentDisplay = document.getElementById('note-content-display');
    const noteAudioPlayerContainer = document.getElementById('note-audio-player-container'); // Added for audio player
    const newNoteBtn = document.getElementById('new-note-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const enhanceNoteBtn = document.getElementById('enhance-note-btn');
    const audioControls = document.getElementById('audio-controls');
    const startRecordingBtn = document.getElementById('start-recording-btn');
    const stopRecordingBtn = document.getElementById('stop-recording-btn');
    const transcribeBtn = document.getElementById('transcribe-btn');
    const recordingStatus = document.getElementById('recording-status');
    const markdownImportInput = document.getElementById('markdown-import-input'); // Added
    const importMarkdownButton = document.getElementById('import-markdown-button'); // Added
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const toastContainer = document.querySelector('.toast-container');
    const markdownToolButtons = document.querySelectorAll('.md-tool-btn');
    const appContainer = document.querySelector('.app-container');
    const encryptionToggle = document.getElementById('encryption-toggle'); // Added for encryption toggle
    
    // Updated UI elements
    const graphViewBtn = document.querySelector('.icon-button[title="Graph View"]');
    const graphViewPanel = document.querySelector('.graph-view-panel');
    const graphCloseBtn = document.querySelector('.graph-close-btn');
    const graphZoomSlider = document.getElementById('graph-zoom');
    const viewToggleButtons = document.querySelectorAll('.view-toggle');
    const tagInput = document.getElementById('tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const tagsList = document.getElementById('tags-list');
    const folderItems = document.querySelectorAll('.folder-item');
    const noteLinks = document.querySelectorAll('.note-link');
    const collapseToggle = document.querySelector('.collapse-toggle');
    const sidebarNotes = document.querySelector('.sidebar-notes');
    const sidebarIcons = document.querySelector('.sidebar-icons');
    const kynseyToolsToggle = document.querySelector('.kynsey-tools-toggle');
    const aiToolsPanel = document.querySelector('.ai-tools-panel');
    const searchToggle = document.getElementById('search-toggle');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const keyboardShortcutsOverlay = document.getElementById('keyboard-shortcuts-overlay');
    const closeShortcutsBtn = document.getElementById('close-shortcuts-btn');
    const settingsPanel = document.getElementById('settingsPanel');
    const keyboardShortcutOverlay = document.getElementById('keyboard-shortcut-overlay');
    const showKeyboardShortcutsBtn = document.getElementById('show-keyboard-shortcuts');
    const closeKeyboardShortcutsBtn = document.getElementById('close-keyboard-shortcuts');
    const codeSyntaxThemeSelector = document.getElementById('code-syntax-theme');
    const codeThemeSelector = document.getElementById('code-theme');
    const codeThemeSelectorElement = document.getElementById('code-theme-selector'); // Added for syntax themes

    // --- State ---
    let currentNoteId = null;
    let mediaRecorder;
    let audioChunks = [];
    let recordedAudioBlob = null;
    let currentTags = []; // For tracking tags of the current note
    let noteConnections = {}; // For tracking note connections in graph view
    let allNotes = []; // Cache of all notes for search and backlinks

    // --- API Base URL ---
    const API_URL = '/api/notes';

    // --- API Helper Functions ---
    async function apiRequest(url, method = 'GET', body = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
            }
            // Handle cases where the response might be empty (e.g., DELETE 204)
            if (response.status === 204) {
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            alert(`Error: ${error.message}`);
            throw error; // Re-throw to handle in calling function if needed
        }
    }

    async function fetchNotes() {
        return apiRequest(API_URL);
    }

    async function fetchNoteById(id) {
        return apiRequest(`${API_URL}/${id}`);
    }

    async function saveNote(noteData) {
        if (currentNoteId) {
            // Update existing note
            return apiRequest(`${API_URL}/${currentNoteId}`, 'PUT', noteData);
        } else {
            // Create new note
            return apiRequest(API_URL, 'POST', noteData);
        }
    }

    async function deleteNote(id) {
        return apiRequest(`${API_URL}/${id}`, 'DELETE');
    }

    async function enhanceNote(id) {
        return apiRequest(`${API_URL}/${id}/enhance`, 'POST');
    }

    async function transcribeAudio(id, audioBase64) {
        return apiRequest(`${API_URL}/${id}/transcribe`, 'POST', { audioData: audioBase64 });
    }

    async function importMarkdownNote(title, content) {
        return apiRequest(`${API_URL}/import`, 'POST', { title, content });
    }

    // --- Toast Notification System ---
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close">×</button>
        `;
        
        // Add close button functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
        
        return toast;
    }

    // --- Theme Toggle ---
    themeToggleBtn.addEventListener('click', () => {
        appContainer.classList.toggle('dark-mode');
        const isDarkMode = appContainer.classList.contains('dark-mode');
        themeToggleBtn.textContent = isDarkMode ? '☀️' : '🌙';
        
        // Save preference to localStorage
        secureStorage.setItem('darkMode', isDarkMode.toString());
        
        // Show toast
        showToast(`Switched to ${isDarkMode ? 'dark' : 'light'} mode`, 'info', 2000);
    });
    
    // Initialize theme from localStorage
    secureStorage.getItem('darkMode').then((darkMode) => {
        if (darkMode === 'true') {
            appContainer.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
        }
    });

    // --- Markdown Toolbar ---
    markdownToolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('title');
            let startPos = noteContentInput.selectionStart;
            let endPos = noteContentInput.selectionEnd;
            let selectedText = noteContentInput.value.substring(startPos, endPos);
            let insertText = '';
            
            switch (action) {
                case 'Bold':
                    insertText = `**${selectedText || 'bold text'}**`;
                    break;
                case 'Italic':
                    insertText = `*${selectedText || 'italic text'}*`;
                    break;
                case 'Heading':
                    insertText = `## ${selectedText || 'Heading'}`;
                    break;
                case 'Link':
                    insertText = `[${selectedText || 'link text'}](url)`;
                    break;
                case 'Image':
                    insertText = `![${selectedText || 'alt text'}](image-url)`;
                    break;
                case 'Code':
                    insertText = selectedText ? `\`${selectedText}\`` : "```\ncode block\n```";
                    break;
                case 'List':
                    insertText = selectedText ? 
                        selectedText.split('\n').map(line => `- ${line}`).join('\n') : 
                        "- List item\n- Another item";
                    break;
                case 'Numbered List':
                    insertText = selectedText ? 
                        selectedText.split('\n').map((line, i) => `${i+1}. ${line}`).join('\n') : 
                        "1. First item\n2. Second item";
                    break;
            }
            
            // Insert the text
            noteContentInput.focus();
            noteContentInput.setRangeText(insertText, startPos, endPos);
            
            // Update preview
            const content = noteContentInput.value;
            noteContentDisplay.innerHTML = marked.parse(content || 'No content.');
        });
    });

    // --- Knowledge Management Features ---
    
    // Initialize custom markdown renderer with wiki-link support
    const renderer = new marked.Renderer();
    const originalLinkRenderer = renderer.link;
    
    // Override link renderer to handle wiki-links
    renderer.link = function(href, title, text) {
        if (href.startsWith('[[') && href.endsWith(']]')) {
            // This is a wiki-style link
            const noteName = href.substring(2, href.length - 2);
            const noteExists = allNotes.some(note => note.title === noteName);
            const className = noteExists ? 'wiki-link' : 'wiki-link new';
            
            return `<a href="#" class="${className}" data-note="${noteName}">${text || noteName}</a>`;
        }
        return originalLinkRenderer.call(this, href, title, text);
    };
    
    marked.setOptions({
        renderer: renderer,
        highlight: function(code, language) {
            // Highlight.js integration could be added here
            return code;
        }
    });
    
    // Process wiki links in markdown text
    function processWikiLinks(text) {
        // Match [[Link]] pattern
        const regex = /\[\[(.*?)\]\]/g;
        let match;
        let connections = [];
        
        while ((match = regex.exec(text)) !== null) {
            const linkedNoteName = match[1];
            connections.push(linkedNoteName);
        }
        
        return connections;
    }
    
    // Update graph view based on note connections
    function updateGraphView() {
        // In a real implementation, this would use a library like D3.js or Sigma.js
        // For now, we just toggle the visibility of our static SVG placeholder
        if (currentNoteId && noteConnections[currentNoteId]) {
            const connections = noteConnections[currentNoteId];
            // Here we would update the graph visualization with the connections
            console.log('Connections for note:', connections);
        }
    }
    
    // Toggle graph view
    graphViewBtn.addEventListener('click', () => {
        graphViewPanel.classList.toggle('hidden');
        graphViewPanel.classList.toggle('show');
        updateGraphView();
    });
    
    graphCloseBtn.addEventListener('click', () => {
        graphViewPanel.classList.add('hidden');
        graphViewPanel.classList.remove('show');
    });
    
    // Graph zoom control
    graphZoomSlider.addEventListener('input', (e) => {
        const zoomLevel = e.target.value;
        document.querySelector('.graph-placeholder').style.transform = `scale(${zoomLevel})`;
    });
    
    // View toggle (Edit, Split, Preview)
    viewToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            viewToggleButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            
            // Toggle view mode based on the button id
            const viewMode = button.id.split('-')[0]; // 'edit', 'split', or 'preview'
            appContainer.classList.remove('edit-view', 'split-view', 'preview-view');
            appContainer.classList.add(`${viewMode}-view`);
            
            // Update display immediately
            updateMarkdownDisplay();
        });
    });
    
    // Tag management
    function addTag(tagName) {
        if (!tagName || currentTags.includes(tagName)) return;
        
        currentTags.push(tagName);
        renderTags();
    }
    
    function removeTag(tagName) {
        currentTags = currentTags.filter(tag => tag !== tagName);
        renderTags();
    }
    
    function renderTags() {
        tagsList.innerHTML = '';
        currentTags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = tag;
            tagEl.addEventListener('click', () => {
                removeTag(tag);
            });
            tagsList.appendChild(tagEl);
        });
    }
    
    addTagBtn.addEventListener('click', () => {
        const tagName = tagInput.value.trim();
        if (tagName) {
            addTag(tagName);
            tagInput.value = '';
        }
    });
    
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const tagName = tagInput.value.trim();
            if (tagName) {
                addTag(tagName);
                tagInput.value = '';
            }
            e.preventDefault();
        }
    });
    
    // Folder navigation
    folderItems.forEach(item => {
        const header = item.querySelector('.folder-header');
        if (header) {
            header.addEventListener('click', () => {
                item.classList.toggle('expanded');
                const toggle = item.querySelector('.folder-toggle');
                if (toggle) {
                    toggle.textContent = item.classList.contains('expanded') ? '▼' : '▶';
                }
            });
        }
    });
    
    noteLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove selected class from all notes
            noteLinks.forEach(l => l.classList.remove('selected'));
            // Add selected class to clicked note
            link.classList.add('selected');
            
            // In a real app, we would load this note - here we just simulate it
            noteTitleInput.value = link.textContent;
            updateBreadcrumbs(link.textContent);
        });
    });
    
    // Sidebar collapse toggle
    collapseToggle.addEventListener('click', () => {
        const isCollapsed = sidebarNotes.classList.toggle('collapsed');
        collapseToggle.textContent = isCollapsed ? '▶' : '◀';
        
        // Adjust grid layout when sidebar is collapsed
        if (isCollapsed) {
            appContainer.style.gridTemplateColumns = '60px 0 1fr';
        } else {
            appContainer.style.gridTemplateColumns = '60px 280px 1fr';
        }
    });
    
    // Kynsey Assist Tools panel toggle
    kynseyToolsToggle.addEventListener('click', () => {
        kynseyToolsToggle.classList.toggle('active');
        aiToolsPanel.classList.toggle('show');
    });
    
    // Search functionality
    searchToggle.addEventListener('click', () => {
        searchContainer.classList.toggle('hide');
        if (!searchContainer.classList.contains('hide')) {
            searchInput.focus();
        }
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
    });
    
    searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
            filterNotes(query);
        } else {
            // Reset to show all notes
            document.querySelectorAll('.note-item').forEach(item => {
                item.style.display = '';
            });
        }
    }, 300));
    
    function filterNotes(query) {
        document.querySelectorAll('.note-item').forEach(item => {
            const title = item.querySelector('.note-item-title').textContent.toLowerCase();
            const preview = item.querySelector('.note-item-preview').textContent.toLowerCase();
            
            if (title.includes(query) || preview.includes(query)) {
                item.style.display = '';
                
                // Highlight matching text
                if (item.querySelector('.search-highlight')) {
                    // Remove previous highlights
                    const titleEl = item.querySelector('.note-item-title');
                    const previewEl = item.querySelector('.note-item-preview');
                    titleEl.innerHTML = titleEl.textContent;
                    previewEl.innerHTML = previewEl.textContent;
                }
                
                // Add new highlights
                highlightText(item.querySelector('.note-item-title'), query);
                highlightText(item.querySelector('.note-item-preview'), query);
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    function highlightText(element, query) {
        if (!element) return;
        
        const content = element.textContent;
        const regex = new RegExp(`(${query})`, 'gi');
        element.innerHTML = content.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Update breadcrumbs based on current note
    function updateBreadcrumbs(noteTitle) {
        const breadcrumbs = document.querySelector('.breadcrumbs');
        breadcrumbs.innerHTML = '';
        
        // Add "Home" folder
        const folderSpan = document.createElement('span');
        folderSpan.textContent = 'Home';
        breadcrumbs.appendChild(folderSpan);
        
        const separator = document.createElement('span');
        separator.className = 'separator';
        separator.textContent = '/';
        breadcrumbs.appendChild(separator);
        
        // Add note title
        const titleSpan = document.createElement('span');
        titleSpan.textContent = noteTitle;
        breadcrumbs.appendChild(titleSpan);
    }
    
    // Generate or update backlinks for current note
    function updateBacklinks(noteTitle) {
        if (!noteTitle) return;
        
        const backlinksContainer = document.querySelector('.backlinks-list');
        backlinksContainer.innerHTML = '';
        
        // Find all notes that link to current note
        const linkedNotes = allNotes.filter(note => {
            const wikiLinks = processWikiLinks(note.content || '');
            return wikiLinks.includes(noteTitle);
        });
        
        if (linkedNotes.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'No linked mentions found.';
            emptyItem.style.padding = '8px 12px';
            emptyItem.style.color = 'var(--text-muted)';
            emptyItem.style.fontStyle = 'italic';
            backlinksContainer.appendChild(emptyItem);
            return;
        }
        
        linkedNotes.forEach(note => {
            const backlink = document.createElement('li');
            backlink.className = 'backlink';
            
            // Find the context of the link in the note
            const context = extractLinkContext(note.content, noteTitle);
            
            backlink.innerHTML = `
                <div class="backlink-header">
                    <span class="backlink-expand">▼</span>
                    <a href="#" class="backlink-title">${note.title}</a>
                    <span class="backlink-count">1</span>
                </div>
                <div class="backlink-context">
                    <p>${context}</p>
                </div>
            `;
            
            // Add click event to load the linked note
            backlink.querySelector('.backlink-title').addEventListener('click', (e) => {
                e.preventDefault();
                const noteToLoad = allNotes.find(n => n.title === note.title);
                if (noteToLoad) {
                    selectNote(noteToLoad.id);
                }
            });
            
            // Toggle context visibility
            backlink.querySelector('.backlink-header').addEventListener('click', (e) => {
                if (!e.target.classList.contains('backlink-title')) {
                    const contextEl = backlink.querySelector('.backlink-context');
                    contextEl.style.display = contextEl.style.display === 'none' ? 'block' : 'none';
                    const expandIcon = backlink.querySelector('.backlink-expand');
                    expandIcon.textContent = contextEl.style.display === 'none' ? '▶' : '▼';
                }
            });
            
            backlinksContainer.appendChild(backlink);
        });
    }
    
    // Extract context around a link mention in note content
    function extractLinkContext(content, linkText) {
        if (!content) return '';
        
        const regex = new RegExp(`[^.!?]*\\[\\[${linkText}\\]\\][^.!?]*`, 'g');
        const matches = content.match(regex);
        
        if (!matches || matches.length === 0) return '';
        
        // Just return first match for now
        return matches[0].replace(`[[${linkText}]]`, `[[<span class="highlight">${linkText}</span>]]`);
    }
    
    // Enhance markdown display to support wiki-links
    function updateMarkdownDisplay() {
        // Use our custom renderer with the current content
        const content = noteContentInput.value || '';
        noteContentDisplay.innerHTML = marked.parse(content);
        
        // Add click events to wiki links
        document.querySelectorAll('#note-content-display a.wiki-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const linkedNoteName = link.dataset.note;
                const linkedNote = allNotes.find(note => note.title === linkedNoteName);
                
                if (linkedNote) {
                    selectNote(linkedNote.id);
                } else {
                    // Create new note with this title
                    createNewNoteWithTitle(linkedNoteName);
                }
            });
        });
    }
    
    // Create a new note with pre-filled title
    function createNewNoteWithTitle(title) {
        clearNoteDetails();
        noteTitleInput.value = title;
        showToast(`Creating new note: ${title}`, 'info');
    }

    // --- UI Functions ---
    function renderNoteList(notes) {
        notesUl.innerHTML = ''; // Clear existing list
        if (!notes || notes.length === 0) {
            notesUl.innerHTML = '<li class="note-item empty-note-list">No notes yet.</li>';
            return;
        }
        
        // Cache the notes for searching and backlinking
        allNotes = notes;
        
        // Process all notes to build connection graph
        noteConnections = {};
        notes.forEach(note => {
            const connections = processWikiLinks(note.content || '');
            noteConnections[note.id] = connections;
        });
        
        notes.forEach(note => {
            const li = document.createElement('li');
            li.dataset.id = note.id;
            li.classList.add('note-item');
            
            // Create a more structured note item
            const titleEl = document.createElement('div');
            titleEl.className = 'note-item-title';
            titleEl.textContent = note.title;
            
            const previewEl = document.createElement('div');
            previewEl.className = 'note-item-preview';
            // Get first 50 chars of content without markdown
            const plainText = note.content ? note.content.replace(/[#*`_\[\]]/g, '') : '';
            previewEl.textContent = plainText.substring(0, 50) + (plainText.length > 50 ? '...' : '');
            
            const dateEl = document.createElement('div');
            dateEl.className = 'note-item-date';
            // Format the date if it exists
            const noteDate = note.updated_at || note.created_at;
            if (noteDate) {
                const date = new Date(noteDate);
                dateEl.textContent = date.toLocaleDateString();
            }
            
            li.appendChild(titleEl);
            li.appendChild(previewEl);
            if (noteDate) li.appendChild(dateEl);
            
            if (note.id === currentNoteId) {
                li.classList.add('selected');
            }
            
            li.addEventListener('click', () => selectNote(note.id));
            notesUl.appendChild(li);
        });
    }

    async function displayNoteContent(note) {
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        
        // Update markdown display with our enhanced renderer
        updateMarkdownDisplay();

        // Display audio player if path exists
        noteAudioPlayerContainer.innerHTML = ''; // Clear previous player
        if (note.audio_file_path) {
            const audioPlayer = document.createElement('audio');
            audioPlayer.controls = true;
            // Construct the URL based on the static serving path defined in server.js
            audioPlayer.src = `/audio/${note.audio_file_path}`;
            audioPlayer.classList.add('note-audio-player'); // Add class for styling if needed
            noteAudioPlayerContainer.appendChild(audioPlayer);
        }

        // Update breadcrumbs
        updateBreadcrumbs(note.title);
        
        // Update tags (simple implementation - in a real app, tags would be stored in DB)
        currentTags = note.tags || ['guide', 'help', 'documentation']; // Example tags
        renderTags();
        
        // Update backlinks
        updateBacklinks(note.title);
        
        // Update graph view connections
        updateGraphView();
        
        // Show/hide relevant buttons
        deleteNoteBtn.classList.remove('hidden');
        enhanceNoteBtn.classList.remove('hidden');
        audioControls.classList.remove('hidden');
        // Reset audio state for the new note
        resetAudioState();
    }

    function clearNoteDetails() {
        currentNoteId = null;
        noteTitleInput.value = '';
        noteContentInput.value = '';
        noteContentDisplay.innerHTML = 'Select a note to view its content or create a new one.';
        noteAudioPlayerContainer.innerHTML = ''; // Clear audio player
        updateBreadcrumbs('New Note');
        deleteNoteBtn.classList.add('hidden');
        enhanceNoteBtn.classList.add('hidden');
        audioControls.classList.add('hidden');
        // Deselect visually
        document.querySelectorAll('.note-item.selected').forEach(el => el.classList.remove('selected'));
        // Clear tags
        currentTags = [];
        renderTags();
        // Clear backlinks
        document.querySelector('.backlinks-list').innerHTML = '';
        resetAudioState();
    }

    async function loadNotes() {
        try {
            const notes = await fetchNotes();
            renderNoteList(notes);
        } catch (error) {
            // Error already logged by apiRequest
            notesUl.innerHTML = '<li>Error loading notes.</li>';
        }
    }

    async function selectNote(id) {
        if (currentNoteId === id) return; // Avoid re-selecting the same note

        currentNoteId = id;
        // Visually select in the list
        document.querySelectorAll('.note-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === String(id));
        });

        try {
            const note = await fetchNoteById(id);
            if (note) {
                displayNoteContent(note);
            } else {
                // Handle case where note might have been deleted elsewhere
                alert('Note not found.');
                clearNoteDetails();
                loadNotes(); // Refresh list
            }
        } catch (error) {
            // Error logged by apiRequest
            clearNoteDetails(); // Clear details on error
        }
    }

    // Listen for changes in note content to update preview in real-time (for split view)
    noteContentInput.addEventListener('input', debounce(() => {
        updateMarkdownDisplay();
    }, 300));

    function resetAudioState() {
        stopRecording(); // Ensure recorder is stopped if active
        audioChunks = [];
        recordedAudioBlob = null;
        startRecordingBtn.disabled = false;
        stopRecordingBtn.disabled = true;
        transcribeBtn.disabled = true;
        recordingStatus.textContent = '';
    }

    // --- Event Listeners ---
    newNoteBtn.addEventListener('click', () => {
        clearNoteDetails();
        showToast('Started a new note', 'info');
    });

    saveNoteBtn.addEventListener('click', async () => {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value; // Keep whitespace as is

        if (!title) {
            showToast('Note title cannot be empty', 'error');
            return;
        }

        const noteData = { title, content };

        saveNoteBtn.disabled = true;
        saveNoteBtn.innerHTML = '⏳ Saving...';

        try {
            const savedNote = await saveNote(noteData);
            if (savedNote) {
                // If it was a new note, select it
                if (!currentNoteId) {
                    currentNoteId = savedNote.id;
                }
                // Refresh list and display saved note
                await loadNotes();
                // Ensure the saved note is displayed (might have updated content)
                if (currentNoteId === savedNote.id) {
                    await selectNote(savedNote.id); // Re-select to show potentially updated content
                }
                showToast('Note saved successfully!', 'success');
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            saveNoteBtn.disabled = false;
            saveNoteBtn.innerHTML = '💾 Save';
        }
    });

    deleteNoteBtn.addEventListener('click', async () => {
        if (!currentNoteId) return;

        if (confirm('Are you sure you want to delete this note?')) {
            try {
                deleteNoteBtn.disabled = true;
                deleteNoteBtn.innerHTML = '⏳ Deleting...';
                
                await deleteNote(currentNoteId);
                clearNoteDetails();
                await loadNotes(); // Refresh list
                showToast('Note deleted successfully!', 'success');
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            } finally {
                deleteNoteBtn.disabled = false;
                deleteNoteBtn.innerHTML = '🗑️ Delete';
            }
        }
    });

    enhanceNoteBtn.addEventListener('click', async () => {
        if (!currentNoteId) return;

        enhanceNoteBtn.disabled = true;
        enhanceNoteBtn.innerHTML = '⏳ Enhancing...';

        try {
            const enhancedNote = await enhanceNote(currentNoteId);
            if (enhancedNote) {
                // Update the UI immediately with the enhanced content
                noteContentInput.value = enhancedNote.content;
                noteContentDisplay.innerHTML = marked.parse(enhancedNote.content);
                showToast('Note enhanced successfully!', 'success');
            }
        } catch (error) {
            showToast('Failed to enhance note', 'error');
        } finally {
            enhanceNoteBtn.disabled = false;
            enhanceNoteBtn.innerHTML = '✨ Enhance';
        }
    });

    // --- Audio Recording Logic ---
    async function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Audio recording is not supported by your browser', 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = []; // Reset chunks for new recording

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Or appropriate type
                // Enable transcribe button only if there's actual data
                transcribeBtn.disabled = !recordedAudioBlob || recordedAudioBlob.size === 0;
                stopRecordingBtn.disabled = true;
                startRecordingBtn.disabled = false;
                recordingStatus.textContent = 'Recording stopped. Ready to transcribe.';
                recordingStatus.classList.remove('recording');
                // Stop the tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
                showToast('Recording stopped', 'info');
            };

            mediaRecorder.start();
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            transcribeBtn.disabled = true; // Disable while recording
            recordingStatus.textContent = 'Recording...';
            recordingStatus.classList.add('recording');
            showToast('Started recording', 'info');

        } catch (err) {
            console.error('Error accessing microphone:', err);
            showToast('Could not access microphone. Please ensure permission is granted', 'error');
            resetAudioState(); // Reset buttons if failed
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            // onstop handler will manage button states and blob creation
        } else {
            // Handle cases where stop might be called unexpectedly
            stopRecordingBtn.disabled = true;
            startRecordingBtn.disabled = false;
        }
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    startRecordingBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);

    transcribeBtn.addEventListener('click', async () => {
        if (!currentNoteId || !recordedAudioBlob || recordedAudioBlob.size === 0) {
            showToast('No recording available or note selected', 'error');
            return;
        }

        transcribeBtn.disabled = true;
        transcribeBtn.innerHTML = '⏳ Transcribing...';
        recordingStatus.textContent = 'Transcribing audio...';

        try {
            const audioBase64 = await blobToBase64(recordedAudioBlob);
            // The backend now returns the full updated note object
            const updatedNote = await transcribeAudio(currentNoteId, audioBase64);

            if (updatedNote) {
                // Update the UI with the full note data returned from the server
                // This ensures content and audio player are consistent
                displayNoteContent(updatedNote); // Use the function to update display including audio player
                noteContentInput.value = updatedNote.content; // Also update the textarea

                showToast('Transcription added and audio saved!', 'success');
                resetAudioState(); // Reset after successful transcription and save
            } else {
                 // This case might occur if the API returns 200 OK but no body, or if the fetch failed earlier
                 throw new Error('Transcription request completed but no updated note data received.');
            }
        } catch (error) {
            console.error('Transcription Error:', error);
            showToast(`Failed to transcribe audio: ${error.message}`, 'error');
            recordingStatus.textContent = 'Transcription failed.';
            // Keep transcribe button enabled to allow retry? Or reset?
            // For now, keep it enabled but reset text
             transcribeBtn.disabled = false; // Allow retry
        } finally {
            // Reset button text regardless of success/failure if not resetting state
             if (!transcribeBtn.disabled) {
                 transcribeBtn.innerHTML = 'Transcribe Recording';
             }
        }
    });

    importMarkdownButton.addEventListener('click', () => {
        const file = markdownImportInput.files[0];
        if (!file) {
            showToast('Please select a Markdown file to import.', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = async (event) => {
            const content = event.target.result;
            // Use filename without .md extension as title
            let title = file.name;
            if (title.toLowerCase().endsWith('.md')) {
                title = title.slice(0, -3);
            }
            title = title.trim() || 'Imported Note'; // Default title if empty after trim

            try {
                importMarkdownButton.disabled = true;
                importMarkdownButton.textContent = 'Importing...';
                const importedNote = await importMarkdownNote(title, content);
                if (importedNote) {
                    showToast(`Note "${importedNote.title}" imported successfully!`, 'success');
                    await loadNotes(); // Refresh the notes list
                    // Optionally, select the newly imported note
                    // await selectNote(importedNote.id);
                    clearNoteDetails(); // Or just clear details
                    markdownImportInput.value = ''; // Clear the file input
                }
            } catch (error) {
                // Error logged by apiRequest
                showToast('Failed to import Markdown note.', 'error');
            } finally {
                importMarkdownButton.disabled = false;
                importMarkdownButton.textContent = 'Import Markdown';
            }
        };

        reader.onerror = (event) => {
            console.error("File reading error:", event.target.error);
            showToast('Error reading the selected file.', 'error');
        };

        reader.readAsText(file);
    });

    // --- Advanced Search Feature ---
    const advancedSearchToggle = document.getElementById('advanced-search-toggle');
    const advancedSearchPanel = document.querySelector('.advanced-search-panel');
    const advancedSearchForm = document.getElementById('advanced-search-form');
    const resetSearchBtn = document.getElementById('reset-search');
    
    // Toggle advanced search panel
    advancedSearchToggle.addEventListener('click', () => {
        advancedSearchPanel.classList.toggle('show');
    });
    
    // Handle advanced search form submission
    advancedSearchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const tagFilter = document.getElementById('tag-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        const sortOrder = document.getElementById('sort-order').value;
        const searchQuery = searchInput.value.trim();
        
        // Prepare search parameters
        const searchParams = new URLSearchParams();
        if (searchQuery) searchParams.append('query', searchQuery);
        if (dateFrom) searchParams.append('dateFrom', dateFrom);
        if (dateTo) searchParams.append('dateTo', dateTo);
        if (tagFilter) searchParams.append('tags', tagFilter);
        searchParams.append('sortBy', sortBy);
        searchParams.append('sortOrder', sortOrder);
        
        try {
            // Make API request to advanced search endpoint
            const response = await fetch(`/api/notes/search?${searchParams.toString()}`);
            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }
            
            const searchResults = await response.json();
            
            // Update the notes list with search results
            renderNoteList(searchResults);
            
            // Show success toast with result count
            showToast(`Found ${searchResults.length} matching notes`, 'success');
            
            // Hide the advanced search panel
            advancedSearchPanel.classList.remove('show');
            
        } catch (error) {
            console.error('Advanced search error:', error);
            showToast(`Search error: ${error.message}`, 'error');
        }
    });
    
    // Reset search form
    resetSearchBtn.addEventListener('click', () => {
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('tag-filter').value = '';
        document.getElementById('sort-by').value = 'updated_at';
        document.getElementById('sort-order').value = 'desc';
        searchInput.value = '';
        
        // Reset the note list to show all notes
        loadNotes();
        showToast('Search filters cleared', 'info');
    });

    // --- Keyboard Shortcuts ---
    const keyboardShortcuts = [
        { key: 'n', description: 'Create new note', handler: createNewNote, modifiers: ['ctrl'] },
        { key: 's', description: 'Save current note', handler: saveNote, modifiers: ['ctrl'] },
        { key: 'd', description: 'Delete current note', handler: deleteNote, modifiers: ['ctrl', 'shift'] },
        { key: 'b', description: 'Toggle sidebar', handler: toggleSidebar, modifiers: ['ctrl'] },
        { key: '/', description: 'Show keyboard shortcuts', handler: toggleKeyboardShortcutsOverlay, modifiers: ['ctrl'] },
        { key: 'f', description: 'Search notes', handler: focusSearch, modifiers: ['ctrl'] },
        { key: 'Escape', description: 'Close dialogs/overlays', handler: closeAllOverlays, modifiers: [] }
    ];

    // Initialize keyboard shortcuts
    function initKeyboardShortcuts() {
        const shortcutsContainer = document.querySelector('.keyboard-shortcuts-list');
        shortcutsContainer.innerHTML = '';
        
        // Populate keyboard shortcuts overlay
        keyboardShortcuts.forEach(shortcut => {
            const shortcutItem = document.createElement('div');
            shortcutItem.classList.add('shortcut-item');
            
            const keyCombo = document.createElement('span');
            keyCombo.classList.add('key-combo');
            
            const modifierText = shortcut.modifiers
                .map(mod => mod === 'ctrl' ? (navigator.platform.includes('Mac') ? '⌘' : 'Ctrl') : 
                     mod.charAt(0).toUpperCase() + mod.slice(1))
                .join(' + ');
                
            const keyText = shortcut.key === 'Escape' ? 'Esc' : 
                           (shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
            
            keyCombo.textContent = modifierText ? `${modifierText} + ${keyText}` : keyText;
            
            const description = document.createElement('span');
            description.classList.add('shortcut-description');
            description.textContent = shortcut.description;
            
            shortcutItem.appendChild(keyCombo);
            shortcutItem.appendChild(description);
            shortcutsContainer.appendChild(shortcutItem);
        });
        
        // Register keyboard event listener
        document.addEventListener('keydown', handleKeyboardShortcut);
    }

    // Handle keyboard shortcuts
    function handleKeyboardShortcut(event) {
        // Don't trigger shortcuts when typing in input fields or textareas
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Check if the pressed key combination matches any of our shortcuts
        for (const shortcut of keyboardShortcuts) {
            const key = event.key.toLowerCase();
            const ctrlKey = event.ctrlKey || event.metaKey; // metaKey for Mac
            const shiftKey = event.shiftKey;
            const altKey = event.altKey;
            
            const hasCtrl = shortcut.modifiers.includes('ctrl');
            const hasShift = shortcut.modifiers.includes('shift');
            const hasAlt = shortcut.modifiers.includes('alt');
            
            // Check if the key and all required modifiers match
            if (
                (key === shortcut.key.toLowerCase() || event.key === shortcut.key) && 
                ctrlKey === hasCtrl && 
                shiftKey === hasShift && 
                altKey === hasAlt
            ) {
                event.preventDefault();
                shortcut.handler();
                return;
            }
        }
    }

    // Toggle keyboard shortcuts overlay
    function toggleKeyboardShortcutsOverlay() {
        const overlay = document.getElementById('keyboard-shortcuts-overlay');
        if (overlay.style.display === 'flex') {
            overlay.style.display = 'none';
        } else {
            overlay.style.display = 'flex';
        }
    }

    // Focus search input
    function focusSearch() {
        document.getElementById('search-bar').focus();
    }

    // Close all overlays
    function closeAllOverlays() {
        const overlays = [
            document.getElementById('keyboard-shortcuts-overlay'),
            document.getElementById('settings-panel'),
            // Add other overlays here
        ];
        
        overlays.forEach(overlay => {
            if (overlay && overlay.style.display === 'flex') {
                overlay.style.display = 'none';
            }
        });
    }

    // Toggle sidebar
    function toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const content = document.querySelector('.content');
        
        sidebar.classList.toggle('hidden');
        content.classList.toggle('full-width');
    }

    // --- Code Syntax Highlighting Themes ---
    const availableCodeThemes = [
        { name: 'Default', value: 'default' },
        { name: 'Atom One Dark', value: 'atom-one-dark' },
        { name: 'Atom One Light', value: 'atom-one-light' },
        { name: 'Dracula', value: 'dracula' },
        { name: 'GitHub', value: 'github' },
        { name: 'Monokai', value: 'monokai' },
        { name: 'Nord', value: 'nord' },
        { name: 'Solarized Dark', value: 'solarized-dark' },
        { name: 'Solarized Light', value: 'solarized-light' },
        { name: 'Tokyo Night Dark', value: 'tokyo-night-dark' },
        { name: 'Tokyo Night Light', value: 'tokyo-night-light' },
        { name: 'VS Code', value: 'vs' },
        { name: 'VS Code Dark', value: 'vs2015' }
    ];

    // Populate code theme selector
    function populateCodeThemeSelector() {
        // Clear existing options
        codeThemeSelectorElement.innerHTML = '';
        
        // Add options for each available theme
        availableCodeThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.value;
            option.textContent = theme.name;
            codeThemeSelectorElement.appendChild(option);
        });
        
        // Set selected theme from localStorage or default
        secureStorage.getItem('codeTheme').then(savedTheme => {
            if (savedTheme) {
                codeThemeSelectorElement.value = savedTheme;
                setCodeTheme(savedTheme);
            } else {
                // Default to a theme that matches the app theme
                const defaultTheme = isDarkMode ? 'atom-one-dark' : 'github';
                codeThemeSelectorElement.value = defaultTheme;
                setCodeTheme(defaultTheme);
            }
        });
    }

    // Set the code theme by changing the stylesheet link
    function setCodeTheme(theme) {
        const codeThemeLink = document.getElementById('code-theme');
        codeThemeLink.setAttribute('href', `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/${theme}.min.css`);
        
        // Save the selected theme to localStorage
        secureStorage.setItem('codeTheme', theme);
        
        // Reapply syntax highlighting to all code blocks
        document.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    // Add event listener to code theme selector
    codeThemeSelectorElement.addEventListener('change', (e) => {
        setCodeTheme(e.target.value);
        showToast(`Code highlighting theme changed to ${e.target.options[e.target.selectedIndex].text}`, 'info', 2000);
    });

    // --- Local Storage Encryption ---

    // Create a secure storage wrapper for localStorage with encryption support
    const secureStorage = {
        // Encryption key derived from user password or generated
        encryptionKey: null,
        isEncrypted: false,

        // Initialize the secure storage with encryption settings
        async init() {
            // Check if encryption is enabled
            const encryptionEnabled = localStorage.getItem('encryptionEnabled') === 'true';
            this.isEncrypted = encryptionEnabled;
            encryptionToggle.checked = encryptionEnabled;

            if (encryptionEnabled) {
                // If we have a saved key in session storage (temporary, for this session only)
                const sessionKey = sessionStorage.getItem('tempEncryptionKey');
                if (sessionKey) {
                    this.encryptionKey = sessionKey;
                } else {
                    // Ask for password to derive key
                    await this.promptForPassword();
                }
            }
        },

        // Prompt the user for an encryption password
        async promptForPassword(isCreating = false) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'password-modal';
                modal.innerHTML = `
                    <div class="password-modal-content">
                        <h3>${isCreating ? 'Create Encryption Password' : 'Enter Encryption Password'}</h3>
                        <p>This password will be used to encrypt your notes. 
                           ${isCreating ? 'Make sure to remember it as your notes cannot be recovered if forgotten!' : ''}
                        </p>
                        <input type="password" id="encryption-password" placeholder="Password" class="password-input">
                        ${isCreating ? '<input type="password" id="encryption-password-confirm" placeholder="Confirm Password" class="password-input">' : ''}
                        <div class="password-buttons">
                            <button id="password-cancel" class="btn btn-secondary">Cancel</button>
                            <button id="password-submit" class="btn btn-primary">Submit</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                const passwordInput = document.getElementById('encryption-password');
                const submitBtn = document.getElementById('password-submit');
                const cancelBtn = document.getElementById('password-cancel');
                
                passwordInput.focus();
                
                submitBtn.addEventListener('click', async () => {
                    const password = passwordInput.value;
                    
                    if (isCreating) {
                        const confirmInput = document.getElementById('encryption-password-confirm');
                        if (password !== confirmInput.value) {
                            showToast('Passwords do not match!', 'error');
                            return;
                        }
                    }
                    
                    if (password) {
                        // Generate a key from the password
                        const encoder = new TextEncoder();
                        const data = encoder.encode(password);
                        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                        const hashArray = Array.from(new Uint8Array(hashBuffer));
                        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                        
                        this.encryptionKey = hashHex;
                        // Store temporarily in session storage (cleared when browser closes)
                        sessionStorage.setItem('tempEncryptionKey', this.encryptionKey);
                        
                        document.body.removeChild(modal);
                        resolve(true);
                        
                        if (isCreating) {
                            // If creating new password, we need to re-encrypt all existing data
                            this.reEncryptAllData();
                        }
                    } else {
                        showToast('Password cannot be empty!', 'error');
                    }
                });
                
                cancelBtn.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    // If user cancels, disable encryption
                    this.isEncrypted = false;
                    encryptionToggle.checked = false;
                    localStorage.setItem('encryptionEnabled', 'false');
                    resolve(false);
                });
                
                // Handle Enter key
                passwordInput.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') {
                        submitBtn.click();
                    }
                });
            });
        },

        // Re-encrypt all existing data with the new key
        async reEncryptAllData() {
            // Get all keys from localStorage
            Object.keys(localStorage).forEach(async (key) => {
                // Skip encryption settings key
                if (key === 'encryptionEnabled') return;
                
                // Get raw value (could be encrypted or not)
                const value = localStorage.getItem(key);
                
                try {
                    // Try to parse as JSON to determine if it's encrypted
                    const parsedValue = JSON.parse(value);
                    // If it has an iv property, it's likely encrypted
                    if (parsedValue && parsedValue.iv) {
                        // This is already encrypted, so decrypt first
                        const decryptedValue = await this.decrypt(value);
                        // Then encrypt with new key
                        const reEncrypted = await this.encrypt(decryptedValue);
                        localStorage.setItem(key, reEncrypted);
                    } else {
                        // Not encrypted, so encrypt it
                        const encrypted = await this.encrypt(value);
                        localStorage.setItem(key, encrypted);
                    }
                } catch (e) {
                    // Not JSON, so it's likely not encrypted
                    const encrypted = await this.encrypt(value);
                    localStorage.setItem(key, encrypted);
                }
            });
            
            showToast('All notes have been encrypted!', 'success');
        },

        // Encrypt a string value
        async encrypt(value) {
            if (!this.isEncrypted || !this.encryptionKey) return value;
            
            try {
                // Generate a random initialization vector
                const iv = crypto.getRandomValues(new Uint8Array(12));
                
                // Convert encryptionKey from hex to ArrayBuffer
                const key = await this.getKeyFromHex(this.encryptionKey);
                
                // Encrypt the value
                const encodedValue = new TextEncoder().encode(value);
                const encryptedBuffer = await crypto.subtle.encrypt(
                    {
                        name: 'AES-GCM',
                        iv: iv
                    },
                    key,
                    encodedValue
                );
                
                // Convert encrypted data to Base64
                const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
                const encryptedBase64 = btoa(String.fromCharCode.apply(null, encryptedArray));
                
                // Convert IV to Base64
                const ivBase64 = btoa(String.fromCharCode.apply(null, iv));
                
                // Return the encrypted object as a JSON string
                return JSON.stringify({
                    iv: ivBase64,
                    data: encryptedBase64
                });
            } catch (e) {
                console.error('Encryption error:', e);
                return value;
            }
        },

        // Decrypt a string value
        async decrypt(encryptedJson) {
            if (!this.isEncrypted || !this.encryptionKey) return encryptedJson;
            
            try {
                // Parse the encrypted JSON
                const { iv, data } = JSON.parse(encryptedJson);
                
                // Convert IV and data from Base64 to ArrayBuffer
                const ivArray = new Uint8Array(Array.from(atob(iv), c => c.charCodeAt(0)));
                const encryptedArray = new Uint8Array(Array.from(atob(data), c => c.charCodeAt(0)));
                
                // Convert encryptionKey from hex to ArrayBuffer
                const key = await this.getKeyFromHex(this.encryptionKey);
                
                // Decrypt the value
                const decryptedBuffer = await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: ivArray
                    },
                    key,
                    encryptedArray
                );
                
                // Convert decrypted buffer to string
                return new TextDecoder().decode(decryptedBuffer);
            } catch (e) {
                console.error('Decryption error:', e);
                return encryptedJson;
            }
        },

        // Convert hex string to CryptoKey
        async getKeyFromHex(hexKey) {
            // Convert hex to byte array
            const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            
            // Import the key
            return await crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        },

        // Get an item from localStorage with decryption if needed
        async getItem(key) {
            const value = localStorage.getItem(key);
            if (!value) return null;
            
            if (this.isEncrypted && this.encryptionKey) {
                try {
                    // Check if it's in encrypted format
                    const parsed = JSON.parse(value);
                    if (parsed && parsed.iv && parsed.data) {
                        return await this.decrypt(value);
                    }
                } catch (e) {
                    // Not encrypted or invalid JSON
                }
            }
            
            return value;
        },

        // Set an item in localStorage with encryption if enabled
        async setItem(key, value) {
            if (this.isEncrypted && this.encryptionKey) {
                const encrypted = await this.encrypt(value);
                localStorage.setItem(key, encrypted);
            } else {
                localStorage.setItem(key, value);
            }
        },

        // Remove an item from localStorage
        removeItem(key) {
            localStorage.removeItem(key);
        }
    };

    // Handle encryption toggle
    encryptionToggle.addEventListener('change', async () => {
        const enableEncryption = encryptionToggle.checked;
        
        if (enableEncryption) {
            // User wants to enable encryption
            const success = await secureStorage.promptForPassword(true);
            if (success) {
                secureStorage.isEncrypted = true;
                localStorage.setItem('encryptionEnabled', 'true');
                showToast('Encryption enabled', 'success');
            }
        } else {
            // User wants to disable encryption
            if (secureStorage.isEncrypted) {
                if (confirm('Disabling encryption will make your notes more vulnerable. Are you sure?')) {
                    secureStorage.isEncrypted = false;
                    localStorage.setItem('encryptionEnabled', 'false');
                    // Decrypt all data and save it unencrypted
                    Object.keys(localStorage).forEach(async (key) => {
                        if (key === 'encryptionEnabled') return;
                        const value = localStorage.getItem(key);
                        try {
                            const decrypted = await secureStorage.decrypt(value);
                            localStorage.setItem(key, decrypted);
                        } catch (e) {
                            // If decryption fails, keep original value
                        }
                    });
                    sessionStorage.removeItem('tempEncryptionKey');
                    showToast('Encryption disabled', 'info');
                } else {
                    // User canceled, revert the toggle
                    encryptionToggle.checked = true;
                }
            }
        }
    });

    // Initialize secure storage on page load
    document.addEventListener('DOMContentLoaded', async () => {
        // Initialize secureStorage before loading any notes
        await secureStorage.init();
        
        // Now populate the code theme selector
        populateCodeThemeSelector();
        
        // Load notes from storage after encryption is set up
        loadNotes();
    });

    // --- Initial Load ---
    loadNotes();
    clearNoteDetails(); // Start with a clean slate
    populateCodeThemeSelector(); // Initialize code themes
    initKeyboardShortcuts(); // Initialize keyboard shortcuts
    
    // Show welcome message
    setTimeout(() => {
        showToast('Welcome to AI Notes App!', 'info', 4000);
    }, 500);
});

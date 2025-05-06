# AI-Enhanced Notes Application

This is an offline-first note-taking application using Ollama for local AI processing.

## Project Structure

- `src/`: Contains the main source code.
  - `backend/`: Backend server logic (Node.js/Express).
  - `frontend/`: Frontend UI components (HTML/CSS/JS - TBD).
  - `core/`: Core application logic shared between frontend and backend.
- `config/`: Configuration files (e.g., `config.json`).
- `database/`: SQLite database file (`notes_app.db`).
- `audio_files/`: Storage for audio recordings.

## Setup

1.  **Clone the repository:** (Assuming this step in the future)
    ```bash
    git clone <repository-url>
    cd ai-notes-app
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Database:** The SQLite database (`database/notes_app.db`) and initial tables (`notes`, `users`) are created automatically if they don't exist when the application starts (or via `node setup_db.js` which was run initially).
4.  **Configuration:** Edit `config/config.json` to set database paths, Ollama models, etc. if needed.

## Dependencies Installed

- `ollama`: Client library for interacting with Ollama.
- `sqlite3`: SQLite database driver for Node.js.
- `express`: Web server framework for the backend API.
- `marked`: Markdown parsing library.

## Next Steps

- Implement backend API endpoints.
- Develop frontend UI.
- Integrate Ollama for note enhancement and audio transcription.
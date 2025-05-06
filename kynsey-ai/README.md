# KYNSEY AI - Ollama Chat Application

A chat interface for interacting with local Ollama LLM models, featuring the KYNSEY AI persona, file uploads (images), response style selection, and conversation history.

## Project Structure
## Prerequisites

1.  **Node.js:** Version 18+ recommended (due to `ollama` package and ES Modules).
2.  **npm:** Comes with Node.js.
3.  **Ollama:** Installed and running locally. [https://ollama.com/](https://ollama.com/)
4.  **Ollama Model:** The required model pulled.
    ```bash
    ollama pull llama3.2:3b-instruct-fp16
    ```

## Setup and Running

### 1. Start Ollama

Ensure the Ollama application or service is running in the background. You can verify by opening a terminal and running:

```bash
ollama list
kynsey-ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── systemPrompt.js
│   │   └── server.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── index.html
│   └── admin.html
└── README.md

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { enhanceNote, transcribeAudio, semanticSearch, getAvailableModels } = require('../core/ai_service');

// --- Configuration ---
const configPath = path.join(__dirname, '../../config/config.json');
let config;
try {
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(configFile);
} catch (err) {
  console.error("Error reading or parsing config file:", err);
  process.exit(1);
}

const dbPath = path.resolve(__dirname, '../../', config.database.path);

// --- Database Setup ---
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    process.exit(1);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error("Error ensuring notes table exists:", err.message);
        }
    });
  }
});

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware Setup ---
// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve audio files
const audioStorageBasePath = config.audioStoragePath || path.resolve(__dirname, '../../audio_files');
console.log(`Serving audio files from: ${audioStorageBasePath}`);
if (!fs.existsSync(audioStorageBasePath)) {
  fs.mkdirSync(audioStorageBasePath, { recursive: true });
}
app.use('/audio', express.static(audioStorageBasePath));

// --- User Role & Permissions ---
const getCurrentUserRole = (req) => {
  return req.headers['x-user-role'] || 'viewer';
};

const checkPermission = (allowedRoles) => {
  return (req, res, next) => {
    const currentUserRole = getCurrentUserRole(req);
    const definedRoles = Array.isArray(config?.roles) ? config.roles : [];

    if (!definedRoles.includes(currentUserRole)) {
        console.warn(`User role '${currentUserRole}' is not defined in config. Denying access.`);
        return res.status(403).json({ error: 'Forbidden: Invalid user role.' });
    }

    if (allowedRoles.includes(currentUserRole)) {
      next();
    } else {
      console.log(`Access denied for role '${currentUserRole}' to resource requiring one of [${allowedRoles.join(', ')}]`);
      res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
    }
  };
};

// --- API Routes Setup ---
const notesRouter = express.Router();

// Notes CRUD Operations
notesRouter.post('/', checkPermission(['admin', 'editor']), (req, res) => {
    const { title, content } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    const sql = `INSERT INTO notes (title, content) VALUES (?, ?)`;
    db.run(sql, [title, content || ''], function(err) {
        if (err) {
            console.error("Error creating note:", err.message);
            return res.status(500).json({ error: 'Failed to create note' });
        }
        res.status(201).json({ id: this.lastID, title, content });
    });
});

notesRouter.get('/', checkPermission(config.roles || ['admin', 'editor', 'viewer']), (req, res) => {
    const sql = `SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching notes:", err.message);
            return res.status(500).json({ error: 'Failed to fetch notes' });
        }
        res.json(rows);
    });
});

notesRouter.get('/:id', checkPermission(config.roles || ['admin', 'editor', 'viewer']), (req, res) => {
    const id = req.params.id;
    const sql = `SELECT id, title, content, created_at, updated_at, audio_file_path FROM notes WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error("Error fetching note:", err.message);
            return res.status(500).json({ error: 'Failed to fetch note' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(row);
    });
});

notesRouter.put('/:id', checkPermission(['admin', 'editor']), (req, res) => {
    const id = req.params.id;
    const { title, content } = req.body;
    if (!title && content === undefined) {
        return res.status(400).json({ error: 'At least title or content must be provided for update' });
    }

    let fields = [];
    let params = [];
    if (title) {
        fields.push("title = ?");
        params.push(title);
    }
    if (content !== undefined) {
        fields.push("content = ?");
        params.push(content);
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const sql = `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`;

    db.run(sql, params, function(err) {
        if (err) {
            console.error("Error updating note:", err.message);
            return res.status(500).json({ error: 'Failed to update note' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Note not found or no changes made' });
        }
        db.get(`SELECT id, title, content, created_at, updated_at, audio_file_path FROM notes WHERE id = ?`, [id], (err, row) => {
             if (err) {
                console.error("Error fetching updated note:", err.message);
                return res.status(200).json({ message: 'Note updated successfully, but failed to fetch updated data.' });
            }
             if (!row) {
                return res.status(404).json({ error: 'Updated note not found' });
            }
            res.json(row);
        });
    });
});

notesRouter.delete('/:id', checkPermission(['admin']), (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM notes WHERE id = ?`;
    db.run(sql, [id], function(err) {
        if (err) {
            console.error("Error deleting note:", err.message);
            return res.status(500).json({ error: 'Failed to delete note' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.status(204).send();
    });
});

// Import route
notesRouter.post('/import', checkPermission(['admin', 'editor']), (req, res) => {
    const { title, content } = req.body;
    if (!title || content === undefined || content === null) {
        return res.status(400).json({ error: 'Title and content are required for import' });
    }
    const sql = `INSERT INTO notes (title, content) VALUES (?, ?)`;
    db.run(sql, [title, content], function(err) {
        if (err) {
            console.error("Error importing note:", err.message);
            return res.status(500).json({ error: 'Failed to import note into database' });
        }
        res.status(201).json({ id: this.lastID, title, content });
    });
});

// AI Enhancement routes
notesRouter.post('/:id/enhance', checkPermission(['admin', 'editor']), async (req, res) => {
    const id = req.params.id;
    const getSql = `SELECT id, title, content FROM notes WHERE id = ?`;

    db.get(getSql, [id], async (err, note) => {
        if (err) {
            console.error("Error fetching note for enhancement:", err.message);
            return res.status(500).json({ error: 'Failed to fetch note' });
        }
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        if (!note.content) {
             return res.status(400).json({ error: 'Note has no content to enhance' });
        }

        try {
            const enhancedContent = await enhanceNote(note.content);
            const updateSql = `UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

            db.run(updateSql, [enhancedContent, id], function(err) {
                if (err) {
                    console.error("Error updating note after enhancement:", err.message);
                    return res.status(500).json({ error: 'Failed to save enhanced note' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Note not found during update' });
                }
                db.get(`SELECT id, title, content, created_at, updated_at, audio_file_path FROM notes WHERE id = ?`, [id], (err, updatedNote) => {
                    if (err || !updatedNote) {
                        return res.status(200).json({ message: 'Note enhanced successfully, but failed to fetch updated data.', enhancedContent });
                    }
                    res.json(updatedNote);
                });
            });
        } catch (aiError) {
            console.error("Error during AI enhancement:", aiError.message);
            res.status(500).json({ error: `AI enhancement failed: ${aiError.message}` });
        }
    });
});

// Mount the notes router
app.use('/api/notes', notesRouter);

// Search endpoint
app.get('/api/notes/search', async (req, res) => {
    try {
        const query = req.query.query || '';
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const tags = req.query.tags;
        const sortBy = req.query.sortBy || 'updated_at';
        const sortOrder = req.query.sortOrder || 'desc';
        const limit = parseInt(req.query.limit) || 50;
        
        let sql = `SELECT * FROM notes WHERE 1=1`;
        const params = [];
        
        if (query) {
            sql += ` AND (title LIKE ? OR content LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`);
        }
        
        if (dateFrom) {
            sql += ` AND (created_at >= ? OR updated_at >= ?)`;
            params.push(dateFrom, dateFrom);
        }
        
        if (dateTo) {
            sql += ` AND (created_at <= ? OR updated_at <= ?)`;
            params.push(dateTo, dateTo);
        }
        
        if (tags) {
            const tagList = tags.split(',').map(tag => tag.trim());
            const tagConditions = tagList.map(() => `content LIKE ?`).join(' OR ');
            if (tagConditions) {
                sql += ` AND (${tagConditions})`;
                tagList.forEach(tag => params.push(`%#${tag}%`));
            }
        }
        
        const validSortFields = ['title', 'created_at', 'updated_at'];
        const validSortOrders = ['asc', 'desc'];
        
        const sanitizedSortBy = validSortFields.includes(sortBy) ? sortBy : 'updated_at';
        const sanitizedSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder : 'desc';
        
        sql += ` ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder} LIMIT ?`;
        params.push(limit);
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Search error:', err);
                return res.status(500).json({ error: 'Database error during search' });
            }
            
            res.json({
                count: rows.length,
                results: rows.map(note => ({
                    ...note,
                    preview: note.content ? 
                        note.content.replace(/[#*`_\[\]]/g, '').substring(0, 150) + 
                        (note.content.length > 150 ? '...' : '') : ''
                }))
            });
        });
    } catch (error) {
        console.error('Search endpoint error:', error);
        res.status(500).json({ error: 'Failed to execute search' });
    }
});

// Models endpoint
app.get('/api/models', async (req, res) => {
    try {
        const models = await getAvailableModels();
        res.json({ 
            models,
            current: config.ollama.model 
        });
    } catch (error) {
        console.error("Error fetching models:", error);
        res.status(500).json({ error: 'Failed to fetch available models' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Client-side routing - catch-all route for SPA
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        next();
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});

module.exports = { app, db, config };

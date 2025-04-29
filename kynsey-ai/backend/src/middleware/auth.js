/**
 * Authentication Middleware
 * Handles authentication and authorization checks for protected routes
 */

/**
 * Check if the request is from an admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function requireAdmin(req, res, next) {
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (!adminSecret) {
        console.error('ADMIN_SECRET environment variable not set');
        return res.status(500).json({ 
            error: 'Server configuration error: Admin authentication not properly configured' 
        });
    }

    // Check for admin secret in header
    const providedSecret = req.headers['x-admin-secret'];
    
    if (!providedSecret || providedSecret !== adminSecret) {
        return res.status(403).json({ 
            error: 'Forbidden: Admin access required' 
        });
    }

    next();
}

/**
 * Middleware to log API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function logApiRequest(req, res, next) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const ip = req.ip;

    console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);
    next();
}

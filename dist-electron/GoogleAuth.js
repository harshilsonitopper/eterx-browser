/**
 * GoogleAuth.ts - Google OAuth for Electron (Loopback Method)
 *
 * Google blocks ALL embedded browsers. This uses the official loopback OAuth:
 * 1. Open Google sign-in in SYSTEM browser (Chrome/Edge)
 * 2. Google redirects to http://127.0.0.1:PORT/callback
 * 3. Local server captures the auth code
 * 4. App exchanges code for tokens
 *
 * This is Google's OFFICIAL recommended approach for desktop apps.
 */
import { shell } from 'electron';
import * as http from 'http';
import * as crypto from 'crypto';
// ============================================================================
// CONFIGURATION - Set your Google OAuth credentials in .env
// ============================================================================
// ============================================================================
// CONFIGURATION (Read at runtime to ensure dotenv is loaded)
// ============================================================================
const REDIRECT_PORT = 8085;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
// ... PKCE functions (unchanged) ...
function base64URLEncode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function generateCodeVerifier() {
    return base64URLEncode(crypto.randomBytes(32));
}
function generateCodeChallenge(verifier) {
    return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}
// ============================================================================
// USER INFO FETCHING
// ============================================================================
async function fetchUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }
    return await response.json();
}
export async function signInWithGoogle() {
    const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '';
    const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || '';
    console.log('[GoogleAuth] Client ID present:', !!GOOGLE_CLIENT_ID);
    if (!GOOGLE_CLIENT_ID) {
        return { success: false, error: 'VITE_GOOGLE_CLIENT_ID not set in .env' };
    }
    // ... (rest of the function, ensuring we call fetchUserInfo)
    return new Promise((resolve) => {
        // Generate PKCE codes
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const state = crypto.randomBytes(16).toString('hex');
        // Build Google OAuth URL
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'email profile');
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        // Create flag to track success
        let isAuthenticated = false;
        // Start local callback server
        const server = http.createServer(async (req, res) => {
            const url = new URL(req.url || '', `http://127.0.0.1:${REDIRECT_PORT}`);
            if (url.pathname === '/callback') {
                const code = url.searchParams.get('code');
                const returnedState = url.searchParams.get('state');
                const error = url.searchParams.get('error');
                // Send response to browser
                res.writeHead(200, { 'Content-Type': 'text/html' });
                if (error) {
                    res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
                    server.close();
                    resolve({ success: false, error });
                    return;
                }
                if (!code || returnedState !== state) {
                    res.end('<html><body><h1>Invalid Response</h1><p>You can close this window.</p></body></html>');
                    server.close();
                    resolve({ success: false, error: 'Invalid state or missing code' });
                    return;
                }
                res.end('<html><body><h1>✓ Signed In Successfully!</h1><p>You can close this window and return to the app.</p><script>window.close();</script></body></html>');
                server.close();
                // Exchange code for tokens
                try {
                    const tokenResult = await exchangeCodeForTokens(code, codeVerifier, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
                    if (tokenResult.accessToken) {
                        try {
                            const userInfo = await fetchUserInfo(tokenResult.accessToken);
                            resolve({
                                success: true,
                                accessToken: tokenResult.accessToken,
                                refreshToken: tokenResult.refreshToken,
                                email: userInfo.email,
                                name: userInfo.name,
                                picture: userInfo.picture
                            });
                        }
                        catch (err) {
                            console.error('[GoogleAuth] Failed to fetch user profile:', err);
                            // Fallback to basic success if profile fails
                            resolve(tokenResult);
                        }
                    }
                    else {
                        resolve(tokenResult);
                    }
                }
                catch (e) {
                    resolve({ success: false, error: e.message });
                }
            }
        });
        server.listen(REDIRECT_PORT, '127.0.0.1', () => {
            console.log(`[GoogleAuth] Callback server listening on port ${REDIRECT_PORT}`);
            // Open Google sign-in in system browser
            shell.openExternal(authUrl.toString());
        });
        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            resolve({ success: false, error: 'Authentication timed out' });
        }, 5 * 60 * 1000);
    });
}
// ============================================================================
// TOKEN EXCHANGE
// ============================================================================
async function exchangeCodeForTokens(code, codeVerifier, clientId, clientSecret) {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.set('client_id', clientId);
    params.set('code', code);
    params.set('code_verifier', codeVerifier);
    params.set('grant_type', 'authorization_code');
    params.set('redirect_uri', REDIRECT_URI);
    // Only include client_secret if available (for confidential clients)
    // Only include client_secret if available (for confidential clients)
    if (clientSecret) {
        params.set('client_secret', clientSecret);
    }
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
    }
    const tokens = await response.json();
    // Get user info
    const userInfo = await getUserInfo(tokens.access_token);
    return {
        success: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        email: userInfo?.email,
        name: userInfo?.name,
        picture: userInfo?.picture
    };
}
async function getUserInfo(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return await response.json();
    }
    catch {
        return null;
    }
}
// ============================================================================
// EXPORT
// ============================================================================
export const GoogleAuth = {
    signIn: signInWithGoogle
};

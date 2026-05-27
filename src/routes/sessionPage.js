const crypto = require('crypto');

const VALID_USER = process.env.SESSION_USER || 'admin';
const VALID_PASS = process.env.SESSION_PASS || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'demo-session-secret';

function parseCookies(req) {
    const cookies = {};
    const header = req.headers.cookie || '';
    header.split(';').forEach((part) => {
        const idx = part.indexOf('=');
        if (idx > 0) {
            cookies[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
        }
    });
    return cookies;
}

function createSession(username) {
    const encoded = Buffer.from(username).toString('base64url');
    const sig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(username)
        .digest('hex');
    return `${encoded}.${sig}`;
}

function verifySession(cookieValue) {
    if (!cookieValue) return null;
    const dot = cookieValue.indexOf('.');
    if (dot === -1) return null;
    const encoded = cookieValue.slice(0, dot);
    const receivedSig = cookieValue.slice(dot + 1);
    let username;
    try {
        username = Buffer.from(encoded, 'base64url').toString('utf8');
    } catch {
        return null;
    }
    const expectedSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(username)
        .digest('hex');
    if (receivedSig.length !== expectedSig.length) return null;
    try {
        if (
            !crypto.timingSafeEqual(
                Buffer.from(receivedSig),
                Buffer.from(expectedSig),
            )
        )
            return null;
    } catch {
        return null;
    }
    return username;
}

const CSS = `
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f4f4f4; }
    .box { background: white; padding: 40px 60px; border-radius: 8px; box-shadow: 0 0 1em #ccc; text-align: center; min-width: 320px; }
    h1 { margin-bottom: 8px; font-size: 1.4em; }
    .subtitle { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    input { display: block; width: 100%; padding: 8px 12px; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 1em; }
    button { padding: 8px 24px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }
    button:hover { background: #0056b3; }
    button.danger { background: #dc3545; margin-top: 12px; }
    button.danger:hover { background: #b02a37; }
    .success { color: #28a745; font-weight: bold; margin: 16px 0; }
    .error { color: #dc3545; margin-top: 12px; }
    .hint { font-size: 0.85em; color: #888; margin-top: 8px; }
    a { color: #007bff; }
`;

const loginPage = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Session Cookie Auth</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="box">
        <h1>Session Cookie Auth</h1>
        <p class="subtitle">Credentials are exchanged for a signed session cookie</p>
        <input id="username" type="text" placeholder="Username" data-testid="username-input" />
        <input id="password" type="password" placeholder="Password" data-testid="password-input" />
        <button onclick="doLogin()" data-testid="login-button">Login</button>
        <p id="error" class="error" style="display:none" data-testid="auth-result"></p>
        <p style="margin-top:20px"><a href="/">Back to app</a></p>
    </div>
    <script>
        function doLogin() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            fetch('/session/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })
            .then(r => r.json())
            .then(data => {
                if (data.authorized) {
                    window.location.reload();
                } else {
                    const err = document.getElementById('error');
                    err.textContent = 'Failure: authentication, you are not authorized';
                    err.style.display = 'block';
                }
            });
        }
    </script>
</body>
</html>`;

function successPage(username) {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Session Cookie Auth — Authorized</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="box">
        <h1>Session Cookie Auth</h1>
        <p class="success" data-testid="auth-result">Success, you're authorized</p>
        <p>Logged in as <strong>${username}</strong></p>
        <p class="hint">Session stored in cookie: <code>session_id</code></p>
        <button class="danger" onclick="doLogout()" data-testid="logout-button">Logout</button>
        <p style="margin-top:16px"><a href="/">Back to app</a></p>
    </div>
    <script>
        function doLogout() {
            fetch('/session/logout', { method: 'POST' })
                .then(() => window.location.reload());
        }
    </script>
</body>
</html>`;
}

module.exports = {
    page: (req, res) => {
        const cookies = parseCookies(req);
        const username = verifySession(cookies.session_id);
        if (username) {
            return res.send(successPage(username));
        }
        return res.send(loginPage);
    },

    login: (req, res) => {
        const { username, password } = req.body;
        if (username === VALID_USER && password === VALID_PASS) {
            const cookie = createSession(username);
            res.setHeader(
                'Set-Cookie',
                `session_id=${cookie}; HttpOnly; SameSite=Strict; Path=/`,
            );
            return res.json({ authorized: true, user: username });
        }
        return res.status(401).json({ authorized: false });
    },

    logout: (req, res) => {
        res.setHeader(
            'Set-Cookie',
            'session_id=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        );
        return res.json({ success: true });
    },

    // Exported for tests to generate a valid cookie value without going through HTTP
    _createSession: createSession,
};

const crypto = require('crypto');

const VALID_USER = process.env.JWT_USER || 'admin';
const VALID_PASS = process.env.JWT_PASS || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret';

function base64url(data) {
    return Buffer.from(data)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function signToken(payload) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify(payload));
    const sig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    if (sig.length !== expectedSig.length) return null;
    try {
        if (
            !crypto.timingSafeEqual(
                Buffer.from(sig),
                Buffer.from(expectedSig),
            )
        )
            return null;
    } catch {
        return null;
    }
    try {
        const payload = JSON.parse(
            Buffer.from(body, 'base64url').toString('utf8'),
        );
        if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp)
            return null;
        return payload;
    } catch {
        return null;
    }
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

const jwtPageHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>JWT Token Auth</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="box">
        <h1>JWT Token Auth</h1>

        <div id="login-section">
            <p class="subtitle">Credentials are exchanged for a JWT stored in localStorage</p>
            <input id="username" type="text" placeholder="Username" data-testid="username-input" />
            <input id="password" type="password" placeholder="Password" data-testid="password-input" />
            <button onclick="doLogin()" data-testid="login-button">Login</button>
            <p id="error" class="error" style="display:none" data-testid="auth-result"></p>
        </div>

        <div id="success-section" style="display:none">
            <p class="success" data-testid="auth-result">Success, you're authorized</p>
            <p>Logged in as <strong id="username-display"></strong></p>
            <p class="hint">Token stored in localStorage under key: <code>jwt_token</code></p>
            <button class="danger" onclick="doLogout()" data-testid="logout-button">Logout</button>
        </div>

        <p style="margin-top:20px"><a href="/">Back to app</a></p>
    </div>
    <script>
        (function checkExistingToken() {
            const token = localStorage.getItem('jwt_token');
            if (!token) return;
            fetch('/jwt/verify', {
                headers: { Authorization: 'Bearer ' + token },
            })
            .then(r => r.json())
            .then(data => {
                if (data.authorized) {
                    showSuccess(data.user);
                } else {
                    localStorage.removeItem('jwt_token');
                }
            })
            .catch(() => localStorage.removeItem('jwt_token'));
        })();

        function doLogin() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            fetch('/jwt/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })
            .then(r => r.json())
            .then(data => {
                if (data.token) {
                    localStorage.setItem('jwt_token', data.token);
                    showSuccess(data.user);
                } else {
                    const err = document.getElementById('error');
                    err.textContent = 'Failure: authentication, you are not authorized';
                    err.style.display = 'block';
                }
            });
        }

        function doLogout() {
            localStorage.removeItem('jwt_token');
            window.location.reload();
        }

        function showSuccess(user) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('success-section').style.display = 'block';
            document.getElementById('username-display').textContent = user;
        }
    </script>
</body>
</html>`;

module.exports = {
    page: (req, res) => {
        res.send(jwtPageHTML);
    },

    login: (req, res) => {
        const { username, password } = req.body;
        if (username === VALID_USER && password === VALID_PASS) {
            const token = signToken({
                sub: username,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            });
            return res.json({ token, user: username });
        }
        return res.status(401).json({ error: 'Invalid credentials' });
    },

    verify: (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ authorized: false });
        }
        const payload = verifyToken(authHeader.slice(7));
        if (!payload) {
            return res.json({ authorized: false });
        }
        return res.json({ authorized: true, user: payload.sub });
    },

    // Exported for tests to generate a valid token without going through HTTP
    _signToken: signToken,
};

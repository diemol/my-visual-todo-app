const VALID_USER = process.env.BASIC_AUTH_USER || 'admin';
const VALID_PASS = process.env.BASIC_AUTH_PASS || 'admin';

const CSS = `
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f4f4; }
    .box { background: white; padding: 40px 60px; border-radius: 8px; box-shadow: 0 0 1em #ccc; text-align: center; }
    h1 { font-size: 1.4em; }
    a { color: #007bff; }
`;

const successPage = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Basic Auth — Authorized</title>
    <style>${CSS} h1 { color: #28a745; }</style>
</head>
<body>
    <div class="box">
        <h1 data-testid="auth-result">Success, you're authorized</h1>
        <p><a href="/">Back to app</a></p>
    </div>
</body>
</html>`;

const failurePage = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Basic Auth — Unauthorized</title>
    <style>${CSS} h1 { color: #dc3545; }</style>
</head>
<body>
    <div class="box">
        <h1 data-testid="auth-result">Failure: authentication, you are not authorized</h1>
        <p><a href="/">Back to app</a></p>
    </div>
</body>
</html>`;

// Shown when the user cancels the browser auth dialog (no credentials sent).
// The meta-refresh redirects them back to the main page.
const cancelPage = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/" />
    <title>Basic Auth — Cancelled</title>
</head>
<body>
    <p>Authentication cancelled. <a href="/">Return to home</a></p>
</body>
</html>`;

module.exports = (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Basic Auth"');
        return res.status(401).send(cancelPage);
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    const user = decoded.slice(0, colonIndex);
    const pass = decoded.slice(colonIndex + 1);

    if (user === VALID_USER && pass === VALID_PASS) {
        return res.send(successPage);
    }

    return res.status(401).send(failurePage);
};

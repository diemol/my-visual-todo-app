const jwt = require('../../src/routes/jwtPage');

function makeRes() {
    return {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

// ── page ──────────────────────────────────────────────────────────────────────

test('page: always renders the JWT page HTML', () => {
    const req = {};
    const res = makeRes();

    jwt.page(req, res);

    const body = res.send.mock.calls[0][0];
    expect(body).toContain('JWT Token Auth');
    expect(body).toContain('data-testid="login-button"');
    expect(body).toContain('jwt_token');
});

// ── login ─────────────────────────────────────────────────────────────────────

test('login: correct credentials → returns token and user', () => {
    const req = { body: { username: 'admin', password: 'admin' } };
    const res = makeRes();

    jwt.login(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.token).toBeDefined();
    expect(payload.user).toBe('admin');
    // Token has three base64url segments
    expect(payload.token.split('.').length).toBe(3);
});

test('login: wrong password → 401', () => {
    const req = { body: { username: 'admin', password: 'wrong' } };
    const res = makeRes();

    jwt.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0]).toHaveProperty('error');
});

// ── verify ────────────────────────────────────────────────────────────────────

test('verify: valid token → authorized', () => {
    // Get a real token via the login handler
    const loginRes = makeRes();
    jwt.login({ body: { username: 'admin', password: 'admin' } }, loginRes);
    const { token } = loginRes.json.mock.calls[0][0];

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();

    jwt.verify(req, res);

    expect(res.json).toHaveBeenCalledWith({ authorized: true, user: 'admin' });
});

test('verify: tampered signature → not authorized', () => {
    const loginRes = makeRes();
    jwt.login({ body: { username: 'admin', password: 'admin' } }, loginRes);
    const { token } = loginRes.json.mock.calls[0][0];

    const tampered =
        token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    const req = { headers: { authorization: `Bearer ${tampered}` } };
    const res = makeRes();

    jwt.verify(req, res);

    expect(res.json).toHaveBeenCalledWith({ authorized: false });
});

test('verify: no Authorization header → not authorized', () => {
    const req = { headers: {} };
    const res = makeRes();

    jwt.verify(req, res);

    expect(res.json).toHaveBeenCalledWith({ authorized: false });
});

test('verify: malformed token → not authorized', () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = makeRes();

    jwt.verify(req, res);

    expect(res.json).toHaveBeenCalledWith({ authorized: false });
});

test('verify: expired token → not authorized', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 10;
    const token = jwt._signToken({ sub: 'admin', iat: pastExp - 3600, exp: pastExp });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();

    jwt.verify(req, res);

    expect(res.json).toHaveBeenCalledWith({ authorized: false });
});

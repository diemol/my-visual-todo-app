const crypto = require('crypto');
const session = require('../../src/routes/sessionPage');

function makeRes() {
    return {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
    };
}

// ── page ──────────────────────────────────────────────────────────────────────

test('page: no cookie → renders login form', () => {
    const req = { headers: {} };
    const res = makeRes();

    session.page(req, res);

    const body = res.send.mock.calls[0][0];
    expect(body).toContain('data-testid="login-button"');
    expect(body).toContain('data-testid="username-input"');
});

test('page: valid session cookie → renders success page', () => {
    const cookie = session._createSession('admin');
    const req = { headers: { cookie: `session_id=${cookie}` } };
    const res = makeRes();

    session.page(req, res);

    const body = res.send.mock.calls[0][0];
    expect(body).toContain("Success, you're authorized");
    expect(body).toContain('admin');
});

test('page: tampered cookie → renders login form', () => {
    const req = { headers: { cookie: 'session_id=tampered.invalidsig' } };
    const res = makeRes();

    session.page(req, res);

    const body = res.send.mock.calls[0][0];
    expect(body).toContain('data-testid="login-button"');
});

// ── login ─────────────────────────────────────────────────────────────────────

test('login: correct credentials → 200 with Set-Cookie', () => {
    const req = { body: { username: 'admin', password: 'admin' } };
    const res = makeRes();

    session.login(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('session_id='),
    );
    expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ authorized: true, user: 'admin' }),
    );
});

test('login: wrong password → 401', () => {
    const req = { body: { username: 'admin', password: 'wrong' } };
    const res = makeRes();

    session.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ authorized: false });
    expect(res.setHeader).not.toHaveBeenCalled();
});

// ── logout ────────────────────────────────────────────────────────────────────

test('logout: clears session cookie', () => {
    const req = {};
    const res = makeRes();

    session.logout(req, res);

    const cookieHeader = res.setHeader.mock.calls[0][1];
    expect(cookieHeader).toContain('session_id=;');
    expect(cookieHeader).toContain('Max-Age=0');
    expect(res.json).toHaveBeenCalledWith({ success: true });
});

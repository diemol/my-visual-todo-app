const basicAuth = require('../../src/routes/basicAuth');

function makeRes() {
    return {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
    };
}

function basicAuthHeader(user, pass) {
    return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

test('no credentials: sends 401 with WWW-Authenticate and cancel redirect page', () => {
    const req = { headers: {} };
    const res = makeRes();

    basicAuth(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
        'WWW-Authenticate',
        'Basic realm="Basic Auth"',
    );
    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.send.mock.calls[0][0];
    expect(body).toContain('http-equiv="refresh"');
    expect(body).toContain('url=/');
});

test('correct credentials: sends success page', () => {
    const req = { headers: { authorization: basicAuthHeader('admin', 'admin') } };
    const res = makeRes();

    basicAuth(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const body = res.send.mock.calls[0][0];
    expect(body).toContain("Success, you're authorized");
});

test('wrong password: sends 401 failure page without WWW-Authenticate', () => {
    const req = { headers: { authorization: basicAuthHeader('admin', 'wrong') } };
    const res = makeRes();

    basicAuth(req, res);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.send.mock.calls[0][0];
    expect(body).toContain('Failure: authentication, you are not authorized');
});

test('wrong user: sends 401 failure page', () => {
    const req = { headers: { authorization: basicAuthHeader('hacker', 'admin') } };
    const res = makeRes();

    basicAuth(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.send.mock.calls[0][0];
    expect(body).toContain('Failure: authentication, you are not authorized');
});

test('password with colon is handled correctly', () => {
    const req = {
        headers: { authorization: basicAuthHeader('admin', 'pass:with:colons') },
    };
    const res = makeRes();

    basicAuth(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
});

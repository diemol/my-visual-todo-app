const express = require('express');
const app = express();
const db = require('./persistence');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');
const deleteItems = require('./routes/deleteItems');
const basicAuth = require('./routes/basicAuth');
const session = require('./routes/sessionPage');
const jwt = require('./routes/jwtPage');

app.use(require('body-parser').json());
app.use(express.static(__dirname + '/static'));

app.get('/basic-auth', basicAuth);
app.get('/session', session.page);
app.post('/session/login', session.login);
app.post('/session/logout', session.logout);
app.get('/jwt', jwt.page);
app.post('/jwt/login', jwt.login);
app.get('/jwt/verify', jwt.verify);
app.get('/items', getItems);
app.post('/items', addItem);
app.delete('/items', deleteItems);
app.put('/items/:id', updateItem);
app.delete('/items/:id', deleteItem);

const appPort = process.env.PORT ? process.env.PORT : 4000;

try {
    db.init();
    app.listen(appPort, () => console.log(`Listening on port ${appPort}`));
} catch (err) {
    console.error(err);
    process.exit(1);
}

const gracefulShutdown = () => {
    try {
        db.teardown();
    } catch (e) {
        console.error('Error during DB teardown:', e);
    } finally {
        process.exit();
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon

const express = require('express');
const app = express();
const basicAuth = require('express-basic-auth')
const db = require('./persistence');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');
const deleteItems = require('./routes/deleteItems');

app.use(basicAuth({
    users: { 'admin': 'admin' },
    challenge: true,
    unauthorizedResponse: getUnauthorizedResponse
}))

function getUnauthorizedResponse(req) {
    return req.auth ? ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') : 'Unauthorized, no credentials provided'
}

app.use(require('body-parser').json());
app.use(express.static(__dirname + '/static'));

app.get('/items', getItems);
app.post('/items', addItem);
app.delete('/items', deleteItems);
app.put('/items/:id', updateItem);
app.delete('/items/:id', deleteItem);

db.init().then(() => {
    app.listen(3000, () => console.log('Listening on port 3000'));
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon

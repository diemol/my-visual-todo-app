const Database = require('better-sqlite3');
const fs = require('fs');
const location = process.env.SQLITE_DB_LOCATION || __dirname + '/todo.db';

let db;

function init() {
    const dirName = require('path').dirname(location);
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    db = new Database(location);
    if (process.env.NODE_ENV !== 'test')
        console.log(`Using sqlite database at ${location}`);

    db.prepare(
        'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
    ).run();
}

function teardown() {
    db.close();
}

function getItems() {
    const rows = db.prepare('SELECT * FROM todo_items').all();
    return rows.map((item) => ({
        ...item,
        completed: item.completed === 1,
    }));
}

function getItem(id) {
    const item = db.prepare('SELECT * FROM todo_items WHERE id=?').get(id);
    if (!item) return null;
    return {
        ...item,
        completed: item.completed === 1,
    };
}

function storeItem(item) {
    db.prepare(
        'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
    ).run(item.id, item.name, item.completed ? 1 : 0);
}

function updateItem(id, item) {
    db.prepare('UPDATE todo_items SET name=?, completed=? WHERE id = ?').run(
        item.name,
        item.completed ? 1 : 0,
        id,
    );
}

function removeItem(id) {
    db.prepare('DELETE FROM todo_items WHERE id = ?').run(id);
}

function removeItems() {
    db.prepare('DELETE FROM todo_items').run();
}

module.exports = {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
    removeItems,
};

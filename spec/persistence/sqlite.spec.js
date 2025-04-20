const path = require('path');
const testDbPath = path.join(__dirname, 'test.db');
process.env.SQLITE_DB_LOCATION = testDbPath;
const db = require('../../src/persistence/sqlite');
const fs = require('fs');


const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test',
    completed: false,
};

beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    db.init();
});

afterEach(() => {
    db.teardown();
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
});

test('it initializes correctly', () => {
    db.init();
});

test('it can store and retrieve items', () => {
    db.init();

    db.storeItem(ITEM);

    const items = db.getItems();
    expect(items.length).toBe(1);
    expect(items[0]).toEqual(ITEM);
});

test('it can update an existing item', () => {
    db.init();

    const initialItems = db.getItems();
    expect(initialItems.length).toBe(0);

    db.storeItem(ITEM);

    db.updateItem(
        ITEM.id,
        Object.assign({}, ITEM, { completed: !ITEM.completed }),
    );

    const items = db.getItems();
    expect(items.length).toBe(1);
    expect(items[0].completed).toBe(!ITEM.completed);
});

test('it can remove an existing item', () => {
    db.init();
    db.storeItem(ITEM);

    db.removeItem(ITEM.id);

    const items = db.getItems();
    expect(items.length).toBe(0);
});

test('it can get a single item', () => {
    db.init();
    db.storeItem(ITEM);

    const item = db.getItem(ITEM.id);
    expect(item).toEqual(ITEM);
});

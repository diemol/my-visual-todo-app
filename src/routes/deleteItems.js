const db = require('../persistence');

module.exports = async (req, res) => {
    await db.removeItems();
    res.sendStatus(200);
};

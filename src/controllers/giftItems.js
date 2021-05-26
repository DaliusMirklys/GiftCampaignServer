const db = require('../../mysql');

exports.get = async (req, res, next) => {
  try {
    const [giftItems] = await db.execute('SELECT * FROM gift_items WHERE status = "active"');
    res.status(200).json(giftItems);
  } catch (error) {
    next(new Error(error));
  }
};
exports.create = async (req, res, next) => {
  try {
    await db.execute(
      'INSERT INTO gift_items (title, price, quantity) VALUES (?,?,?)',
      [req.body.title, req.body.price, req.body.quantity]
    );
    res.status(201).json({ message: 'Gift item created' });
  } catch (error) {
    next(new Error(error));
  }
};
exports.delete = async (req, res, next) => {
  try {
    const [response] = await db.execute(`
    DELETE FROM gift_items WHERE id NOT IN (SELECT item FROM gift_boxes) AND id = ?`, 
    [req.params.id]);
    if(!response.affectedRows) await db.execute(`
    UPDATE gift_items SET status = "removed" WHERE id = ?`, 
    [req.params.id]);
    res.status(200).json({ message: 'Gift item removed' });
  } catch (error) {
    next(new Error(error));
  }
};
exports.add = async (req, res, next) => {
  try {
    await db.execute(
      'UPDATE gift_items SET quantity = quantity + 1 WHERE id = ?',
      [req.params.id]
    );
    res.status(200).json({ message: 'added' });
  } catch (error) {
    next(new Error(error));
  }
};
exports.subtract = async (req, res, next) => {
  try {
    await db.execute(
      'UPDATE gift_items SET quantity = quantity - 1 WHERE id = ? AND quantity > 0',
      [req.params.id]
    );
    res.status(200).json({ message: 'subtracted' });
  } catch (error) {
    next(new Error(error));
  }
};

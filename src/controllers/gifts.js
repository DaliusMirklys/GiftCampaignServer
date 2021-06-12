const db = require('../../mysql');
const io = require('../../socket');

exports.send = async (req, res, next) => {
  if (req.userRole !== 'human_resources')
    return next(new Error('Incorrect user role'));
  try {
    const [sentGift] = await db.execute(
      'INSERT INTO sent_gifts (boxId, senderId, recipientId, deliveryDuration, message) VALUES (?,?,?,?,?)',
      [
        req.body.giftBoxId,
        req.userId,
        req.body.recipientId,
        req.body.deliveryDuration,
        req.body.message,
      ]
    );
    await db.execute(
      `
      UPDATE gift_items i, gift_boxes b
      SET i.quantity = i.quantity - b.itemQuantity
      WHERE b.id = ? AND i.id = b.item`,
      [req.body.giftBoxId]
    );
    io.getIO().emit('giftItemsChanged');
    setTimeout(async () => {
      await db.execute(
        'UPDATE sent_gifts SET status = "delivered", receivedDate = CURRENT_TIMESTAMP WHERE id = ?',
        [sentGift.insertId]
      );
      io.getIO().emit('giftDelivered');
    }, req.body.deliveryDuration * 1000);
    res.status(201).json({ message: 'Gift sent' });
  } catch (error) {
    next(new Error(error));
  }
};
exports.getReceived = async (req, res, next) => {
  try {
    const [data] = await db.execute(
      `
      SELECT g.id, g.boxId, g.message, DATE_FORMAT(g.receivedDate, '%Y/%m/%d %H:%i') receivedDate,
       g.rating, g.opened, b.title boxTitle, 
      GROUP_CONCAT((SELECT GROUP_CONCAT(bb.id, ':', i.title, ':', bb.itemQuantity) 
        FROM gift_items i 
        JOIN gift_boxes bb ON i.id = bb.item
        WHERE i.id = b.item)) items
      FROM sent_gifts g
      JOIN gift_boxes b ON b.id = g.boxId
      WHERE g.opened = "delivered" AND g.recipientId = ?
      GROUP BY g.id
      ORDER BY g.receivedDate DESC`,
      [req.userId]
    );
    const gifts = data.map(gift => {
      const concatanetedItems = gift.items.split(',');
      const items = [];
      concatanetedItems.forEach(pair => {
        const pairArray = pair.split(':');
        if (pairArray[0] == gift.boxId)
          items.push({ title: pairArray[1], quantity: pairArray[2] });
      });
      return {
        id: gift.id,
        boxId: gift.boxId,
        boxTitle: gift.boxTitle,
        receivedDate: gift.receivedDate,
        message: gift.message,
        rating: gift.rating,
        opened: gift.opened ? true : false,
        items: items,
      };
    });
    res.status(200).json(gifts);
  } catch (error) {
    next(new Error(error));
  }
};
exports.getHistory = async (req, res, next) => {
  try {
    const [data] = await db.execute(
      `
    SELECT g.id, g.boxId, g.message, u.name, u.email, u.address,
    g.status, g.rating, b.title boxTitle, 
    GROUP_CONCAT((SELECT GROUP_CONCAT(bb.id, ':', i.title, ':', bb.itemQuantity, ':', i.price) 
      FROM gift_items i 
      JOIN gift_boxes bb ON i.id = bb.item
      WHERE i.id = b.item)) items
    FROM sent_gifts g
    JOIN gift_boxes b ON b.id = g.boxId
    JOIN users u ON g.recipientId = u.id
    WHERE g.senderId = ?
    GROUP BY g.id
    ORDER BY g.sendDate DESC`,
      [req.userId]
    );
    const gifts = data.map(gift => {
      const concatanetedItems = gift.items.split(',');
      let totalPrice = 0;
      const items = [];
      concatanetedItems.forEach(pair => {
        const pairArray = pair.split(':');
        if (pairArray[0] == gift.boxId) {
          totalPrice += pairArray[2] * pairArray[3];
          items.push({
            title: pairArray[1],
            quantity: pairArray[2],
            price: pairArray[3],
          });
        }
      });
      return {
        id: gift.id,
        boxId: gift.boxId,
        boxTitle: gift.boxTitle,
        status: gift.status,
        message: gift.message,
        rating: gift.rating,
        items: items,
        totalPrice: Math.round(totalPrice * 100) / 100,
        recipient: {
          name: gift.name,
          address: gift.address,
          email: gift.email,
        },
      };
    });
    res.status(200).json(gifts);
  } catch (error) {
    next(new Error(error));
  }
};
exports.getOverview = async (req, res, next) => {
  if (req.userRole !== 'human_resources')
    return next(new Error('Incorrect user role'));
  try {
    const [gifts] = await db.execute(
      `SELECT COUNT(*) sent, COUNT(IF(status = "in delivery", 1, null)) inDelivery,
        COUNT(IF(status = "delivered", 1, null)) delivered, ROUND(AVG(rating), 2) avgRating FROM sent_gifts WHERE senderId = ?`,
      [req.userId]
    );
    res.status(201).json({ gifts: gifts[0] });
  } catch (error) {
    next(new Error(error));
  }
};
exports.rate = async (req, res, next) => {
  try {
    await db.execute('UPDATE sent_gifts SET rating = ? WHERE id = ?', [
      req.body.rating,
      req.body.giftId,
    ]);
    io.getIO().emit('giftRated');
    res.status(201).json({ message: 'rating updated' });
  } catch (error) {
    next(new Error(error));
  }
};
exports.open = async (req, res, next) => {
  try {
    await db.execute('UPDATE sent_gifts SET opened = "1" WHERE id = ?', [
      req.params.id,
    ]);
    res.status(201).json({ message: 'gift opened' });
  } catch (error) {
    next(new Error(error));
  }
};

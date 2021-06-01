const db = require('../../mysql');
const io = require('../../socket')

exports.get = async (req, res, next) => {
  try {
    const [data] = await db.execute(`SELECT b.id, b.title, 
      GROUP_CONCAT(i.id) itemsIDs, 
      GROUP_CONCAT(i.title) itemsTitles,
      GROUP_CONCAT(i.price) itemsPrices, 
      GROUP_CONCAT(b.itemQuantity) itemsQuantities, 
      GROUP_CONCAT(IF (i.status = "active", i.quantity, 0)) itemsQuantitiesInStock
      FROM gift_boxes b 
      JOIN gift_items i ON b.item = i.id 
      WHERE b.status = "active"
      GROUP BY b.id`);
    const [ratingsData] =
      await db.execute(`SELECT boxId, GROUP_CONCAT(rating) ratings
        FROM sent_gifts
        GROUP BY boxId 
      `);
    const giftBoxes = data.map(giftBox => {
      const IDsArray = giftBox.itemsIDs.split(',');
      const titlesArray = giftBox.itemsTitles.split(',');
      const pricesArray = giftBox.itemsPrices.split(',');
      const quantitiesArray = giftBox.itemsQuantities.split(',');
      const quantitiesInStockArray = giftBox.itemsQuantitiesInStock.split(',');
      if (IDsArray.length !== quantitiesArray.length)
        throw new Error('Lengths do not match');
        
        ratingsData.forEach(box => {
          if (box.ratings && box.boxId === giftBox.id) {
            const ratingsArray = box.ratings.split(',');
            giftBox.avgRating =
            ratingsArray.reduce((prev, curr) => +prev + +curr) /
            ratingsArray.length;
          }
        });
        let totalPrice = 0
        let items = [];
        let enoughItemsInStock = true;

      for (let i = 0; i < titlesArray.length; i++) {
        totalPrice += pricesArray[i] * quantitiesArray[i]
        if (+quantitiesInStockArray[i] < +quantitiesArray[i])
          enoughItemsInStock = false;
        items.push({
          id: IDsArray[i],
          title: titlesArray[i],
          price: pricesArray[i],
          quantity: quantitiesArray[i],
        });
      }
      return {
        id: giftBox.id,
        title: giftBox.title,
        totalPrice: Math.round(totalPrice * 100) / 100,
        items: items,
        avgRating: giftBox.avgRating || null,
        enoughItemsInStock: enoughItemsInStock,
      };
    });
    res.status(200).json(giftBoxes);
  } catch (error) {
    next(new Error(error));
  }
};
exports.create = async (req, res, next) => {
  try {
    const response = (
      await db.execute('SELECT id FROM gift_boxes ORDER BY id DESC LIMIT 1')
    )[0][0];
    const lastId = response ? response.id : 0;
    await Promise.all(
      req.body.items.map(
        async item =>
          await db.execute(
            'INSERT INTO gift_boxes (id, item, itemQuantity, title) VALUES (?,?,?,?)',
            [lastId + 1, +item.id, +item.quantity, req.body.giftBoxTitle]
          )
      )
    );
    io.getIO().emit('giftBoxesChanged');
    res.status(201).json({ message: 'Gift box created' });
  } catch (error) {
    next(new Error(error));
  }
};
exports.delete = async (req, res, next) => {
  try {
    const [response] = await db.execute(`
    DELETE FROM gift_boxes WHERE id NOT IN (SELECT boxId FROM sent_gifts) AND id = ?`, 
    [req.params.id]);
    if(!response.affectedRows) await db.execute(`
    UPDATE gift_boxes SET status = "removed" WHERE id = ?`, 
    [req.params.id]);
    io.getIO().emit('giftBoxesChanged');
    res.status(200).json({ message: 'Gift box removed' });
  } catch (error) {
    next(new Error(error));
  }
};

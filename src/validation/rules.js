const { body } = require('express-validator');
const db = require('../../mysql');

module.exports = {
    createUser: [
      body('role').trim().not().isEmpty(),
      body('name').trim().isLength({ min: 2 }),
      body('address').trim().isLength({ min: 2 }),
      body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter valid email')
        .normalizeEmail()
        .custom(async (value, { req }) => {
          try {
            const [data] = await db.execute(
              'SELECT id FROM users WHERE email = ?',
              [req.body.email]
            );
            if (data.length) return Promise.reject('email already exists');
            return true;
          } catch (error) {
            return Promise.reject('database error');
          }
        }),
      body('password').trim().isLength({ min: 4 }),
    ],
    login: [
      body('email')
        .trim()
        .isEmail()
        .withMessage('Please enter valid email')
        .normalizeEmail(),
      body('password').trim().isLength({ min: 4 }),
    ],
    createGiftItem: [
      body('title').trim().isLength({ min: 3 }),
      body(['price', 'quantity']).trim().isNumeric(),
    ],
    createGiftBox: [
      body('giftBoxTitle').trim().isLength({ min: 3 }),
      body(['items']).isArray(),
    ],
    rateGift: [
      body('rating', 'Rating must be between 0 and 10').isInt({
        min: 0,
        max: 10,
      }),
      body('giftId').custom(async (value, { req }) => {
        try {
          const [data] = await db.execute(
            'SELECT status FROM sent_gifts WHERE id = ? AND recipientId = ?',
            [req.body.giftId, req.userId]
          );
          if (!data.length) return Promise.reject('no such gift for this user');
          if (data[0].status !== 'delivered')
            return Promise.reject('gift has not been delivered yet');
          return true;
        } catch (error) {
          return Promise.reject('database error');
        }
      }),
    ],
  };
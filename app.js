require('dotenv').config()
const bodyParser = require('body-parser');
const express = require('express');
const users = require('./src/controllers/users');
const giftItems = require('./src/controllers/giftItems');
const giftBoxes = require('./src/controllers/giftBoxes');
const gifts = require('./src/controllers/gifts');
const validate = require('./src/validation/validate');
const isAuth = require('./src/middlewares/isAuth')
const rules = require('./src/validation/rules')
const app = express();


app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.get('/getEmployees', isAuth, users.getEmployees);
app.get('/getGiftItems', isAuth, giftItems.get);
app.get('/getGiftBoxes', isAuth, giftBoxes.get);
app.get('/getReceivedGifts', isAuth, gifts.getReceived);
app.post('/login', rules.login, validate, users.login);
app.post('/createUser', rules.createUser, validate, users.createUser);
app.post(
  '/createGiftItem',
  rules.createGiftItem,
  validate,
  isAuth,
  giftItems.create
);
app.post(
  '/createGiftBox',
  rules.createGiftBox,
  validate,
  isAuth,
  giftBoxes.create
);
app.post('/sendGift', isAuth, gifts.send);
app.get('/getGiftsOverview', isAuth, gifts.getOverview);
app.get('/getHistory', isAuth, gifts.getHistory);
app.delete('/deleteGiftItem/:id', isAuth, giftItems.delete);
app.delete('/deleteGiftBox/:id', isAuth, giftBoxes.delete);
app.put('/rateGift', isAuth, rules.rateGift, validate, gifts.rate);
app.put('/openGift/:id', isAuth, gifts.open);
app.put('/addQuantity/:id', isAuth, giftItems.add);
app.put('/subtractQuantity/:id', isAuth, giftItems.subtract);
app.use((error, req, res, next) => {
  res
    .status(error.statusCode || 500)
    .json({ message: error.message, data: error.data });
});


const socket = require('./socket');
const server = app.listen(process.env.PORT || 8080);
socket.init(server);


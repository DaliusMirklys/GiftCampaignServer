const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    const authError = () => {
      const error = new Error('Could not authenticate');
      error.statusCode = 401;
      next(error);
    };
    const authorization = req.get('Authorization');
    if (!authorization) authError();
    const token = authorization.split(' ')[1];
    let decodedToken = {};
    try {
      decodedToken = jwt.verify(token, 'slaptazodis');
    } catch (error) {
      authError();
    }
    if (!decodedToken) authError();
    req.userId = decodedToken.userId;
    req.userRole = decodedToken.userRole;
    next();
  };
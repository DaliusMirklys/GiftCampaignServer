const db = require('../../mysql');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
    try {
      const [data] = await db.execute(
        `SELECT hashedPassword, id, name, role FROM users WHERE email = ?`,
        [req.body.email]
      );
      if (!data.length) next(new Error('No such email'));
      const isEqual = await bcrypt.compare(
        req.body.password,
        data[0].hashedPassword
      );
      if (!isEqual) {
        const error = new Error('wrong password');
        error.statusCode = 401;
        throw error;
      }
      const expiresIn = 7200 // seconds
      const token = jwt.sign(
        { userId: data[0].id, userRole: data[0].role },
        'slaptazodis',
        {
          expiresIn: expiresIn,
        }
      );
      res
        .status(200)
        .json({ token: token, role: data[0].role, name: data[0].name, expiresIn: expiresIn });
    } catch (error) {
      next(new Error(error));
    }
}
exports.createUser = async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    await db.execute(
      `INSERT INTO users (role, name, email, address, hashedPassword) VALUES (?,?,?,?,?)`,
      [
        req.body.role,
        req.body.name,
        req.body.email,
        req.body.address,
        hashedPassword,
      ]
    );
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    next(new Error(error));
  }
}
exports.getEmployees = async (req, res, next) => {
  try {
    const [employees] = await db.execute(
      'SELECT * FROM users WHERE role = "employee"'
    );
    res.status(200).json(employees);
  } catch (error) {
    next(new Error(error));
  }
}
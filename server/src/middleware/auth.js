const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Auth middleware: token =', token);
    if (!token) {
      throw new Error();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware: decoded =', decoded);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { hospital: true }
    });
    console.log('Auth middleware: user =', user);
    if (!user || !user.isActive) {
      throw new Error();
    }
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.log('Auth middleware: authentication failed');
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    next();
  };
};

module.exports = {
  auth,
  checkRole
}; 
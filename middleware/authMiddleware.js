const jwt = require('jsonwebtoken');
const { readData } = require('../utils/jsonDb');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1]; // Fixed typo split('') -> split(' ')

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const users = readData('users');
            const user = users.find(u => u._id === decoded.id);

            if (!user) {
                throw new Error('User not found');
            }

            // Remove password from user object
            const { password, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };

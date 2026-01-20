const { readData, writeData } = require('./utils/jsonDb');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        console.log('Seeding Admin to JSON DB...');
        const users = readData('users');

        if (users.find(u => u.username === 'admin')) {
            console.log('Admin user already exists');
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const newUser = {
            _id: Date.now().toString(),
            username: 'admin',
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        writeData('users', [...users, newUser]);

        console.log('Admin user created');
        console.log('Username: admin');
        console.log('Password: password123');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdmin();

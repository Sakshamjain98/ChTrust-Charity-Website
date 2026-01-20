const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const multer = require('multer');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

// Ensure /js routes work locally by mapping /js to public/js
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Helper functions for JSON file operations
const readJSON = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeJSON = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// ============ AUTHENTICATION ROUTES ============

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await readJSON(path.join(__dirname, 'data/users.json'));

        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({ message: 'Login successful', user: { username: user.username } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ BLOG ROUTES ============

// Get all blogs
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single blog by ID
app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        const blog = blogs.find(b => b._id === req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new blog
app.post('/api/blogs', upload.single('image'), async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));

        const newBlog = {
            _id: Date.now().toString(),
            title: req.body.title,
            slug: req.body.slug,
            description: req.body.description,
            content: req.body.content,
            subheading: req.body.subheading || '',
            featuredImage: req.file ? `/public/uploads/${req.file.filename}` : req.body.featuredImage || '',
            author: req.body.author || 'Admin',
            status: req.body.status || 'draft',
            publishedAt: req.body.status === 'published' ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        blogs.unshift(newBlog);
        await writeJSON(path.join(__dirname, 'data/blogs.json'), blogs);

        res.status(201).json(newBlog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update blog
app.put('/api/blogs/:id', upload.single('image'), async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        const index = blogs.findIndex(b => b._id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const updatedBlog = {
            ...blogs[index],
            title: req.body.title,
            slug: req.body.slug,
            description: req.body.description,
            content: req.body.content,
            subheading: req.body.subheading || blogs[index].subheading,
            featuredImage: req.file ? `/public/uploads/${req.file.filename}` : req.body.featuredImage || blogs[index].featuredImage,
            author: req.body.author || blogs[index].author,
            status: req.body.status || blogs[index].status,
            publishedAt: req.body.status === 'published' && !blogs[index].publishedAt ? new Date().toISOString() : blogs[index].publishedAt,
            updatedAt: new Date().toISOString()
        };

        blogs[index] = updatedBlog;
        await writeJSON(path.join(__dirname, 'data/blogs.json'), blogs);

        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete blog
app.delete('/api/blogs/:id', async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        const filteredBlogs = blogs.filter(b => b._id !== req.params.id);

        if (blogs.length === filteredBlogs.length) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        await writeJSON(path.join(__dirname, 'data/blogs.json'), filteredBlogs);
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ FILE LOG ROUTES ============

// Get all file logs
app.get('/api/file-logs', async (req, res) => {
    try {
        const logs = await readJSON(path.join(__dirname, 'data/file-logs.json'));
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create file log
app.post('/api/file-logs', upload.single('file'), async (req, res) => {
    try {
        const logs = await readJSON(path.join(__dirname, 'data/file-logs.json'));

        const newLog = {
            _id: Date.now().toString(),
            patientName: req.body.patientName,
            patientPhone: req.body.patientPhone,
            patientEmail: req.body.patientEmail,
            fileName: req.file ? req.file.originalname : '',
            filePath: req.file ? `/public/uploads/${req.file.filename}` : '',
            status: 'sent',
            createdAt: new Date().toISOString()
        };

        logs.unshift(newLog);
        await writeJSON(path.join(__dirname, 'data/file-logs.json'), logs);

        res.status(201).json(newLog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ DONATION ROUTES ============

// Get all donations (from Firestore - placeholder for now)
app.get('/api/donations', async (req, res) => {
    try {
        // This would typically fetch from Firestore
        // For now, return empty array or mock data
        res.json([]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Save donation
app.post('/api/donations', async (req, res) => {
    try {
        // This would typically save to Firestore
        // For now, just acknowledge receipt
        res.status(201).json({ message: 'Donation recorded', data: req.body });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ CONFIGURATION ENDPOINT ============

// Serve environment variables to client
app.get('/env.js', (req, res) => {
    const env = {
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        NEXT_PUBLIC_EMAILJS_SERVICE_ID: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    };
    res.type('application/javascript');
    res.send(`window.env = ${JSON.stringify(env)};`);
});

app.get('/api/config', (req, res) => {
    try {
        res.json({
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
        });
    } catch (error) {
        console.error('Config endpoint error:', error);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

// Specific route for Send Files page (Cloudinary version)
app.get('/admin/send-files.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/send-files.html'));
});

// Specific route for File Sending page (Direct EmailJS version)
app.get('/admin/file-sending', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/file-sending.html'));
});

// Admin Panel Static Files
// This allows other assets like css/js to be served
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Admin Panel Main Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Serve Single Blog Template for all blog post routes
app.get('/blog-post/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-post/charity-meals-that-change-the-lives-every-day.html'));
});

// Root fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.htm'));
});

// Fallback for other HTML files
app.get('/:page', (req, res) => {
    try {
        const page = req.params.page;
        // Prevent directory traversal
        if (page.includes('..') || page.includes('/')) {
            return res.status(400).send('Invalid page name');
        }
        if (page.endsWith('.html') || page.endsWith('.htm')) {
            res.sendFile(path.join(__dirname, page), (err) => {
                if (err) {
                    console.error('File not found:', page, err);
                    res.status(404).send('Page not found');
                }
            });
        } else {
            res.status(404).send('Page not found');
        }
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).send('Internal server error');
    }
});

// Export for Vercel serverless
module.exports = app;

// For local testing only (Vercel handles this automatically)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

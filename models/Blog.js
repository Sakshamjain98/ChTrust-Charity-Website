const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    content: {
        type: String, // Rich text content from frontend editor
        required: true
    },
    featuredImage: {
        type: String, // URL/Path to image
        required: false
    },
    author: {
        type: String,
        default: 'Admin'
    },
    publishedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Blog', blogSchema);

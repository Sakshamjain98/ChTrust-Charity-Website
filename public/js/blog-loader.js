import { getAllBlogs } from './firebase-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Selectors for the 3 distinct layout areas in blog.html
    const featuredList = document.querySelectorAll('.blog-collection-list.is-1.w-dyn-items')[0]; // First Featured
    const secondaryList = document.querySelectorAll('.blog-collection-list.is-1.w-dyn-items')[1]; // Second Featured (Side)
    const gridList = document.querySelector('.blog-collection-list.w-dyn-items:not(.is-1)'); // Main Grid

    if (!featuredList && !gridList) return; // Need at least one

    // 1. Extract Templates
    let featuredTemplate = null;
    let secondaryTemplate = null;
    let gridTemplate = null;

    if (featuredList) {
        const item = featuredList.querySelector('.blog-collection-item');
        if (item) featuredTemplate = item.outerHTML;
        featuredList.innerHTML = '<div class="loading"></div>';
    }

    if (secondaryList) {
        const item = secondaryList.querySelector('.blog-collection-item');
        if (item) secondaryTemplate = item.outerHTML;
        secondaryList.innerHTML = '';
    }

    if (gridList) {
        const item = gridList.querySelector('.blog-collection-item');
        if (item) gridTemplate = item.outerHTML;
        gridList.innerHTML = '';
    }

    // Helper: Map Data to Template
    const createBlogItem = (template, blog) => {
        const div = document.createElement('div');
        div.innerHTML = template;
        const newItem = div.firstElementChild;

        // Title
        const titleEl = newItem.querySelector('h1, h2, h3, .blog-item-title');
        if (titleEl) titleEl.innerText = blog.title;

        // Link
        const links = newItem.querySelectorAll('a');
        links.forEach(link => link.href = `/blog-post/${blog.slug}`);

        // Image
        const imgEl = newItem.querySelector('img');
        if (imgEl && blog.featuredImage) {
            imgEl.src = blog.featuredImage;
            imgEl.srcset = '';
            imgEl.removeAttribute('style'); // Remove blur
            imgEl.style.opacity = '1';
            imgEl.style.filter = 'none';
        }

        // Date
        const dateEl = newItem.querySelector('.blog-item-date-text');
        if (dateEl) {
            const date = new Date(blog.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            dateEl.innerText = date;
        }

        // Ensure visible
        newItem.style.display = 'block';

        return newItem;
    };

    try {
        const blogs = await getAllBlogs();

        if (featuredList) featuredList.innerHTML = '';
        if (secondaryList) secondaryList.innerHTML = '';
        if (gridList) gridList.innerHTML = '';

        if (blogs.length === 0) {
            if (gridList) gridList.innerHTML = 'No blogs found.';
            return;
        }

        // Distribute Blogs
        // Blog 0 -> Featured
        if (blogs[0] && featuredList && featuredTemplate) {
            featuredList.appendChild(createBlogItem(featuredTemplate, blogs[0]));
        }

        // Blog 1 -> Secondary (if exists)
        if (blogs[1] && secondaryList && secondaryTemplate) {
            secondaryList.appendChild(createBlogItem(secondaryTemplate, blogs[1]));
        }

        // Blog 2+ -> Grid
        const gridBlogs = secondaryList ? blogs.slice(2) : blogs.slice(1);

        if (gridList && gridTemplate) {
            gridBlogs.forEach(blog => {
                gridList.appendChild(createBlogItem(gridTemplate, blog));
            });
        }

    } catch (error) {
        console.error('Error loading blogs:', error);
    }
});

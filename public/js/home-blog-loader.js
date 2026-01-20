import { getAllBlogs } from './firebase-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    const listContainer = document.getElementById('recent-blogs-list');

    if (!listContainer) return;

    // Apply Horizontal Layout via JS
    // We use Grid to force 3 columns on desktop
    const style = document.createElement('style');
    style.innerHTML = `
        /* Remove the .is-1 class restrictions */
        .blog-collection-list-block.is-1 {
            width: 100% !important;
            max-width: 100% !important;
        }
        #recent-blogs-list {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 30px !important;
            width: 100% !important;
            height: auto !important;
        }
        #recent-blogs-list .blog-collection-item {
            width: 100% !important;
            display: flex !important;
            flex-direction: column;
            margin-bottom: 0 !important;
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
        }
        #recent-blogs-list .blog-item-block {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        #recent-blogs-list .blog-item-thumbnail-block {
            width: 100%;
            height: 240px;
            overflow: hidden;
            position: relative;
            display: block;
            border-radius: 12px 12px 0 0;
        }
        #recent-blogs-list .blog-item-thumbnail {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        #recent-blogs-list .blog-item-thumbnail:hover {
            transform: scale(1.05);
        }
        #recent-blogs-list .blog-item-content-block {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        #recent-blogs-list .blog-item-title {
            font-size: 20px;
            font-weight: 600;
            line-height: 1.4;
            margin-top: 0;
            color: #1a1a1a;
            text-decoration: none;
        }
        #recent-blogs-list .blog-item-summary {
            font-size: 14px;
            color: #666;
            margin-top: 8px;
            line-height: 1.6;
        }
        /* Tablet Responsive */
        @media (max-width: 991px) {
            #recent-blogs-list {
                grid-template-columns: repeat(2, 1fr) !important;
            }
        }
        /* Mobile Responsive */
        @media (max-width: 767px) {
            #recent-blogs-list {
                grid-template-columns: 1fr !important;
            }
            #recent-blogs-list .blog-item-thumbnail-block {
                height: 200px;
            }
        }
    `;
    document.head.appendChild(style);

    const templateItem = listContainer.querySelector('.blog-collection-item');
    if (!templateItem) return;

    const templateHTML = templateItem.outerHTML;
    listContainer.innerHTML = ''; // Clear template

    try {
        const blogs = await getAllBlogs();

        if (blogs.length === 0) {
            listContainer.innerHTML = '<div style="width: 100%; text-align: center; padding: 40px; color: #666; font-size: 16px;">No recent news or articles available at the moment.</div>';
            return;
        }

        // Take only first 3
        const recentBlogs = blogs.slice(0, 3);

        recentBlogs.forEach(blog => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = templateHTML;
            const newItem = tempDiv.firstElementChild;

            // Map Data
            const titleEl = newItem.querySelector('h3, h2.blog-item-title, .blog-item-title');
            if (titleEl) titleEl.innerText = blog.title;

            const links = newItem.querySelectorAll('a');
            links.forEach(link => {
                link.href = `/blog-post/${blog.slug}`;
            });

            const imgEl = newItem.querySelector('img');
            if (imgEl && blog.featuredImage) {
                imgEl.src = blog.featuredImage;
                imgEl.srcset = '';
                imgEl.removeAttribute('style');
            }

            const dateEl = newItem.querySelector('.blog-item-date-text');
            if (dateEl) {
                const date = new Date(blog.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
                dateEl.innerText = date;
            }

            // Ensure visibility
            newItem.style.display = 'block';

            listContainer.appendChild(newItem);
        });

    } catch (error) {
        console.error('Error loading recent blogs:', error);
    }
});

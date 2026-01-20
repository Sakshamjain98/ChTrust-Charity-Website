import { getBlogBySlug } from './firebase-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Extract Slug from URL components
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[pathParts.length - 1];

    if (!slug) return;

    try {
        const blog = await getBlogBySlug(slug);

        if (!blog) throw new Error('Blog not found');

        // 1. Update Title
        const titleEl = document.querySelector('h1.section-title');
        if (titleEl) titleEl.innerText = blog.title;
        document.title = blog.title + ' | Charity Blog';

        // 2. Update Metadata
        const readTimeBlock = document.querySelector('.blog-read-time-block');
        if (readTimeBlock) {
            // Format Date (e.g., September 30, 2025)
            const dateOpts = { year: 'numeric', month: 'long', day: 'numeric' };
            const dateStr = new Date(blog.createdAt).toLocaleDateString('en-US', dateOpts);

            readTimeBlock.innerHTML = `<p class="blog-info-text">${dateStr}</p>`;
        }

        const authorBlock = document.querySelector('.blog-author-block');
        if (authorBlock) {
            const texts = authorBlock.querySelectorAll('.blog-info-text');
            if (texts.length >= 2) {
                texts[1].innerText = blog.author || 'Admin';
            }
        }

        // 3. Update Image
        const mainImg = document.querySelector('.blog-details-content-block img'); // Or .w-richtext figure img
        if (mainImg && blog.featuredImage) {
            mainImg.src = blog.featuredImage;
            mainImg.srcset = '';
            mainImg.removeAttribute('style'); // Remove inline blur
        }

        // 4. Update Content
        const contentContainer = document.querySelector('.blog-details-content.w-richtext');
        if (contentContainer) {
            let finalContent = blog.content;

            if (blog.featuredImage) {
                // Check if image is already displayed elsewhere? 
                // In template, it IS part of the richtext block effectively.
                const imgHTML = `<figure style="max-width:1320px" class="w-richtext-align-fullwidth w-richtext-figure-type-image"><div><img src="${blog.featuredImage}" loading="lazy" alt=""></div></figure>`;
                finalContent = imgHTML + finalContent;
            }

            if (blog.subHeading) {
                const subHeadingHTML = `<h2 style="color: #4A6FA5; margin-top: 24px; margin-bottom: 16px; font-weight: 600;">${blog.subHeading}</h2>`;
                if (blog.featuredImage) {
                    // Insert after image
                    // We just prepended image, so finalContent starts with image. 
                    // Verify structure. imgHTML + finalContent. 
                    // If we want Image -> SubHeading -> Content
                    // We should do: imgHTML + subHeadingHTML + blog.content
                    // Let's rewrite safely.
                    const imgHTML = `<figure style="max-width:1320px" class="w-richtext-align-fullwidth w-richtext-figure-type-image"><div><img src="${blog.featuredImage}" loading="lazy" alt=""></div></figure>`;
                    finalContent = imgHTML + subHeadingHTML + blog.content;
                } else {
                    finalContent = subHeadingHTML + finalContent;
                }
            }

            contentContainer.innerHTML = finalContent;
        }

    } catch (error) {
        console.error('Error loading blog detail:', error);
        // document.body.innerHTML = '<h1 style="text-align:center; margin-top:50px;">Blog Not Found</h1>';
    }
});

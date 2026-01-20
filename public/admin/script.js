import {
    loginAdmin,
    logoutAdmin,
    monitorAuthState,
    getAllBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    uploadImage,
    createReportLog,
    uploadReportFile,
    getFileLogs,
    getRecentDonations
} from '/js/firebase-service.js';

// Initialize EmailJS (client-side only)
if (typeof window !== 'undefined' && typeof emailjs !== 'undefined') {
    try {
        emailjs.init("EXjUjLmLuDHOHsrMZ");
    } catch (e) {
        console.error("EmailJS Init Error:", e);
    }
}

// Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const editorView = document.getElementById('editor-view');

const loginForm = document.getElementById('login-form');
const blogsList = document.getElementById('blogs-list');
const blogForm = document.getElementById('blog-form');
const logoutBtn = document.getElementById('logout-btn');
const addBlogBtn = document.getElementById('add-blog-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// State
let isEditing = false;
let currentUser = null;

// Initialization
function init() {
    monitorAuthState((user) => {
        currentUser = user;
        if (user) {
            showDashboard();
        } else {
            showLogin();
        }
    });
}

function showLogin() {
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    editorView.classList.add('hidden');
}

function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    editorView.classList.add('hidden');
    fetchBlogs();
}

function showEditor(blog = null) {
    loginView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    editorView.classList.remove('hidden');

    // Reset Form
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-title').value = '';
    document.getElementById('blog-slug').value = '';
    document.getElementById('blog-description').value = '';
    document.getElementById('blog-content').value = '';
    document.getElementById('blog-author').value = 'Admin';
    document.getElementById('blog-status').value = 'published';
    document.getElementById('blog-image').value = '';
    document.getElementById('blog-subheading').value = '';
    document.getElementById('image-preview').style.display = 'none';

    if (blog) {
        isEditing = true;
        document.getElementById('editor-title').innerText = 'Edit Blog';

        document.getElementById('blog-id').value = blog._id;
        document.getElementById('blog-title').value = blog.title;
        document.getElementById('blog-slug').value = blog.slug;
        document.getElementById('blog-description').value = blog.description;
        document.getElementById('blog-subheading').value = blog.subHeading || '';
        document.getElementById('blog-content').value = blog.content;
        document.getElementById('blog-author').value = blog.author;
        document.getElementById('blog-status').value = blog.status;

        if (blog.featuredImage) {
            document.getElementById('image-preview').src = blog.featuredImage;
            document.getElementById('image-preview').style.display = 'block';
        }
    } else {
        isEditing = false;
        document.getElementById('editor-title').innerText = 'Add New Blog';
    }
}

// Navigation & Tabs
const navBlogs = document.getElementById('nav-blogs');
const navFiles = document.getElementById('nav-files');

const tabBlogs = document.getElementById('tab-blogs');
const tabFiles = document.getElementById('tab-files');

if (navBlogs && navFiles) {
    navBlogs.addEventListener('click', () => {
        navBlogs.classList.add('active');
        navFiles.classList.remove('active');

        tabBlogs.classList.remove('hidden');
        tabFiles.classList.add('hidden');
    });

    navFiles.addEventListener('click', () => {
        window.location.href = '/admin/send-files.html';
    });
}

// Toast Function
function showToast(message, duration = 3000, type = '') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Authentication
const togglePassword = document.getElementById('toggle-password');
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.innerText = type === 'password' ? '👁️' : '🙈';
    });
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Handle "admin" username by appending domain if missing
    if (!username.includes('@')) {
        // Assumption: If user types "admin", they mean the admin email for this trust.
        // Trying the most likely domain based on the website identity.
        username += '@karunyacharitabletrust.org';
    }

    try {
        await loginAdmin(username, password);
        showToast('Login Successful!', 1500, 'success');
    } catch (err) {
        console.error('Login error:', err);
        let msg = err.message;
        if (err.code === 'auth/invalid-email') {
            msg = 'Invalid email address format.';
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = 'Invalid username or password.';
        } else if (err.code === 'auth/network-request-failed') {
            msg = 'Network error. Please check your connection.';
        } else if (err.message && err.message.includes('Firebase auth is not initialized')) {
            msg = 'Authentication service not available. Please refresh the page.';
        }
        document.getElementById('login-error').innerText = msg;
    }
});

logoutBtn.addEventListener('click', async () => {
    await logoutAdmin();
    location.reload();
});

// Blogs Listing
// Blogs Listing
const handleEditBlog = async (id) => {
    try {
        const blogs = await getAllBlogs();
        // Support both id and _id for compatibility
        const blog = blogs.find(b => (b.id || b._id) === id);
        if (blog) showEditor(blog);
    } catch (err) {
        console.error("Edit error:", err);
        showToast("Error loading blog for editing");
    }
};

const handleDeleteBlog = async (id) => {
    if (!id) {
        console.error("No ID provided for deletion");
        showToast('Error: No blog ID provided', 3000, 'error');
        return;
    }

    // Strict Hard Delete Requirement: Single Confirmation
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this blog?');
    if (!confirmDelete) return;

    const btn = document.querySelector(`button[data-id="${id}"]`);
    const row = btn ? btn.closest('tr') : null;

    try {
        if (row) row.style.opacity = '0.3';
        showToast('Deleting blog...', 2000);

        // 1. Hard Delete from Firestore using actual document ID
        await deleteBlog(id);

        // 2. Immediate UI Update (Remove from DOM)
        if (row) {
            row.remove();
        }

        // 3. Check if list is now empty and show message
        if (blogsList.querySelectorAll('tr').length === 0) {
            blogsList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #666;">No blogs available. Click "Add New Blog" to create one.</td></tr>`;
        }

        showToast('Blog deleted permanently.', 2000, 'success');

    } catch (error) {
        console.error("Delete failed:", error);
        showToast('Failed to delete blog: ' + (error.message || 'Unknown error'), 3000, 'error');
        if (row) row.style.opacity = '1';
    }
};

// Event Delegation for Blog Actions (Edit/Delete)
blogsList.addEventListener('click', (e) => {
    const target = e.target;

    // Handle Delete
    if (target.classList.contains('btn-delete')) {
        const id = target.dataset.id;
        handleDeleteBlog(id);
    }

    // Handle Edit
    if (target.classList.contains('btn-edit')) {
        const id = target.dataset.id;
        handleEditBlog(id);
    }
});

async function fetchBlogs() {
    try {
        const blogs = await getAllBlogs();

        if (blogs.length === 0) {
            blogsList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #666;">No blogs available. Click "Add New Blog" to create one.</td></tr>`;
        } else {
            blogsList.innerHTML = blogs.map(blog => {
                // Use actual Firestore document ID (id takes precedence, fallback to _id for compatibility)
                const blogId = blog.id || blog._id;
                return `
                <tr>
                    <td><img src="${blog.featuredImage || 'https://placehold.co/100x100?text=No+Image'}" class="thumb-small" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                    <td><strong>${blog.title}</strong></td>
                    <td><span class="badge ${blog.status === 'published' ? 'bg-success' : 'bg-secondary'}">${blog.status}</span></td>
                    <td>
                        <button class="btn-sm btn-edit" data-id="${blogId}">Edit</button>
                        <button class="btn-sm btn-delete" data-id="${blogId}" style="background-color: #dc3545; color: white; margin-left: 5px;">Delete</button>
                    </td>
                </tr>
            `;
            }).join('');

            // Note: Event listeners are now handled via delegation above
        }
    } catch (err) {
        console.error(err);
        showToast('Error fetching blogs');
    }
}

// Blog Create/Update
addBlogBtn.addEventListener('click', () => showEditor());
cancelEditBtn.addEventListener('click', showDashboard);

blogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('blog-id').value;
    const title = document.getElementById('blog-title').value;
    const slug = document.getElementById('blog-slug').value;
    const description = document.getElementById('blog-description').value;
    const subHeading = document.getElementById('blog-subheading').value;
    const content = document.getElementById('blog-content').value;
    const author = document.getElementById('blog-author').value;
    const status = document.getElementById('blog-status').value;

    const submitBtn = blogForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    const originalBtnHTML = submitBtn.innerHTML;

    // Helper function to update button status
    const updateButtonStatus = (text, showSpinner = true) => {
        if (showSpinner) {
            submitBtn.innerHTML = `<span style="display: inline-block; width: 14px; height: 14px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle;"></span>${text}`;
        } else {
            submitBtn.innerHTML = text;
        }
    };

    // Disable button immediately and show initial status
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    submitBtn.style.cursor = 'not-allowed';
    updateButtonStatus('Processing...', true);

    let featuredImage = '';
    const imageInput = document.getElementById('blog-image');

    try {
        // Step 1: Upload image if needed
        if (imageInput.files[0]) {
            updateButtonStatus('Uploading image...', true);
            try {
                featuredImage = await uploadImage(imageInput.files[0]);
            } catch (e) {
                submitBtn.innerHTML = originalBtnHTML;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
                showToast('Image upload failed: ' + e.message, 3000, 'error');
                return;
            }
        } else {
            const imgPreview = document.getElementById('image-preview');
            if (imgPreview.src && imgPreview.style.display !== 'none') {
                featuredImage = imgPreview.src;
            }
        }

        // Step 2: Save to database
        updateButtonStatus(isEditing ? 'Saving changes...' : 'Creating blog...', true);

        const blogData = {
            title, slug, description, subHeading, content, author, status, featuredImage
        };

        if (isEditing) {
            await updateBlog(id, blogData);
            showToast('Blog updated successfully!', 2000, 'success');
        } else {
            await createBlog(blogData);
            showToast('Blog created successfully!', 2000, 'success');
        }

        // Step 3: Navigate to dashboard
        updateButtonStatus('Done!', false);
        setTimeout(() => {
            showDashboard();
        }, 300);

    } catch (err) {
        console.error(err);
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        showToast('Error: ' + (err.message || 'Failed to save blog'), 3000, 'error');
    }
});

// File Sending Logic (Updated with EmailJS and Firestore)
const fileForm = document.getElementById('file-send-form');
const fileLogsList = document.getElementById('file-logs-list');

if (fileForm) {
    fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = fileForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Sending...";
        submitBtn.disabled = true;

        const patientName = document.getElementById('patient-name').value;
        const phoneNumber = document.getElementById('patient-phone').value;
        const email = document.getElementById('patient-email').value;
        const fileInput = document.getElementById('patient-file');

        if (!fileInput.files[0]) {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            return;
        }

        try {
            // 1. Upload to Cloudinary (Reports Folder)
            const { url, format } = await uploadReportFile(fileInput.files[0]);

            // 2. Send Email via EmailJS
            const templateParams = {
                file_url: url,
                to_email: email,
                patient_email: email,
                email: email,
                to_name: patientName,
                patient_name: patientName,
                name: patientName,
                link: url,
                url: url,
                download_link: url,
                file_link: url,
                message: `Here is your file: ${url}`,
                reply_to: 'admin@karunyacharitabletrust.org',
                from_name: 'Karunya Trust'
            };

            if (typeof emailjs === 'undefined') {
                throw new Error('EmailJS is not loaded. Please refresh the page.');
            }

            const response = await emailjs.send("service_xjugpoi", "template_72p6u49", templateParams, "EXjUjLmLuDHOHsrMZ");

            console.log("EmailJS Success:", response.status, response.text);
            showToast('Report sent successfully!', 1500);
            alert("Email Sent Successfully! API Response: " + response.status);
            fileForm.reset();

            // 3. Log to Firestore (Separate Try-Catch to avoid blocking Success UI)
            try {
                await createReportLog({
                    patientName,
                    phoneNumber,
                    patientEmail: email,
                    fileUrl: url,
                    fileType: format,
                    status: 'success'
                });
                fetchFileLogs();
            } catch (dbError) {
                console.error("Firestore Error:", dbError);
                if (dbError.code === 'permission-denied') {
                    alert("Note: Report was sent to email, but not saved to History because of Firebase Permissions. Please update Firestore Rules to allow 'sent-reports'.");
                }
            }

        } catch (error) {
            console.error(error);
            alert('Error sending report: ' + error.message);
            try {
                await createReportLog({
                    patientEmail: email,
                    fileUrl: '',
                    fileType: 'unknown',
                    status: 'failed'
                });
            } catch (e) { console.error("Failed to log error", e); }
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

async function fetchFileLogs() {
    try {
        const logs = await getFileLogs();

        fileLogsList.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.sentAt || log.createdAt).toLocaleDateString()}</td>
                <td>${log.patientName || log.patientEmail}</td>
                <td><a href="${log.fileUrl || log.filePath}" target="_blank">View File</a></td>
                <td><span style="color: ${log.status === 'success' ? 'green' : 'red'};">${log.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error fetching logs', error);
    }
}


// Auto-fill slug from title
document.getElementById('blog-title').addEventListener('input', (e) => {
    if (!isEditing) {
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        document.getElementById('blog-slug').value = slug;
    }
});

// Live Preview Logic
function setupLivePreview() {
    const titleInput = document.getElementById('blog-title');
    const authorInput = document.getElementById('blog-author');
    const subHeadingInput = document.getElementById('blog-subheading');
    const contentInput = document.getElementById('blog-content');
    const imageInput = document.getElementById('blog-image');
    const iframe = document.getElementById('blog-preview-iframe');

    if (!iframe) return;

    const getPreviewEl = (selector) => {
        return iframe.contentDocument ? iframe.contentDocument.querySelector(selector) : null;
    };

    titleInput.addEventListener('input', () => {
        const el = getPreviewEl('#preview-title');
        if (el) el.innerText = titleInput.value || 'Blog Title Preview';
    });

    authorInput.addEventListener('input', () => {
        const el = getPreviewEl('#preview-author');
        if (el) el.innerText = authorInput.value || 'Admin';
    });

    contentInput.addEventListener('input', () => {
        const el = getPreviewEl('#preview-content');
        if (el) el.innerHTML = contentInput.value || '<p>Start typing...</p>';
    });

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        const previewContainer = getPreviewEl('#preview-image-container');
        const previewImg = getPreviewEl('#preview-image');
        const subHeadingEl = getPreviewEl('#preview-subheading');

        if (file && previewImg) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                if (previewContainer) previewContainer.style.display = 'block';
                // Show subheading if it has content
                if (subHeadingEl && subHeadingInput.value.trim()) {
                    subHeadingEl.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        } else if (previewContainer) {
            previewContainer.style.display = 'none';
        }
    });

    subHeadingInput.addEventListener('input', () => {
        const el = getPreviewEl('#preview-subheading');
        if (el) {
            if (subHeadingInput.value.trim()) {
                el.innerText = subHeadingInput.value;
                el.style.display = 'block';
            } else {
                el.innerText = '';
                el.style.display = 'none';
            }
        }
    });

    iframe.onload = () => {
        titleInput.dispatchEvent(new Event('input'));
        authorInput.dispatchEvent(new Event('input'));
        contentInput.dispatchEvent(new Event('input'));

        const dateBlock = getPreviewEl('.blog-read-time-block');
        if (dateBlock) {
            const dateOpts = { year: 'numeric', month: 'long', day: 'numeric' };
            const today = new Date().toLocaleDateString('en-US', dateOpts);
            dateBlock.innerHTML = `<p class="blog-info-text">${today}</p>`;
        }

        const existingImg = document.getElementById('image-preview');
        const previewImg = getPreviewEl('#preview-image');
        const previewContainer = getPreviewEl('#preview-image-container');
        const subHeadingEl = getPreviewEl('#preview-subheading');

        if (existingImg && existingImg.src && existingImg.style.display !== 'none' && previewImg) {
            previewImg.src = existingImg.src;
            if (previewContainer) previewContainer.style.display = 'block';
        }

        // Update subheading after image is set
        subHeadingInput.dispatchEvent(new Event('input'));
    };
}

document.addEventListener('DOMContentLoaded', setupLivePreview);

init();

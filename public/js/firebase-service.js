import { auth, db, storage } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Auth Services ---

export const loginAdmin = async (email, password) => {
    try {
        if (!auth) {
            throw new Error('Firebase auth is not initialized. Please refresh the page.');
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logoutAdmin = async () => {
    try {
        if (!auth) {
            console.warn('Firebase auth is not initialized');
            return;
        }
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error", error);
    }
};

export const monitorAuthState = (callback) => {
    if (!auth) {
        console.error('Firebase auth is not initialized');
        callback(null);
        return;
    }
    onAuthStateChanged(auth, callback);
};

// --- Blog Services ---

const BLOGS_COLLECTION = 'blogs';

export const getAllBlogs = async () => {
    try {
        if (!db) {
            console.error('Firestore is not initialized');
            return [];
        }
        const q = query(collection(db, BLOGS_COLLECTION), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            _id: doc.id, // Keep _id for backward compatibility
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching blogs: ", error);
        return [];
    }
};

export const getBlogBySlug = async (slug) => {
    try {
        if (!db) {
            console.error('Firestore is not initialized');
            return null;
        }
        const q = query(collection(db, BLOGS_COLLECTION), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
        return { _id: doc.id, ...doc.data() };
    } catch (error) {
        console.error("Error fetching blog by slug: ", error);
        return null;
    }
};

export const createBlog = async (blogData) => {
    try {
        if (!db) {
            throw new Error('Firestore is not initialized. Please refresh the page.');
        }
        const docRef = await addDoc(collection(db, BLOGS_COLLECTION), {
            ...blogData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Create blog error:', error);
        throw error;
    }
};

export const updateBlog = async (id, blogData) => {
    try {
        if (!db) {
            throw new Error('Firestore is not initialized. Please refresh the page.');
        }
        if (!id) {
            throw new Error('Blog ID is required for update');
        }
        const docRef = doc(db, BLOGS_COLLECTION, id);
        await updateDoc(docRef, {
            ...blogData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Update blog error:', error);
        throw error;
    }
};

export const deleteBlog = async (id) => {
    if (!id) {
        throw new Error("Blog ID is required for deletion");
    }
    try {
        if (!db) {
            throw new Error('Firestore is not initialized. Please refresh the page.');
        }
        const docRef = doc(db, BLOGS_COLLECTION, id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Firestore delete error:", error);
        throw error;
    }
};

// --- Storage Services ---

const REPORTS_COLLECTION = 'sent-reports';

export const createReportLog = async (data) => {
    try {
        if (!db) {
            console.warn('Firestore is not initialized, skipping log');
            return;
        }
        await addDoc(collection(db, REPORTS_COLLECTION), {
            ...data,
            sentAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create report log error:', error);
        // Don't throw - logging failures shouldn't break the main flow
    }
};

export const getFileLogs = async () => {
    try {
        if (!db) {
            console.error('Firestore is not initialized');
            return [];
        }
        const q = query(collection(db, REPORTS_COLLECTION), orderBy('sentAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching file logs: ", error);
        return [];
    }
};

const CLOUDINARY_CLOUD_NAME = (window.env && window.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) || 'di5p3wflw';
const CLOUDINARY_UPLOAD_PRESET = (window.env && window.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) || 'blog_unsigned';

// Cloudinary upload implementation for Blogs
export const uploadImage = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        throw error;
    }
};

// REPORT UPLOAD - Fixed to use correct resource_type and presets
export const uploadReportFile = async (file) => {
    try {
        // 1. FILE TYPE DETECTION - Check if it's an image or other file type
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const isDocument = !isImage; // Everything that's not an image goes to /raw/upload

        // 2. RESOURCE TYPE & PRESET SELECTION
        // Images → /image/upload with 'blog_unsigned' preset
        // PDFs and other files → /raw/upload with 'blog_unsigned' preset (same preset works for raw)
        const resourceType = isImage ? 'image' : 'raw';
        const uploadPreset = CLOUDINARY_UPLOAD_PRESET; // Use same preset for all file types

        // 3. CORRECT ENDPOINT - Endpoint decides resource type
        const uploadUrl = isImage
            ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
            : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;

        // 4. UPLOAD IMPLEMENTATION
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'reports');

        console.log(`Uploading ${file.name} as ${resourceType} using preset ${uploadPreset}`);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Cloudinary Error:', errorData);
            throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        // 5. HANDLE RESPONSE - Return the secure URL directly
        // Note: fl_attachment transformation removed to avoid 401 errors with Strict Transformations enabled
        // PDFs will open in browser instead of forcing download, but will be accessible
        const finalUrl = data.secure_url;

        return {
            url: finalUrl,
            format: data.format || file.name.split('.').pop() || 'file'
        };
    } catch (error) {
        console.error("Report upload failed:", error);
        throw error;
    }
};

// FIREBASE STORAGE UPLOAD
export const uploadFileToStorage = async (file, onProgress) => {
    try {
        if (!storage) {
            throw new Error('Firebase Storage is not initialized. Please refresh the page.');
        }
        const date = new Date();
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const fileName = `${Date.now()}_${file.name}`;
        const storagePath = `admin-uploads/${yearMonth}/${fileName}`;

        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    console.error("Firebase Storage Upload Error:", error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        url: downloadURL,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        path: storagePath
                    });
                }
            );
        });
    } catch (error) {
        console.error("Upload function error:", error);
        throw error;
    }
};

// --- Donation Services ---

const DONATIONS_COLLECTION = 'donations';

export const addDonation = async (donationData) => {
    try {
        if (!db) {
            throw new Error('Firestore is not initialized. Please refresh the page.');
        }
        const docRef = await addDoc(collection(db, DONATIONS_COLLECTION), {
            ...donationData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error('Add donation error:', error);
        throw error;
    }
};

export const updateDonation = async (id, donationData) => {
    try {
        if (!db) {
            throw new Error('Firestore is not initialized. Please refresh the page.');
        }
        if (!id) {
            throw new Error('Donation ID is required for update');
        }
        const docRef = doc(db, DONATIONS_COLLECTION, id);
        await updateDoc(docRef, {
            ...donationData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Update donation error:', error);
        throw error;
    }
};

export const deleteDonation = async (id) => {
    try {
        if (!db) {
            throw new Error('Firestore is not initialized. Please refresh the page.');
        }
        if (!id) {
            throw new Error('Donation ID is required for deletion');
        }
        await deleteDoc(doc(db, DONATIONS_COLLECTION, id));
    } catch (error) {
        console.error('Delete donation error:', error);
        throw error;
    }
};

export const getAllDonations = async () => {
    try {
        // Get all donations and sort in memory (avoids Firestore index requirements)
        const querySnapshot = await getDocs(collection(db, DONATIONS_COLLECTION));
        const donations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            _id: doc.id,
            ...doc.data()
        }));

        // Sort by transactionDate (newest first), fallback to createdAt
        return donations.sort((a, b) => {
            const dateA = a.transactionDate || a.createdAt || '';
            const dateB = b.transactionDate || b.createdAt || '';
            return dateB.localeCompare(dateA);
        });
    } catch (error) {
        console.error("Error fetching donations: ", error);
        return [];
    }
};

export const getRecentDonations = async (limitCount = 20) => {
    try {
        if (!db) {
            console.error('Firestore is not initialized');
            return [];
        }
        const q = query(
            collection(db, DONATIONS_COLLECTION),
            orderBy('donatedAt', 'desc'),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data(),
            donatedAt: doc.data().donatedAt ? doc.data().donatedAt.toDate() : new Date()
        }));
    } catch (error) {
        console.error("Error fetching donations: ", error);
        return [];
    }
};

export { serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

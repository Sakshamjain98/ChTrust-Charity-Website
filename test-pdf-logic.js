// Test Script for PDF URL Cleaning Logic

function cleanUrl(finalUrl) {
    console.log(`Original: ${finalUrl}`);

    if (finalUrl.includes('/upload/')) {
        const parts = finalUrl.split('/upload/');
        if (parts.length === 2) {
            const afterUpload = parts[1];
            const versionMatch = afterUpload.match(/(v\d+\/)/);

            if (versionMatch) {
                // Strip params: keep only version + filename
                let cleanPath = afterUpload.substring(versionMatch.index);

                // Ensure extension is .pdf
                if (!cleanPath.toLowerCase().endsWith('.pdf')) {
                    const lastDot = cleanPath.lastIndexOf('.');
                    if (lastDot > -1) {
                        // Replace extension
                        cleanPath = cleanPath.substring(0, lastDot) + '.pdf';
                    } else {
                        // Append extension
                        cleanPath += '.pdf';
                    }
                }

                finalUrl = parts[0] + '/upload/' + cleanPath;
            }
        }
    }
    console.log(`Cleaned:  ${finalUrl}`);
    console.log('---');
    return finalUrl;
}

// Test Cases
const tests = [
    "https://res.cloudinary.com/demo/image/upload/v12345/doc.pdf",
    "https://res.cloudinary.com/demo/image/upload/w_500,f_auto/v12345/doc.pdf",
    "https://res.cloudinary.com/demo/image/upload/fl_attachment/v123456/my-report.jpg", // Wrong ext
    "https://res.cloudinary.com/demo/raw/upload/v999/schedule.PDF"
];

console.log("Running URL Cleaning Tests...\n");

tests.forEach(url => cleanUrl(url));

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 GitHub Pages Deployment Validator\n');

// Find all HTML files
const htmlFiles = glob.sync('**/*.{html,htm}', {
    ignore: ['node_modules/**', '.git/**', 'public/**']
});

let totalErrors = 0;
let totalWarnings = 0;
const issues = [];

htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const fileIssues = [];

    // Check 1: Absolute paths (CRITICAL)
    const absolutePaths = content.match(/(href|src)=["']\/[^"']+["']/g);
    if (absolutePaths && absolutePaths.length > 0) {
        fileIssues.push({
            type: 'ERROR',
            message: `Found ${absolutePaths.length} absolute path(s)`,
            examples: absolutePaths.slice(0, 3)
        });
        totalErrors++;
    }

    // Check 2: Missing defer on external scripts (WARNING)
    const scriptsWithoutDefer = content.match(/<script\s+src="[^"]+\.js"[^>]*(?<!defer)>/g);
    if (scriptsWithoutDefer && scriptsWithoutDefer.length > 0) {
        const filtered = scriptsWithoutDefer.filter(s => !s.includes('defer'));
        if (filtered.length > 0) {
            fileIssues.push({
                type: 'WARNING',
                message: `${filtered.length} script(s) missing defer attribute`,
                examples: filtered.slice(0, 2)
            });
            totalWarnings++;
        }
    }

    // Check 3: Broken relative paths (ERROR)
    const relativePaths = content.match(/(href|src)=["']\.\.\/[^"']+["']/g);
    if (relativePaths) {
        relativePaths.forEach(p => {
            const match = p.match(/["']([^"']+)["']/);
            if (match) {
                const relPath = match[1];
                const fullPath = path.resolve(path.dirname(file), relPath);
                if (!fs.existsSync(fullPath)) {
                    fileIssues.push({
                        type: 'ERROR',
                        message: `Broken relative path: ${relPath}`,
                        examples: [p]
                    });
                    totalErrors++;
                }
            }
        });
    }

    if (fileIssues.length > 0) {
        issues.push({ file, issues: fileIssues });
    }
});

// Print results
console.log('📊 Validation Results:\n');

if (issues.length === 0) {
    console.log('✅ All files passed validation!');
    console.log(`   Checked ${htmlFiles.length} HTML files`);
    console.log('   No errors or warnings found\n');
} else {
    issues.forEach(({ file, issues: fileIssues }) => {
        console.log(`📄 ${file}:`);
        fileIssues.forEach(issue => {
            const icon = issue.type === 'ERROR' ? '❌' : '⚠️';
            console.log(`   ${icon} ${issue.message}`);
            if (issue.examples) {
                issue.examples.forEach(ex => console.log(`      ${ex}`));
            }
        });
        console.log('');
    });
}

// Summary
console.log('📈 Summary:');
console.log(`   Total files checked: ${htmlFiles.length}`);
console.log(`   Files with issues: ${issues.length}`);
console.log(`   Errors: ${totalErrors}`);
console.log(`   Warnings: ${totalWarnings}\n`);

// Check for .nojekyll
if (fs.existsSync('.nojekyll')) {
    console.log('✅ .nojekyll file exists');
} else {
    console.log('❌ .nojekyll file missing!');
    totalErrors++;
}

// Exit code
if (totalErrors > 0) {
    console.log('\n❌ Validation failed! Please fix errors before deploying.');
    process.exit(1);
} else {
    console.log('\n✅ Ready for GitHub Pages deployment!');
    process.exit(0);
}

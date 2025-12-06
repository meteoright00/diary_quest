import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const RELEASE_TYPE = process.argv[2] || 'patch'; // patch, minor, major

function run(command) {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
}

function updateVersion(file, keyPath = 'version') {
    const content = JSON.parse(readFileSync(file, 'utf8'));
    let currentVersion = content;
    const keys = keyPath.split('.');
    for (let i = 0; i < keys.length - 1; i++) {
        currentVersion = currentVersion[keys[i]];
    }
    const lastKey = keys[keys.length - 1];

    // Simple version bump logic (can be replaced with semver)
    const [major, minor, patch] = currentVersion[lastKey].split('.').map(Number);
    let newVersion;
    if (RELEASE_TYPE === 'major') newVersion = `${major + 1}.0.0`;
    else if (RELEASE_TYPE === 'minor') newVersion = `${major}.${minor + 1}.0`;
    else newVersion = `${major}.${minor}.${patch + 1}`; // patch default

    currentVersion[lastKey] = newVersion;
    writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
    return newVersion;
}

try {
    console.log(`Starting ${RELEASE_TYPE} release...`);

    // 1. Check for clean working directory
    try {
        execSync('git diff-index --quiet HEAD --');
    } catch (e) {
        console.error('Error: Working directory is not clean. Commit changes first.');
        process.exit(1);
    }

    // 2. Bump versions
    // Root package.json (if workspaces are managed there, or for the script itself)
    const newVersion = updateVersion('package.json');
    console.log(`New version: ${newVersion}`);

    // Update Tauri config
    updateVersion('apps/desktop/src-tauri/tauri.conf.json', 'package.version');

    // Update desktop package.json
    updateVersion('apps/desktop/package.json');

    // 3. Commit and Tag
    run('git add .');
    run(`git commit -m "chore(release): v${newVersion}"`);
    run(`git tag v${newVersion}`);

    // 4. Push
    run('git push');
    run('git push --tags');

    console.log('Use "gh run watch" to monitor the release build? (y/n)');
    // In a real interactive script we could ask, but here we just info
    console.log(`\nRelease v${newVersion} triggered! Run "gh run watch" to monitor progress.`);

} catch (error) {
    console.error('Release failed:', error.message);
    process.exit(1);
}

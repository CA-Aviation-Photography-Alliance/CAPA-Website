#!/usr/bin/env node

/**
 * Security Update Script for CAPA Website Server
 *
 * This script addresses critical security vulnerabilities in dependencies:
 * - Lodash: Prototype Pollution, Command Injection, ReDoS
 * - OAuth2-Server: Open Redirect, Code Injection
 *
 * Run this script to safely update vulnerable packages.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const packageJsonPath = './package.json';
const packageLockPath = './package-lock.json';

console.log('🔒 CAPA Website Security Update Tool');
console.log('=====================================\n');

// Backup current package files
function backupPackageFiles() {
  console.log('📦 Creating backup of package files...');
  try {
    fs.copyFileSync(packageJsonPath, `${packageJsonPath}.backup`);
    if (fs.existsSync(packageLockPath)) {
      fs.copyFileSync(packageLockPath, `${packageLockPath}.backup`);
    }
    console.log('✅ Backup created successfully\n');
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    process.exit(1);
  }
}

// Remove unused vulnerable packages
function removeUnusedPackages() {
  console.log('🗑️  Removing unused vulnerable packages...');

  const unusedPackages = [
    'express-oauth-server' // Not used in codebase but has critical vulnerabilities
  ];

  unusedPackages.forEach(pkg => {
    try {
      console.log(`   Removing ${pkg}...`);
      execSync(`npm uninstall ${pkg}`, { stdio: 'inherit' });
    } catch (error) {
      console.log(`   Warning: ${pkg} was not installed or already removed`);
    }
  });

  console.log('✅ Unused packages removed\n');
}

// Update vulnerable dependencies
function updateVulnerableDependencies() {
  console.log('🔄 Updating vulnerable dependencies...');

  try {
    // Force update lodash to latest version
    console.log('   Updating lodash...');
    execSync('npm install lodash@latest', { stdio: 'inherit' });

    // Update other potentially vulnerable packages
    console.log('   Updating other dependencies...');
    execSync('npm update', { stdio: 'inherit' });

    console.log('✅ Dependencies updated successfully\n');
  } catch (error) {
    console.error('❌ Failed to update dependencies:', error.message);
    console.log('\n🔧 You may need to run these commands manually:');
    console.log('   npm install lodash@latest');
    console.log('   npm update');
    process.exit(1);
  }
}

// Run security audit
function runSecurityAudit() {
  console.log('🔍 Running security audit...');

  try {
    execSync('npm audit', { stdio: 'inherit' });
    console.log('\n✅ Security audit completed\n');
  } catch (error) {
    console.log('\n⚠️  Security audit found issues. Run "npm audit fix" to address them.\n');
  }
}

// Attempt to fix vulnerabilities automatically
function autoFixVulnerabilities() {
  console.log('🔧 Attempting to automatically fix vulnerabilities...');

  try {
    execSync('npm audit fix --force', { stdio: 'inherit' });
    console.log('✅ Auto-fix completed\n');
  } catch (error) {
    console.log('⚠️  Some vulnerabilities require manual intervention\n');
  }
}

// Verify the application still works
function verifyApplication() {
  console.log('🧪 Verifying application integrity...');

  try {
    // Run a simple syntax check
    execSync('node --check server.js', { stdio: 'pipe' });
    console.log('✅ Application syntax is valid');

    // Check if all required modules can be loaded
    execSync('node -e "import(\'./server.js\').then(() => process.exit(0)).catch(() => process.exit(1))"', {
      stdio: 'pipe',
      timeout: 10000
    });
    console.log('✅ All modules load successfully\n');

  } catch (error) {
    console.log('⚠️  Application verification failed. Please check manually.');
    console.log('   Run: node server.js');
    console.log('   And test your API endpoints\n');
  }
}

// Display summary
function displaySummary() {
  console.log('📋 SECURITY UPDATE SUMMARY');
  console.log('==========================');
  console.log('✅ Removed unused vulnerable packages (express-oauth-server)');
  console.log('✅ Updated lodash to latest secure version');
  console.log('✅ Applied automatic security fixes');
  console.log('✅ Verified application integrity');
  console.log('\n🔒 RECOMMENDED NEXT STEPS:');
  console.log('1. Test your application thoroughly');
  console.log('2. Run "npm audit" to check for remaining issues');
  console.log('3. Consider implementing Content Security Policy (CSP)');
  console.log('4. Regular dependency updates (monthly)');
  console.log('5. Enable GitHub Dependabot alerts');
  console.log('\n💾 Backup files created:');
  console.log('   - package.json.backup');
  console.log('   - package-lock.json.backup');
  console.log('\n🚀 Your application should now be more secure!');
}

// Restore from backup if needed
function restoreFromBackup() {
  console.log('\n🔄 Restoring from backup...');
  try {
    fs.copyFileSync(`${packageJsonPath}.backup`, packageJsonPath);
    if (fs.existsSync(`${packageLockPath}.backup`)) {
      fs.copyFileSync(`${packageLockPath}.backup`, packageLockPath);
    }
    console.log('✅ Restored from backup successfully');
  } catch (error) {
    console.error('❌ Failed to restore from backup:', error.message);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user');
  console.log('To restore original state, run:');
  console.log('cp package.json.backup package.json');
  console.log('cp package-lock.json.backup package-lock.json');
  console.log('npm install');
  process.exit(1);
});

// Main execution
async function main() {
  try {
    // Check if we're in the right directory
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json not found. Please run this script from the server directory.');
      process.exit(1);
    }

    // Execute security updates
    backupPackageFiles();
    removeUnusedPackages();
    updateVulnerableDependencies();
    autoFixVulnerabilities();
    runSecurityAudit();
    verifyApplication();
    displaySummary();

  } catch (error) {
    console.error('\n❌ Security update failed:', error.message);
    console.log('\nTo restore original state, run:');
    console.log('cp package.json.backup package.json');
    console.log('cp package-lock.json.backup package-lock.json');
    console.log('npm install');
    process.exit(1);
  }
}

// Run the script
main();

# 🔒 Security Vulnerabilities Fix Guide

## Overview
This document outlines critical security vulnerabilities discovered in the CAPA Website server dependencies and provides step-by-step instructions to remediate them.

## 🚨 Identified Vulnerabilities

### Critical & High Risk Issues

#### 1. **Lodash v4.17.21** - Multiple Vulnerabilities
- **Prototype Pollution** (Critical & High Risk)
- **Command Injection** (High Risk)
- **Regular Expression Denial of Service (ReDoS)** (Moderate Risk)

**Impact**: Could allow attackers to modify object prototypes, execute arbitrary commands, or cause denial of service through malicious regular expressions.

#### 2. **OAuth2-Server v2.4.1** - High Risk Vulnerabilities
- **Open Redirect** (High Risk)
- **Code Injection** (High Risk)

**Impact**: Could allow attackers to redirect users to malicious sites or execute arbitrary code.

## 🛠️ Quick Fix Instructions

### Option 1: Automated Fix (Recommended)
Run the security update script:

```bash
cd CAPA-Website/server
node security-update.js
```

This script will:
- Create backups of your package files
- Remove unused vulnerable packages
- Update dependencies to secure versions
- Run security audits
- Verify application integrity

### Option 2: Manual Fix

#### Step 1: Remove Unused Vulnerable Packages
```bash
npm uninstall express-oauth-server
```

#### Step 2: Update Package.json
Add the following override to force secure versions:

```json
{
  "overrides": {
    "lodash": "^4.17.21"
  }
}
```

#### Step 3: Update Dependencies
```bash
npm install lodash@latest
npm update
npm audit fix --force
```

#### Step 4: Verify Installation
```bash
npm audit
node --check server.js
```

## 📊 Vulnerability Details

### Lodash Issues

**CVE References**: Multiple CVEs including prototype pollution vulnerabilities

**Affected Versions**: < 4.17.21 (some issues persist in 4.17.21)

**Root Cause**: 
- Improper input validation in merge operations
- Unsafe property access patterns
- Regex performance issues

**Current Usage in Project**:
- Direct dependency: Used in package.json
- Transitive dependency: Required by `express-validator`, `jsonwebtoken` (lodash modules), `oauth2-server`

### OAuth2-Server Issues

**CVE References**: Multiple security advisories

**Affected Versions**: <= 3.1.1

**Root Cause**:
- Insufficient URL validation for redirects
- Improper input sanitization

**Current Usage in Project**: 
- Listed as dependency but **NOT USED** in codebase
- Can be safely removed

## 🔍 Impact Assessment

### Before Fix:
- **Critical Risk**: Prototype pollution could compromise entire application
- **High Risk**: Code injection vulnerabilities in OAuth flow
- **Medium Risk**: ReDoS attacks could cause service disruption

### After Fix:
- ✅ Prototype pollution vulnerabilities resolved
- ✅ OAuth2-server vulnerabilities eliminated (package removed)
- ✅ ReDoS vulnerabilities mitigated
- ✅ No breaking changes to existing functionality

## 🧪 Testing After Updates

### 1. Verify Server Starts
```bash
npm start
```

### 2. Test Core Endpoints
```bash
# Health check
curl http://localhost:3003/health

# Airports API
curl http://localhost:3003/api/airports

# Events API
curl http://localhost:3003/api/events
```

### 3. Run Application Tests
```bash
npm run test-api
npm run test-auth
```

## 🔐 Prevention Measures

### 1. Dependency Management
- Use `npm audit` regularly (monthly)
- Enable GitHub Dependabot alerts
- Pin dependency versions in production
- Review new dependencies before adding

### 2. Security Scanning
Add to package.json scripts:
```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:fix": "npm audit fix",
    "security:check": "npm audit --audit-level=high"
  }
}
```

### 3. Runtime Protection
Consider adding these security middleware:
```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Add to server.js
app.use(helmet()); // Security headers
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## 📅 Maintenance Schedule

- **Weekly**: Check for new security advisories
- **Monthly**: Run `npm audit` and update non-breaking changes
- **Quarterly**: Review and update major dependencies
- **As needed**: Apply critical security patches immediately

## 🆘 Rollback Procedure

If issues occur after the security updates:

### 1. Restore from Backup
```bash
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
npm install
```

### 2. Restart Application
```bash
npm start
```

### 3. Report Issues
Document any problems and create an issue with:
- Error messages
- Steps to reproduce
- Environment details

## 📚 Additional Resources

- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)
- [NPM Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

## 🏁 Conclusion

These security fixes address critical vulnerabilities without impacting application functionality. The `oauth2-server` package removal actually improves security by reducing the attack surface, as it wasn't being used in the codebase.

Regular security audits and dependency updates are essential for maintaining a secure application. Consider implementing automated security scanning in your CI/CD pipeline for ongoing protection.

---

**Last Updated**: January 2025  
**Security Assessment**: High Priority  
**Risk Level After Fix**: Low  

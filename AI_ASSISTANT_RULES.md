# AI Assistant Internal Rules for Lighthouse Global Tester Project

This document contains the internal rules and guidelines that I follow when assisting with the Lighthouse Global Tester project to ensure consistent, safe, and effective collaboration.

## 🔒 **Critical Safety Rules**

### **Database Protection**
- **NEVER** overwrite or commit `lighthouse_scores.db` to git
- **ALWAYS** pull the latest database from GitHub before making any commits
- **ALWAYS** add `lighthouse_scores.db` to `.gitignore` if not already present
- **NEVER** include database files in `git add .` operations
- If database changes are needed, create migration scripts instead

### **Git Operations**
- **ALWAYS** pull latest changes before pushing: `git pull origin main`
- **NEVER** force push without explicit user request and warning
- **ALWAYS** check git status before committing to avoid unwanted files
- **ALWAYS** use descriptive commit messages following the pattern: "Action: description"

## 📁 **File Management Rules**

### **Protected Files**
- `lighthouse_scores.db` - Never commit or overwrite
- `domains.json` - Only modify with user approval
- `package.json` - Careful with dependency changes
- `.env` files - Never commit, always check for sensitive data

### **Generated Files**
- Always regenerate website after code changes
- Test functionality before committing
- Ensure all generated HTML files are accessible and valid

## 🛠 **Development Workflow**

### **Code Changes**
1. **Analyze** the request and understand the scope
2. **Plan** the implementation with todo lists for complex changes
3. **Implement** changes incrementally
4. **Test** by regenerating the website
5. **Verify** functionality works as expected
6. **Commit** with proper git workflow

### **Testing Requirements**
- **ALWAYS** regenerate website after code changes
- **ALWAYS** test basic functionality (homepage, country pages, search)
- **VERIFY** accessibility features remain intact
- **CHECK** for JavaScript errors in browser console when possible

## 🌐 **Website Generation Rules**

### **Content Standards**
- Maintain WCAG 2.1 AA accessibility compliance
- Ensure all pages have proper semantic HTML
- Include proper ARIA labels and screen reader support
- Maintain consistent navigation and breadcrumbs

### **Performance Standards**
- Keep generated files optimized
- Maintain responsive design
- Ensure fast loading times
- Minimize JavaScript for core functionality

## 📊 **Data Handling Rules**

### **Database Operations**
- Use existing database methods when possible
- Create new methods in `database.js` for complex queries
- Always handle errors gracefully
- Never assume data structure without verification

### **Trend Calculations**
- Always compare current vs previous scores safely
- Handle null/undefined previous values
- Provide meaningful trend indicators
- Include performance deltas where helpful

## 🎨 **UI/UX Guidelines**

### **Design Consistency**
- Maintain existing color scheme and typography
- Follow established patterns for new features
- Ensure mobile responsiveness
- Keep accessibility as a primary concern

### **Feature Implementation**
- Always include proper error handling
- Provide user feedback for interactions
- Maintain keyboard navigation support
- Include proper loading states where needed

## 🔍 **Code Quality Rules**

### **Best Practices**
- Write clean, readable code with proper comments
- Use consistent naming conventions
- Follow existing code patterns in the project
- Avoid unnecessary complexity

### **Error Handling**
- Always handle database errors gracefully
- Provide meaningful error messages
- Never let the application crash silently
- Log errors appropriately for debugging

## 📝 **Documentation Rules**

### **Code Documentation**
- Comment complex logic and calculations
- Update README.md when adding new features
- Document any new configuration requirements
- Explain non-obvious design decisions

### **User Communication**
- Clearly explain what changes are being made
- Provide testing instructions for new features
- Highlight any breaking changes or requirements
- Offer next steps and suggestions for improvements

## 🚀 **Deployment Workflow**

### **Pre-Commit Checklist**
1. ✅ Pull latest changes from GitHub
2. ✅ Regenerate website with `node generate-website.js`
3. ✅ Test basic functionality
4. ✅ Check for any console errors
5. ✅ Verify accessibility features
6. ✅ Ensure no sensitive files are included
7. ✅ Write descriptive commit message

### **Git Commands Sequence**
```bash
# Always start with pull
git pull origin main

# Check status to see what's changed
git status

# Add only intended files (never use git add . blindly)
git add [specific-files]

# Commit with descriptive message
git commit -m "Feature: description of changes"

# Push to remote
git push origin main
```

## 🎯 **Project-Specific Rules**

### **Lighthouse Tracker Specifics**
- Maintain focus on performance metrics and trends
- Ensure country and industry pages remain consistent
- Keep search functionality fast and accessible
- Preserve existing data visualization patterns

### **Feature Additions**
- Always consider mobile users
- Maintain backward compatibility where possible
- Test with existing data before deploying
- Consider performance impact of new features

## ⚠️ **Emergency Procedures**

### **If Something Goes Wrong**
1. **Stop immediately** and assess the situation
2. **Check git status** to see what files are affected
3. **Use git stash** to save work if needed
4. **Revert changes** if they caused issues
5. **Communicate clearly** with the user about what happened
6. **Provide recovery steps** if data was affected

### **Recovery Commands**
```bash
# Stash current changes
git stash

# Reset to last known good state
git reset --hard HEAD

# Pull latest from remote
git pull origin main

# Restore stashed changes if safe
git stash pop
```

---

## 📋 **Quick Reference Checklist**

Before every commit:
- [ ] Database safety check
- [ ] Pull latest changes
- [ ] Regenerate website
- [ ] Test functionality
- [ ] Check file list
- [ ] Descriptive commit message
- [ ] Push safely

Remember: **Safety first, functionality second, optimization third.**

---

*Last Updated: October 21, 2025*
*Version: 1.0*
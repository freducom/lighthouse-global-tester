# Claude AI Assistant Rules for CheetahCheck Project

## Critical Development Rules

### 🚨 NEVER EDIT GENERATED FILES DIRECTLY
**RULE #1: Always edit `generate-website.js`, never the generated HTML/CSS files**

- ❌ **NEVER** edit files in `/website/` directory directly (index.html, styles.css, etc.)
- ✅ **ALWAYS** edit `generate-website.js` for HTML and CSS changes
- ✅ **ALWAYS** regenerate the website after changes with `node generate-website.js`

**Why:** Generated files are overwritten on each build. Changes must be made in the generator to persist.

### 🔄 Proper Workflow
1. Edit `generate-website.js` 
2. Run `node generate-website.js` to regenerate
3. Test the changes
4. Commit both the generator and generated files

### 📁 File Structure Understanding
```
lighthouse-global-tester/
├── generate-website.js     ← EDIT THIS for HTML/CSS changes
├── database.js            ← Database operations
├── domains.json           ← Site data
├── website/               ← GENERATED FILES - DO NOT EDIT
│   ├── index.html         ← Generated from generate-website.js
│   ├── styles.css         ← Generated from generate-website.js
│   └── ...                ← All other generated files
```

### 🎯 When Making Changes
- **CSS Changes**: Edit the CSS generation section in `generate-website.js`
- **HTML Changes**: Edit the HTML generation methods in `generate-website.js`
- **New Pages**: Add new generation methods in `generate-website.js`
- **Footer/Navigation**: Edit `getFooterHTML()` method in `generate-website.js`

### 🐛 Debugging Generated Output
- Look at generated files to understand the issue
- Make fixes in `generate-website.js`
- Test by regenerating the website

### 💾 Git Workflow
- Always commit changes to `generate-website.js` first
- Regenerate website
- Commit all generated files together
- Push changes

## Project-Specific Knowledge

### 📊 CheetahCheck Features
- Performance monitoring with Google Lighthouse
- 878+ websites queued for testing
- Country and industry analysis
- Automated 2-hour update cycles
- About page with AI development story
- API documentation and endpoints

### 🔗 Key Pages
- Homepage: Performance overview and rankings
- About: Project journey and AI development story
- Queued Sites: Shows pending websites for testing
- Latest Scan: Most recent performance results
- Country/Industry pages: Filtered analysis

### 🎨 Styling Guidelines
- Use CheetahCheck branding (🐆)
- White background tiles for content sections
- Hover effects and smooth transitions
- Mobile-responsive design
- Accessibility features (ARIA labels, screen readers)

---

**Remember: This file helps you understand the project structure and rules. Always follow the "NEVER EDIT GENERATED FILES" rule!**
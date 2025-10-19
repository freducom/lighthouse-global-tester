# 🚀 GitHub Deployment Instructions

## 📋 Manual Steps Required on GitHub

After completing the local setup, you need to complete these steps on GitHub.com:

### 1. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `lighthouse-global-tester`
3. Description: `Automated weekly Lighthouse performance testing for 110 major websites across 11 countries`
4. Set to **Public** (required for GitHub Pages)
5. Don't initialize with README (we already have one)
6. Click "Create repository"

### 2. Push Local Code to GitHub
Run these commands in your terminal:

```bash
# Add GitHub remote (replace 'yourusername' with your actual GitHub username)
git remote add origin https://github.com/yourusername/lighthouse-global-tester.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Actions
1. Go to your repository on GitHub
2. Click the "Actions" tab
3. GitHub will automatically detect the workflow file
4. Click "I understand my workflows, go ahead and enable them"

### 4. Enable GitHub Pages
1. Go to repository "Settings" tab
2. Scroll down to "Pages" section
3. Under "Source", select "GitHub Actions"
4. Save the settings

### 5. Configure Repository Settings (Optional but Recommended)
1. Go to "Settings" → "General"
2. Under "Features", enable:
   - ✅ Issues
   - ✅ Projects
   - ✅ Wiki
   - ✅ Discussions
3. Under "Pull Requests", enable:
   - ✅ Allow merge commits
   - ✅ Allow squash merging
   - ✅ Allow rebase merging

### 6. First Test Run
1. Go to "Actions" tab
2. Click on "Lighthouse Performance Testing" workflow
3. Click "Run workflow" → "Run workflow" to trigger manual test
4. Wait for completion (~10-15 minutes for all 110 websites)

### 7. View Live Dashboard
After the first successful run:
- **Live Dashboard**: https://yourusername.github.io/lighthouse-global-tester
- **Workflow Status**: https://github.com/yourusername/lighthouse-global-tester/actions

## 🎯 What Happens Next

### Automated Weekly Testing
- **Schedule**: Every Sunday at 2 AM UTC
- **Process**: Tests all 110 websites across 11 countries
- **Output**: Updated database and regenerated website
- **Deployment**: Automatic deployment to GitHub Pages

### Manual Testing
- Trigger anytime via GitHub Actions "Run workflow" button
- Useful for testing after code changes
- Same process as automated runs

### Monitoring
- Check Actions tab for run status
- View artifacts for debugging
- Monitor performance trends on live dashboard

## 🔧 Customization Options

### Change Testing Schedule
Edit `.github/workflows/lighthouse-tests.yml`:
```yaml
schedule:
  # Every day at 3 AM UTC
  - cron: '0 3 * * *'
  
  # Every Monday and Friday at 9 AM UTC  
  - cron: '0 9 * * 1,5'
```

### Add More Websites
Edit `domains.json` and add websites to appropriate country arrays:
```json
{
  "country": "Finland",
  "top_domains": [
    "yle.fi",
    "hs.fi",
    "your-new-site.fi"
  ]
}
```

### Modify Database Schema
1. Update `database.js` with new columns
2. Create migration script
3. Test locally before deploying

## 🎉 Success Indicators

✅ **Repository Created**: Code pushed to GitHub  
✅ **Actions Enabled**: Workflow appears in Actions tab  
✅ **Pages Enabled**: Settings configured for GitHub Actions source  
✅ **First Run Complete**: Initial test run finishes successfully  
✅ **Live Dashboard**: Website accessible at GitHub Pages URL  
✅ **Weekly Schedule**: Automatic runs every Sunday  

## 📞 Support

If you encounter issues:
1. Check Actions tab for error logs
2. Verify GitHub Pages settings
3. Ensure repository is public
4. Review workflow file for syntax errors
5. Check database permissions and migrations

---

**🌟 You're all set for automated global performance monitoring!**
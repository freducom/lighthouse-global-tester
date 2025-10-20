# 🚀 GitHub Deployment Instructions

## 📋 Manual Steps Required on GitHub

After completing the local setup, you need to complete these steps on GitHub.com:

### 1. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `lighthouse-global-tester`
3. Description: `Automated daily Lighthouse performance testing for 148 major websites across 14 countries`
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

### 3. Configure Repository Permissions (IMPORTANT!)
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll to "Actions" → "General"
4. Under "Workflow permissions", select:
   - ✅ **"Read and write permissions"**
   - ✅ **"Allow GitHub Actions to create and approve pull requests"**
5. Click "Save"

### 4. Enable GitHub Pages
1. Go to repository "Settings" tab
2. Scroll down to "Pages" section
3. Under "Source", select **"GitHub Actions"** (not Deploy from branch)
4. Save the settings

### 5. Enable GitHub Actions
1. Go to your repository on GitHub
2. Click the "Actions" tab
3. GitHub will automatically detect the workflow file
4. Click "I understand my workflows, go ahead and enable them"

### 6. Configure Repository Settings (Optional but Recommended)
### 6. Configure Repository Settings (Optional but Recommended)
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

### 7. First Test Run
1. Go to "Actions" tab
2. Click on "Daily Lighthouse Tests" workflow
3. Click "Run workflow" → "Run workflow" to trigger manual test
4. Wait for completion (~5-7 minutes for daily batch of ~22 websites)
5. **For full test**: Check "Test all websites (ignore daily rotation)" before clicking "Run workflow"

### 8. View Live Dashboard
After the first successful run:
- **Live Dashboard**: https://freducom.github.io/lighthouse-global-tester
- **Workflow Status**: https://github.com/freducom/lighthouse-global-tester/actions

## 🔧 Troubleshooting Permission Issues

If you get permission errors:

### Error: "Permission denied to github-actions[bot]"
✅ **Fix**: Follow step 3 above - enable "Read and write permissions" for Actions

### Error: "Pages deployment failed"  
✅ **Fix**: Ensure Pages source is set to "GitHub Actions" (not "Deploy from branch")

### Error: "Workflow not found"
✅ **Fix**: Make sure `.github/workflows/lighthouse-tests.yml` exists and is pushed to main branch

## 🎯 What Happens Next

### Automated Daily Testing
- **Schedule**: Every day at 2 AM UTC
- **Process**: Tests 1/7th of websites daily (approximately 22 sites)
- **Full Cycle**: All 148 websites tested over 7 days
- **Output**: Updated database and regenerated website daily
- **Deployment**: Automatic deployment to GitHub Pages
- **Scalability**: Automatically adapts when new countries or domains are added

### Manual Testing Options
- **Daily Batch** (default): Test today's portion (~22 sites, ~5-7 minutes)
- **Full Test**: Check the checkbox to test all 148 websites (~30 minutes)
- Trigger anytime via GitHub Actions "Run workflow" button

### Testing Distribution by Day
- **Sunday (Day 0)**: ~22 websites from early countries (US, UK, etc.)
- **Monday (Day 1)**: ~22 websites from next batch (UK, Germany, India, Brazil)
- **Tuesday (Day 2)**: ~22 websites continuing the cycle (Brazil, Japan, Canada)
- **Wednesday (Day 3)**: ~22 websites (Canada, Australia, Russia)
- **Thursday-Saturday**: Remaining websites in batches (~22 sites each, 16 on Saturday)
- **Automatic Scaling**: When you add new countries/domains, they're automatically distributed

### Monitoring
- Check Actions tab for run status
- View deployment logs for debugging
- Monitor performance trends on live dashboard

## 🔧 Customization Options

### Change Testing Schedule
Edit `.github/workflows/lighthouse-tests.yml`:
```yaml
schedule:
  # Every 6 hours (4 times per day)
  - cron: '0 */6 * * *'
  
  # Every Monday, Wednesday, Friday at 9 AM UTC  
  - cron: '0 9 * * 1,3,5'
  
  # Keep daily at 2 AM UTC (recommended)
  - cron: '0 2 * * *'
```

### Test Different Daily Batches Locally
```bash
# Test Sunday's batch (day 0)
npm run test-daily -- 0

# Test Wednesday's batch (day 3)  
npm run test-daily -- 3

# Test all websites (ignore daily rotation)
npm test
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
✅ **Permissions Set**: Actions have read/write permissions  
✅ **Pages Configured**: Source set to "GitHub Actions"  
✅ **Actions Enabled**: Workflow appears in Actions tab  
✅ **First Run Complete**: Initial test run finishes successfully  
✅ **Live Dashboard**: Website accessible at GitHub Pages URL  
✅ **Daily Schedule**: Automatic runs every day at 2 AM UTC  
✅ **Distributed Testing**: 1/7th of websites tested daily
✅ **Auto-Scaling**: New countries/domains automatically distributed  

## 📞 Support

If you encounter issues:
1. **Permissions**: Ensure Actions have "Read and write permissions"
2. **Pages Setup**: Verify source is "GitHub Actions"
3. **Repository Public**: GitHub Pages requires public repository
4. **Check Logs**: Review Actions tab for detailed error messages
5. **Workflow File**: Ensure `.github/workflows/lighthouse-tests.yml` exists

---

**🌟 You're all set for automated global performance monitoring!**
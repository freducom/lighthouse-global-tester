# 🚀 Lightho- **🔄 Automated Testing**: Daily Lighthouse performance testing via GitHub Actions (1/7th of sites per day)
- **🌍 Global Coverage**: 110 websites across 11 countries (Finland, Japan, Sweden, Norway, Denmark, Estonia, Latvia, Lithuania, Iceland, Germany, Global)
- **📊 Beautiful Dashboard**: Facebook-style responsive web interface
- **📈 Historical Tracking**: SQLite database with performance score history
- **🎯 Comprehensive Metrics**: Performance, Accessibility, Best Practices, SEO, and PWA scores
- **📱 Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **🚀 GitHub Integration**: Fully automated with GitHub Actions and Pages deployment
- **⚡ Distributed Load**: Tests spread across 7 days for faster execution and more frequent updatesbal Performance Tester

[![Lighthouse Tests](https://github.com/fredu/lighthouse-global-tester/actions/workflows/lighthouse-tests.yml/badge.svg)](https://github.com/fredu/lighthouse-global-tester/actions/workflows/lighthouse-tests.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://fredu.github.io/lighthouse-global-tester)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

An automated weekly performance monitoring system that tests **110 major websites** across **11 countries** using Google Lighthouse, stores results in SQLite database, and serves a beautiful dashboard via GitHub Pages.

## 🌐 [Live Performance Dashboard](https://fredu.github.io/lighthouse-global-tester)

## ✨ Features

- **� Automated Testing**: Weekly Lighthouse performance testing via GitHub Actions
- **🌍 Global Coverage**: 110 websites across 11 countries (Finland, Japan, Sweden, Norway, Denmark, Estonia, Latvia, Lithuania, Iceland, Germany, Global)
- **📊 Beautiful Dashboard**: Facebook-style responsive web interface
- **📈 Historical Tracking**: SQLite database with performance score history
- **🎯 Comprehensive Metrics**: Performance, Accessibility, Best Practices, SEO, and PWA scores
- **📱 Mobile Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **🚀 GitHub Integration**: Fully automated with GitHub Actions and Pages deployment

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub Actions│────│  Lighthouse Tests │────│   SQLite DB     │
│   (Weekly Cron) │    │  (110 Websites)   │    │  (Historical)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │   Website Generator     │
                    │  (Static HTML/CSS/JS)   │
                    └─────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │    GitHub Pages        │
                    │  (Live Dashboard)      │
                    └─────────────────────────┘
```

## 📊 Monitored Websites by Country

### 🇫🇮 Finland (10 websites)
- yle.fi, hs.fi, iltalehti.fi, is.fi, op.fi, helsinki.fi, mtv.fi, verkkokauppa.com, suomi24.fi, tori.fi

### 🇯🇵 Japan (10 websites)  
- yahoo.co.jp, rakuten.co.jp, ameblo.jp, goo.ne.jp, livedoor.jp, nicovideo.jp, nhk.or.jp, pixiv.net, line.me, cookpad.com

### 🌍 Global (90 websites)
Major international platforms including Google, Facebook, Amazon, Microsoft, GitHub, Reddit, Wikipedia, YouTube, Instagram, LinkedIn, and many more.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/fredu/lighthouse-global-tester.git
   cd lighthouse-global-tester
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```

3. **Run tests and generate website**
   ```bash
   npm run deploy
   ```

4. **Serve locally**
   ```bash
   npm run dev
   ```

Visit `http://localhost:8080` to view the dashboard locally.

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run all lighthouse tests |
| `npm test` | Run tests immediately (no scheduling) |
| `npm run test-daily` | Run today's batch (1/7th of websites) |
| `npm run generate` | Generate static website from database |
| `npm run serve` | Serve website locally on port 8080 |
| `npm run deploy` | Test all sites and generate website |
| `npm run deploy-daily` | Test daily batch and generate website |
| `npm run dev` | Generate and serve for local development |
| `npm run migrate` | Initialize/migrate database |
| `npm run query` | Interactive database query tool |

## 📈 Dashboard Features

### � Homepage
- **Country Overview**: Performance summary for all 11 countries
- **Global Statistics**: Total websites, average scores, trending metrics
- **Visual Charts**: Interactive performance comparisons using Chart.js
- **Quick Navigation**: Easy access to country-specific and domain-specific pages

### 🌍 Country Pages
- **Country-Specific Results**: All websites tested in each country
- **Performance Rankings**: Sorted by overall Lighthouse scores
- **Detailed Metrics**: Performance, Accessibility, Best Practices, SEO, PWA
- **Historical Trends**: Score evolution over time

### 🏢 Domain Pages
- **Individual Website Analysis**: Comprehensive performance breakdown
- **Score History**: Track performance changes over weeks/months  
- **Detailed Insights**: Specific recommendations and improvements
- **Mobile-First Design**: Optimized for all device sizes

## 🔄 Automation & Deployment

### GitHub Actions Workflow
The system automatically:
1. **Runs every day at 2 AM UTC** using cron scheduling
2. **Tests 1/7th of websites daily** (approximately 16 sites) for distributed load
3. **Completes full cycle weekly** - all 110 websites tested over 7 days
4. **Updates the SQLite database** with fresh performance data
5. **Generates a new static website** with latest results
6. **Deploys to GitHub Pages** for instant live updates
7. **Provides detailed summaries** of each test run
8. **Scales automatically** when new countries or domains are added

### Manual Triggers
- **Workflow Dispatch**: Trigger tests manually from GitHub Actions
  - **Daily Batch**: Test today's portion (1/7th) of websites
  - **Full Test**: Test all 110 websites at once (use "test_all" input)
- **Push to Main**: Automatic deployment on code changes
- **Local Testing**: Run and test locally before deployment

## 🗃️ Database Schema

```sql
CREATE TABLE lighthouse_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    country TEXT NOT NULL,
    performance_score INTEGER,
    accessibility_score INTEGER,
    best_practices_score INTEGER,
    seo_score INTEGER,
    pwa_score INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 📁 Project Structure

```
web-testing-app/
├── 📋 domains.json              # 110 websites organized by country
├── 🗄️ database.js               # SQLite database management
├── 🧪 global-tester.js          # Main testing application
├── 🏃 lighthouse-runner.js      # Lighthouse execution engine
├── 🌐 generate-website.js       # Static website generator
├── 🖥️ serve-website.js          # Local development server
├── 🔄 migrate-db.js             # Database migration tool
├── 📊 query-scores.js           # Interactive database queries
├── 📦 package.json              # Dependencies and scripts
├── 📚 README.md                 # This documentation
├── .github/workflows/
│   └── ⚡ lighthouse-tests.yml  # GitHub Actions automation
└── website/                     # Generated static website
    ├── 🏠 index.html            # Homepage dashboard
    ├── 🌍 country-*.html        # Country-specific pages  
    ├── 🏢 domain-*.html         # Individual domain pages
    └── 🎨 styles.css            # Beautiful responsive styling
```

## 🎯 Performance Metrics

The system tracks five core Lighthouse metrics:

1. **⚡ Performance** (0-100): Loading speed, runtime performance
2. **♿ Accessibility** (0-100): Web accessibility standards compliance  
3. **✅ Best Practices** (0-100): Security, HTTPS, browser console errors
4. **🔍 SEO** (0-100): Search engine optimization factors
5. **📱 PWA** (0-100): Progressive Web App capabilities

## 🌟 Key Benefits

- **🔍 Comprehensive Monitoring**: Track 110 major websites automatically
- **📊 Beautiful Visualizations**: Professional dashboard with charts and trends
- **🌍 Global Perspective**: Multi-country performance insights
- **⚡ Zero Maintenance**: Fully automated via GitHub Actions
- **📈 Historical Analysis**: Track performance evolution over time
- **🚀 Fast & Reliable**: Lightweight static site, blazing-fast loading
- **💰 Cost-Free**: Runs entirely on GitHub's free tier

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Lighthouse** - The powerful performance testing engine
- **GitHub Actions** - Seamless CI/CD automation  
- **GitHub Pages** - Free and reliable static site hosting
- **Chart.js** - Beautiful interactive charts
- **SQLite** - Reliable embedded database

---

**Made with ❤️ for the web performance community**

🌐 **[View Live Dashboard](https://fredu.github.io/lighthouse-global-tester)** | 📊 **[See Latest Results](https://github.com/fredu/lighthouse-global-tester/actions)**
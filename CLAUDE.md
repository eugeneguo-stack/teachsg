# TeachSG - AI Tutoring Platform

## Overview
AI-powered educational platform for Singapore O-Level curriculum featuring Mathematics, Science, and Music Theory tutoring with GPT-OSS-120B integration.

## Current Setup
- **Primary AI Model**: GPT-OSS-120B via Cloudflare Workers AI
- **Cost**: $0.350 input / $0.750 output per M tokens (8-20x cheaper than Claude)
- **Usage Limits**: 25 conversations/day per user (localStorage tracking)
- **Deployment**: GitHub → Cloudflare Pages auto-deployment
- **Domain**: teach.sg

## Key Features
- GPT-OSS-120B chat integration with educational focus
- Modern chat UI with gradient bubbles and animations
- Owl emoji (🦉) branding throughout interface
- Markdown and LaTeX math formatting support
- Usage tracking and rate limiting
- Responsive design for mobile/desktop

## Development Commands
```bash
# Local development
npm run dev

# Wrangler local testing
npx wrangler pages dev public --port 3001

# Deploy to Cloudflare Pages
git push origin main  # Auto-deploys via GitHub integration

# Testing workflow
npx playwright test  # Run after git push to test live deployment
```

## Development Workflow
1. Make code changes
2. **Always git push after fixes** - ensures changes are deployed to live site
3. Run `npx playwright test` to verify live deployment functionality
4. This workflow ensures all fixes are properly deployed and tested

## Architecture
- `/functions/api/workers-ai.js` - GPT-OSS-120B API integration
- `/functions/api/chat.js` - Main chat routing logic
- `/public/chat.js` - Frontend chat functionality with usage tracking
- `/public/index.html` - Main landing page with owl branding
- Owl emoji (🦉) used throughout interface for branding

## Project Structure
- `teachsg/` - Active development repository
- `archive/` - Legacy files and unused directories
  - `teach-sg-new/` - Previous version
  - `public_html-legacy-wordpress/` - WordPress legacy files
  - Python parsing scripts and export files

## Configuration
- Cloudflare Workers AI environment variables configured
- GitHub repository: eugeneguo-stack/teachsg
- Cloudflare Pages project connected for auto-deployment
- KV storage for caching and usage monitoring

## Notes
- Removed Claude 3.5 Sonnet integration (cost optimization)
- Using owl emoji (🦉) for clean, universal branding
- All aesthetic improvements deployed and working
- Directory structure organized for clarity (active vs archived)
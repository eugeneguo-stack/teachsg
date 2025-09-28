# Teach.sg - AI-Powered Educational Platform

A modern educational platform featuring Singapore O-Level mathematics and music content with integrated AI chat tutoring.

## 🌟 Features

- **AI Chat Tutor** - Claude Sonnet 3.5 integration for personalized learning
- **Mathematics Content** - Additional Math (A-Math) and Elementary Math (E-Math)
- **Music Resources** - Piano tutorials, chords, and praise & worship songs
- **Global Performance** - Deployed on Cloudflare Pages for fast worldwide access
- **Mobile Friendly** - Responsive design with Tailwind CSS

## 🚀 Live Site

**Production:** https://teach-sg.pages.dev
**Custom Domain:** https://teach.sg *(coming soon)*

## 📁 Project Structure

```
teach-sg-cloudflare/
├── src/static/          # Static HTML, CSS, JS files
│   ├── index.html       # Homepage with AI chat
│   ├── mathematics.html # Math topics browser
│   ├── music.html       # Music content browser
│   └── chat.js          # Chat functionality
├── functions/           # Cloudflare Workers
│   └── api/chat.js      # AI chat API endpoint
├── content/             # Educational content (MDX)
│   ├── mathematics/     # 36 math topics
│   └── music/           # 157 music pieces
└── public/              # Built files for deployment
```

## 🛠️ Development

### Local Development
```bash
npm install
npm run dev
# Visit http://localhost:3001
```

### Deploy to Cloudflare Pages
```bash
npm run build
npx wrangler pages deploy public --project-name teach-sg
```

## 🔧 Configuration

### Environment Variables
```bash
# Add API key for chat functionality
npx wrangler pages secret put ANTHROPIC_API_KEY
```

### Custom Domain Setup
1. Go to Cloudflare Dashboard → Pages → teach-sg → Custom domains
2. Add teach.sg domain
3. Update DNS settings

## 📚 Content

**Mathematics (36 topics):**
- Additional Mathematics: Advanced O-Level concepts
- Elementary Mathematics: Core mathematical foundations
- Topics: Coordinate geometry, algebra, trigonometry, calculus basics

**Music (157 pieces):**
- Piano tutorials and covers
- Chord progressions and theory
- Praise & worship arrangements
- Music notation and sight-reading

## 🤖 AI Integration

The platform uses Claude Sonnet 3.5 for:
- Personalized math tutoring
- Music theory explanations
- Step-by-step problem solving
- Singapore O-Level curriculum alignment

## 🌐 Tech Stack

- **Frontend:** Vanilla HTML, CSS (Tailwind), JavaScript
- **Backend:** Cloudflare Workers (Serverless)
- **AI:** Anthropic Claude API
- **Hosting:** Cloudflare Pages
- **Math Rendering:** KaTeX
- **Content:** MDX format

## 📝 License

Educational content for Singapore O-Level curriculum.

---

Built with ❤️ for Singapore students
# SixMinutes AI - Web Application

A modern web application for learning English through BBC's "6 Minute English" podcasts with AI-powered features.

## Features

### For Users
- **Lessons**: Browse and study BBC 6 Minute English lessons
- **Audio Player**: Listen to lessons with playback controls
- **Interactive Transcript**: Highlight any word to get AI-powered definitions
- **Vocabulary Management**: Save words to your personal vocabulary list
- **AI Exercises**: Practice with auto-generated multiple choice and gap-fill exercises
- **Progress Tracking**: Track completed lessons and exercise scores
- **PDF Export**: Download your vocabulary as a PDF file
- **Dark/Light Mode**: Toggle between themes

### For Admins
- **Lesson Import**: Add lessons by pasting BBC 6 Minute English URLs
- **API Key Management**: Configure Gemini API key for AI features
- **User Management**: View registered users and their activity

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **AI**: Google Gemini API
- **Authentication**: JWT-based auth with bcrypt

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
npx prisma migrate dev
```

### 3. Create Admin User

```bash
npm run create-admin
# Default: username=admin, password=admin123

# Or with custom credentials:
npm run create-admin myusername mypassword
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

- **Admin**: username: `admin`, password: `admin123`

## Configuration

### Environment Variables

Create a `.env` file with:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
```

### Gemini API Key

1. Log in as admin
2. Go to Admin Panel
3. Enter your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run create-admin` - Create admin user
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Protected pages
│   ├── login/         # Auth pages
│   └── register/
├── components/
│   └── ui/            # UI components
├── hooks/             # React hooks
└── lib/               # Utilities
    ├── auth.ts        # Authentication
    ├── db.ts          # Database client
    ├── scraper.ts     # BBC scraper
    └── ai-service.ts  # Gemini AI integration
```

## License

MIT

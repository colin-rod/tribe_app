# Tree App

A private family sharing platform built with Next.js and Supabase. Create intimate family branches to share precious memories, milestones, and moments with only your closest loved ones.

## ✨ Features

- 👨‍👩‍👧‍👦 **Private Family Branches** - Create dedicated spaces for different children, topics, or family groups
- 📸 **Rich Media Support** - Share photos, videos, voice notes, and milestone moments
- 💬 **Real-time Chat** - Engage with posts through comments, likes, and instant messaging
- 🎉 **Milestone Tracking** - Capture and celebrate important family moments with special milestone posts
- 🔒 **Complete Privacy** - Only family members you invite can see your content - no public posts, ever
- 🤖 **AI Family Assistant** - Get personalized prompts and suggestions for sharing family memories
- 📱 **Responsive Design** - Works beautifully on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A [Supabase](https://supabase.com) account
- Git

### Setup Instructions

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/colin-rod/tree_app.git
   cd tree_app
   npm install
   ```

2. **Set up Supabase**
   - Create a new project at [app.supabase.com](https://app.supabase.com)
   - Go to Project Settings > API to get your credentials
   - Create a storage bucket named `media` for file uploads

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run database migrations**
   - In your Supabase project, go to the SQL Editor
   - Run each migration file in `supabase/migrations/` in order:
     - `20241225_initial_schema.sql`
     - `20241225_circles_first_architecture.sql`
     - (Additional migrations as needed)

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Visit the app**
   - Open [http://localhost:3000](http://localhost:3000)
   - Create an account and start growing your tree!

## 🗂️ Project Structure

```
├── src/
│   ├── app/
│   │   ├── auth/           # Authentication pages
│   │   ├── branches/       # Branch management
│   │   ├── dashboard/      # Main dashboard
│   │   └── page.tsx        # Landing page
│   ├── lib/
│   │   └── supabase/       # Supabase client configuration
│   └── types/
│       └── database.ts     # TypeScript types
├── supabase/
│   └── migrations/         # Database schema migrations
├── TESTING.md             # Comprehensive testing guide
└── README.md
```

## 🎯 Core Concepts

### Family Branches
- **Always Private** - Every branch is completely private by default
- **Invite-Only Access** - Only family members you personally invite can join
- **Organized by Topic** - Create separate branches for each child, family events, or shared interests

### User Roles
- **Admin** - Can manage branch settings and members
- **Member** - Can post and interact with content

## 🧪 Testing

This project includes a comprehensive testing guide in `TESTING.md` that covers:
- Authentication flows
- Branch creation and management
- Post creation and media uploads
- Dashboard functionality
- Cross-browser compatibility
- Mobile responsiveness

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Authentication**: Supabase Auth with email confirmation
- **Storage**: Supabase Storage for media files
- **Deployment**: Vercel (recommended)

## 🔐 Security Features

- **Complete Privacy by Design** - No public content, ever
- Row Level Security (RLS) policies for data protection
- Server-side authentication checks
- Secure file upload with user isolation
- Protected API routes
- Family-only access controls

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your environment variables in Vercel's dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and run tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License. See `LICENSE` for more information.

## 🐛 Issues & Support

- Report bugs and request features in [GitHub Issues](https://github.com/colin-rod/tree_app/issues)
- Check `TESTING.md` for troubleshooting common issues
- Review Supabase documentation for database and auth questions

---

**Made with ❤️ for families and communities**

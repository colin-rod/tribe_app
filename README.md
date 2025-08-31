# Tree App 🌳

A private family sharing platform built with Next.js 15 and Supabase. Create intimate family branches to share precious memories, milestones, and moments with only your closest loved ones.

**Made with ❤️ for families who want to preserve and share their most precious memories in complete privacy.**

---

## ✨ **Features**

### 🏠 **Family-Centered Organization**
- 🌳 **Private Family Trees** - Your family's home base with organized branches for different topics
- 👨‍👩‍👧‍👦 **Private Family Branches** - Create dedicated spaces for each child, family events, or interests
- 🔒 **Complete Privacy by Design** - Only family members you invite can see your content - no public posts, ever
- 👥 **Flexible Family Roles** - Owner, admin, and member roles with granular permissions

### 📸 **Rich Memory Sharing**
- 📱 **Rich Media Support** - Share photos, videos, voice notes, and milestone moments
- 🎉 **Milestone Tracking** - Capture and celebrate important family moments with special milestone posts
- 💬 **Real-time Engagement** - Live comments, likes, and instant notifications when family shares
- 🏷️ **Smart Organization** - Organize memories by branches, milestones, and family topics

### 🛡️ **Security & Privacy**
- 🔐 **Row Level Security** - Database-level security ensuring complete privacy
- 🎯 **RBAC Permissions** - Role-based access control with granular permissions
- 📧 **Secure Invitations** - Email-based invitations with role assignments
- 🛡️ **Protected API Routes** - Server-side authentication checks throughout

### 🎨 **Modern User Experience**
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile devices
- ⚡ **Real-time Updates** - See family activity instantly across all devices
- 🎯 **Enhanced Error Handling** - User-friendly error messages and loading states
- 🖼️ **Optimized Media** - Next.js Image optimization for fast loading
- 🌙 **Accessibility Ready** - Built with accessibility in mind

---

## 🚀 **Quick Start**

### Prerequisites

- **Node.js 18+** (Latest LTS recommended)
- **Supabase Account** - [Create account](https://supabase.com)
- **Git** - For cloning the repository

### Setup Instructions

1. **Clone and Install**
   ```bash
   git clone https://github.com/colin-rod/tree_app.git
   cd tree_app
   npm install
   ```

2. **Set up Supabase**
   ```bash
   # Create a new project at app.supabase.com
   # Go to Project Settings > API to get your credentials
   # Create a storage bucket named 'media' for file uploads
   ```

3. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials:
   # NEXT_PUBLIC_SUPABASE_URL=your-project-url
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run Database Migrations**
   ```bash
   # In Supabase SQL Editor, run migration files in order:
   # 1. supabase/migrations/20241225_initial_schema.sql
   # 2. supabase/migrations/20241225_circles_first_architecture.sql
   # 3. supabase/migrations/20250826_implement_rbac_functions.sql
   # (Run additional migrations as needed)
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Visit Your App**
   ```
   Open http://localhost:3000
   Create your account and start growing your family tree! 🌱
   ```

---

## 🗂️ **Project Architecture**

### File Structure
```
tree_app/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── auth/              # Authentication pages  
│   │   ├── branches/          # Branch management
│   │   ├── dashboard/         # Main family dashboard
│   │   ├── invite/            # Family invitation system
│   │   ├── onboarding/        # New user onboarding
│   │   ├── profile/           # User profiles
│   │   ├── settings/          # User settings
│   │   └── trees/             # Tree management
│   ├── components/            # Reusable React components
│   │   ├── branches/          # Branch-specific components
│   │   ├── dashboard/         # Dashboard components  
│   │   ├── errors/            # Error handling components
│   │   ├── leaves/            # Post/memory components
│   │   ├── settings/          # Settings components
│   │   └── ui/                # UI library components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── supabase/         # Supabase client & server
│   │   ├── validation/        # Form validation & schemas
│   │   ├── error-handler.ts   # Error handling system
│   │   ├── toast-service.ts   # Toast notifications
│   │   └── rbac.ts           # Role-based access control
│   └── types/                # TypeScript type definitions
├── supabase/
│   └── migrations/           # Database schema migrations
├── public/                   # Static assets
├── docs/                     # Documentation
├── TODO.md                   # Comprehensive improvement roadmap
├── TESTING.md               # Detailed testing guide
└── README.md               # This file
```

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Authentication**: Supabase Auth with email confirmation
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Supabase Storage for media files
- **Real-time**: Supabase Real-time subscriptions
- **Deployment**: Vercel (recommended)
- **State Management**: React Query + React Context
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom components
- **Testing**: Jest + React Testing Library

---

## 🎯 **Core Concepts**

### Family Trees 🌳
Your family's **home base** where all branches are organized. Each tree represents a family unit and contains multiple branches for different purposes.
- **Private by Default** - Complete privacy for family memories
- **RBAC Permissions** - Owner, admin, member roles with specific permissions
- **Scalable Structure** - Support for extended families and multiple family units

### Family Branches 🌿
**Dedicated spaces** within your tree for specific topics, children, or family interests.
- **Always Private** - Every branch is completely private by default
- **Invite-Only Access** - Only family members you personally invite can join
- **Organized by Topic** - Separate branches for each child, events, or shared interests
- **Flexible Permissions** - Granular control over who can view, post, and manage

### Family Leaves (Posts) 📝
**Individual memories** shared within branches - the heart of your family's story.
- **Rich Content** - Text, photos, videos, voice notes, and milestone tracking
- **Real-time Sharing** - Family sees updates instantly across all devices
- **Milestone Support** - Special posts for first words, steps, birthdays, achievements
- **Interactive** - Comments, likes, and reactions to engage with memories

### User Roles 👥
- **Owner** - Full control over trees/branches, member management, settings
- **Admin** - Manage members, moderate content, configure branch settings  
- **Member** - Create posts, comment, like, participate in family sharing

---

## 🧪 **Testing**

### Comprehensive Testing Suite
This project includes an extensive testing infrastructure with [`TESTING.md`](./TESTING.md) providing detailed testing scenarios.

**Test Infrastructure:**
- 🧪 **Jest + React Testing Library**: Component and unit testing
- 🔄 **Integration Tests**: API routes and data flow testing
- 🛡️ **Security Tests**: Authentication, authorization, and input validation
- 📱 **Responsive Tests**: Cross-device and cross-browser compatibility
- ⚡ **Performance Tests**: Load testing and optimization validation
- 🎯 **Accessibility Tests**: Screen reader and keyboard navigation

**Test Categories:**
```bash
# Unit Tests - Individual components and utilities
npm run test

# Integration Tests - Component interactions and API routes  
npm run test:integration

# Coverage Reports - Detailed test coverage analysis
npm run test:coverage

# Watch Mode - Development testing
npm run test:watch

# CI Testing - Automated testing for deployments
npm run test:ci
```

**Current Test Coverage:**
- **Statements**: 70%+ (targeting 85%)
- **Critical Components**: Authentication, RBAC, Error handling
- **Family Scenarios**: Privacy controls, member management, content sharing
- **Real-time Features**: Live updates, notifications, interactions

### Quick Test Checklist
- [ ] User registration and tree creation
- [ ] Branch creation within trees
- [ ] Real-time posts across multiple browsers
- [ ] Mobile responsive design
- [ ] Error handling and edge cases

---

## 🔐 **Security Features**

### Privacy by Design
- **No Public Content** - Everything is private by default
- **Family-Only Access** - Only invited family members can see content
- **Granular Permissions** - Control who can view, post, and manage
- **Secure File Storage** - Isolated file storage per family

### Technical Security
- **Row Level Security (RLS)** - Database-level security policies
- **Server-side Authentication** - All API routes protected
- **Role-based Access Control** - Granular permissions system
- **Input Validation** - Comprehensive input sanitization
- **Secure File Uploads** - Type validation and size limits
- **Session Management** - Secure session handling

### Security Roadmap
- [ ] **Multi-Factor Authentication (2FA)** - SMS and authenticator app support
- [ ] **End-to-End Encryption** - For sensitive family content
- [ ] **Advanced Audit Logging** - Track all family activity
- [ ] **Data Retention Policies** - Automatic cleanup and archival
- [ ] **GDPR Compliance** - Data export and deletion tools

---

## ⚡ **Performance & Optimization**

### Current Optimizations
- ✅ **Next.js Image Optimization** - Automatic image compression and resizing
- ✅ **Code Splitting** - Automatic route-based code splitting
- ✅ **Real-time Efficiency** - Optimized Supabase subscriptions
- ✅ **Enhanced Error Handling** - User-friendly error states
- ✅ **Toast Notifications** - Non-blocking user feedback

### Performance Roadmap
- [ ] **Progressive Web App** - Offline support and native app feel
- [ ] **Virtual Scrolling** - Handle large family timelines
- [ ] **Image Lazy Loading** - Faster initial page loads
- [ ] **Bundle Optimization** - Further reduce JavaScript bundle size
- [ ] **CDN Integration** - Faster global content delivery

---

## 🚀 **Deployment**

### Deploy to Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Push your code to GitHub
   # Connect repository to Vercel
   # Vercel will auto-detect Next.js configuration
   ```

2. **Environment Variables**
   ```bash
   # Add in Vercel dashboard:
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Deploy**
   ```bash
   # Vercel will automatically deploy on push to main branch
   # Custom domains and SSL included
   ```

### Alternative Deployment Options
- **Netlify** - Static site deployment
- **Railway** - Full-stack deployment
- **Self-hosted** - Docker containers available
- **Supabase Platform** - Native Supabase hosting

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Storage bucket configured
- [ ] Real-time subscriptions enabled
- [ ] Error monitoring set up
- [ ] Analytics configured (optional)

---

## 🤝 **Contributing**

We welcome contributions that help families better connect and preserve memories!

### Development Process
1. **Fork & Clone**
   ```bash
   git clone https://github.com/colin-rod/tree_app.git
   cd tree_app
   npm install
   ```

2. **Development Setup**
   ```bash
   npm install
   cp .env.local.example .env.local
   # Configure your local Supabase instance
   ```

3. **Feature Development**
   ```bash
   git checkout -b feature/amazing-family-feature
   # Make your changes
   npm run test
   npm run test:coverage
   npm run lint
   npm run build
   ```

4. **Submit Changes**
   ```bash
   git commit -m "Add amazing family feature"
   git push origin feature/amazing-family-feature
   # Open Pull Request with detailed description
   ```

### Contribution Guidelines
- **Family-First**: All features should enhance family connection and privacy
- **Privacy-Focused**: Maintain privacy-by-design principles
- **Test Coverage**: Include comprehensive tests for new features (aim for 85%+)
- **Documentation**: Update docs and testing scenarios for user-facing changes
- **TypeScript**: Maintain strong type safety and code quality
- **Accessibility**: Ensure all features work with screen readers and keyboard navigation
- **Security**: Follow security best practices and validate all inputs

### Areas for Contribution
- 🎨 **UI/UX Improvements** - Better family user experience
- 📱 **Mobile Enhancements** - Progressive Web App features  
- 🔒 **Security Features** - Enhanced privacy and security
- ⚡ **Performance** - Speed and optimization improvements
- 🧪 **Testing** - Expanded test coverage
- 📚 **Documentation** - Better guides and examples

---

## 📋 **Roadmap**

### 🚨 **Current Focus** (Next 1-2 months)
- [x] **Enhanced Testing Infrastructure** - Comprehensive test suite with Jest and RTL
- [x] **Improved Error Handling** - Better error boundaries and user feedback
- [ ] **Email Notifications** - Complete invitation and activity notifications
- [ ] **Performance Optimization** - Bundle size and loading speed improvements
- [ ] **Mobile Enhancement** - Progressive Web App features

### 🎯 **High Priority** (Next 3-6 months)
- [ ] **Family Calendar Integration** - Sync events, birthdays, milestones
- [ ] **Voice Messages** - Native voice recording for posts
- [ ] **Progressive Web App** - Offline support, push notifications
- [ ] **Enhanced Photo Management** - Batch uploads, smart organization
- [ ] **Multi-Factor Authentication** - Enhanced security options

### 🚀 **Future Features** (6-12 months)
- [ ] **AI Memory Prompts** - Smart suggestions for family sharing
- [ ] **Advanced Real-time Features** - Live reactions, typing indicators
- [ ] **Family Analytics** - Privacy-friendly engagement insights
- [ ] **Video Calling** - Integrated family video chat
- [ ] **Advanced Search** - Find memories across all family content

See [`TODO.md`](./TODO.md) for the complete roadmap with 150+ improvements.

---

## 🐛 **Issues & Support**

### Get Help
- 📖 **Documentation** - Check [`TESTING.md`](./TESTING.md) for troubleshooting
- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/colin-rod/tree_app/issues)
- 💡 **Feature Requests** - [GitHub Issues](https://github.com/colin-rod/tree_app/issues) with enhancement label
- 📧 **Supabase Questions** - [Supabase Documentation](https://supabase.com/docs)

### Common Issues
- **Build Errors** - Check Node.js version (18+ required)
- **Database Issues** - Ensure all migrations are applied
- **Real-time Issues** - Check Supabase real-time configuration
- **File Upload Issues** - Verify storage bucket permissions
- **Authentication Issues** - Check environment variables

---

## 📜 **License**

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for more information.

---

## 🙏 **Acknowledgments**

Built with love using incredible tools:
- **[Next.js](https://nextjs.org)** - The React framework for production
- **[Supabase](https://supabase.com)** - The open source Firebase alternative  
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[React Query](https://tanstack.com/query)** - Data fetching and state management
- **[TypeScript](https://typescriptlang.org)** - Type safety and developer experience

Special thanks to all families who inspired this project with their need for private, secure family memory sharing.

---

## 📱 **Stay Connected**

- 🌟 **Star this repo** if Tree helps your family stay connected
- 🐛 **Report bugs** to help improve the experience for all families
- 💡 **Suggest features** that would help your family share memories better
- 🤝 **Contribute** to help other families benefit from Tree

---

**Made with ❤️ for families everywhere**

*"Every family deserves a private, beautiful space to share their most precious memories."*

---

*Last updated: January 31, 2025*
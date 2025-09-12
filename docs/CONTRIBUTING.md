# Contributing to Tribe App

Thank you for your interest in contributing to Tribe App! This guide will help you get started with contributing to our family-focused, privacy-first memory sharing platform.

## Code of Conduct

By participating in this project, you agree to abide by our community standards:

- **Family-First**: All contributions should enhance family connection and privacy
- **Privacy-Focused**: Maintain privacy-by-design principles in all features
- **Respectful**: Be kind and respectful in all interactions
- **Inclusive**: Welcome contributors of all skill levels and backgrounds
- **Quality-Focused**: Maintain high standards for code quality and user experience

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **Git** for version control
- **Supabase account** for local development
- **SendGrid account** for email testing
- Familiarity with **TypeScript**, **React**, and **Next.js**

### Local Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/tribe_app.git
   cd tribe_app
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase and SendGrid credentials
   ```

3. **Database Setup**
   ```bash
   # Apply migrations in Supabase SQL editor
   # Files in order: migrations/001_person_centric_schema.sql
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

## Development Guidelines

### Project Structure

Understanding the codebase organization:

```
src/
├── app/                    # Next.js 15 App Router pages
│   ├── api/               # API routes and webhooks
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Main application interface
├── components/            # Reusable React components
│   ├── ui/                # Base UI components and icon library
│   ├── leaves/            # Content/memory related components
│   └── branches/          # Family organization components
├── lib/                   # Utility libraries and services
│   ├── email/             # Email processing system
│   ├── supabase/          # Database client and queries
│   └── validation/        # Form validation and schemas
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
```

### Coding Standards

#### TypeScript
- **Strict typing**: Avoid `any` types, use proper interfaces
- **Type safety**: All props and functions should be properly typed
- **Interface consistency**: Follow existing naming conventions

```typescript
// Good
interface TreeProps {
  tree: Tree
  onSelect: (treeId: string) => void
  className?: string
}

// Avoid
interface TreeProps {
  tree: any
  onSelect: Function
}
```

#### React Components
- **Functional components**: Use hooks instead of class components
- **Props destructuring**: Destructure props at component level
- **Custom hooks**: Extract reusable logic into custom hooks

```typescript
// Good
export function TreeCard({ tree, onSelect, className }: TreeProps) {
  const { user } = useAuth()
  // component logic
}

// Avoid
export function TreeCard(props: TreeProps) {
  // accessing props.tree, props.onSelect throughout
}
```

#### Styling
- **Tailwind CSS**: Use utility classes for styling
- **Responsive design**: Mobile-first approach
- **Accessibility**: Include proper ARIA labels and semantic HTML

```tsx
// Good
<button
  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
  aria-label="Create new tree"
  onClick={handleCreate}
>
  Create Tree
</button>
```

### Git Workflow

#### Branch Naming
- **Features**: `feature/description-of-feature`
- **Bug fixes**: `fix/description-of-fix`  
- **Documentation**: `docs/description-of-change`
- **Refactoring**: `refactor/description-of-change`

#### Commit Messages
Follow conventional commit format:

```bash
# Feature
feat: add voice message recording to leaf creator

# Bug fix
fix: resolve email parsing issue with large attachments

# Documentation
docs: update deployment guide with Vercel configuration

# Refactoring
refactor: extract email processing logic into separate service
```

#### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-family-feature
   ```

2. **Make Changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Locally**
   ```bash
   npm run test
   npm run test:coverage
   npm run lint
   npm run build
   ```

4. **Submit Pull Request**
   - Clear description of changes
   - Link to related issues
   - Include screenshots for UI changes
   - Request review from maintainers

## Testing Guidelines

### Testing Requirements

All contributions must include appropriate tests:

#### Unit Tests
```typescript
// Example: Testing a utility function
import { extractPersonIdFromEmail } from '../email-utils'

describe('extractPersonIdFromEmail', () => {
  test('extracts tree ID from person email', () => {
    const email = 'person-abc123@domain.com'
    expect(extractPersonIdFromEmail(email)).toBe('abc123')
  })

  test('returns null for invalid email format', () => {
    const email = 'invalid-email@domain.com'
    expect(extractPersonIdFromEmail(email)).toBeNull()
  })
})
```

#### Component Tests
```typescript
// Example: Testing a React component
import { render, screen, fireEvent } from '@testing-library/react'
import { TreeSelector } from '../TreeSelector'

describe('TreeSelector', () => {
  test('renders tree options', () => {
    const trees = [{ id: '1', person_name: 'Baby Sarah' }]
    render(<TreeSelector trees={trees} onSelect={jest.fn()} />)
    
    expect(screen.getByText('Baby Sarah')).toBeInTheDocument()
  })

  test('calls onSelect when tree is clicked', () => {
    const onSelect = jest.fn()
    const trees = [{ id: '1', person_name: 'Baby Sarah' }]
    render(<TreeSelector trees={trees} onSelect={onSelect} />)
    
    fireEvent.click(screen.getByText('Baby Sarah'))
    expect(onSelect).toHaveBeenCalledWith('1')
  })
})
```

#### Integration Tests
Test complete user workflows:

```typescript
// Example: Testing email-to-memory flow
describe('Email Integration', () => {
  test('creates leaf from email with photo attachment', async () => {
    // Mock webhook payload
    const emailData = {
      to: 'person-abc123@domain.com',
      subject: 'Sarah\'s first steps!',
      attachment1: 'photo.jpg',
      attachment1_content: 'base64-encoded-image'
    }

    // Test webhook processing
    const response = await POST('/api/webhooks/sendgrid', emailData)
    expect(response.success).toBe(true)
    
    // Verify leaf creation
    const leaf = await getLeafById(response.data.leafId)
    expect(leaf.content).toContain('Sarah\'s first steps!')
    expect(leaf.media_urls).toHaveLength(1)
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- TreeSelector.test.tsx

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI
npm run test:ci
```

## Feature Development Process

### Planning New Features

Before starting development:

1. **Check existing issues** to avoid duplication
2. **Create feature proposal** if it's a major change
3. **Discuss with maintainers** in GitHub Discussions
4. **Break down into smaller tasks** if needed

### Feature Categories

#### Family-Focused Features
Features that enhance family connection:
- Cross-tree content sharing improvements
- Family relationship management
- Memory organization and discovery
- Collaborative storytelling tools

#### Privacy & Security Features
Maintaining our privacy-first approach:
- Enhanced permission controls
- Data encryption improvements
- Privacy audit tools
- Secure sharing mechanisms

#### User Experience Improvements
Making the app more intuitive:
- Interface simplification
- Mobile experience enhancements
- Accessibility improvements
- Performance optimizations

### Implementation Best Practices

#### Privacy Considerations
Always consider privacy implications:

```typescript
// Good: Explicit privacy controls
interface BranchCreateRequest {
  name: string
  privacy_level: 'private' | 'shared'
  connected_trees: string[]
  visibility_settings: {
    allow_external_sharing: boolean
    require_approval_for_new_members: boolean
  }
}

// Avoid: Unclear privacy defaults
interface BranchCreateRequest {
  name: string
  public?: boolean // Unclear what this means
}
```

#### Family-Centric Design
Design features around family workflows:

```typescript
// Good: Family-first approach
interface MemoryCreationFlow {
  selectPerson: (treeId: string) => void
  addContent: (content: Content) => void
  shareWithFamily: (familyMembers: string[]) => void
  setPrivacyLevel: (level: PrivacyLevel) => void
}

// Avoid: Generic social media approach
interface PostCreationFlow {
  createPost: (content: any) => void
  sharePublic?: boolean
}
```

## Documentation Contributions

Documentation is just as important as code! Help improve:

### Types of Documentation
- **User guides**: Help families understand features
- **Developer docs**: Technical implementation guides
- **API reference**: Endpoint documentation
- **Deployment guides**: Production setup instructions

### Documentation Standards
- Clear, concise language
- Step-by-step instructions
- Code examples where relevant
- Screenshots for UI guidance
- Keep docs updated with code changes

## Community Guidelines

### Getting Help

- **GitHub Discussions**: For feature proposals and questions
- **GitHub Issues**: For bugs and specific feature requests  
- **Code Reviews**: Learn from feedback on pull requests
- **Documentation**: Check existing docs before asking

### Helping Others

- **Code reviews**: Provide constructive feedback
- **Issue triage**: Help identify bugs and feature requests
- **Documentation**: Improve docs based on your experience
- **Mentoring**: Help new contributors get started

## Recognition

We value all contributions:

- **Contributors**: Listed in README and releases
- **Major features**: Highlighted in release notes
- **Bug fixes**: Acknowledged in changelog
- **Documentation**: Just as valuable as code contributions

## Areas for Contribution

### Current Priorities

#### High Impact, Beginner Friendly
- Improve error messages and user feedback
- Add loading states to components
- Enhance mobile responsive design
- Write additional tests for existing features

#### Medium Complexity
- Implement voice message recording
- Create family relationship visualization
- Build memory export features
- Optimize database queries

#### Advanced Features
- AI-powered content categorization
- Multi-channel integration (SMS, WhatsApp)
- Real-time collaboration features
- Advanced privacy controls

### Skills Needed

#### Frontend Development
- **React/Next.js**: Component development and optimization
- **TypeScript**: Type-safe development practices
- **Tailwind CSS**: Responsive design implementation
- **Accessibility**: WCAG compliance and screen reader support

#### Backend Development
- **API Design**: RESTful endpoints and webhook processing
- **Database**: PostgreSQL optimization and query design
- **Email Processing**: SendGrid integration and media handling
- **Authentication**: Supabase Auth and RBAC implementation

#### DevOps & Testing
- **Testing**: Jest, React Testing Library, integration tests
- **Performance**: Bundle optimization and monitoring
- **Deployment**: Vercel, Docker, CI/CD pipeline setup
- **Security**: Security audit and vulnerability assessment

## Getting Started with Your First Contribution

Ready to contribute? Here's a great first contribution path:

1. **Find a good first issue**: Look for `good-first-issue` label
2. **Set up development environment**: Follow setup instructions above
3. **Make a small improvement**: Fix a bug or improve documentation
4. **Submit pull request**: Follow our PR guidelines
5. **Engage with feedback**: Address review comments
6. **Celebrate**: You've made Tribe better for families!

## Questions?

- 📖 **Documentation**: Check our [docs/](../docs/) directory
- 💬 **Discussions**: Use GitHub Discussions for questions
- 🐛 **Issues**: Report bugs via GitHub Issues
- 📧 **Email**: Contact maintainers for sensitive issues

---

**Thank you for helping make Tribe the best platform for family memory sharing!** 

Every contribution, no matter how small, helps families around the world stay connected and preserve their precious memories.
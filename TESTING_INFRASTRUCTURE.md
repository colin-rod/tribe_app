# Testing Infrastructure

This document outlines the comprehensive testing setup for the Tribe application.

## 🧪 **Testing Stack**

- **Test Runner**: Jest (with Next.js integration)
- **React Testing**: React Testing Library + Jest DOM
- **User Interactions**: Testing Library User Event
- **Coverage**: Istanbul (built into Jest)
- **CI/CD**: GitHub Actions

## 📁 **Test Structure**

```
src/
├── __tests__/
│   └── utils/
│       └── test-utils.tsx        # Custom render and test utilities
├── components/
│   └── __tests__/                # Component integration tests
├── hooks/
│   └── __tests__/                # Hook unit tests
├── lib/
│   └── __tests__/                # Service and utility tests
└── utils/
    └── __tests__/                # Utility function tests
```

## 🚀 **Available Scripts**

```bash
# Run all tests once
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

## 📝 **Writing Tests**

### **Component Tests**

Use the custom render function from test-utils to include providers:

```tsx
import { render, screen } from '@/__tests__/utils/test-utils'
import MyComponent from '@/components/MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello World')).toBeInTheDocument()
})
```

### **Hook Tests**

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

test('returns correct data', async () => {
  const { result } = renderHook(() => useMyHook())
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false)
  })
  
  expect(result.current.data).toBeDefined()
})
```

### **Service Tests**

```tsx
import { handleError } from '@/lib/error-handler'

test('handles errors correctly', () => {
  const result = handleError('Test error', { logError: false })
  expect(result.message).toBe('Test error')
})
```

## 🎯 **Test Categories**

### **1. Unit Tests**
- **React Query Hooks**: Data fetching, caching, mutations
- **Utility Functions**: Performance utilities, error handlers
- **Services**: RBAC, data services, validation

### **2. Integration Tests**
- **Components**: LeafCard, TreeExplorer, form components
- **User Workflows**: Creating content, reactions, sharing
- **State Management**: React Query integration

### **3. Mocking Strategy**

#### **Global Mocks (in jest.setup.js)**
- Next.js router
- Supabase client
- React Query client
- Browser APIs (matchMedia, IntersectionObserver)

#### **Component-Specific Mocks**
```tsx
// Mock hooks in individual test files
jest.mock('@/hooks/use-leaves', () => ({
  useTreeLeaves: jest.fn(() => ({ data: [], isLoading: false }))
}))
```

## 🏗️ **Test Utilities**

### **Custom Render**
Includes all necessary providers (QueryClient, etc.)

### **Mock Data Factories**
```tsx
import { createMockUser, createMockTree, createMockLeaf } from '@/__tests__/utils/test-utils'

const mockUser = createMockUser()
const mockTree = createMockTree()
const mockLeaf = createMockLeaf()
```

### **Query Client Mock**
Pre-configured QueryClient for testing with disabled retries and caching.

## 📊 **Coverage Goals**

- **Overall**: 80%+ coverage
- **Functions**: 70%+ coverage
- **Lines**: 70%+ coverage
- **Branches**: 70%+ coverage

### **Coverage Reports**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🔧 **Configuration**

### **Jest Config** (`jest.config.js`)
- Next.js integration
- Custom test patterns
- Module path mapping
- Coverage thresholds
- Transform ignore patterns

### **Setup File** (`jest.setup.js`)
- Testing Library DOM matchers
- Global mocks
- Test utilities
- Console method overrides

## 🚦 **CI/CD Integration**

### **GitHub Actions** (`.github/workflows/ci.yml`)
- **Matrix Testing**: Node.js 18.x and 20.x
- **Linting**: ESLint checks
- **Type Checking**: TypeScript compilation
- **Testing**: Jest with coverage
- **Building**: Production build verification
- **Coverage Upload**: Codecov integration

### **Workflow Steps**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run linter
5. Run type check
6. Run tests with coverage
7. Upload coverage
8. Build application

## 🎯 **Testing Best Practices**

### **1. Test Behavior, Not Implementation**
```tsx
// Good: Test user interactions
fireEvent.click(screen.getByRole('button', { name: /submit/i }))
expect(mockOnSubmit).toHaveBeenCalled()

// Avoid: Testing internal state
expect(component.state.isSubmitting).toBe(true)
```

### **2. Use Descriptive Test Names**
```tsx
// Good
test('should display error message when form submission fails')

// Avoid
test('error handling')
```

### **3. Test User Workflows**
```tsx
test('user can create and react to a leaf', async () => {
  // 1. Create leaf
  // 2. View leaf
  // 3. Add reaction
  // 4. Verify reaction appears
})
```

### **4. Mock External Dependencies**
- Supabase client
- API endpoints
- File uploads
- Navigation

### **5. Test Error States**
```tsx
test('handles network errors gracefully', async () => {
  mockApi.get.mockRejectedValue(new Error('Network error'))
  // Test error handling
})
```

## 🐛 **Debugging Tests**

### **Common Issues**

1. **Async Operations**: Use `waitFor` for async state changes
2. **Missing Providers**: Use custom render with providers
3. **Mock Cleanup**: Clear mocks in `beforeEach`
4. **Timer Issues**: Use `jest.useFakeTimers()` for timing tests

### **Debug Commands**
```bash
# Run specific test file
npm test -- hooks/use-trees.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should fetch"

# Debug mode
npm test -- --detectOpenHandles --verbose
```

## 🚀 **Future Improvements**

- **E2E Testing**: Add Playwright for end-to-end tests
- **Visual Regression**: Add visual testing with Chromatic
- **Performance Testing**: Add performance benchmarks
- **Accessibility Testing**: Add automated a11y tests
- **API Testing**: Add contract testing with Pact

## 📚 **Resources**

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
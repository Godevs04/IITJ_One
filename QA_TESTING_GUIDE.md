# IITJ One - QA Testing Guide

Complete guide for running QA automation tests across mobile, API, and admin platforms.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or remote)
- Expo CLI (for mobile testing)
- Android SDK / Xcode (for device testing)

### Installation

```bash
# Install root dependencies
npm install

# Install API dependencies
npm install -w @iitj1/api

# Install mobile dependencies
npm install -w @iitj1/mobile
```

---

## API Testing

### Running API Tests

```bash
# Run all API tests
npm run test:api

# Run specific test file
npm run test -w @iitj1/api -- src/tests/health.test.ts

# Run tests with coverage
npm run test:api -- --coverage

# Run tests in watch mode
npm run test:api -- --watch

# Run tests matching pattern
npm run test:api -- --testNamePattern="Authentication"
```

### API Test Coverage

Current test files:
- `src/tests/health.test.ts` - Health check & docs endpoints
- `src/tests/parsers.test.ts` - Data parser functions
- `src/tests/authentication.test.ts` - Admin auth flows
- `src/tests/notices.test.ts` - Notices API & admin endpoints

### API Test Matrix

| Feature | Test File | Test Count | Coverage |
|---------|-----------|------------|----------|
| Health | health.test.ts | 2 | 100% |
| Parsers | parsers.test.ts | 3+ | 100% |
| Auth | authentication.test.ts | 8+ | 80% |
| Notices | notices.test.ts | 12+ | 70% |
| Total | | 25+ | 75% |

### Running Tests Against Different Environments

```bash
# Local development
NODE_ENV=development npm run test:api

# Against local MongoDB
MONGODB_URI=mongodb://localhost:27017/iitj1-test npm run test:api

# Against remote MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/iitj1-test npm run test:api

# Test database
NODE_ENV=test npm run test:api
```

---

## Mobile Testing

### Detox E2E Tests (iOS/Android)

```bash
# Build Detox test app (iOS)
detox build-framework-cache
detox build-framework ios.sim.release --recordLogs all

# Build app for testing
cd apps/mobile
detox build-framework app.debug.ios.sim

# Run Detox tests
detox test e2e --cleanup --configuration ios.sim.release

# Android
detox test e2e --cleanup --configuration android.emu.release
```

### Jest Component Tests

```bash
# Run mobile unit tests
npm run test -w @iitj1/mobile

# Run with coverage
npm run test -w @iitj1/mobile -- --coverage

# Run specific component tests
npm run test -w @iitj1/mobile -- --testNamePattern="Home"
```

### Manual Testing Checklist

#### Home Dashboard
- [ ] App launches and displays dashboard
- [ ] All tiles render correctly
- [ ] Pull-to-refresh works
- [ ] Navigation to each feature works
- [ ] Loading state displays during data fetch

#### Notices
- [ ] List displays with correct pagination
- [ ] Filtering by category works
- [ ] Tap notice shows detail view
- [ ] Expired notices handled
- [ ] Empty state shows when no notices

#### Mess Menu
- [ ] Current week displays
- [ ] Veg/non-veg toggle works
- [ ] Week navigation works
- [ ] QR code displays in full screen
- [ ] Screen capture is blocked on QR

#### Timetable
- [ ] Add class form validation works
- [ ] Classes persist across app restarts
- [ ] Edit/delete works
- [ ] Time conflict detection works

#### Settings
- [ ] Dark/light theme toggle
- [ ] Theme persists on restart
- [ ] Notifications toggle works
- [ ] Clear cache works without crash

#### Offline Mode
- [ ] Data displays when offline
- [ ] Queued requests send on reconnect
- [ ] No data loss during offline operation

---

## Admin Dashboard Testing

### Admin API Tests

```bash
# Run admin authentication tests
npm run test:api -- --testNamePattern="Admin Authentication"

# Run admin CRUD tests
npm run test:api -- --testNamePattern="Admin.*Management"

# Test admin endpoints
curl -X GET http://localhost:6002/api/v1/admin/me \
  -H "Authorization: Bearer <token>"
```

### Admin Routes Coverage Matrix

| Route | Method | Auth | Tests | Status |
|-------|--------|------|-------|--------|
| /admin/auth/login | POST | No | ✅ | Complete |
| /admin/auth/refresh | POST | No | ✅ | Complete |
| /admin/me | GET | Yes | ✅ | Complete |
| /admin/notices | CRUD | Yes | ✅ | Partial |
| /admin/menu | CRUD | Yes | ⏳ | To Do |
| /admin/transport | CRUD | Yes | ⏳ | To Do |
| /admin/calendar | CRUD | Yes | ⏳ | To Do |
| /admin/portals | CRUD | Yes | ⏳ | To Do |
| /admin/push | POST | Yes | ⏳ | To Do |
| /admin/admins | CRUD | Yes | ⏳ | To Do |

---

## Security Testing

### OWASP Vulnerability Scan

```bash
# Install OWASP ZAP (Docker)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:6002/api/v1/docs

# Or using npm security audit
npm audit

# Check for hardcoded secrets
grep -r "password\|secret\|key\|token" apps/api/src --exclude-dir=node_modules | grep -v ".test.ts"
```

### Security Test Checklist

- [ ] XSS payload in notice body filtered
- [ ] SQL injection in search params handled
- [ ] Rate limiting blocks 121st request/min
- [ ] JWT token cannot be forged
- [ ] Admin routes require authentication
- [ ] CORS only allows expected origins
- [ ] No sensitive data in logs
- [ ] Password hashed with bcrypt (rounds=12)
- [ ] HTTPS enforced in production
- [ ] Certificate pinning validated

---

## Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 1000 http://localhost:6002/api/v1/notices

# Run spike test
artillery run spike.yml

# Run endurance test
artillery run endurance.yml
```

### Load Test Configuration (spike.yml)

```yaml
config:
  target: "http://localhost:6002"
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 60
      arrivalRate: 100
    - duration: 60
      arrivalRate: 10
  processor: "./loadtest-processor.js"

scenarios:
  - name: "Spike Test"
    flow:
      - get:
          url: "/api/v1/notices"
      - get:
          url: "/api/v1/menu"
      - get:
          url: "/api/v1/transport"
```

### Performance Benchmarks

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Health check response | <100ms | ? | ⏳ Measure |
| Notices list (20 items) | <500ms | ? | ⏳ Measure |
| Menu response | <300ms | ? | ⏳ Measure |
| Search response (100 items) | <1000ms | ? | ⏳ Measure |
| App cold start | <3s | ? | ⏳ Measure |
| Screen navigation | <500ms | ? | ⏳ Measure |

---

## Accessibility Testing

### Mobile Accessibility

#### iOS (VoiceOver)

```
1. Settings → Accessibility → VoiceOver → On
2. Use two-finger tap-and-swipe to navigate
3. Check all interactive elements are labeled
4. Verify screen reader announces all content
```

#### Android (TalkBack)

```
1. Settings → Accessibility → TalkBack → On
2. Use two-finger tap-and-hold for context menu
3. Check all buttons have accessibility labels
4. Verify dynamic content announced
```

### Web Accessibility (axe)

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Run accessibility audit
npm run test:a11y

# Generate HTML report
npm run test:a11y -- --format html
```

### Accessibility Checklist

- [ ] Color contrast ≥4.5:1 for text
- [ ] Touch targets ≥48x48pt
- [ ] Focus indicators visible
- [ ] All buttons have labels
- [ ] Screen reader announces dynamic updates
- [ ] No flashing/strobing (>3Hz)
- [ ] Support text scaling 200%
- [ ] Keyboard navigation works

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: QA Tests
on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:api -- --coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
# Install husky
npm install husky --save-dev

# Setup pre-commit hook
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test:api"

# Setup pre-push hook
npx husky add .husky/pre-push "npm run typecheck && npm run test:api"
```

---

## Test Coverage Reports

### Current Coverage

```
IITJ One API Coverage:
─────────────────────
Statements   : 45.2%
Branches     : 38.5%
Functions    : 42.1%
Lines        : 46.3%
```

### View Coverage Report

```bash
# Generate coverage
npm run test:api -- --coverage

# Open HTML report
open coverage/index.html

# Generate LCOV format
npm run test:api -- --coverage --coverageReporters=lcov
```

---

## Debugging Tests

### Debug Mode

```bash
# Run tests with debugging
node --inspect-brk ./node_modules/.bin/jest --runInBand

# In Chrome: chrome://inspect
```

### Log Output

```bash
# Enable debug logging
DEBUG=* npm run test:api

# Enable specific logger
LOG_LEVEL=debug npm run test:api
```

### Database Debugging

```bash
# Connect to MongoDB and inspect test data
mongosh mongodb://localhost:27017/iitj1-test

# View notices collection
db.notices.find().pretty()

# View admin users
db.admins.find().pretty()

# Clear test data
db.dropDatabase()
```

---

## Test Data Setup

### Seed Test Database

```bash
# Create initial test data
npm run seed -w @iitj1/api

# Seed specific campus
CAMPUS_ID=iitj npm run seed -w @iitj1/api
```

### Manual Test Data Creation

```bash
# Create admin user
curl -X POST http://localhost:6002/api/v1/admin/admins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "email": "test@iitjone.app",
    "password": "testpass123",
    "name": "Test Admin",
    "role": "admin"
  }'

# Create notice
curl -X POST http://localhost:6002/api/v1/admin/notices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "campusId": "iitj",
    "title": "Test Notice",
    "body": "Test content",
    "category": "academic",
    "startDate": "2026-07-16T00:00:00Z",
    "expiryDate": "2026-08-16T00:00:00Z"
  }'
```

---

## Reporting Issues

### Bug Report Template

```markdown
## [API/Mobile/Admin] Title of Issue

### Environment
- App Version: 1.0.0
- Platform: iOS 15.2 / Android 12 / Web Chrome
- API Endpoint: /api/v1/notices

### Steps to Reproduce
1. First step
2. Second step
3. Expected behavior

### Actual Behavior
Description of what went wrong

### Logs
```
error logs here
```

### Screenshots/Videos
[Attach if applicable]
```

---

## Resources

- [IITJ One QA Report](./QA_AUTOMATION_REPORT.md)
- [API Documentation](http://localhost:6002/api/v1/docs)
- [OpenAPI Spec](http://localhost:6002/api/v1/openapi.json)
- [Jest Docs](https://jestjs.io/)
- [Detox Docs](https://wix.github.io/Detox/)
- [Artillery Docs](https://artillery.io/)

---

## Support

For questions or issues with testing:
1. Check [QA_AUTOMATION_REPORT.md](./QA_AUTOMATION_REPORT.md)
2. Review test files for examples
3. Check CI/CD logs for failures
4. Ask in team Slack #qa-automation

---

**Last Updated:** 2026-07-16  
**Test Framework Version:** Jest 29.5 + Detox 20.13 + Node Test

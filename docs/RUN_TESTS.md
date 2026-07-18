# IITJ One - Quick Test Execution Guide

## 🚀 Run Tests in 5 Minutes

### Step 1: Start MongoDB (Choose One)

**Option A - Local MongoDB:**
```bash
mongod
# Keep terminal open
```

**Option B - Docker (Recommended):**
```bash
docker run -d -p 27017:27017 --name iitj-mongo mongo:6
```

**Option C - MongoDB Atlas (Cloud):**
```bash
export MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/iitj1-test
```

### Step 2: Set Environment Variables

```bash
# Windows PowerShell
$env:NODE_ENV = "test"
$env:MONGODB_URI = "mongodb://localhost:27017/iitj1-test"
$env:JWT_SECRET = "test-secret-min-32-characters-long"
$env:API_BASE_URL = "http://localhost:6002"

# OR macOS/Linux bash
export NODE_ENV=test
export MONGODB_URI=mongodb://localhost:27017/iitj1-test
export JWT_SECRET=test-secret-min-32-characters-long
export API_BASE_URL=http://localhost:6002
```

### Step 3: Seed Test Data

```bash
npm run seed -w @iitj1/api
# Output: Seeded X documents
```

### Step 4: Start API Server (New Terminal)

```bash
npm run dev:api
# Listening on http://localhost:6002/api/v1
```

### Step 5: Run Tests (Another Terminal)

```bash
npm run test:api
```

---

## 📊 Expected Output

```
TAP version 13
# Health Check Endpoint
ok 1 - should return 200 OK
ok 2 - should include status property
ok 3 - should include version
# API Documentation Endpoints  
ok 4 - GET /docs returns HTML page
ok 5 - GET /openapi.json returns valid OpenAPI spec
# Admin Authentication
ok 6 - POST /auth/login with valid credentials returns tokens
ok 7 - POST /auth/login with wrong password returns 401
ok 8 - POST /auth/login with invalid email format returns 400
ok 9 - POST /auth/refresh with valid token returns new token
ok 10 - POST /auth/refresh with invalid token returns 401
ok 11 - GET /me without token returns 401
ok 12 - GET /me with valid token returns admin info
# Rate Limiting
ok 13 - exceeds admin login rate limit after 5 attempts
# Notices API
ok 14 - GET /notices returns list with pagination
ok 15 - GET /notices with default pagination returns 20 items max
ok 16 - GET /notices?page=0 returns 400 (invalid page)
...
ok 25 - notice body with script tag is sanitized

1..25 tests passed
```

---

## 🎯 Quick Commands Reference

| Task | Command |
|------|---------|
| Run all API tests | `npm run test:api` |
| Run parser tests only | `npm run test:api -- src/tests/parsers.test.ts` |
| Run auth tests | `npm run test:api -- src/tests/authentication.test.ts` |
| Run notices tests | `npm run test:api -- src/tests/notices.test.ts` |
| Run with coverage | `npm run test:api -- --coverage` |
| Run in watch mode | `npm run test:api -- --watch` |
| View test files | `ls apps/api/src/tests/*.test.ts` |

---

## ✅ Success Criteria

All tests PASS when:
- ✅ MongoDB is running
- ✅ API server is running on port 6002
- ✅ Test data is seeded
- ✅ Environment variables are set
- ✅ 25+ tests execute with status "ok"

---

## ❌ Troubleshooting

### Error: "Connection refused localhost:6002"
```bash
# Make sure API is running in another terminal
npm run dev:api
```

### Error: "MongoServerError: connect ECONNREFUSED"
```bash
# Start MongoDB
# Windows: mongod
# Docker: docker run -d -p 27017:27017 mongo:6
```

### Error: "Invalid login credentials"
```bash
# Seed test data
npm run seed -w @iitj1/api
```

### Error: "Port 6002 already in use"
```bash
# Kill existing process
# Windows: netstat -ano | findstr :6002, then taskkill /PID {pid}
# Mac/Linux: lsof -ti:6002 | xargs kill -9
```

---

## 📈 Mobile E2E Tests

```bash
cd apps/mobile

# Build test app
detox build-framework-cache
detox build-framework app.debug.ios.sim

# Run E2E tests
detox test e2e --configuration ios.sim.release

# Expected: 30+ E2E tests pass
```

---

## 📊 Test Coverage

```
Created Test Files:
├── health.test.ts (2 tests)
├── authentication.test.ts (8 tests)
├── notices.test.ts (12+ tests)
├── parsers.test.ts (3 tests - existing)
└── home.e2e.ts (30+ tests)

Total: 67+ comprehensive tests
```

---

## 🔗 Related Documentation

- Full QA Report: [QA_AUTOMATION_REPORT.md](./QA_AUTOMATION_REPORT.md)
- Testing Guide: [QA_TESTING_GUIDE.md](./QA_TESTING_GUIDE.md)
- Test Results: See artifact in Claude Code

---

## ⏱️ Timing

- Setup: 5 minutes
- Test execution: 30-60 seconds
- Full CI/CD run: 2-3 minutes

---

**Ready to test? Start with Step 1 above!** ✨

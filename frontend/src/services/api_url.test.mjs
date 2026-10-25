// ==============================================================================
// ReValue API URL Construction Unit Test Suite
// Verifies URL resolution across local dev, Render production, and trailing slash variants.
// ==============================================================================

import assert from 'node:assert';

function resolveApiBaseUrl(rawInput, isProd = false) {
  const envVal = rawInput?.trim();

  if (!envVal) {
    if (isProd) {
      return 'https://revalue-api-qk4m.onrender.com/api/v1';
    }
    return '/api/v1';
  }

  const trimmed = envVal.replace(/\/+$/, '');

  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
}

function buildApiUrl(endpoint, base) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

function resolveMediaUrl(path, base) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const root = base.replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${root}${cleanPath}`;
}

console.log('Running ReValue API URL Construction Tests...');

// Test 1: Empty input in local dev falls back to relative /api/v1 for Vite proxy
assert.strictEqual(resolveApiBaseUrl('', false), '/api/v1', 'Test 1 Failed');
assert.strictEqual(resolveApiBaseUrl(undefined, false), '/api/v1', 'Test 1b Failed');

// Test 2: Standard production Render domain
assert.strictEqual(
  resolveApiBaseUrl('https://revalue-api-qk4m.onrender.com'),
  'https://revalue-api-qk4m.onrender.com/api/v1',
  'Test 2 Failed'
);

// Test 3: Domain with trailing slash
assert.strictEqual(
  resolveApiBaseUrl('https://revalue-api-qk4m.onrender.com/'),
  'https://revalue-api-qk4m.onrender.com/api/v1',
  'Test 3 Failed'
);

// Test 4: Domain already containing /api/v1 does not duplicate
assert.strictEqual(
  resolveApiBaseUrl('https://revalue-api-qk4m.onrender.com/api/v1'),
  'https://revalue-api-qk4m.onrender.com/api/v1',
  'Test 4 Failed'
);

// Test 5: Domain already containing /api appends /v1
assert.strictEqual(
  resolveApiBaseUrl('https://revalue-api-qk4m.onrender.com/api'),
  'https://revalue-api-qk4m.onrender.com/api/v1',
  'Test 5 Failed'
);

// Test 6: Production fallback when env is missing
assert.strictEqual(
  resolveApiBaseUrl('', true),
  'https://revalue-api-qk4m.onrender.com/api/v1',
  'Test 6 Failed'
);

// Test 7: Endpoint construction for authentication
const prodBase = resolveApiBaseUrl('https://revalue-api-qk4m.onrender.com');
assert.strictEqual(
  buildApiUrl('/auth/login', prodBase),
  'https://revalue-api-qk4m.onrender.com/api/v1/auth/login',
  'Test 7 Failed'
);
assert.strictEqual(
  buildApiUrl('auth/login', prodBase),
  'https://revalue-api-qk4m.onrender.com/api/v1/auth/login',
  'Test 7b Failed'
);
assert.strictEqual(
  buildApiUrl('/auth/register', prodBase),
  'https://revalue-api-qk4m.onrender.com/api/v1/auth/register',
  'Test 8 Failed'
);
assert.strictEqual(
  buildApiUrl('/auth/me', prodBase),
  'https://revalue-api-qk4m.onrender.com/api/v1/auth/me',
  'Test 9 Failed'
);

// Test 8: Media URL resolution
assert.strictEqual(
  resolveMediaUrl('/uploads/products/phone.jpg', prodBase),
  'https://revalue-api-qk4m.onrender.com/uploads/products/phone.jpg',
  'Test 10 Failed'
);
assert.strictEqual(
  resolveMediaUrl('https://images.unsplash.com/phone.jpg', prodBase),
  'https://images.unsplash.com/phone.jpg',
  'Test 11 Failed'
);

console.log('✅ ALL 11 API URL Resolution Tests Passed Successfully!');

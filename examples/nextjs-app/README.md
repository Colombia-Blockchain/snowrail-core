# SnowRail Next.js Starter Template

A complete Next.js application demonstrating SnowRail integration.

## Features

- ✅ URL validation with SENTINEL
- ✅ Trust score visualization
- ✅ Payment intent creation
- ✅ API routes for backend integration
- ✅ TypeScript support
- ✅ Tailwind CSS styling

## Quick Start

```bash
# Install dependencies
cd examples/nextjs-app
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev

# Open http://localhost:3001
```

## Project Structure

```
nextjs-app/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page with validator
│   └── api/
│       └── validate/
│           └── route.ts    # SENTINEL API route
├── components/
│   ├── PaymentValidator.tsx  # Main validator component
│   └── TrustScore.tsx         # Trust score display
├── lib/
│   └── sentinel.ts         # Sentinel client
├── .env.example            # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### 1. Install Dependencies

```bash
npm install @snowrail/sentinel
```

### 2. Create API Route

See [app/api/validate/route.ts](./app/api/validate/route.ts) for the validation endpoint.

### 3. Use in Components

```typescript
import { useState } from 'react';

export default function ValidatorPage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);

  const validate = async () => {
    const response = await fetch('/api/validate', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    setResult(data);
  };

  return (
    <div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://api.example.com"
      />
      <button onClick={validate}>Validate</button>

      {result && (
        <div>
          <p>Trust Score: {result.trustScore}/100</p>
          <p>Can Pay: {result.canPay ? '✓' : '✗'}</p>
        </div>
      )}
    </div>
  );
}
```

## Environment Variables

Create `.env.local`:

```bash
# SnowRail Configuration
SENTINEL_MIN_SCORE=60
SENTINEL_CACHE=true

# Backend API (optional)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Key Files

### API Route ([app/api/validate/route.ts](./app/api/validate/route.ts))

Handles validation requests:

```typescript
import { createSentinel } from '@snowrail/sentinel';
import { NextResponse } from 'next/server';

const sentinel = createSentinel();

export async function POST(request: Request) {
  const { url } = await request.json();
  const result = await sentinel.validate({ url });
  return NextResponse.json(result);
}
```

### Validator Component ([components/PaymentValidator.tsx](./components/PaymentValidator.tsx))

Main UI component for URL validation.

### Trust Score Component ([components/TrustScore.tsx](./components/TrustScore.tsx))

Displays trust score with progress bar.

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build
docker build -t snowrail-nextjs .

# Run
docker run -p 3001:3001 snowrail-nextjs
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [SnowRail Integration Guide](../../docs/guides/INTEGRATION.md)
- [API Reference](../../docs/api/ENDPOINTS.md)

## License

MIT

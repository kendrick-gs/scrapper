# Shopify Product Scraper

A comprehensive Shopify product scraping and management application built with Next.js, featuring advanced caching with Redis support.

## Features

- 🛍️ **Shopify Product Scraping**: Import products and collections from Shopify stores
- 📊 **Advanced Data Management**: Sortable tables, filtering, and search functionality
- 🖼️ **Image Caching**: Optimized image loading with Redis-backed caching
- 📝 **HTML Editor**: Rich text editing for product descriptions
- 📋 **Custom Lists**: Create and manage product lists
- 🔄 **Real-time Cache**: Redis-powered caching for improved performance
- 📱 **Responsive Design**: Mobile-first responsive interface

## Prerequisites

- Node.js 18+
- Redis (optional, for enhanced caching)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scrapper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`

## Redis Setup (Optional but Recommended)

For enhanced caching performance, set up Redis:

### Using Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Using Homebrew (macOS)
```bash
brew install redis
brew services start redis
```

### Environment Configuration
Update your `.env.local` file:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Getting Started

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── console/           # Main dashboard
│   ├── lists/             # List management
│   ├── stores/            # Store management
│   └── start/             # Onboarding
├── components/            # Reusable UI components
├── lib/                   # Utilities and business logic
│   ├── redis-cache.ts     # Redis cache service
│   ├── redis-storage.ts   # Redis-enhanced storage
│   └── enhanced-redis-cache.ts # Cache implementation
├── store/                 # State management
└── types/                 # TypeScript definitions
```

## Caching Architecture

The application uses a hybrid caching strategy:

- **Redis Cache**: Server-side caching for API responses and data
- **Local Storage**: Client-side fallback for browser-based caching
- **Image Cache**: Specialized caching for product images
- **Automatic Fallback**: Graceful degradation when Redis is unavailable

## API Routes

- `GET /api/console-data` - Get user's scraped data
- `POST /api/stores` - Add new store
- `GET /api/lists` - Get user's lists
- `POST /api/lists` - Create new list
- `GET /api/presets` - Get user's presets

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm run start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

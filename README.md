# ApexData 🏎️

Modern and elegant Formula 1 data platform built with Next.js 15, React 19, and TypeScript.

## Features

- 📊 Historical F1 data from 1950 to present
- 🔴 Real-time race telemetry (2023+)
- 🏁 Driver and team statistics
- 📈 Advanced data visualization
- ⚡ Blazing fast performance with Next.js
- 🎨 Elegant UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion + GSAP
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Charts**: Recharts
- **APIs**: Jolpica F1, OpenF1

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd apexdata
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Setup environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Configure your database URL in `.env`

5. Run database migrations (coming soon):
\`\`\`bash
npm run db:migrate
\`\`\`

6. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
apexdata/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/             # Utility functions and configurations
│   ├── services/        # API integration services
│   └── types/           # TypeScript type definitions
├── prisma/              # Database schema and migrations
├── public/              # Static assets
└── ...config files
\`\`\`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## Development Phases

- ✅ **FASE 0**: Planning and Setup (In Progress)
- ⏳ **FASE 1**: Backend - API and Database
- ⏳ **FASE 2**: Frontend - Base Structure and Components
- ⏳ **FASE 3**: Frontend - Main Pages
- ⏳ **FASE 4**: Optimization and Visual Improvements
- ⏳ **FASE 5**: Advanced Features
- ⏳ **FASE 6**: Testing and QA
- ⏳ **FASE 7**: Deployment and Documentation

## API Data Sources

- **Jolpica F1**: Historical F1 data (1950-2025)
- **OpenF1**: Real-time telemetry and advanced metrics (2023+)

See [API_RESEARCH.md](./API_RESEARCH.md) for detailed API documentation.

## License

MIT

## Contributing

This is a personal learning project. Contributions are welcome!

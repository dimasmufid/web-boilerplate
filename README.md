# Next.js Boilerplate

A modern, production-ready Next.js boilerplate template featuring authentication, database integration, and a beautiful UI component library.

## 🚀 Tech Stack

- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM for PostgreSQL
- **[Better Auth](https://www.better-auth.com/)** - Modern authentication library
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible component library
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

## ✨ Features

- 🔐 **Authentication** - Email/password authentication with Better Auth
- 👤 **Admin Panel** - Built-in admin functionality with user management
- 🎨 **UI Components** - Pre-configured shadcn/ui components (New York style)
- 🌓 **Dark Mode** - Theme switching with next-themes
- 📊 **Data Tables** - Advanced table components with sorting, filtering, and pagination
- 📱 **Responsive Design** - Mobile-first responsive layouts
- 🐳 **Docker Support** - Production-ready Dockerfile included
- 🗄️ **Database Migrations** - Drizzle migrations for schema management

## 📋 Prerequisites

- [Bun](https://bun.sh/) (v1.2.0 or higher)
- PostgreSQL database (local or hosted)
- Node.js (for Docker builds)

## 🏁 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd boilerplate
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret key for Better Auth (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Your application URL (e.g., `http://localhost:3000`)

### 4. Set up the database

Run database migrations:

```bash
bunx drizzle-kit push
```

Or generate migrations:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

You can also use `npx drizzle-kit` if you prefer npm.

### 5. Run the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
boilerplate/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Protected app routes
│   │   │   ├── admin/         # Admin panel
│   │   │   └── dashboard/     # Dashboard page
│   │   ├── (auth)/            # Auth routes
│   │   │   ├── sign-in/       # Sign in page
│   │   │   └── sign-up/       # Sign up page
│   │   └── api/               # API routes
│   │       └── auth/          # Better Auth API routes
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   └── ...               # Custom components
│   ├── db/                   # Database schema and config
│   │   ├── auth-schema.ts    # Better Auth schema
│   │   └── index.ts          # Drizzle database instance
│   ├── lib/                  # Utilities and helpers
│   │   ├── auth.ts           # Better Auth server config
│   │   ├── auth-client.ts    # Better Auth client config
│   │   └── utils.ts          # Utility functions
│   └── hooks/                # Custom React hooks
├── drizzle/                  # Database migrations
├── public/                   # Static assets
├── Dockerfile               # Docker configuration
└── drizzle.config.ts        # Drizzle ORM configuration
```

## 🛠️ Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## 🐳 Docker Deployment

Build and run with Docker:

```bash
# Build the image
docker build -t boilerplate .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL=your_database_url \
  -e BETTER_AUTH_SECRET=your_secret \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  boilerplate
```

## 🔧 Configuration

### Database

The project uses Drizzle ORM with PostgreSQL. Configure your database connection in `drizzle.config.ts` and set the `DATABASE_URL` environment variable.

### Authentication

Better Auth is configured in `src/lib/auth.ts`. The admin plugin is enabled by default. Customize authentication providers and settings as needed.

### UI Components

shadcn/ui components are configured in `components.json`. Add new components using:

```bash
npx shadcn@latest add [component-name]
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Bun Documentation](https://bun.sh/docs)

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

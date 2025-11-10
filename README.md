# Infusion Backend

A Node.js Express server built with **TypeScript**, MongoDB, Redis, and comprehensive middleware setup.

## Features

- 🚀 Express.js server with proper middleware setup
- 📝 Morgan HTTP request logging
- 🔄 CORS enabled
- 🏗️ MVC architecture with organized file structure
- 🛣️ RESTful API routes
- 🔧 Environment configuration
- 📦 Modular design with separate controllers and utilities
- 🗄️ MongoDB integration with Mongoose
- 🔴 Redis caching and session management
- 🛡️ Global error handling middleware
- 📄 Static file serving
- 🔄 Graceful shutdown handling
- 💅 Prettier code formatting
- 🏷️ **Full TypeScript support with strict type checking**

## Project Structure

```
infusion-backend/
├── src/
│   ├── controllers/           # Controller files (empty - ready for implementation)
│   ├── lib/
│   │   ├── customErrors.ts    # Custom error definitions
│   │   ├── db.ts              # MongoDB connection utilities
│   │   ├── redis.ts           # Redis client and connection
│   │   └── responseUtils.ts   # Response formatting utilities
│   ├── middleware/
│   │   └── errorHandler.ts    # Global error handling middleware
│   ├── models/               # Model files (empty - ready for implementation)
│   ├── routes/
│   │   └── index.ts          # Main route handler
│   ├── types/
│   │   └── environment.d.ts  # TypeScript environment definitions
│   └── index.ts              # Main application entry point
├── dist/                     # Compiled JavaScript output
├── .env                      # Environment variables (not in repo)
├── .env.example              # Environment variables template
├── .gitignore
├── .prettierignore           # Prettier ignore rules
├── .prettierrc.json          # Prettier configuration
├── package.json
├── package-lock.json
├── tsconfig.json             # TypeScript configuration
└── README.md
```

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   - `MONGO_URI` - MongoDB connection string
   - `REDIS_DB_HOST` - Redis server host
   - `REDIS_DB_PORT` - Redis server port
   - `REDIS_DB_PASS` - Redis server password
   - `PORT` - Server port (defaults to 3000)

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server (requires build first)
- `npm run dev` - Start the development server with hot-reloading
- `npm run dev:watch` - Start development server with file watching
- `npm run lint` - Format code with Prettier
- `npm run lint:check` - Check code formatting
- `npm run lint:fix` - Fix code formatting issues

## Development Workflow

### Development Mode
```bash
npm run dev
```
This uses `tsx` to run TypeScript directly with hot-reloading.

### Production Build
```bash
npm run build
npm start
```
This compiles TypeScript to JavaScript and runs the compiled code.

## API Endpoints

### Health Check

- `GET /` - Server health check and status

### API Base

- `GET /api` - API information (currently minimal setup)

*Note: Additional endpoints can be added to the routes/index.ts file*

## Dependencies

### Production Dependencies
- **express** - Web application framework
- **mongoose** - MongoDB object modeling
- **redis** - Redis client for caching
- **cors** - Cross-origin resource sharing
- **morgan** - HTTP request logging
- **dotenv** - Environment variable loading
- **axios** - HTTP client

### Development Dependencies
- **typescript** - TypeScript compiler
- **tsx** - TypeScript execution engine
- **@types/express** - TypeScript definitions for Express
- **@types/cors** - TypeScript definitions for CORS
- **@types/morgan** - TypeScript definitions for Morgan
- **@types/node** - TypeScript definitions for Node.js
- **nodemon** - Development server with auto-reload
- **prettier** - Code formatting

## TypeScript Configuration

The project uses strict TypeScript configuration with:
- **Target**: ES2022
- **Module**: ESNext with Node.js resolution
- **Strict mode**: Enabled with all strict checks
- **Source maps**: Generated for debugging
- **Declaration files**: Generated for library usage

### Type Safety Features
- Strict null checks
- No implicit any
- Exact optional property types
- No unchecked indexed access
- Environment variable type definitions

## Usage

Start the server:

```bash
npm run build
npm start
```

The server will be running on `http://localhost:3000`

## Development

For development with auto-restart:

```bash
npm run dev
```

## Configuration

The application uses environment variables for configuration. Create a `.env` file based on `.env.example`:

### Required Environment Variables

- `MONGO_URI` - MongoDB connection string
- `REDIS_DB_HOST` - Redis server hostname
- `REDIS_DB_PORT` - Redis server port (default: 16061)
- `REDIS_DB_PASS` - Redis server password

### Optional Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Architecture

The application follows a modular MVC architecture with full TypeScript support:

- **Controllers** - Handle business logic (ready for implementation)
- **Models** - Data models and schemas (ready for implementation)  
- **Routes** - API endpoint definitions with Express types
- **Lib** - Utility functions and external service connections
- **Middleware** - Custom middleware for error handling, authentication, etc.
- **Types** - TypeScript type definitions and interfaces

## Error Handling

The application includes comprehensive error handling with TypeScript support:
- Global error handler middleware with proper typing
- Custom error classes with inheritance
- 404 not found handler
- Structured error responses with type safety

## Database & Caching

- **MongoDB** with Mongoose for data persistence
- **Redis** for caching and session management  
- Graceful connection handling with error recovery
- Type-safe database operations

## TypeScript Migration Benefits

✅ **Type Safety**: Compile-time error checking prevents runtime errors
✅ **Better IntelliSense**: Enhanced autocomplete and code navigation
✅ **Refactoring Support**: Safe renaming and code restructuring
✅ **Documentation**: Self-documenting code with type annotations
✅ **Maintainability**: Easier to maintain and scale the codebase

## License

ISC

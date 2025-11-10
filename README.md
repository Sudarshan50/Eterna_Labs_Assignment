# Infusion Backend

A Node.js Express server with MongoDB, Redis, and comprehensive middleware setup.

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

## Project Structure

```
infusion-backend/
├── src/
│   ├── controllers/           # Controller files (empty - ready for implementation)
│   ├── lib/
│   │   ├── customErrors.js    # Custom error definitions
│   │   ├── db.js              # MongoDB connection utilities
│   │   ├── redis.js           # Redis client and connection
│   │   └── responseUtils.js   # Response formatting utilities
│   ├── middleware/
│   │   └── errorHandler.js    # Global error handling middleware
│   ├── models/               # Model files (empty - ready for implementation)
│   └── routes/
│       └── index.js          # Main route handler
├── .env                      # Environment variables (not in repo)
├── .env.example              # Environment variables template
├── .gitignore
├── .prettierignore           # Prettier ignore rules
├── .prettierrc.json          # Prettier configuration
├── index.js                  # Main application entry point
├── package.json
├── package-lock.json
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

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm run lint` - Format code with Prettier
- `npm run lint:check` - Check code formatting
- `npm run lint:fix` - Fix code formatting issues

## API Endpoints

### Health Check

- `GET /` - Server health check and status

### API Base

- `GET /api` - API information (currently minimal setup)

*Note: Additional endpoints can be added to the routes/index.js file*

## Dependencies

### Production Dependencies
- **express** - Web application framework
- **mongoose** - MongoDB object modeling
- **redis** - Redis client for caching
- **cors** - Cross-origin resource sharing
- **morgan** - HTTP request logging
- **dotenv** - Environment variable loading
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT implementation
- **axios** - HTTP client
- **mqtt** - MQTT client
- **socket.io** - Real-time communication

### Development Dependencies
- **nodemon** - Development server with auto-reload
- **prettier** - Code formatting

## Usage

Start the server:

```bash
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

The application follows a modular MVC architecture:

- **Controllers** - Handle business logic (ready for implementation)
- **Models** - Data models and schemas (ready for implementation)  
- **Routes** - API endpoint definitions
- **Lib** - Utility functions and external service connections
- **Middleware** - Custom middleware for error handling, authentication, etc.

## Error Handling

The application includes comprehensive error handling:
- Global error handler middleware
- Custom error definitions
- 404 not found handler
- Structured error responses

## Database & Caching

- **MongoDB** with Mongoose for data persistence
- **Redis** for caching and session management
- Graceful connection handling with error recovery

## License

ISC

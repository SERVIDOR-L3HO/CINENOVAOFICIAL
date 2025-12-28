# Movie API

## Overview

A simple REST API for serving movie data built with Express.js. The API provides endpoints to retrieve movie information including titles, directors, years, genres, ratings, and external service IDs (IMDB, TMDB). Data is stored in a local JSON file rather than a database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **Express.js 5.x** serves as the web framework
- Standard MVC-like structure with routes, controllers, and data separation
- Entry point is `src/server.js` which imports the app configuration from `src/app.js`

### Directory Structure
```
src/
├── app.js          # Express app configuration and middleware
├── server.js       # Server startup
├── controllers/    # Request handlers
├── routes/         # API route definitions
└── data/           # JSON data storage
```

### Middleware Stack
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging (dev mode)
- **express.json()** - JSON body parsing

### Data Storage
- Uses local JSON file (`src/data/movies.json`) for movie data
- File-based storage using Node.js `fs.promises` for async file operations
- No database currently configured

### API Endpoints
- `GET /api/movies` - Returns all movies
- `GET /api/movies/:id` - Returns a single movie by ID

### Error Handling
- Global error handler middleware returns 500 status with generic error message
- Controller-level try/catch for file read operations

## External Dependencies

### NPM Packages
- **express** (5.2.1) - Web framework
- **cors** (2.8.5) - CORS middleware
- **helmet** (8.1.0) - Security middleware
- **morgan** (1.10.1) - HTTP logging
- **dotenv** (17.2.3) - Environment variable management
- **@types/node** (22.13.11) - Node.js type definitions

### External Service References
Movie data includes references to external services (not actively integrated):
- **IMDB** - Movie IDs stored for reference
- **TMDB** - The Movie Database IDs stored
- **SuperEmbed** - Embed URLs for movie streaming widgets

### Environment Configuration
- Uses `dotenv` for environment variables
- `PORT` defaults to 5000 if not specified
- Server binds to `0.0.0.0` for external accessibility
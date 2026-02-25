# Contributing to CodeCafé

Thank you for your interest in contributing to CodeCafé! We're excited to have you join our mission to make collaborative coding more accessible and seamless.

## Getting Started

### Prerequisites

- **Git**
- **Java JDK 23+** and **Maven**
- **Node.js 18+** and **npm 9+**
- **Redis Server** (or Docker for containerized setup)

### Development Setup

#### Option 1: Docker Setup (Recommended)

```bash
git clone https://github.com/YOUR_USERNAME/codecafe.git
cd codecafe
docker-compose up
```

#### Option 2: Manual Setup

```bash
git clone https://github.com/YOUR_USERNAME/codecafe.git
cd codecafe

# Start Redis
redis-server &

# Server setup
cd server
echo "spring.redis.host=localhost
spring.redis.port=6379" > src/main/resources/application.properties
./mvnw install
./mvnw spring-boot:run &

# Client setup
cd ../client
echo "VITE_BACKEND_URL=http://localhost:8080" > .env
npm install
npm run dev
```

## How to Contribute

1. **Fork the repository** and create a feature branch: `git checkout -b feature/your-feature-name`
2. **Make your changes** following our development guidelines below
3. **Test thoroughly** - especially real-time collaboration with multiple browser windows
4. **Submit a pull request** with a clear description of your changes

## Development Guidelines

### Client (React/TypeScript)

- Use functional components with hooks
- Zustand for global state, local state for component-specific data
- Tailwind CSS for styling
- Maintain TypeScript strict type safety
- Run `npm run lint` and `npm run format` before committing

### Server (Java/Spring Boot)

- Follow standard Java conventions
- Maintain clean separation between controllers, services, and repositories
- Add JavaDoc comments for public methods
- Use proper exception handling

### Commit Messages

Use conventional commits format:

```
feat: add user authentication system
fix: resolve WebSocket connection issues
docs: update API documentation
```

## Testing

```bash
# Client
cd client && npm test

# Server
cd server && ./mvnw test
```

**Manual Testing Checklist:**

- Test real-time collaboration with multiple browser windows
- Verify WebSocket connections work correctly
- Test the integrated terminal and web preview

## Reporting Issues

When reporting bugs or requesting features:

- Provide a clear description
- Include steps to reproduce (for bugs)
- Mention your browser/OS if relevant
- Add screenshots if helpful

## Areas We're Looking For

- **Enhanced Chat Features**
- **Performance Improvements**
- **Accessibility & Mobile Responsiveness**

## Questions?

- Create a GitHub issue with the "question" label
- Check existing documentation in README.md

Thanks for contributing to CodeCafé!

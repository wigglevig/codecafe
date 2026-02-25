FROM node:18-alpine as build

# Declare build-time argument
ARG VITE_BACKEND_URL
# Set it as an environment variable available to the build process
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

WORKDIR /app

# Install Python and build essentials for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package.json and package-lock.json separately to leverage Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"] 
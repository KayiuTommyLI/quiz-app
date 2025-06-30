# Stage 1: Build the React client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node.js server  
FROM node:20-alpine
WORKDIR /app

# Install system dependencies for PDF parsing AND Gemini CLI
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    curl \
    bash

# REMOVE the old curl installation
# RUN curl -L -f -o gemini https://dl.google.com/gemini/gemini-cli-linux-amd64 && \
#     chmod +x gemini && \
#     mv gemini /usr/local/bin/

# ADD the new, correct installation method using npm
RUN npm install -g @google/gemini-cli

# Copy server files and install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server source code
COPY server/ ./

# Copy the built React app to the server's public directory
COPY --from=client-builder /app/client/dist ./public

# Go back to app root to create directories
WORKDIR /app
RUN mkdir -p /app/quizzes && mkdir -p /app/study_materials

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of ALL directories the container needs to access
RUN chown -R nodejs:nodejs /app /app/quizzes /app/study_materials

# Make sure the directories are writable
RUN chmod -R 755 /app/quizzes /app/study_materials

# Switch to non-root user
USER nodejs

# Set working directory to server and start
WORKDIR /app/server
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/test', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the server
CMD ["node", "index.js"]
# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    openssl \
    openssl-dev \
    openssl-libs-static \
    && ln -s /usr/lib/libssl.so.3 /usr/lib/libssl.so.1.1 \
    && ln -s /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.1.1 \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Development stage
FROM base AS development
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS production-build
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --omit=dev
COPY . .
RUN npx prisma generate

# Production stage  
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Install runtime dependencies
RUN apk add --no-cache curl openssl openssl-dev openssl-libs-static && \
    ln -s /usr/lib/libssl.so.3 /usr/lib/libssl.so.1.1 && \
    ln -s /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.1.1 && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy built application
COPY --from=production-build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=production-build --chown=nodejs:nodejs /app/package*.json ./
COPY --from=production-build --chown=nodejs:nodejs /app/prisma ./prisma/
COPY --from=production-build --chown=nodejs:nodejs /app/src ./src/

# Create necessary directories
RUN mkdir -p logs uploads tmp && chown -R nodejs:nodejs logs uploads tmp

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["npm", "start"]
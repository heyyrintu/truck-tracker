# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL 1.1 compatibility for Prisma
RUN apk add --no-cache openssl1.1-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Install OpenSSL 1.1 compatibility and wget for healthcheck
RUN apk add --no-cache openssl1.1-compat wget

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --legacy-peer-deps

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]

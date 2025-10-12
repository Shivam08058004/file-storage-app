# Simplified Dockerfile for Next.js 15 - Build on Host, Run in Container
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy all built files and dependencies from host
COPY --chown=nextjs:nodejs package.json pnpm-lock.yaml* ./
COPY --chown=nextjs:nodejs node_modules ./node_modules
COPY --chown=nextjs:nodejs .next ./.next
COPY --chown=nextjs:nodejs public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/files/stats || exit 1

# Start the application
CMD ["node_modules/.bin/next", "start"]

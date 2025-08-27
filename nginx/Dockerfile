FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /etc/nginx/certs /etc/nginx/conf.d

# Set proper permissions
RUN chown -R nginx:nginx /var/log/nginx /etc/nginx/certs /etc/nginx/conf.d

# Create pid file directory
RUN mkdir -p /var/run && chown -R nginx:nginx /var/run

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
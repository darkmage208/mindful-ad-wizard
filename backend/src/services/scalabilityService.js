import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * Scalability optimization service
 * Provides caching, connection pooling, and performance monitoring
 */

/**
 * Redis-like in-memory cache for development
 * In production, replace with actual Redis
 */
class InMemoryCache {
  constructor(defaultTTL = 300000) { // 5 minutes default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.cleanup();
  }

  set(key, value, ttl = null) {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired items every 5 minutes
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          this.cache.delete(key);
        }
      }
    }, 300000);
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
const cache = new InMemoryCache();

/**
 * Cache wrapper for expensive operations
 */
export const withCache = async (key, fn, ttl = null) => {
  try {
    // Try to get from cache first
    const cached = cache.get(key);
    if (cached !== null) {
      logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    cache.set(key, result, ttl);
    logger.debug(`Cache set for key: ${key}`);

    return result;
  } catch (error) {
    logger.error('Cache operation failed:', { key, error: error.message });
    // Fall back to executing function without cache
    return await fn();
  }
};

/**
 * Invalidate cache by pattern
 */
export const invalidateCache = (pattern) => {
  if (pattern === '*') {
    cache.clear();
    return;
  }

  // Simple pattern matching for keys starting with pattern
  const keys = Array.from(cache.cache.keys());
  keys.forEach(key => {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  });
};

/**
 * Database query optimization with caching
 */
export const optimizedQuery = async (model, operation, args = {}, cacheOptions = {}) => {
  const {
    useCache = true,
    cacheKey = null,
    cacheTTL = 300000, // 5 minutes
    invalidatePatterns = []
  } = cacheOptions;

  if (!useCache) {
    return await prisma[model][operation](args);
  }

  // Generate cache key if not provided
  const key = cacheKey || `${model}:${operation}:${JSON.stringify(args)}`;

  // For write operations, invalidate related cache
  if (['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany'].includes(operation)) {
    // Execute operation
    const result = await prisma[model][operation](args);

    // Invalidate cache patterns
    invalidatePatterns.forEach(pattern => invalidateCache(pattern));
    invalidateCache(`${model}:`); // Invalidate all queries for this model

    return result;
  }

  // For read operations, use cache
  return await withCache(key, async () => {
    return await prisma[model][operation](args);
  }, cacheTTL);
};

/**
 * Batch operations for better performance
 */
export const batchOperations = {
  /**
   * Batch create with chunking
   */
  async createMany(model, data, chunkSize = 100) {
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    const results = [];
    for (const chunk of chunks) {
      const result = await prisma[model].createMany({
        data: chunk,
        skipDuplicates: true,
      });
      results.push(result);
    }

    // Invalidate cache for this model
    invalidateCache(`${model}:`);

    return results;
  },

  /**
   * Batch update with chunking
   */
  async updateMany(model, updates, chunkSize = 50) {
    const results = [];
    const chunks = [];

    for (let i = 0; i < updates.length; i += chunkSize) {
      chunks.push(updates.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(update =>
        prisma[model].update({
          where: { id: update.id },
          data: update.data,
        })
      );

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    // Invalidate cache for this model
    invalidateCache(`${model}:`);

    return results;
  },

  /**
   * Bulk upsert operations
   */
  async upsertMany(model, records, uniqueField = 'id') {
    const results = [];

    for (const record of records) {
      const result = await prisma[model].upsert({
        where: { [uniqueField]: record[uniqueField] },
        update: record,
        create: record,
      });
      results.push(result);
    }

    // Invalidate cache for this model
    invalidateCache(`${model}:`);

    return results;
  },
};

/**
 * Database connection monitoring
 */
class ConnectionMonitor {
  constructor() {
    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      queryTimes: [],
      errors: 0,
    };
    this.startTime = Date.now();
  }

  recordQuery(duration, error = null) {
    this.metrics.totalQueries++;

    if (error) {
      this.metrics.errors++;
      logger.error('Database query error:', error);
    }

    if (duration > 1000) { // Slow query threshold: 1 second
      this.metrics.slowQueries++;
      logger.warn(`Slow query detected: ${duration}ms`);
    }

    this.metrics.queryTimes.push(duration);

    // Keep only last 1000 query times for memory efficiency
    if (this.metrics.queryTimes.length > 1000) {
      this.metrics.queryTimes = this.metrics.queryTimes.slice(-1000);
    }
  }

  getStats() {
    const uptime = Date.now() - this.startTime;
    const avgQueryTime = this.metrics.queryTimes.length > 0
      ? this.metrics.queryTimes.reduce((a, b) => a + b, 0) / this.metrics.queryTimes.length
      : 0;

    return {
      uptime: Math.floor(uptime / 1000), // seconds
      totalQueries: this.metrics.totalQueries,
      slowQueries: this.metrics.slowQueries,
      errorRate: this.metrics.totalQueries > 0
        ? (this.metrics.errors / this.metrics.totalQueries * 100).toFixed(2) + '%'
        : '0%',
      averageQueryTime: Math.round(avgQueryTime) + 'ms',
      cacheSize: cache.size(),
      queriesPerSecond: Math.round(this.metrics.totalQueries / (uptime / 1000)),
    };
  }

  reset() {
    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      queryTimes: [],
      errors: 0,
    };
    this.startTime = Date.now();
  }
}

const monitor = new ConnectionMonitor();

/**
 * Monitored Prisma wrapper
 */
export const monitoredPrismaQuery = async (model, operation, args = {}) => {
  const startTime = Date.now();
  let error = null;

  try {
    const result = await prisma[model][operation](args);
    return result;
  } catch (err) {
    error = err;
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    monitor.recordQuery(duration, error);
  }
};

/**
 * Performance optimization utilities
 */
export const performanceUtils = {
  /**
   * Efficient counting with estimated counts for large tables
   */
  async efficientCount(model, where = {}, useEstimate = true) {
    if (useEstimate) {
      // For large tables, use estimated count from PostgreSQL statistics
      try {
        const tableName = `${model.toLowerCase()}s`; // Simple pluralization
        const result = await prisma.$queryRaw`
          SELECT reltuples::bigint AS estimate
          FROM pg_class
          WHERE relname = ${tableName}
        `;

        if (result.length > 0 && result[0].estimate > 1000) {
          return Number(result[0].estimate);
        }
      } catch (error) {
        logger.warn('Estimated count failed, falling back to exact count');
      }
    }

    return await prisma[model].count({ where });
  },

  /**
   * Cursor-based pagination for large datasets
   */
  async cursorPaginate(model, options = {}) {
    const {
      cursor = null,
      take = 20,
      where = {},
      orderBy = { createdAt: 'desc' },
      include = null,
      select = null,
    } = options;

    const args = {
      take: take + 1, // Take one extra to determine if there are more records
      where,
      orderBy,
      ...(include && { include }),
      ...(select && { select }),
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    };

    const results = await prisma[model].findMany(args);

    const hasNextPage = results.length > take;
    const nodes = hasNextPage ? results.slice(0, -1) : results;
    const nextCursor = hasNextPage ? nodes[nodes.length - 1].id : null;

    return {
      nodes,
      pageInfo: {
        hasNextPage,
        nextCursor,
      },
    };
  },

  /**
   * Parallel query execution
   */
  async parallel(queries) {
    const startTime = Date.now();

    try {
      const results = await Promise.all(queries.map(query => query()));

      logger.debug(`Parallel queries completed in ${Date.now() - startTime}ms`);
      return results;
    } catch (error) {
      logger.error('Parallel query execution failed:', error);
      throw error;
    }
  },
};

/**
 * Health check for scalability metrics
 */
export const getScalabilityMetrics = () => {
  const dbStats = monitor.getStats();

  return {
    database: dbStats,
    cache: {
      size: cache.size(),
      hitRate: 'N/A', // Would need more sophisticated tracking
    },
    memory: {
      used: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    uptime: Math.floor(process.uptime()),
  };
};

/**
 * Initialize scalability optimizations
 */
export const initializeScalability = () => {
  // Set up periodic metrics logging
  setInterval(() => {
    const metrics = getScalabilityMetrics();
    logger.info('Scalability metrics:', metrics);

    // Alert on high error rate
    if (parseFloat(metrics.database.errorRate) > 5) {
      logger.warn('High database error rate detected:', metrics.database.errorRate);
    }

    // Alert on slow average query time
    if (parseInt(metrics.database.averageQueryTime) > 500) {
      logger.warn('Slow average query time detected:', metrics.database.averageQueryTime);
    }
  }, 300000); // Every 5 minutes

  logger.info('Scalability service initialized');
};

/**
 * Export cache instance for direct access
 */
export { cache };

/**
 * Export monitor instance for direct access
 */
export { monitor };
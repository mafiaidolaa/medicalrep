// @ts-nocheck
import { supabase } from '../supabase';

// Types for performance and search
export interface PerformanceSettings {
  id: string;
  cache_enabled: boolean;
  cache_ttl_minutes: number;
  pagination_size: number;
  search_debounce_ms: number;
  lazy_loading_enabled: boolean;
  image_compression_enabled: boolean;
  prefetch_enabled: boolean;
  analytics_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CacheEntry {
  id: string;
  cache_key: string;
  data: any;
  expires_at: string;
  created_at: string;
  access_count: number;
  last_accessed: string;
}

export interface SearchIndex {
  id: string;
  entity_type: 'expense_request' | 'expense_item' | 'user' | 'category';
  entity_id: string;
  searchable_text: string;
  keywords: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SearchQuery {
  query: string;
  filters: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  score: number;
  highlights: string[];
}

export interface PerformanceMetrics {
  id: string;
  operation_type: string;
  duration_ms: number;
  cache_hit: boolean;
  error_occurred: boolean;
  user_id?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

class PerformanceService {
  private cache = new Map<string, { data: any; expires: number; hits: number }>();
  private searchDebounce = new Map<string, NodeJS.Timeout>();

  // Get performance settings
  async getPerformanceSettings(): Promise<PerformanceSettings | null> {
    try {
      const { data, error } = await supabase
        .from('performance_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return await this.createDefaultSettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get performance settings failed:', error);
      return null;
    }
  }

  // Create default performance settings
  async createDefaultSettings(): Promise<PerformanceSettings | null> {
    try {
      const defaultSettings = {
        cache_enabled: true,
        cache_ttl_minutes: 15,
        pagination_size: 25,
        search_debounce_ms: 300,
        lazy_loading_enabled: true,
        image_compression_enabled: true,
        prefetch_enabled: true,
        analytics_enabled: true,
      };

      const { data, error } = await supabase
        .from('performance_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default performance settings failed:', error);
      return null;
    }
  }

  // Cache management
  async getFromCache(key: string): Promise<any | null> {
    const settings = await this.getPerformanceSettings();
    if (!settings?.cache_enabled) return null;

    // Check in-memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expires) {
      memoryEntry.hits++;
      return memoryEntry.data;
    }

    // Check database cache
    try {
      const { data, error } = await supabase
        .from('cache_entries')
        .select('*')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;

      // Update access statistics
      await supabase
        .from('cache_entries')
        .update({
          access_count: data.access_count + 1,
          last_accessed: new Date().toISOString(),
        })
        .eq('id', data.id);

      // Store in memory cache for faster access
      const ttl = settings.cache_ttl_minutes * 60 * 1000;
      this.cache.set(key, {
        data: data.data,
        expires: Date.now() + ttl,
        hits: 1,
      });

      return data.data;
    } catch (error) {
      console.error('Get from cache failed:', error);
      return null;
    }
  }

  async setCache(key: string, data: any, customTTL?: number): Promise<boolean> {
    const settings = await this.getPerformanceSettings();
    if (!settings?.cache_enabled) return false;

    const ttlMinutes = customTTL || settings.cache_ttl_minutes;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      // Store in database
      await supabase
        .from('cache_entries')
        .upsert({
          cache_key: key,
          data,
          expires_at: expiresAt.toISOString(),
          access_count: 0,
          last_accessed: new Date().toISOString(),
        });

      // Store in memory
      this.cache.set(key, {
        data,
        expires: expiresAt.getTime(),
        hits: 0,
      });

      return true;
    } catch (error) {
      console.error('Set cache failed:', error);
      return false;
    }
  }

  async invalidateCache(pattern: string): Promise<boolean> {
    try {
      // Remove from memory cache
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));

      // Remove from database cache
      const { error } = await supabase
        .from('cache_entries')
        .delete()
        .like('cache_key', `%${pattern}%`);

      return !error;
    } catch (error) {
      console.error('Invalidate cache failed:', error);
      return false;
    }
  }

  // Search functionality
  async buildSearchIndex(entityType: SearchIndex['entity_type'], entityId: string): Promise<boolean> {
    try {
      let searchableText = '';
      let keywords: string[] = [];
      let metadata: Record<string, any> = {};

      // Build searchable content based on entity type
      switch (entityType) {
        case 'expense_request':
          const { data: expenseRequest } = await supabase
            .from('expense_requests')
            .select(`
              *,
              employee:users(full_name, email, department),
              items:expense_items(description, merchant_name, notes)
            `)
            .eq('id', entityId)
            .single();

          if (expenseRequest) {
            searchableText = [
              expenseRequest.employee?.full_name,
              expenseRequest.employee?.department,
              expenseRequest.status,
              expenseRequest.priority,
              ...expenseRequest.items.map((item: any) => 
                [item.description, item.merchant_name, item.notes].filter(Boolean).join(' ')
              ),
            ].filter(Boolean).join(' ');

            keywords = [
              expenseRequest.employee?.department,
              expenseRequest.status,
              expenseRequest.priority,
              expenseRequest.currency,
            ].filter(Boolean);

            metadata = {
              employee_name: expenseRequest.employee?.full_name,
              department: expenseRequest.employee?.department,
              status: expenseRequest.status,
              total_amount: expenseRequest.total_amount,
              currency: expenseRequest.currency,
              created_at: expenseRequest.created_at,
            };
          }
          break;

        case 'expense_item':
          const { data: expenseItem } = await supabase
            .from('expense_items')
            .select(`
              *,
              category:expense_categories(name),
              expense_request:expense_requests(
                employee:users(full_name, department)
              )
            `)
            .eq('id', entityId)
            .single();

          if (expenseItem) {
            searchableText = [
              expenseItem.description,
              expenseItem.merchant_name,
              expenseItem.notes,
              expenseItem.category?.name,
              expenseItem.expense_request?.employee?.full_name,
            ].filter(Boolean).join(' ');

            keywords = [
              expenseItem.category?.name,
              expenseItem.expense_request?.employee?.department,
            ].filter(Boolean);

            metadata = {
              category_name: expenseItem.category?.name,
              amount: expenseItem.amount,
              merchant_name: expenseItem.merchant_name,
              employee_name: expenseItem.expense_request?.employee?.full_name,
              department: expenseItem.expense_request?.employee?.department,
            };
          }
          break;

        case 'user':
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', entityId)
            .single();

          if (user) {
            searchableText = [
              user.full_name,
              user.email,
              user.department,
              user.position,
              user.region,
            ].filter(Boolean).join(' ');

            keywords = [user.department, user.region, user.role].filter(Boolean);

            metadata = {
              full_name: user.full_name,
              email: user.email,
              department: user.department,
              position: user.position,
              region: user.region,
              role: user.role,
            };
          }
          break;

        case 'category':
          const { data: category } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('id', entityId)
            .single();

          if (category) {
            searchableText = [
              category.name,
              category.description,
              category.department,
            ].filter(Boolean).join(' ');

            keywords = [category.department].filter(Boolean);

            metadata = {
              name: category.name,
              description: category.description,
              department: category.department,
              max_amount: category.max_amount,
              monthly_budget: category.monthly_budget,
            };
          }
          break;
      }

      // Store in search index
      const searchIndex = {
        entity_type: entityType,
        entity_id: entityId,
        searchable_text: searchableText.toLowerCase(),
        keywords,
        metadata,
      };

      await supabase
        .from('search_index')
        .upsert(searchIndex);

      return true;
    } catch (error) {
      console.error('Build search index failed:', error);
      return false;
    }
  }

  // Advanced search with full-text search and ranking
  async search(searchQuery: SearchQuery): Promise<{
    results: SearchResult[];
    total: number;
    facets: Record<string, { value: string; count: number }[]>;
  }> {
    try {
      const startTime = Date.now();
      let cacheHit = false;

      // Check cache first
      const cacheKey = `search:${JSON.stringify(searchQuery)}`;
      const cachedResults = await this.getFromCache(cacheKey);
      if (cachedResults) {
        cacheHit = true;
        await this.logPerformanceMetric('search', Date.now() - startTime, cacheHit);
        return cachedResults;
      }

      // Build search query
      let query = supabase
        .from('search_index')
        .select('*');

      // Full-text search
      if (searchQuery.query) {
        // Use PostgreSQL full-text search
        query = query.textSearch('searchable_text', searchQuery.query, {
          type: 'websearch',
          config: 'arabic', // Support Arabic language
        });
      }

      // Apply filters
      Object.entries(searchQuery.filters).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (field === 'entity_type') {
            query = query.eq('entity_type', value);
          } else if (field === 'date_from') {
            query = query.gte('metadata->>created_at', value);
          } else if (field === 'date_to') {
            query = query.lte('metadata->>created_at', value);
          } else if (field === 'amount_min') {
            query = query.gte('metadata->>amount', value);
          } else if (field === 'amount_max') {
            query = query.lte('metadata->>amount', value);
          } else if (field === 'department') {
            query = query.eq('metadata->>department', value);
          } else if (field === 'category') {
            query = query.eq('metadata->>category_name', value);
          } else if (field === 'status') {
            query = query.eq('metadata->>status', value);
          } else {
            // Generic metadata filter
            query = query.eq(`metadata->>${field}`, value);
          }
        }
      });

      // Apply sorting
      if (searchQuery.sort) {
        const { field, direction } = searchQuery.sort;
        if (field === 'relevance') {
          // PostgreSQL full-text search rank
          query = query.order('ts_rank(to_tsvector(searchable_text), websearch_to_tsquery($1))', { 
            ascending: direction === 'asc' 
          });
        } else if (field.startsWith('metadata.')) {
          const metadataField = field.replace('metadata.', '');
          query = query.order(`metadata->>${metadataField}`, { ascending: direction === 'asc' });
        } else {
          query = query.order(field, { ascending: direction === 'asc' });
        }
      } else {
        // Default sort by relevance
        query = query.order('updated_at', { ascending: false });
      }

      // Apply pagination
      const limit = searchQuery.limit || 25;
      const offset = searchQuery.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: searchResults, error, count } = await query;

      if (error) throw error;

      // Transform results
      const results: SearchResult[] = (searchResults || []).map(item => ({
        id: item.id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        title: this.generateTitle(item),
        description: this.generateDescription(item),
        metadata: item.metadata,
        score: this.calculateRelevanceScore(item, searchQuery.query),
        highlights: this.generateHighlights(item, searchQuery.query),
      }));

      // Generate facets for filtering
      const facets = await this.generateFacets(searchQuery);

      const searchResult = {
        results,
        total: count || 0,
        facets,
      };

      // Cache results
      await this.setCache(cacheKey, searchResult, 10); // Cache for 10 minutes

      // Log performance
      await this.logPerformanceMetric('search', Date.now() - startTime, cacheHit);

      return searchResult;
    } catch (error) {
      console.error('Search failed:', error);
      await this.logPerformanceMetric('search', Date.now() - Date.now(), false, true);
      return { results: [], total: 0, facets: {} };
    }
  }

  // Generate search suggestions
  async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      const cacheKey = `suggestions:${query}`;
      const cached = await this.getFromCache(cacheKey);
      if (cached) return cached;

      // Get popular search terms and keywords
      const { data: suggestions } = await supabase
        .from('search_index')
        .select('keywords')
        .textSearch('searchable_text', query)
        .limit(10);

      const allKeywords = suggestions?.flatMap(s => s.keywords) || [];
      const uniqueSuggestions = [...new Set(allKeywords)]
        .filter(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      await this.setCache(cacheKey, uniqueSuggestions, 60); // Cache for 1 hour
      return uniqueSuggestions;
    } catch (error) {
      console.error('Get search suggestions failed:', error);
      return [];
    }
  }

  // Debounced search
  async debouncedSearch(
    searchQuery: SearchQuery,
    callback: (results: any) => void,
    delay?: number
  ): Promise<void> {
    const settings = await this.getPerformanceSettings();
    const debounceMs = delay || settings?.search_debounce_ms || 300;

    const queryKey = JSON.stringify(searchQuery);

    // Clear existing timeout
    const existingTimeout = this.searchDebounce.get(queryKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      const results = await this.search(searchQuery);
      callback(results);
      this.searchDebounce.delete(queryKey);
    }, debounceMs);

    this.searchDebounce.set(queryKey, timeout);
  }

  // Pagination with smart prefetching
  async getPaginatedData<T>(
    tableName: string,
    page: number = 1,
    customPageSize?: number,
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending: boolean }
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    try {
      const settings = await this.getPerformanceSettings();
      const pageSize = customPageSize || settings?.pagination_size || 25;
      const offset = (page - 1) * pageSize;

      // Build query
      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      }

      // Apply pagination
      query = query.range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / pageSize);

      // Prefetch next page if enabled
      if (settings?.prefetch_enabled && page < totalPages) {
        setTimeout(() => {
          this.prefetchNextPage(tableName, page + 1, pageSize, filters, orderBy);
        }, 100);
      }

      return {
        data: data as T[],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      console.error('Get paginated data failed:', error);
      return {
        data: [],
        pagination: {
          page,
          pageSize: customPageSize || 25,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }

  // Prefetch next page for better UX
  private async prefetchNextPage(
    tableName: string,
    page: number,
    pageSize: number,
    filters?: Record<string, any>,
    orderBy?: { column: string; ascending: boolean }
  ): Promise<void> {
    try {
      const cacheKey = `prefetch:${tableName}:${page}:${JSON.stringify(filters)}:${JSON.stringify(orderBy)}`;
      
      // Check if already cached
      const cached = await this.getFromCache(cacheKey);
      if (cached) return;

      // Fetch and cache
      const result = await this.getPaginatedData(tableName, page, pageSize, filters, orderBy);
      await this.setCache(cacheKey, result, 5); // Cache for 5 minutes
    } catch (error) {
      console.error('Prefetch next page failed:', error);
    }
  }

  // Image compression and optimization
  async compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Performance monitoring
  private async logPerformanceMetric(
    operation: string,
    duration: number,
    cacheHit: boolean,
    errorOccurred: boolean = false,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const settings = await this.getPerformanceSettings();
      if (!settings?.analytics_enabled) return;

      const metric: Omit<PerformanceMetrics, 'id'> = {
        operation_type: operation,
        duration_ms: duration,
        cache_hit: cacheHit,
        error_occurred: errorOccurred,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
      };

      // Log asynchronously to avoid blocking
      setTimeout(() => {
        supabase.from('performance_metrics').insert(metric);
      }, 0);
    } catch (error) {
      console.error('Log performance metric failed:', error);
    }
  }

  // Helper methods for search
  private generateTitle(item: any): string {
    switch (item.entity_type) {
      case 'expense_request':
        return `طلب مصروفات - ${item.metadata.employee_name}`;
      case 'expense_item':
        return item.metadata.description || 'مصروف';
      case 'user':
        return item.metadata.full_name;
      case 'category':
        return item.metadata.name;
      default:
        return 'نتيجة بحث';
    }
  }

  private generateDescription(item: any): string {
    switch (item.entity_type) {
      case 'expense_request':
        return `${item.metadata.total_amount} ${item.metadata.currency} - ${item.metadata.status}`;
      case 'expense_item':
        return `${item.metadata.amount} - ${item.metadata.category_name}`;
      case 'user':
        return `${item.metadata.department} - ${item.metadata.position}`;
      case 'category':
        return item.metadata.description || '';
      default:
        return '';
    }
  }

  private calculateRelevanceScore(item: any, query?: string): number {
    if (!query) return 1;

    const searchableText = item.searchable_text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    let score = 0;
    
    // Exact match bonus
    if (searchableText.includes(queryLower)) {
      score += 100;
    }
    
    // Word match bonus
    const queryWords = queryLower.split(' ');
    queryWords.forEach(word => {
      if (searchableText.includes(word)) {
        score += 10;
      }
    });
    
    // Keyword match bonus
    item.keywords.forEach((keyword: string) => {
      if (keyword.toLowerCase().includes(queryLower)) {
        score += 50;
      }
    });
    
    return score;
  }

  private generateHighlights(item: any, query?: string): string[] {
    if (!query) return [];

    const highlights: string[] = [];
    const queryLower = query.toLowerCase();
    const text = item.searchable_text;
    
    // Find highlighted snippets
    const words = text.split(' ');
    let currentSnippet: string[] = [];
    
    words.forEach((word, index) => {
      if (word.toLowerCase().includes(queryLower)) {
        // Add context around the match
        const start = Math.max(0, index - 3);
        const end = Math.min(words.length, index + 4);
        const snippet = words.slice(start, end).join(' ');
        highlights.push(snippet);
      }
    });
    
    return highlights.slice(0, 3); // Return top 3 highlights
  }

  private async generateFacets(searchQuery: SearchQuery): Promise<Record<string, { value: string; count: number }[]>> {
    try {
      const facets: Record<string, { value: string; count: number }[]> = {};

      // Generate facets for common fields
      const facetFields = ['entity_type', 'metadata->department', 'metadata->status', 'metadata->category_name'];

      for (const field of facetFields) {
        const { data } = await supabase
          .from('search_index')
          .select(field)
          .not(field, 'is', null);

        if (data) {
          const counts: Record<string, number> = {};
          data.forEach(item => {
            const value = field.startsWith('metadata->') ? 
              item.metadata[field.replace('metadata->', '')] : 
              item[field];
            
            if (value) {
              counts[value] = (counts[value] || 0) + 1;
            }
          });

          const fieldName = field.replace('metadata->', '');
          facets[fieldName] = Object.entries(counts)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 facet values
        }
      }

      return facets;
    } catch (error) {
      console.error('Generate facets failed:', error);
      return {};
    }
  }

  // Cleanup old cache entries
  async cleanupCache(): Promise<void> {
    try {
      // Remove expired entries from database
      await supabase
        .from('cache_entries')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Remove expired entries from memory
      this.cache.forEach((entry, key) => {
        if (Date.now() >= entry.expires) {
          this.cache.delete(key);
        }
      });
    } catch (error) {
      console.error('Cleanup cache failed:', error);
    }
  }

  // Get performance analytics
  async getPerformanceAnalytics(days: number = 7): Promise<{
    averageResponseTime: number;
    cacheHitRate: number;
    slowestOperations: { operation: string; avgDuration: number }[];
    errorRate: number;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('timestamp', since);

      if (!data?.length) {
        return {
          averageResponseTime: 0,
          cacheHitRate: 0,
          slowestOperations: [],
          errorRate: 0,
        };
      }

      const totalMetrics = data.length;
      const averageResponseTime = data.reduce((sum, m) => sum + m.duration_ms, 0) / totalMetrics;
      const cacheHits = data.filter(m => m.cache_hit).length;
      const cacheHitRate = (cacheHits / totalMetrics) * 100;
      const errors = data.filter(m => m.error_occurred).length;
      const errorRate = (errors / totalMetrics) * 100;

      // Group by operation and calculate average duration
      const operationStats: Record<string, { total: number; count: number }> = {};
      data.forEach(metric => {
        if (!operationStats[metric.operation_type]) {
          operationStats[metric.operation_type] = { total: 0, count: 0 };
        }
        operationStats[metric.operation_type].total += metric.duration_ms;
        operationStats[metric.operation_type].count += 1;
      });

      const slowestOperations = Object.entries(operationStats)
        .map(([operation, stats]) => ({
          operation,
          avgDuration: stats.total / stats.count,
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 5);

      return {
        averageResponseTime,
        cacheHitRate,
        slowestOperations,
        errorRate,
      };
    } catch (error) {
      console.error('Get performance analytics failed:', error);
      return {
        averageResponseTime: 0,
        cacheHitRate: 0,
        slowestOperations: [],
        errorRate: 0,
      };
    }
  }
}

export const performanceService = new PerformanceService();
export default performanceService;
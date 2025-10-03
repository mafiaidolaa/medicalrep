"use client";

// Lightweight compatibility wrapper that forwards to the optimized provider.
// This eliminates heavy, eager fetching and ensures a single, cached data source.
export { OptimizedDataProvider as DataProvider, useOptimizedDataProvider as useDataProvider } from './optimized-data-provider';

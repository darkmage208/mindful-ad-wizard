import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function generateLandingPageUrl(slug: string): string {
  // Get the current domain or use environment variable
  const baseUrl = window.location.origin || import.meta.env.VITE_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/lp/${slug}`
}

export function formatDate(date: Date | string): string {
  // Handle both Date objects and date strings
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
'use client'

import { useEffect } from 'react'

// Analytics event types for conversion tracking
export const ANALYTICS_EVENTS = {
  // Navigation & Page Views
  page_view: 'page_view',
  nav_click: 'nav_click',

  // Tour Conversions
  book_tour_click: 'book_tour_click',
  booking_calendar_open: 'booking_calendar_open',
  booking_complete: 'booking_complete',

  // Shop Conversions
  product_view: 'product_view',
  add_to_cart: 'add_to_cart',
  remove_from_cart: 'remove_from_cart',
  begin_checkout: 'begin_checkout',
  purchase: 'purchase',
  view_woven_collection: 'view_woven_collection',
  view_commission: 'view_commission',
  view_alcaca: 'view_alcaca',

  // Commission Conversions
  commission_form_open: 'commission_form_open',
  commission_submit: 'commission_submit',

  // Lead Capture
  newsletter_signup: 'newsletter_signup',
  contact_form_submit: 'contact_form_submit',
  email_inquiry: 'email_inquiry',
  whatsapp_click: 'whatsapp_click',

  // Migration & Referrer
  site_migration: 'site_migration',
}

interface EventProperties {
  [key: string]: string | number | boolean | undefined
}

/**
 * Track analytics events for conversion optimization
 * Replace these console logs with your actual analytics service (GA4, Mixpanel, etc.)
 */
export function trackEvent(eventName: string, properties?: EventProperties) {
  // Log to console for development
  console.log(`[Analytics] Event: ${eventName}`, properties)

  // In production, send to your analytics service
  // Example: gtag('event', eventName, properties)
  // Example: mixpanel.track(eventName, properties)
  // Example: fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ eventName, properties }) })

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties ?? {})
  }
}

/**
 * Hook to track page views
 */
export function usePageView(pageName: string, properties?: EventProperties) {
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.page_view, {
      page_name: pageName,
      ...properties,
    })
  }, [pageName, properties])
}

/**
 * Track link clicks
 */
export function trackLinkClick(href: string, label?: string) {
  trackEvent(ANALYTICS_EVENTS.nav_click, {
    link: href,
    label: label,
  })
}

/**
 * Track specific conversion events
 */
export const trackConversion = {
  bookTourClick: () =>
    trackEvent(ANALYTICS_EVENTS.book_tour_click),
  bookingCalendarOpen: () =>
    trackEvent(ANALYTICS_EVENTS.booking_calendar_open),
  bookingComplete: (tourType?: string) =>
    trackEvent(ANALYTICS_EVENTS.booking_complete, { tour_type: tourType }),

  productView: (productId: string, productName: string, price: number) =>
    trackEvent(ANALYTICS_EVENTS.product_view, {
      product_id: productId,
      product_name: productName,
      price: price,
    }),
  addToCart: (productId: string, productName: string, quantity: number) =>
    trackEvent(ANALYTICS_EVENTS.add_to_cart, {
      product_id: productId,
      product_name: productName,
      quantity: quantity,
    }),
  beginCheckout: (cartValue: number, itemCount: number) =>
    trackEvent(ANALYTICS_EVENTS.begin_checkout, {
      cart_value: cartValue,
      item_count: itemCount,
    }),
  purchase: (orderId: string, totalValue: number, itemCount: number) =>
    trackEvent(ANALYTICS_EVENTS.purchase, {
      order_id: orderId,
      total_value: totalValue,
      item_count: itemCount,
    }),

  commissionFormOpen: () =>
    trackEvent(ANALYTICS_EVENTS.commission_form_open),
  commissionSubmit: (projectType?: string, budgetRange?: string) =>
    trackEvent(ANALYTICS_EVENTS.commission_submit, {
      project_type: projectType,
      budget_range: budgetRange,
    }),

  newsletterSignup: (email?: string) =>
    trackEvent(ANALYTICS_EVENTS.newsletter_signup, { has_email: !!email }),
  contactFormSubmit: (subject?: string) =>
    trackEvent(ANALYTICS_EVENTS.contact_form_submit, { subject: subject }),
  emailInquiry: (inquiryType?: string) =>
    trackEvent(ANALYTICS_EVENTS.email_inquiry, { inquiry_type: inquiryType }),
  whatsappClick: () =>
    trackEvent(ANALYTICS_EVENTS.whatsapp_click),
}

// Declare global gtag for TypeScript
declare global {
  interface Window {
    gtag?: (
      command: string,
      ...args: (string | Record<string, unknown>)[]
    ) => void
  }
}

// Re-export engagement helpers (defined in a React-free module so they can be
// unit-tested under Node without JSDOM or a 'use client' boundary).
export { trackEngagement } from './analytics-engagement'

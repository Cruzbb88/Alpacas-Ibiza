# Alpacas Ibiza - Project Completion Checklist & Integration Guide

## ✅ Built Components & Pages

### Core Pages
- [x] Home page (hero + 4-path conversion funnel + newsletter)
- [x] Tours & Visits page (timeline + FAQ + FareHarbor embed placeholder)
- [x] Shop Hub (3 categories + features)
- [x] Woven Collection (product grid + care info)
- [x] Custom Commission (6-step process + form)
- [x] Alpaca Manure/Alcaca (packages + use cases + order form)
- [x] About (mission + team + farm story + values)
- [x] Contact (contact form + options + FAQ)
- [x] Legal Pages (Privacy, Terms, Cookies)

### Reusable Components
- [x] Header (sticky nav + mobile menu)
- [x] Hero (customizable with CTAs)
- [x] ChoicePaths (4-option conversion grid)
- [x] Features (flexible grid for 3 or 6 items)
- [x] Timeline (process visualization)
- [x] FAQ (accordion component)
- [x] ProductCard & ProductGrid (e-commerce ready)
- [x] Footer (comprehensive with links)

### Design System
- [x] Color palette (sage green, terra, cream, neutrals)
- [x] Typography setup (Playfair Display + Geist)
- [x] CSS design tokens (HSL colors via CSS variables)
- [x] Responsive grid layouts
- [x] Mobile-first design
- [x] Tailwind configuration

### Analytics & Tracking
- [x] Analytics utility (`lib/analytics.ts`) with 20+ predefined events
- [x] Conversion tracking structure
- [x] Ready for GA4, Mixpanel, or custom backend

---

## 🔧 Next Steps: Integration Checklist

### Phase 1: Content & Media (Priority 1)
- [ ] Replace placeholder images with actual farm photos
  - [ ] Hero images (farm/alpaca close-ups)
  - [ ] Product images (woven items)
  - [ ] Team photos
  - [ ] Process/lifestyle shots
- [ ] Update all placeholder text with real copy
  - [ ] Home hero tagline
  - [ ] Tour descriptions
  - [ ] Product prices and descriptions
  - [ ] Team bios
  - [ ] Contact information

### Phase 2: FareHarbor Booking (Priority 1)
- [x] Get FareHarbor account & API credentials
- [x] Generate embed iframe code from FareHarbor dashboard
- [x] Replace iframe placeholder in `/app/tours/page.tsx` (search "FareHarbor booking system integration")
- [ ] Test booking flow end-to-end
- [ ] Verify booking confirmation emails
- [ ] Add `tracking_id` to FareHarbor for order tracking

### Phase 3: E-commerce Setup (Priority 2)
Choose one option:

**Option A: Stripe + Custom**
- [ ] Set up Stripe account
- [ ] Add STRIPE_PUBLIC_KEY and STRIPE_SECRET_KEY to environment
- [ ] Create checkout pages or API route handlers
- [ ] Implement cart state management (Zustand/Redux)
- [ ] Test payment flow with Stripe test cards

**Option B: Shopify Storefront**
- [ ] Set up Shopify store for products
- [ ] Get Storefront API credentials
- [ ] Build cart + checkout integration
- [ ] Sync products with `/shop/woven` page

**Option C: Supabase + Stripe**
- [ ] Set up Supabase database
- [ ] Create products table
- [ ] Implement order management
- [ ] Connect Stripe for payments

### Phase 4: Analytics Setup (Priority 2)
- [ ] Set up Google Analytics 4 (GA4)
  - [ ] Create GA4 property
  - [ ] Get measurement ID
  - [ ] Add to environment: `NEXT_PUBLIC_GA4_ID`
- [ ] Add Google Analytics script to layout.tsx
- [ ] Create custom events in GA4:
  - [ ] View tour type
  - [ ] Click book tour
  - [ ] View product
  - [ ] Add to cart
  - [ ] Begin checkout
  - [ ] Purchase complete
  - [ ] Commission inquiry
- [ ] Test tracking with browser console (`[Analytics]` logs)
- [ ] Set up GA4 conversion funnels

### Phase 5: Forms & Email (Priority 2)
Choose email service:

**SendGrid**
- [ ] Create SendGrid account
- [ ] Get API key
- [ ] Set up email templates
- [ ] Create API routes for form submissions
  - [ ] `/api/commission` (commission inquiries)
  - [ ] `/api/contact` (contact form)
  - [x] `/api/newsletter` (newsletter signup)
  - [ ] `/api/alcaca-order` (product orders)

**Mailgun**
- [ ] Similar setup to SendGrid

**Built-in (Node emailer)**
- [ ] Configure SMTP server
- [ ] Create email templates

- [ ] Test form submissions end-to-end
- [ ] Verify confirmations reach customer & admin

### Phase 6: Legal & Compliance (Priority 3)
- [ ] Update Privacy Policy (add real data practices)
- [ ] Update Terms of Service (add actual cancellation policy)
- [ ] Update Cookies Policy (list actual cookies used)
- [ ] Add GDPR cookie consent banner (optional library: `react-cookie-consent`)
- [ ] Ensure email forms have consent checkboxes
- [ ] Test cookie blocking in Privacy Policy page

### Phase 7: Database Setup (Priority 3, Optional)
- [ ] Choose database: Supabase, Neon, or AWS
- [ ] Create tables:
  - [ ] `products` (woven items, alcaca, etc.)
  - [ ] `orders` (e-commerce orders)
  - [ ] `commission_inquiries` (custom commission requests)
  - [ ] `bookings` (tour bookings)
  - [ ] `newsletter_signups` (email list)
- [ ] Set up admin dashboard for managing:
  - [ ] Products/inventory
  - [ ] Orders
  - [ ] Inquiries
  - [ ] Bookings (optional—FareHarbor may handle)

### Phase 8: Performance & SEO (Priority 3)
- [ ] Add JSON-LD schema:
  - [ ] Organization schema (homepage)
  - [ ] LocalBusiness schema (farm location)
  - [ ] Product schema (shop items)
  - [ ] Event schema (tour bookings)
- [ ] Optimize images:
  - [ ] Use next/image for auto-optimization
  - [ ] Add loading placeholders
  - [ ] Test Core Web Vitals (LCP, FID, CLS)
- [ ] Set up sitemap.xml generator
- [ ] Submit to Google Search Console
- [ ] Test with Lighthouse

### Phase 9: Deployment (Priority 4)
- [ ] Deploy to Vercel (recommended)
  - [ ] Connect GitHub repo
  - [ ] Add environment variables in Vercel dashboard
  - [ ] Enable automatic deployments
  - [ ] Test production build
- [ ] Set up custom domain (alpacasibiza.com)
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set up CDN caching
- [ ] Monitor error logs

### Phase 10: Testing & Optimization (Priority 4)
- [ ] Functional testing:
  - [ ] All forms submit properly
  - [ ] Navigation works on mobile/desktop
  - [ ] Bookings flow end-to-end
  - [ ] Product pages load images
- [ ] Browser testing:
  - [ ] Chrome, Firefox, Safari, Edge
  - [ ] iOS Safari, Android Chrome
- [ ] Load testing:
  - [ ] Test with 100+ concurrent users
  - [ ] Monitor server response time
- [ ] A/B testing:
  - [ ] Test CTA button text/color
  - [ ] Test form field order
  - [ ] Test hero copy variations

---

## 📊 Analytics Events to Track

Pre-configured in `/lib/analytics.ts`:

```javascript
// Page views
page_view
nav_click

// Tour conversions
book_tour_click
booking_calendar_open
booking_complete

// Shop conversions
product_view
add_to_cart
remove_from_cart
begin_checkout
purchase
view_woven_collection
view_commission
view_alcaca

// Commission conversions
commission_form_open
commission_submit

// Lead capture
newsletter_signup
contact_form_submit
email_inquiry
whatsapp_click

// Engagement
faq_expand
image_view
video_play
social_click
```

**To use:**
```typescript
import { trackEvent, trackConversion } from '@/lib/analytics'

// Simple event
trackEvent('book_tour_click')

// Event with properties
trackConversion.purchase('order-123', 150.50, 3)
```

---

## 🌐 Third-Party Services Integration Points

| Service | Purpose | Status | Notes |
|---------|---------|--------|-------|
| FareHarbor | Tour booking engine | Placeholder | Replace iframe code in `/tours` |
| Stripe | E-commerce payments | Ready | Needs API keys in .env |
| Google Analytics | Conversion tracking | Ready | Needs GA4 ID |
| SendGrid/Mailgun | Email service | Ready | Needs API routes |
| Supabase/Neon | Database (optional) | Ready | Tables need to be created |
| Instagram/Social | Marketing | Links only | Update in footer |

---

## 🔐 Environment Variables Template

Create `.env.local`:
```
# Analytics
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX

# Stripe (if using)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Email Service
SENDGRID_API_KEY=SG.xxx...
SENDGRID_FROM_EMAIL=info@alpacasibiza.com

# Database (if using)
DATABASE_URL=postgresql://user:pass@host/db

# FareHarbor (if using API)
FAREHARBOR_API_KEY=xxx...
FAREHARBOR_ACCOUNT_ID=xxx...
```

---

## 📱 Sitemap Structure

```
alpacasibiza.com/
├── /                    (Home - all 4 conversion paths)
├── /tours               (Tour booking hub)
├── /shop                (Shop hub - 3 categories)
├── /shop/woven          (Woven collection)
├── /shop/commission     (Custom commission)
├── /shop/alcaca         (Alpaca manure)
├── /about               (About & story)
├── /contact             (Contact form)
├── /privacy             (Privacy policy)
├── /terms               (Terms of service)
└── /cookies             (Cookie policy)
```

---

## 🎯 Conversion Optimization Checklist

- [ ] **Home page hero**: Clear value prop + 4 CTAs
- [ ] **Tours page**: "Book Tour" CTA above fold + embedded booking
- [ ] **Shop hub**: 3-category buttons with unique value props
- [ ] **Product pages**: High-quality images + clear pricing + "Add to Cart"
- [ ] **Commission page**: Visual 6-step process + lead capture form
- [ ] **Alcaca page**: Package comparison + clear pricing
- [ ] **Forms**: Minimal required fields, mobile-optimized
- [ ] **CTAs**: Consistent color (accent orange), clear text
- [ ] **Trust signals**: Testimonials, ratings, guarantees
- [ ] **Speed**: Page load < 3 seconds
- [ ] **Mobile**: Fully responsive, touch-friendly buttons

---

## 🚀 Launch Checklist

Before going live:
- [ ] All images optimized & loaded
- [ ] All links tested & working
- [ ] Forms tested (submit & receive emails)
- [ ] FareHarbor bookings tested
- [ ] Analytics tracking verified
- [ ] Mobile viewport tested
- [ ] Password-protected admin areas secured
- [ ] SSL certificate enabled
- [ ] Robots.txt & sitemap.xml set up
- [ ] Google Search Console verified
- [ ] Social sharing previews correct
- [ ] Error pages (404, 500) styled
- [ ] Legal pages reviewed by lawyer (optional)

---

## 📚 File Reference

**Key files for customization:**
- `app/page.tsx` - Home page (main conversion hub)
- `app/layout.tsx` - Metadata & fonts
- `app/globals.css` - Design tokens
- `tailwind.config.ts` - Tailwind setup
- `components/header.tsx` - Navigation
- `components/footer.tsx` - Footer links
- `lib/analytics.ts` - Analytics events
- `.env.local` - Environment variables

**Page-specific files:**
- `/app/tours/page.tsx` - Tours & FareHarbor embed
- `/app/shop/page.tsx` - Shop hub
- `/app/shop/woven/page.tsx` - Woven products
- `/app/shop/commission/page.tsx` - Commission form
- `/app/shop/alcaca/page.tsx` - Alcaca order form
- `/app/about/page.tsx` - About page
- `/app/contact/page.tsx` - Contact form

---

## 💡 Pro Tips

1. **Test everything before launch** - Especially forms, payments, and booking flow
2. **Start with one payment method** - Don't over-complicate initially
3. **Monitor analytics closely** - Track which CTAs convert best
4. **Get user feedback** - Test with real users before full launch
5. **Keep content fresh** - Update testimonials, products, and stories regularly
6. **Mobile-first mindset** - Most traffic will be mobile
7. **Email follow-up** - Set up automated confirmations & reminders
8. **Social proof** - Add customer testimonials & reviews ASAP
9. **Speed optimization** - Image optimization is critical
10. **Iterate quickly** - Launch MVP, gather data, improve

---

## 📞 Support

For questions, refer to:
- `README.md` - Project overview & customization guide
- Component files - Inline JSDoc comments
- `/lib/analytics.ts` - Analytics integration examples

Happy building! 🦙

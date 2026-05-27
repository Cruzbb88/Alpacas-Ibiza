import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Footer } from '@/components/footer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'

export default function ContactPage() {
  return (
    <main>
      <Header />

      <Hero
        title="Get in Touch"
        subtitle="Have questions? Ready to book? Want to collaborate? We'd love to hear from you. Private farm—reach out and we'll get back to you soon."
      />

      {/* Contact Options */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="p-8 text-center border-border/50 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Email
              </h3>
              <p className="text-sm text-foreground/70 mb-4">
                For general inquiries and orders
              </p>
              <a
                href="mailto:info@alpacasibiza.com"
                className="text-accent hover:text-accent/80 font-medium text-sm"
              >
                info@alpacasibiza.com
              </a>
            </Card>

            <Card className="p-8 text-center border-border/50 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                WhatsApp
              </h3>
              <p className="text-sm text-foreground/70 mb-4">
                Quick messages and support
              </p>
              <a
                href="https://wa.me/32475586544"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent/80 font-medium text-sm"
              >
                +32 475 58 65 44
              </a>
            </Card>

            <Card className="p-8 text-center border-border/50 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Location
              </h3>
              <p className="text-sm text-foreground/70 mb-4">
                Private farm in Ibiza
              </p>
              <p className="text-accent font-medium text-sm">
                Directions sent at booking
              </p>
            </Card>

            <Card className="p-8 text-center border-border/50 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">🕐</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Response Time
              </h3>
              <p className="text-sm text-foreground/70 mb-4">
                We reply within 24 hours
              </p>
              <p className="text-accent font-medium text-sm">
                Even on weekends!
              </p>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-foreground/70">
              <strong className="text-foreground">Prefer social media?</strong> Follow us on{' '}
              <a
                href="https://www.instagram.com/wishfulfillingweaving/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Instagram @wishfulfillingweaving
              </a>{' '}
              and DM us anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="w-full py-16 md:py-24 px-4 bg-secondary/20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Send us a Message
            </h2>
            <p className="text-foreground/70">
              Fill out the form and we'll get back to you with more info
            </p>
          </div>

          <Card className="p-8 border-border/50">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subject
                </label>
                <select className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Select a topic...</option>
                  <option>Tour Booking</option>
                  <option>Shop Inquiry</option>
                  <option>Custom Commission</option>
                  <option>Event or Workshop</option>
                  <option>Partnership</option>
                  <option>General Question</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Tell us what you're thinking..."
                  rows={6}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-1 w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm text-foreground/70">
                    I'd like to receive updates about tours, products, and farm stories
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Send Message
              </Button>

              <p className="text-xs text-foreground/50 text-center">
                We'll respond within 24 hours. Thank you for reaching out!
              </p>
            </form>
          </Card>
        </div>
      </section>

      {/* FAQ - Quick Answers */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Quick Questions?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'How do I book a tour?',
                a: 'Head to our Tours page and use the booking calendar. Spots fill up, especially in summer, so book early!',
              },
              {
                q: 'Can I visit without booking?',
                a: 'No, visits are by appointment only to keep our farm calm and peaceful for the alpacas.',
              },
              {
                q: 'Do you offer group tours?',
                a: 'Yes! Groups, schools, corporate retreats—we customize experiences. Contact us for group rates.',
              },
              {
                q: 'Can I buy products without visiting?',
                a: 'Absolutely. Shop our collection online and we ship worldwide. Delivery within 3-14 days depending on location.',
              },
              {
                q: 'How long does a custom commission take?',
                a: 'Typically 4-8 weeks from design approval. Rush commissions possible—ask!',
              },
              {
                q: 'Do you have a physical location to visit?',
                a: 'Yes, our farm is in Ibiza. Visits by appointment. Directions provided at booking.',
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 border-border/50">
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-foreground/70">{item.a}</p>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-foreground/70 mb-6">
              Didn't find an answer? Send us a message or reach out directly.
            </p>
            <a
              href="mailto:info@alpacasibiza.com"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-16 md:py-24 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            We're Excited to Connect
          </h2>
          <p className="text-lg text-foreground/70 mb-8">
            Whether it's your first visit, a custom order, or a collaboration idea—we're here to help make it happen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <a href="/en/tours">Book a Tour</a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary/5 bg-transparent"
            >
              <a href="/en/shop">Shop Now</a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

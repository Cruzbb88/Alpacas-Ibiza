import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { Features } from '@/components/features'
import { Footer } from '@/components/footer'
import { Card } from '@/components/ui/card'

export default function AboutPage() {
  const team = [
    {
      icon: '👩‍🌾',
      name: 'Maria',
      role: 'Founder & Weaver',
      bio: 'Passionate about sustainable farming and traditional textile arts. Maria started Alpacas Ibiza to create a sanctuary for alpacas and artisanal craft.',
    },
    {
      icon: '👨‍🌾',
      name: 'Diego',
      role: 'Farm Manager',
      bio: 'With over a decade of experience in organic farming, Diego ensures every alpaca receives the best care, nutrition, and attention.',
    },
    {
      icon: '🧵',
      name: 'Elena',
      role: 'Master Weaver',
      bio: 'A textile artist trained in traditional techniques. Elena leads our weaving studio, teaching visitors and creating our signature pieces.',
    },
  ]

  const values = [
    {
      icon: '💚',
      title: 'Animal Welfare',
      description:
        'Our alpacas are cherished. Their comfort, health, and happiness guide every decision we make.',
    },
    {
      icon: '🌍',
      title: 'Sustainability',
      description:
        'Organic practices, natural dyes, biodegradable materials. We care for the planet as much as our farm.',
    },
    {
      icon: '🎨',
      title: 'Authentic Craft',
      description:
        'Hand-processed fibers, traditional weaving, time-honored techniques. Quality over shortcuts.',
    },
    {
      icon: '👥',
      title: 'Community',
      description:
        'We create spaces for connection—between people, nature, and tradition. Every visit is personal.',
    },
    {
      icon: '🌱',
      title: 'Education',
      description:
        'Workshops, farm tours, and storytelling. We share knowledge about sustainable living and fiber arts.',
    },
    {
      icon: '💎',
      title: 'Quality',
      description:
        'Every item is hand-checked. We stand behind our work. Longevity and beauty are our promise.',
    },
  ]

  return (
    <main>
      <Header />

      <Hero
        title="Our Story"
        subtitle="A working alpaca farm and weaving studio in the heart of Ibiza. A place where tradition, sustainability, and animal welfare meet Mediterranean calm."
      />

      {/* Our Mission */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Mission
            </h2>
          </div>

          <div className="prose prose-lg max-w-none text-foreground/70">
            <p className="mb-6 leading-relaxed">
              Alpacas Ibiza was born from a simple dream: to create a sanctuary where alpacas thrive, where traditional weaving craft is honored, and where visitors connect with nature and authenticity.
            </p>
            <p className="mb-6 leading-relaxed">
              We believe in sustainable farming, animal welfare, and the timeless beauty of handcrafted textiles. Every fiber, every dye, every stitch tells a story—of our animals, our land, and the hands that created it.
            </p>
            <p className="leading-relaxed">
              Through farm tours, workshops, and our shop, we invite you to be part of this story. To slow down. To learn. To bring home something truly meaningful.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="w-full py-16 md:py-24 px-4 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What We Value
            </h2>
            <p className="text-foreground/70">
              The principles that guide everything we do
            </p>
          </div>
          <Features items={values} />
        </div>
      </section>

      {/* The Farm */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                The Farm
              </h2>
              <p className="text-foreground/70 mb-4 leading-relaxed">
                Nestled in Ibiza's countryside, our farm is a working space where 30+ alpacas live and thrive. They're not just animals—they're family. We practice rotational grazing, organic pasture management, and gentle handling to ensure every alpaca is healthy, calm, and content.
              </p>
              <p className="text-foreground/70 mb-4 leading-relaxed">
                Visitors meet our herd regularly, learning about their personalities, care needs, and the craft of alpaca fiber. It's intimate, peaceful, and authentic.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                Our manure, "Oro Negro," is a byproduct we're proud of—nutrient-rich and sustainably produced, it supports organic gardeners worldwide.
              </p>
            </div>
            <div className="bg-primary/10 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🦙</div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Our Herd
              </h3>
              <p className="text-foreground/70 mb-6">
                30+ alpacas, each with a unique personality and story.
              </p>
              <div className="bg-background rounded-lg p-6 text-sm text-foreground/70">
                <p className="mb-3"><strong>They're:</strong></p>
                <ul className="text-left space-y-1">
                  <li>✓ Well-bred, gentle animals</li>
                  <li>✓ Organically raised and fed</li>
                  <li>✓ Regularly cared for by veterinarians</li>
                  <li>✓ Part of our family</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Studio */}
      <section className="w-full py-16 md:py-24 px-4 bg-secondary/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="bg-accent/10 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🧵</div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                The Weaving Studio
              </h3>
              <p className="text-foreground/70 mb-6">
                Where fiber becomes art.
              </p>
              <div className="bg-background rounded-lg p-6 text-sm text-foreground/70">
                <p className="mb-3"><strong>Our Process:</strong></p>
                <ul className="text-left space-y-1">
                  <li>✓ Hand-processing of alpaca fiber</li>
                  <li>✓ Natural plant dyes</li>
                  <li>✓ Traditional weaving techniques</li>
                  <li>✓ Every piece hand-finished</li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                The Weaving Studio
              </h2>
              <p className="text-foreground/70 mb-4 leading-relaxed">
                At the heart of Alpacas Ibiza is our studio—a space where tradition meets creativity. Here, alpaca fiber is transformed into art.
              </p>
              <p className="text-foreground/70 mb-4 leading-relaxed">
                We use only natural dyes sourced from plants, roots, and sustainable suppliers. Traditional weaving patterns honor textile history while creating modern, timeless pieces. Every scarf, blanket, and cushion is unique.
              </p>
              <p className="text-foreground/70 mb-4 leading-relaxed">
                Our workshops welcome visitors to try their hand at carding, dyeing, and weaving. You'll leave not just with a souvenir, but with an understanding of the craft.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                This is where slow living happens—where you see, touch, and understand the labor of love that goes into every item.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Team */}
      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet the Team
            </h2>
            <p className="text-foreground/70">
              The people who make Alpacas Ibiza possible
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <Card key={i} className="p-8 text-center border-border/50 hover:shadow-md transition-shadow">
                <div className="text-5xl mb-4">{member.icon}</div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-accent font-medium mb-4">{member.role}</p>
                <p className="text-foreground/70">{member.bio}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sustainability & Certifications */}
      <section className="w-full py-16 md:py-24 px-4 bg-secondary/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Commitment to Sustainability
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: 'Organic Farming',
                desc: 'No pesticides, no synthetic fertilizers. Our alpacas graze on naturally managed pasture.',
              },
              {
                title: 'Natural Dyes',
                desc: 'Plant-based dyes only. No synthetic chemicals. Every color comes from nature.',
              },
              {
                title: 'Eco-Packaging',
                desc: 'Biodegradable packaging, minimal waste. We care about your experience and the planet.',
              },
              {
                title: 'Animal Welfare',
                desc: 'Our alpacas live well. Veterinary care, proper nutrition, low stress—always.',
              },
              {
                title: 'Community Support',
                desc: 'We hire locally, buy locally, and invest back into Ibiza\'s sustainable communities.',
              },
              {
                title: 'Education',
                desc: 'Every tour and workshop teaches visitors about sustainability and conscious living.',
              },
            ].map((item, i) => (
              <Card key={i} className="p-6 border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-foreground/70">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full py-16 md:py-24 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Experience Alpacas Ibiza
          </h2>
          <p className="text-lg text-foreground/70 mb-8">
            Visit the farm, meet the alpacas, learn the craft, and support sustainable farming and animal welfare.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/en/tours"
              className="inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-medium transition-colors"
            >
              Book a Tour
            </a>
            <a
              href="/en/shop"
              className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary hover:bg-primary/5 rounded-lg font-medium transition-colors"
            >
              Shop Handcrafted Pieces
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

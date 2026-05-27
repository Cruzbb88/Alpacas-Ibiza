import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { CommissionForm } from '@/components/commission-form'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = t(locale)
  return {
    title: tr('commissionPage.title'),
    alternates: buildLocaleAlternates(locale, 'shop/commission'),
  }
}

export default async function CommissionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const translate = t(locale)

  const formLabels = {
    name: translate('commissionPage.name'),
    email: translate('commissionPage.email'),
    description: translate('commissionPage.description'),
    submit: translate('commissionPage.submit'),
    sending: translate('commissionPage.sending') || 'Sending…',
    success: translate('commissionPage.successMessage') || "Thank you! We'll review your commission and be in touch soon.",
    error: translate('commissionPage.errorMessage') || 'Something went wrong. Please try again.',
  }

  return (
    <>
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {translate('commissionPage.title')}
          </h1>
          <p className="text-lg text-foreground/70 mb-8">
            {translate('commissionPage.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-8 md:p-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {translate('commissionPage.formTitle')}
            </h2>
            <CommissionForm labels={formLabels} />
          </div>
        </div>
      </section>
    </>
  )
}


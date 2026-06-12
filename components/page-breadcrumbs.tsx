import Link from 'next/link'
import { breadcrumbSchema, toJsonLd } from '@/lib/structured-data'
import { SITE_BASE_URL as BASE_URL } from '@/lib/config'

export interface BreadcrumbCrumb {
    /** Display name */
    name: string
    /** Path segment (e.g. "tours"). Home is handled automatically. */
    path: string
}

/**
 * Emits a BreadcrumbList JSON-LD script for the current page.
 * Always prepends a Home crumb. Pass the rest of the chain as props.
 *
 * Example:
 *   <PageBreadcrumbs locale="en" homeLabel="Home" crumbs={[{ name: 'Tours', path: 'tours' }]} />
 */
export function PageBreadcrumbs({
    locale,
    homeLabel = 'Home',
    crumbs,
}: {
    locale: string
    homeLabel?: string
    crumbs: BreadcrumbCrumb[]
}) {
    // Track both the absolute URL (for JSON-LD) and the relative href (for the
    // visible <nav> Links).
    const items: { name: string; url: string; href: string }[] = [
        { name: homeLabel, url: `${BASE_URL}/${locale}`, href: `/${locale}` },
    ]
    let currentPath = `/${locale}`
    for (const c of crumbs) {
        currentPath += `/${c.path}`
        items.push({ name: c.name, url: `${BASE_URL}${currentPath}`, href: currentPath })
    }
    const list = items.map(({ name, url }) => ({ name, url }))

    return (
        <>
            <nav
                aria-label="Breadcrumb"
                className="w-full max-w-6xl mx-auto px-4 py-3 text-sm text-muted-foreground"
            >
                <ol className="flex flex-wrap items-center gap-1.5">
                    {items.map((c, i) =>
                        i < items.length - 1 ? (
                            <li key={c.href} className="flex items-center gap-1.5">
                                <Link href={c.href} className="hover:text-foreground transition-colors">
                                    {c.name}
                                </Link>
                                <span aria-hidden="true">›</span>
                            </li>
                        ) : (
                            <li key={c.href}>
                                <span aria-current="page" className="text-foreground font-medium">
                                    {c.name}
                                </span>
                            </li>
                        ),
                    )}
                </ol>
            </nav>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbSchema(list)) }}
            />
        </>
    )
}

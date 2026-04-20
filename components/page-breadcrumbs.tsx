import { breadcrumbSchema, toJsonLd } from '@/lib/structured-data'

const BASE_URL = 'https://alpacasibiza.com'

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
    const list: { name: string; url: string }[] = [
        { name: homeLabel, url: `${BASE_URL}/${locale}` },
    ]
    let currentPath = `/${locale}`
    for (const c of crumbs) {
        currentPath += `/${c.path}`
        list.push({ name: c.name, url: `${BASE_URL}${currentPath}` })
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbSchema(list)) }}
        />
    )
}

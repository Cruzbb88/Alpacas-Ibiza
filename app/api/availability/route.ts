import { NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/fetch'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

export async function GET(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('availability', reqId)

    const appKey = process.env.FAREHARBOR_APP_KEY
    const userKey = process.env.FAREHARBOR_USER_KEY
    const shortname = process.env.FAREHARBOR_SHORTNAME || 'alpacasibiza'
    const itemId = process.env.FAREHARBOR_ITEM_ID

    // Check if API credentials are configured
    if (!appKey || !userKey) {
        return attachRequestId(
            NextResponse.json(
                {
                    error: 'FareHarbor API credentials not configured',
                    message: 'Contact support@fareharbor.com to request API access'
                },
                { status: 503 }
            ),
            reqId
        )
    }

    try {
        // Calculate date range (next 30 days)
        const today = new Date()
        const endDate = new Date()
        endDate.setDate(today.getDate() + 30)

        const formatDate = (date: Date) => {
            return date.toISOString().split('T')[0] // YYYY-MM-DD
        }

        const startDateStr = formatDate(today)
        const endDateStr = formatDate(endDate)

        // If no specific item ID, fetch all items first
        let itemsToCheck = []
        if (itemId) {
            itemsToCheck = [itemId]
        } else {
            // Fetch all items
            const itemsResponse = await fetchWithTimeout(
                `https://fareharbor.com/api/external/v1/companies/${shortname}/items/`,
                {
                    headers: {
                        'X-FareHarbor-API-App': appKey,
                        'X-FareHarbor-API-User': userKey,
                    },
                }
            )

            if (!itemsResponse.ok) {
                throw new Error(`Failed to fetch items: ${itemsResponse.statusText}`)
            }

            const itemsData = await itemsResponse.json()
            itemsToCheck = itemsData.items?.map((item: any) => item.pk) || []
        }

        // Fetch availabilities for each item — parallel with per-item failure tolerance
        const availabilities: { date: string; capacity: number; startTime: string }[] = []

        const results = await Promise.allSettled(
            itemsToCheck.slice(0, 3).map((itemPk: any) =>
                fetchWithTimeout(
                    `https://fareharbor.com/api/external/v1/companies/${shortname}/items/${itemPk}/minimal/availabilities/date-range/${startDateStr}/${endDateStr}/`,
                    {
                        headers: {
                            'X-FareHarbor-API-App': appKey,
                            'X-FareHarbor-API-User': userKey,
                        },
                    }
                ).then(r => r.ok ? r.json() : null)
            )
        )

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value?.availabilities?.length) {
                availabilities.push(
                    ...r.value.availabilities
                        .filter((avail: any) => avail.capacity > 0)
                        .map((avail: any) => ({
                            date: avail.start_at.split('T')[0],
                            capacity: avail.capacity,
                            startTime: avail.start_at,
                        }))
                )
            } else if (r.status === 'rejected') {
                log.error('FareHarbor item availability fetch failed', { reason: String(r.reason) })
            }
        }

        // Remove duplicates and sort by date
        const uniqueDates = Array.from(
            new Map(availabilities.map(item => [item.date, item])).values()
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        return attachRequestId(
            NextResponse.json({
                dates: uniqueDates.slice(0, 8), // Return up to 8 upcoming dates
                lastUpdated: new Date().toISOString(),
            }),
            reqId
        )

    } catch (error) {
        log.error('FareHarbor API error', { err: String(error) })
        return attachRequestId(
            NextResponse.json(
                {
                    error: 'Failed to fetch availability',
                    message: error instanceof Error ? error.message : 'Unknown error'
                },
                { status: 500 }
            ),
            reqId
        )
    }
}

// Cache for 2 hours (as recommended by FareHarbor for current day)
export const revalidate = 7200

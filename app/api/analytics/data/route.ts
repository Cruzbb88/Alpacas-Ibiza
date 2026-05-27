import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '../../auth/[...nextauth]/route'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
})

const propertyId = process.env.GA4_PROPERTY_ID

export async function GET(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('analytics/data', reqId)
  try {
    // Check authentication
    const session = await getServerSession(auth)
    if (!session) {
      return attachRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), reqId)
    }

    if (!propertyId) {
      throw new Error('GA4_PROPERTY_ID not configured')
    }

    // Get date range (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      ],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
      ],
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
      limit: 10,
    })

    // Aggregate totals
    const totals = {
      totalUsers: 0,
      totalSessions: 0,
      pageViews: 0,
      bounceRate: 0,
    }

    const topPages: Array<{ pagePath: string; pageViews: number }> = []

    response.rows?.forEach((row) => {
      const pagePath = row.dimensionValues?.[0]?.value || ''
      const users = parseInt(row.metricValues?.[0]?.value || '0')
      const sessions = parseInt(row.metricValues?.[1]?.value || '0')
      const views = parseInt(row.metricValues?.[2]?.value || '0')
      const bounce = parseFloat(row.metricValues?.[3]?.value || '0')

      totals.totalUsers += users
      totals.totalSessions += sessions
      totals.pageViews += views
      totals.bounceRate = Math.max(totals.bounceRate, bounce) // Use max bounce rate

      topPages.push({ pagePath, pageViews: views })
    })

    // If no rows, get overall metrics
    if (!response.rows || response.rows.length === 0) {
      const [overallResponse] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          },
        ],
        metrics: [
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
        ],
      })

      const row = overallResponse.rows?.[0]
      if (row) {
        totals.totalUsers = parseInt(row.metricValues?.[0]?.value || '0')
        totals.totalSessions = parseInt(row.metricValues?.[1]?.value || '0')
        totals.pageViews = parseInt(row.metricValues?.[2]?.value || '0')
        totals.bounceRate = parseFloat(row.metricValues?.[3]?.value || '0')
      }
    }

    return attachRequestId(
      NextResponse.json({
        totalUsers: totals.totalUsers,
        totalSessions: totals.totalSessions,
        pageViews: totals.pageViews,
        bounceRate: totals.bounceRate,
        topPages: topPages.slice(0, 10),
      }),
      reqId
    )
  } catch (error) {
    log.error('Analytics API error', { err: String(error) })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      ),
      reqId
    )
  }
}
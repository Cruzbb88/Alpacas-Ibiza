import { ImageResponse } from 'next/og'
import { findAlpacaName } from '@/lib/data/alpacas'

export const runtime = 'edge'
export const alt = 'Meet this alpaca · Alpacas Ibiza'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { locale: string; slug: string } }) {
  const name = findAlpacaName(params.slug) ?? 'One of the herd'

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #F5E6D3 0%, #E8C9A5 50%, #D9A876 100%)',
        padding: '80px',
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: 60,
          left: 60,
          fontSize: 22,
          color: '#AD561A',
          letterSpacing: 6,
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          Meet our herd
        </div>
        <div style={{
          display: 'flex',
          fontSize: 96,
          fontWeight: 700,
          color: '#2E2E2E',
          textAlign: 'center',
          lineHeight: 1,
          marginBottom: 16,
        }}>
          {name}
        </div>
        <div style={{
          display: 'flex',
          fontSize: 28,
          color: '#666',
          textAlign: 'center',
        }}>
          Alpacas Ibiza · Es Currals
        </div>
        <div style={{
          display: 'flex',
          position: 'absolute',
          bottom: 60,
          right: 60,
          fontSize: 20,
          color: '#888',
          letterSpacing: 2,
        }}>
          alpacasibiza.com/alpacas/{params.slug}
        </div>
        <div style={{
          display: 'flex',
          position: 'absolute',
          bottom: 60,
          left: 60,
          fontSize: 64,
        }}>
          🦙
        </div>
      </div>
    ),
    size,
  )
}

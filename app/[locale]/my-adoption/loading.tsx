export default function Loading() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 16px',
      }}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header */}
      <div
        style={{
          height: 36,
          width: 220,
          borderRadius: 6,
          background: 'var(--color-foreground, #27272a)',
          opacity: 0.08,
          marginBottom: 12,
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        }}
      />
      <div
        style={{
          height: 20,
          width: 120,
          borderRadius: 99,
          background: 'var(--color-foreground, #27272a)',
          opacity: 0.08,
          marginBottom: 28,
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        }}
      />

      {/* Alpaca card skeleton */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e4e4e7',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            background: '#f4f4f5',
            animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
          }}
        />
        <div style={{ padding: 20 }}>
          <div
            style={{
              height: 24,
              width: 160,
              borderRadius: 6,
              background: '#e4e4e7',
              marginBottom: 10,
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
          <div
            style={{
              height: 16,
              width: '80%',
              borderRadius: 4,
              background: '#e4e4e7',
              marginBottom: 6,
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
          <div
            style={{
              height: 16,
              width: '60%',
              borderRadius: 4,
              background: '#e4e4e7',
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
        </div>
      </div>

      {/* Subscription box */}
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        {[180, 220, 160].map((w, i) => (
          <div
            key={i}
            style={{
              height: 16,
              width: w,
              borderRadius: 4,
              background: '#e4e4e7',
              marginBottom: i < 2 ? 12 : 0,
              animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  )
}

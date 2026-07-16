import { ImageResponse } from 'next/og';
import { BRAND_NAME, TAGLINE } from '@/lib/constants';

export const alt = BRAND_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #002947 0%, #123652 55%, #1d3f5e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#1d3f5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: '#f4ece0',
              border: '2px solid rgba(244,236,224,0.35)',
            }}
          >
            1
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, color: '#f4ece0' }}>{BRAND_NAME}</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#f4ece0', lineHeight: 1.1, maxWidth: 900 }}>
          {TAGLINE}
        </div>
        <div style={{ fontSize: 28, color: 'rgba(244,236,224,0.75)', marginTop: 24, maxWidth: 820 }}>
          Mess, transport, calendar, and more — offline-first, no account required.
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from 'next/og';
import { BRAND_NAME, TAGLINE } from '@/lib/constants';

export const alt = `${BRAND_NAME} — the campus app for IIT Jodhpur students`;
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
          background: 'linear-gradient(135deg, #01050d 0%, #0b1b2a 55%, #11303f 100%)',
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
              background: '#3da9d8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: '#01050d',
            }}
          >
            1
          </div>
          <div style={{ fontSize: 32, fontWeight: 600, color: '#f5f7fb' }}>{BRAND_NAME}</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#f5f7fb', lineHeight: 1.1, maxWidth: 900 }}>
          {TAGLINE}
        </div>
        <div style={{ fontSize: 28, color: 'rgba(245,247,251,0.75)', marginTop: 24, maxWidth: 820 }}>
          IIT Jodhpur mess menu, bus timings, calendar, and more — free, offline-first, no login.
        </div>
      </div>
    ),
    { ...size },
  );
}

import { z } from 'zod';

export const wifiGuideSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  pdfUrl: z.string().url(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export const wifiPutSchema = z.object({
  campusId: z.string().min(1),
  providers: z.array(z.string().min(1)).default([]),
  guides: z.array(wifiGuideSchema),
  notes: z.string().optional(),
});

export type WifiGuide = z.infer<typeof wifiGuideSchema>;
export type WifiDoc = z.infer<typeof wifiPutSchema>;

export const DEFAULT_WIFI_DOC: Omit<WifiDoc, 'campusId'> = {
  providers: ['NKN', 'BSNL', 'Airtel', 'PGCIL'],
  guides: [
    {
      title: 'Linux',
      icon: 'terminal-outline',
      description: 'Official WPA2-Enterprise Wi-Fi configuration guide for Linux devices.',
      pdfUrl: 'https://iitj.ac.in/PageImages/Gallery/01-2025/internet-linux-638738366727934551.pdf',
      order: 1,
    },
    {
      title: 'Windows',
      icon: 'desktop-outline',
      description: 'Official WPA2-Enterprise Wi-Fi configuration guide for Windows devices.',
      pdfUrl: 'https://iitj.ac.in/PageImages/Gallery/01-2025/Internet-window-638738369547845162.pdf',
      order: 2,
    },
    {
      title: 'macOS',
      icon: 'laptop-outline',
      description: 'Official WPA2-Enterprise Wi-Fi configuration guide for macOS devices.',
      pdfUrl: 'https://iitj.ac.in/PageImages/Gallery/01-2025/Internet-mac-638738370188410589.pdf',
      order: 3,
    },
    {
      title: 'Android',
      icon: 'phone-portrait-outline',
      description: 'Official IITJ WPA2-Enterprise Wi-Fi configuration guide for Android devices.',
      pdfUrl:
        'https://iitj.ac.in/PageImages/Gallery/09-2025/IITJWLAN-configuration-steps-for-Android-User-638944967480274395.pdf',
      order: 4,
    },
    {
      title: 'Certificate',
      icon: 'shield-checkmark-outline',
      description: 'Download the official IITJ Wi-Fi certificate if required during device configuration.',
      pdfUrl: 'https://drive.google.com/file/d/1rjTBValxR_6jEIvGDzGYZH13ye7o-VBL/view',
      order: 5,
    },
  ],
  notes: 'SSID: IITJ. Use WPA2-Enterprise with your institute credentials.',
};

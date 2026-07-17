import { DISCLAIMER } from './constants';
import type { FaqItem } from '@/components/marketing/FaqAccordion';

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Do I need to create an account to use IITJ One?',
    answer:
      'No. IITJ One has no student accounts or login of any kind — every campus data screen is available immediately, and personal features (Mess QR, notes, timetable) stay entirely on your device.',
  },
  {
    question: 'Is IITJ One an official IIT Jodhpur app?',
    answer: DISCLAIMER,
  },
  {
    question: 'Does the app work without internet?',
    answer:
      'Yes. Mess menu, notices, transport, calendar, and more all work offline once you’ve opened the app at least once.',
  },
  {
    question: 'When is IITJ One launching?',
    answer: 'IITJ One is launching soon on Google Play and the App Store — check the Download page for updates.',
  },
  {
    question: 'What data does IITJ One collect?',
    answer:
      'Only anonymous, aggregate usage analytics — no personal names, phone numbers, Mess QR images, or notes content are ever collected. See the Privacy Policy for the full breakdown.',
  },
  {
    question: 'Is IITJ One free?',
    answer: 'Yes, free for every IIT Jodhpur student, with no ads and no plans to monetize.',
  },
];

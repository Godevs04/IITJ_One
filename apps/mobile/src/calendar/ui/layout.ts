import { PixelRatio } from 'react-native';
import type { AcademicDisplayType } from '@iitj1/types';
import type { ThemeColors } from '@/theme/tokens';
import type { MonthSection, TimelineItem } from '../buildTimeline';

/**
 * Every timeline row has an explicit, computed height (each text line sits in a fixed-height box), so
 * SectionList.getItemLayout is exact by construction — scroll-to-today and month jumps land precisely,
 * including with the user's font-size setting (scale capped at 1.3 for these rows).
 */
export const FONT_SCALE_CAP = 1.3;
export function fontScale(): number {
  return Math.min(PixelRatio.getFontScale() || 1, FONT_SCALE_CAP);
}

export interface RowMetrics {
  header: number;
  dayPadding: number;
  titleLine: number;
  metaLine: number;
  busLine: number;
  eventGap: number;
  moreLine: number;
  infoLine: number;
  todayMarker: number;
  dayNumber: number;
  weekday: number;
  gap: number;
  carryPadding: number;
}

export function metrics(scale = fontScale()): RowMetrics {
  const s = (n: number) => Math.ceil(n * scale);
  return {
    header: s(26) + 18,
    dayPadding: 10,
    titleLine: s(21),
    metaLine: s(17),
    busLine: s(22),
    eventGap: 6,
    moreLine: s(20),
    infoLine: s(20),
    todayMarker: s(18) + 6,
    dayNumber: s(28),
    weekday: s(15),
    gap: s(18) + 14,
    carryPadding: 8,
  };
}

export function eventBlockHeight(m: RowMetrics, officialHoliday: boolean): number {
  return m.titleLine + m.metaLine + (officialHoliday ? m.busLine : 0);
}

export function itemHeight(item: TimelineItem, m: RowMetrics): number {
  switch (item.kind) {
    case 'gap':
      return m.gap;
    case 'carry':
      return m.carryPadding * 2 + item.events.length * m.infoLine;
    case 'day': {
      let right = 0;
      if (item.shown.length === 0) right += m.infoLine; // "No events today"
      item.shown.forEach((e, i) => {
        right += (i > 0 ? m.eventGap : 0) + eventBlockHeight(m, !!e.officialHoliday);
      });
      if (item.more > 0) right += m.moreLine;
      right += item.ongoing.length * m.infoLine;
      const left = m.dayNumber + m.weekday;
      return m.dayPadding * 2 + Math.max(left, right) + (item.isToday ? m.todayMarker : 0);
    }
  }
}

/**
 * VirtualizedSectionList counts a header and a footer slot per section in its flat index space.
 * Footers are not rendered here, so they have length 0.
 */
export function buildItemLayout(sections: MonthSection[], m: RowMetrics) {
  const layouts: { length: number; offset: number }[] = [];
  let offset = 0;
  for (const section of sections) {
    layouts.push({ length: m.header, offset });
    offset += m.header;
    for (const item of section.data) {
      const length = itemHeight(item, m);
      layouts.push({ length, offset });
      offset += length;
    }
    layouts.push({ length: 0, offset });
  }
  return layouts;
}

export function typeAccent(type: AcademicDisplayType, theme: ThemeColors): string {
  switch (type) {
    case 'HOLIDAY':
      return theme.nonVeg;
    case 'EXAM':
      return theme.accent;
    case 'DEADLINE':
      return theme.secondary;
    case 'BREAK':
      return theme.veg;
    case 'EVENT':
    case 'ORIENTATION':
      return theme.linkText;
    case 'THESIS_PROJECT':
      return theme.secondary;
    default:
      return theme.iconMuted;
  }
}

# IITJ Campus Transport Schedule

**Source:** IITJ_Bus_Schedule_App_Database.xlsx (Office of Security & Transports, effective November 2026)
**Last verified:** November 2026
**Note:** Bus schedules are subject to change by the Institute. Update this document whenever a revision is announced, then publish it with `npm run seed:transport -w @iitj1/api`.

Saturdays now run the weekend timetable. The app's route groups keep their historical keys: `mon-sat` holds the Monday–Friday timetable and `sun-holiday` the Saturday, Sunday & Institute Holidays one.

The Route column lists every stop after the origin, in order. Trips marked "(Ends at …)" go out to the named stop and finish at the stop in brackets.

---

## Monday to Friday

### Departure from Campus

| Bus | Start Time | From (IITJ) | End Time | To | Route | Note |
|---|---|---|---|---|---|---|
| B1 | 6:15 AM | Main Gate Parking | 7:30 AM | GPRA | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Railway Station Back Gate → Bhati Circle → MBM → Riktiya Bheru Ji → Bhagat ki Kothi Railway Station → Krishi Mandi Basni → Madhuban → Jhalamand → GPRA |  |
| B2 | 6:15 AM | Main Gate | 7:30 AM | Akhaliya Circle | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Riktiya Bheru Ji → Jaljog Circle → 12 Road Circle → Bombay Motor Circle → Akhaliya Circle |  |
| B1 | 9:15 AM | Old Mess | 10:20 AM | AIIMS Jodhpur | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Riktiya Bheru Ji → Bhagat ki Kothi Railway Station → Krishi Mandi Turn → AIIMS | MedTech Course (Timing may change) |
| B2 | 10:30 AM | Old Mess | 11:45 AM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Railway Station Back Gate → Bhati Circle → MBM |  |
| B3 | 12:00 PM | Old Mess | 1:00 PM | Airport Circle (Ends at MBM) | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Paanch Batti Circle → Airport Circle → Paanch Batti Circle → MBM |  |
| B1 | 3:15 PM | Old Mess | 3:46 PM | Paota | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio |  |
| B3 | 4:15 PM | Old Mess | 5:30 PM | AIIMS | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Riktiya Bheru Ji → Bhagat ki Kothi Railway Station → Krishi Mandi Basni Turn → AIIMS |  |
| B1 | 5:45 PM | Shamiyana | 7:30 PM | GPRA (Ends at MBM) | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Riktiya Bheru Ji → Bhagat ki Kothi Railway Station → Krishi Mandi Basni → Madhuban → Jhalamand → GPRA → Jhalamand → Madhuban → Krishi Mandi → Bhagat ki Kothi Railway Station → Riktiya Bheru Circle → MBM |  |
| B2 | 6:00 PM | Old Mess | 8:30 PM | Akhaliya Circle (Ends at MBM) | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Riktiya Bheru Ji → Jaljog Circle → 12 Road Circle → Bombay Motor Circle → Akhaliya Circle → Bombay Motor Circle → 12 Road Circle → Jaljog Circle → MBM |  |
| B3 | 7:10 PM | Old Mess | 8:00 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Bhati Circle → MBM |  |

### Arrival at Campus

| Bus | Start Time | From | End Time | To | Route | Note |
|---|---|---|---|---|---|---|
| B1 | 7:40 AM | GPRA | 8:55 AM | IITJ | Jhalamand → Madhuban → Krishi Mandi → Bhagat ki Kothi Railway Station → Riktiya Bheru Circle → MBM → Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B2 | 7:45 AM | Akhaliya Circle | 8:55 AM | IITJ | Bombay Motor Circle → 12 Road Circle → Jaljog Circle → Riktiya Bheru Ji → MBM → Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi Mandore → Mandore → D Mart → 8 Mill → IITJ |  |
| B2 | 12:15 PM | MBM | 1:30 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B3 | 1:15 PM | MBM | 2:15 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B1 | 1:30 PM | Gate 5: AIIMS Jodhpur | 2:35 PM | IITJ | Krishi Mandi Turn → Bhagat ki Kothi Railway Station → Riktiya Bheru Ji → MBM → Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Mandore Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ | MedTech Course (Timing may change) |
| B1 | 4:00 PM | Paota | 5:00 PM | IITJ | Mahamandir → Mandore Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B3 | 5:45 PM | AIIMS | 7:00 PM | IITJ | Krishi Mandi Basni Turn → Bhagat ki Kothi Railway Station → Riktiya Bheru Ji → MBM → Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Mandore Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B2 | 8:45 PM | MBM | 9:45 PM | IITJ | Bhati Circle → Railway Station Back Gate → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B3 | 9:00 PM | MBM | 10:00 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B1 | 9:15 PM | MBM | 10:00 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |

---

## Saturday, Sunday & Institute Holidays

### Departure from Campus

| Bus | Start Time | From (IITJ) | End Time | To | Route | Note |
|---|---|---|---|---|---|---|
| B1 | 6:30 AM | Old Mess | 7:30 AM | Airport Circle (Ends at MBM) | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM → Paanch Batti Circle → Airport Circle → Paanch Batti Circle → MBM |  |
| B2 | 9:00 AM | Old Mess | 9:45 AM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Paota → Bhati Circle → MBM |  |
| B3 | 11:00 AM | Old Mess | 12:00 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Bhati Circle → MBM |  |
| B1 | 2:00 PM | Old Mess | 2:45 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM |  |
| B2 | 3:00 PM | Old Mess | 3:45 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Paota → Bhati Circle → MBM |  |
| B3 | 4:00 PM | Old Mess | 5:00 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Railway Station Back Gate → Bhati Circle → MBM |  |
| B1 | 4:30 PM | Old Mess | 5:20 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Circuit House → Bhati Circle → MBM |  |
| B2 | 5:00 PM | Old Mess | 5:45 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Paota → Bhati Circle → MBM |  |
| B3 | 6:15 PM | Old Mess | 7:00 PM | MBM | 8 Mill → D Mart → Mandore → Krishi Mandi Mandore → Mahamandir → Paota Zudio → Bhati Circle → MBM |  |

### Arrival at Campus

| Bus | Start Time | From | End Time | To | Route | Note |
|---|---|---|---|---|---|---|
| B1 | 8:00 AM | MBM | 9:00 AM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B2 | 10:15 AM | MBM | 11:00 AM | IITJ | Bhati Circle → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B3 | 12:45 PM | MBM | 1:45 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B1 | 2:50 PM | MBM | 3:40 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B2 | 4:00 PM | MBM | 4:45 PM | IITJ | Bhati Circle → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B3 | 5:05 PM | MBM | 6:05 PM | IITJ | Bhati Circle → Railway Station Back Gate → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B1 | 8:30 PM | MBM | 9:30 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B2 | 9:00 PM | MBM | 10:00 PM | IITJ | Bhati Circle → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |
| B3 | 9:15 PM | MBM | 10:05 PM | IITJ | Bhati Circle → Circuit House → Paota Zudio → Mahamandir → Krishi Mandi → Mandore → D Mart → 8 Mill → IITJ |  |

---

## Notes for IITJ1 App Integration

- Stored in the `transport` collection as the `routes` array (four groups: weekday/weekend × departure/arrival). There is no Thursday override in this revision, so `scheduleOverrides` is empty.
- One-off changes (cancellations, special days) go through dated schedule exceptions in the admin panel, not this file.
- Stops without coordinates in `packages/types/src/busStops.ts` are shown in the app but skipped when drawing GPS route geometry.

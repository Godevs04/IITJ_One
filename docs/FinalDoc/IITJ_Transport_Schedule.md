# IITJ Campus Transport Schedule

**Source:** [IITJ Office of Security & Transports — Transport page](https://iitj.ac.in/office-of-security-transports/en/transport)
**Last verified:** July 2026
**Note:** Bus schedules are subject to change by the Institute. Verify against the official page before each semester, and update this document (and the app's `transport` collection) whenever a revision is announced.

---

## Monday to Saturday

### Departure from Campus

| Bus | Start Time | From (IITJ) | End Time | To | Route |
|---|---|---|---|---|---|
| B1 | 6:30 AM | Main Gate Parking | 7:40 AM | GPRA | Paota → Railway Station → GPRA |
| B2 | 9:15 AM | Old Mess | 10:20 AM | AIIMS Jodhpur* | Paota → MBM → AIIMS |
| B1 | 10:30 AM | Old Mess | 11:30 AM | MBM | Paota → Railway Station → MBM |
| B2 | 4:15 PM | Old Mess | 5:15 PM | AIIMS Jodhpur | Paota → Railway Station |
| B1 | 5:45 PM | Shamiyana | 6:45 PM | GPRA | Paota → MBM → Riktiya Bheruji Circle |
| B2 | 6:45 PM | Old Mess | 7:45 PM | Jaljog Circle | Paota → MBM → Riktiya Bheruji Circle → MBM |

*\*See Thursday revision below — this timing changes on Thursdays.*

### Arrival at Campus

| Bus | Start Time | From | End Time | To | Route |
|---|---|---|---|---|---|
| B1 | 7:50 AM | GPRA | 8:50 AM | IITJ | MBM → Paota → Mandore → IITJ |
| B2 | 1:30 PM | Gate 4: AIIMS Jodhpur | 2:30 PM | IITJ | AIIMS Jodhpur → IITJ |
| B1 | 2:30 PM | Gate 1: MBM | 3:30 PM | IITJ | MBM College → Paota → IITJ |
| B2 | 5:20 PM | Gate 4: AIIMS Jodhpur | 6:20 PM | IITJ | Riktiya Bheruji Circle → MBM → Paota |
| B1 | 9:00 PM | Gate 1: MBM | 10:00 PM | IITJ | MBM → Paota |
| B2 | 9:00 PM | Gate 1: MBM | 10:00 PM | IITJ | MBM → Railway Station → Paota |

---

## Sunday & Institute Holidays

### Departure from Campus

| Bus | Start Time | From (IITJ) | End Time | To | Route |
|---|---|---|---|---|---|
| B1 | 10:00 AM | Old Mess | 11:00 AM | MBM | Paota → Riktiya Bheruji Circle → MBM |
| B2 | 11:30 AM | Old Mess | 12:30 PM | MBM | Paota → MBM |
| B1 | 4:45 PM | Old Mess | 5:45 PM | MBM | Paota → MBM → Riktiya Bheruji Circle |
| B2 | 5:45 PM | Old Mess | 6:45 PM | MBM | Paota → MBM → Riktiya Bheruji Circle |

### Arrival at Campus

| Bus | Start Time | From | End Time | To | Route |
|---|---|---|---|---|---|
| B1 | 1:00 PM | Gate 1: MBM | 2:00 PM | IITJ | MBM College → Paota → IITJ |
| B2 | 4:00 PM | Gate 1: MBM | 5:00 PM | IITJ | MBM → Paota → Mandore → IITJ |
| B1 | 9:00 PM | Gate 1: MBM | 10:00 PM | IITJ | MBM → Railway Station → Paota |
| B2 | 9:00 PM | Gate 1: MBM | 10:00 PM | IITJ | — |

---

## Special Notice — Thursday Revision

> Due to the Surgical Device Development class scheduled at AIIMS every Thursday, the B2 departure previously at 9:15 AM is revised to **8:00 AM**, effective every Thursday from **05 February 2026** onward. The return time remains unchanged at 1:30 PM.

### Revised Thursday Schedule (effective 05 Feb 2026, every Thursday)

| Direction | Bus | Start Time | From | End Time | To | Route |
|---|---|---|---|---|---|---|
| Departure | B2 | 8:00 AM | Old Mess | 9:00 AM | AIIMS | Paota → AIIMS |
| Arrival | B2 | 1:30 PM | AIIMS → MBM | 2:30 PM | IITJ | AIIMS → Paota → Mandore → IITJ |

---

## Key Locations Referenced

| Location | Notes |
|---|---|
| Main Gate Parking | IITJ campus boundary stop |
| Old Mess | IITJ campus boundary stop |
| Shamiyana | IITJ campus boundary stop |
| Paota | Common transit point on most routes |
| Railway Station | Jodhpur Railway Station |
| MBM | MBM Engineering College (Gate 1) |
| AIIMS Jodhpur | AIIMS Jodhpur (Gate 4) |
| GPRA | Destination stop |
| Mandore | Transit point on some return routes |
| Riktiya Bheruji Circle | Transit point on evening/holiday routes |
| Jaljog Circle | Destination stop (evening route) |

---

## Notes for IITJ1 App Integration

- Store this schedule in the `transport` collection as the `routes` array, with the Thursday exception stored separately (e.g., a `scheduleOverrides` field keyed by day-of-week) so admins can edit the exception without touching the regular six-day schedule.
- Recommend surfacing a "Today's schedule" view in the app that automatically applies the Thursday override, rather than showing all schedules at once.
- Flag this document for re-verification against the [official transport page](https://iitj.ac.in/office-of-security-transports/en/transport) before each semester and whenever students report a mismatch.

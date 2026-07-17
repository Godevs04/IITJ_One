<wizard-report>
# PostHog post-wizard report

The wizard has completed a full PostHog analytics integration for the IITJ One Expo mobile app. The SDK was installed, a PostHog client was configured via `expo-constants`, the `PostHogProvider` was added to the root layout with manual screen tracking for Expo Router, and 11 new capture events were instrumented across 8 screens. The integration sits alongside the existing Firebase Analytics pipeline without replacing or removing any existing code.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `timetable_class_added` | User saves a new class to their personal timetable. | `app/timetable/add.tsx` |
| `timetable_class_updated` | User saves changes to an existing timetable class entry. | `app/timetable/add.tsx` |
| `timetable_class_deleted` | User deletes a class from their personal timetable. | `app/timetable/add.tsx` |
| `note_saved` | User saves a note (new creation or edit of an existing note). | `app/notes/edit.tsx` |
| `suggestion_submitted` | User successfully submits an anonymous suggestion for campus improvements. | `app/suggest.tsx` |
| `suggestion_failed` | User's suggestion submission failed due to a network or server error. | `app/suggest.tsx` |
| `portal_link_opened` | User opens an official IITJ portal link from the Portals screen. | `app/portals.tsx` |
| `mess_qr_upload_started` | User initiates the Mess QR upload flow by tapping gallery or camera. | `app/mess-qr.tsx` |
| `notification_topic_toggled` | User enables or disables a specific notification topic in Settings. | `app/settings.tsx` |
| `laundry_hostel_selected` | User selects a hostel to view its laundry collection schedule. | `app/laundry.tsx` |
| `quick_link_tapped` | User taps a quick-access tile on the Home screen to navigate to a feature. | `app/(tabs)/index.tsx` |

## Files created or modified

- **Created** `app.config.js` — extends `app.json` to expose `posthogProjectToken` and `posthogHost` via `expo-constants` extras
- **Created** `src/config/posthog.ts` — PostHog client singleton, reads config from `Constants.expoConfig.extra`
- **Modified** `app/_layout.tsx` — added `PostHogProvider` wrapper and manual screen tracking (`posthog.screen()`) for Expo Router
- **Modified** `app/suggest.tsx` — `suggestion_submitted`, `suggestion_failed`
- **Modified** `app/timetable/add.tsx` — `timetable_class_added`, `timetable_class_updated`, `timetable_class_deleted`
- **Modified** `app/notes/edit.tsx` — `note_saved`
- **Modified** `app/portals.tsx` — `portal_link_opened`
- **Modified** `app/mess-qr.tsx` — `mess_qr_upload_started`
- **Modified** `app/settings.tsx` — `notification_topic_toggled`
- **Modified** `app/laundry.tsx` — `laundry_hostel_selected`
- **Modified** `app/(tabs)/index.tsx` — `quick_link_tapped`

## Next steps

We've built a dashboard and 5 insights for you to keep an eye on user behavior, based on the events just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://eu.posthog.com/project/225705/dashboard/825611)
- [Timetable class actions (wizard)](https://eu.posthog.com/project/225705/insights/pokKtYw2)
- [Most-used quick links (wizard)](https://eu.posthog.com/project/225705/insights/GEUVmLQB)
- [Suggestion submission funnel (wizard)](https://eu.posthog.com/project/225705/insights/IRSg6IMU)
- [Portal links opened (wizard)](https://eu.posthog.com/project/225705/insights/1K4OOjCY)
- [Mess QR upload & note saves (wizard)](https://eu.posthog.com/project/225705/insights/KviKYyKc)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` to `.env.example` and any monorepo/bootstrap scripts so collaborators know what to set.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
</wizard-report>

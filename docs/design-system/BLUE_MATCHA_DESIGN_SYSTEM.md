# IITJ One — Blue Matcha Design System

The official design specification for the IITJ One redesign (`feature/app-full-redesign`).
It is three specs saved as received, in the order they build on each other:

1. [Global Color Palette — Blue Matcha Theme](#part-1--global-color-palette--design-system)
2. [Global Typography, Spacing & Icon System](#part-2--global-typography-spacing--icon-design-system)
3. [Global Floating Bottom Navigation](#part-3--global-floating-bottom-navigation)

> Note: Part 2 was received cut off partway through section 3 (Official Icon Library). The text stops where the source stopped.

---

# PART 1 — GLOBAL COLOR PALETTE & DESIGN SYSTEM
## Blue Matcha Theme — Master Claude Implementation Prompt

We are developing **IITJ One**, an integrated campus super application for IIT Jodhpur.

I have provided a reference image of the **Blue Matcha** color palette.

Use this reference as the foundation for the entire application's color system.

This palette must apply to all existing and future IITJ One screens.

### 1. Official Color Palette

Use exactly these seven foundation colors:

| Color Name | HEX Code | Primary Purpose |
|---|---|---|
| Deep Ocean | `#31465A` | Primary brand color, headings, navigation, dark surfaces |
| Matcha Green | `#C7DFA3` | Accent color, selected states, positive indicators |
| Vanilla Milk | `#FFFDF7` | Warm background, cards and containers |
| Airy Blue | `#89B9E6` | Secondary accent, buttons, interactive components |
| Frozen Aqua | `#D9F0FF` | Highlight backgrounds, informational sections |
| Pure Black | `#000000` | High-contrast text and monochrome elements |
| Pure White | `#FFFFFF` | Clean backgrounds, white text, surfaces |

Important: The correct black HEX code is `#000000`, not `#00000`.

Do not introduce unrelated brand colors or arbitrary gradients.

### 2. Global Theme Requirements

Create a centralized, reusable design-token system.

Define semantic tokens for:

- Primary color
- Secondary color
- Accent color
- Main background
- Card background
- Elevated surface
- Primary text
- Secondary text
- Button background
- Button text
- Active navigation
- Inactive navigation
- Selected tabs
- Input backgrounds
- Borders
- Dividers
- Informational highlights

Use the seven foundation colors consistently.

Opacity variants may be used where appropriate.

If additional colors are required for critical semantic states such as errors, unread notification badges, or warnings, define them separately as minimal accessibility exceptions rather than changing the core brand palette.

### 3. Suggested Light Theme

Use the following as the starting point:

- Main background: `#FFFFFF`
- Secondary background: `#FFFDF7`
- Primary text: `#31465A`
- High-contrast text: `#000000`
- Primary buttons: `#31465A`
- Primary button text: `#FFFFFF`
- Secondary buttons: `#89B9E6`
- Selected items: `#C7DFA3`
- Informational cards: `#D9F0FF`
- Accent surfaces: `#FFFDF7`

Always verify text and icon contrast.

For example, use Deep Ocean or Black text on Matcha Green and Airy Blue backgrounds rather than white text when the latter is insufficiently legible.

### 4. Suggested Dark Theme

Support a dark appearance using the same foundation colors.

Suggested starting point:

- Main background: `#000000`
- Secondary background: `#31465A`
- Primary text: `#FFFFFF`
- Secondary text: `#D9F0FF`
- Selected elements: `#C7DFA3`
- Secondary accent: `#89B9E6`

Use the light colors carefully as accents and readable surfaces rather than applying all of them indiscriminately to large dark backgrounds.

### 5. Component Color Rules

**Headers**

Use Deep Ocean for primary headings in the light theme.

**Buttons**

Use Deep Ocean for primary actions, Airy Blue for secondary actions, and Matcha Green for appropriate selected states.

**Cards**

Use Vanilla Milk, Pure White, or Frozen Aqua, depending on visual hierarchy.

**Bottom Navigation**

Use clear active and inactive states.

The active destination must remain visually recognizable.

**Inputs**

Use consistent backgrounds, focus states, and readable placeholder text.

**Badges**

Use Matcha Green for suitable informational or positive highlights.

Unread notification indicators must remain clearly noticeable.

### 6. Application-Wide Integration

Apply the theme to all documented IITJ One screens:

- Screen 01 — Home Dashboard
- Screen 02 — Reminder List
- Screen 03 — New Reminder
- Screen 04 — Full Mess Menu
- Screen 05 — Add QR Popup
- Screen 06 — QR Upload Preview
- Screen 07 — Quick Links & Services Directory

Also apply it to all future screens and features.

Do not modify their previously defined functionality or navigation behavior solely to implement the color palette.

### 7. Technical Implementation

The existing application uses React Native with Expo for mobile and React for web.

Before implementing:

1. Inspect the existing theme and styling architecture.
2. Identify existing color constants and reusable components.
3. Create or extend centralized color tokens.
4. Integrate semantic light and dark theme mappings.
5. Replace inconsistent hardcoded UI colors where appropriate.
6. Update reusable components to consume theme tokens.
7. Preserve the existing typography, spacing, and layout structure unless separate specifications require changes.
8. Check accessibility contrast and active-state visibility.
9. Verify theme consistency across mobile and web.

Use the existing styling framework and theme provider if one is already available.

Avoid introducing additional styling dependencies unnecessarily.

### 8. Theme Consistency Rules

- Maintain a clean and consistent Blue Matcha identity.
- Use the seven supplied colors as the foundation.
- Avoid excessive color switching between adjacent components.
- Use accent colors strategically.
- Keep interactive elements visually distinguishable.
- Avoid low-contrast text combinations.
- Support accessible states for focused, disabled, selected, and pressed controls.
- Ensure modal screens and navigation components follow the same theme.
- Keep the application visually consistent without altering the supplied wireframe structure.

### 9. Expected Deliverables

Provide:

1. Centralized color token definitions.
2. Light theme configuration.
3. Dark theme configuration.
4. Semantic component color mappings.
5. Updated shared UI components.
6. Application-wide theme integration.
7. Accessibility and contrast validation.
8. A summary of modified files.

**Final objective:** Establish Blue Matcha as the official design language of IITJ One, using Deep Ocean, Matcha Green, Vanilla Milk, Airy Blue, Frozen Aqua, Pure Black, and Pure White consistently across the complete application.

---

# PART 2 — GLOBAL TYPOGRAPHY, SPACING & ICON DESIGN SYSTEM
## Claude Code Implementation Prompt

You are working on **IITJ One**, an integrated campus super application for IIT Jodhpur.

Implement a centralized, reusable design system for typography, layout spacing, and icons throughout the application.

The following specifications are mandatory and must remain consistent across all existing and future screens.

## 1. Typography System

### Font Family

**Primary Font: Helvetica Neue**

Use Helvetica Neue throughout the application, including:

- Headings
- Section titles
- Body text
- Buttons
- Navigation labels
- Input fields
- Cards
- Dialogs and modals
- Form labels

Use the correct platform-supported font-family mapping.

Helvetica Neue may not be available by default on Android or Windows. Use a legally licensed font asset if available in the repository; otherwise, configure an appropriate system fallback.

Do not download or bundle unlicensed Helvetica Neue font files.

### Font Size Specifications

Use these exact typography tokens:

| Typography Token | Font Size |
|---|---|
| Big Heading | 24px |
| Section Heading | 20px |
| Body Text Header | 16px |
| Body Text | 16px |
| Secondary Body Text | 12px |
| Small Body Text | 10px |

The original specification repeats Big Heading at 24px and Body Text at two sizes. Treat those as the same heading token and separate body/secondary body tokens.

### Typography Configuration

Create centralized typography constants.

```typescript
export const typography = {
  fontFamily: {
    primary: "Helvetica Neue",
    fallback: "System",
  },

  fontSize: {
    bigHeading: 24,
    sectionHeading: 20,
    bodyHeader: 16,
    body: 16,
    secondaryBody: 12,
    smallBody: 10,
  },

  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },

  lineHeight: {
    bigHeading: 32,
    sectionHeading: 28,
    bodyHeader: 24,
    body: 24,
    secondaryBody: 18,
    smallBody: 14,
  },
} as const;
```

React Native uses density-independent numeric units rather than CSS pixels. Use the numeric values above as dp-equivalent style values on mobile and pixel values on web.

Do not assume that specifying the Helvetica Neue family name makes the font available on every device.

## 2. Layout Spacing System

Use the following base layout measurements.

| Spacing Token | Value |
|---|---|
| Border Margin / Screen Padding | 16px |
| Gutter / Component Spacing | 8px |

### Border Margin — 16px

Maintain 16px spacing between the screen edge and the primary content area.

Apply this consistently to:

- Screen content containers
- Headers
- Cards
- Forms
- Service grids
- Reminder lists
- Mess Menu
- QR management
- Quick Links

Respect device safe-area insets in addition to the 16px layout margin.

### Gutter — 8px

Use an 8px base spacing unit between related elements.

Apply it to:

- Grid column gaps
- Related buttons
- Icons and labels
- Form fields
- Repeated list items
- Internal card elements

Use multiples of 8px when larger spacing is needed.

### Spacing Configuration

```typescript
export const spacing = {
  unit: 8,
  screenMargin: 16,
  gutter: 8,

  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;
```

Do not introduce inconsistent arbitrary spacing values unless a component or accessibility requirement justifies them.

## 3. Official Icon Library

Use **Google Material Symbols** as the primary icon system.

Official reference:

https://fonts.google.com/icons

Use the Material Symbols icon family, preferably the outlined variant.

### Icon Style Requirements

- Prefer outlined icons.
- Keep consistent stroke appearance.
- Maintain uniform sizing.
- Use the established Blue Matcha theme

_(The source text ends here.)_

---

# PART 3 — GLOBAL FLOATING BOTTOM NAVIGATION
## Claude Implementation Prompt — Reference-Based Navigation Design

### 1. Project Context

We are developing **IITJ One**, an integrated campus super application for IIT Jodhpur.

I have provided a reference image showing the exact visual style I want for the application's bottom navigation bar.

Implement a reusable, animated floating bottom navigation bar inspired by this reference.

This is a **global UI component**, not a new application screen.

The navigation bar must integrate with all five primary navigation destinations of IITJ One.

### Technology Stack

- Mobile: React Native with Expo
- Web: React
- Backend: Node.js with TypeScript
- Navigation: Reuse the existing navigation framework

Do not replace the existing navigation architecture unnecessarily.

---

# 2. Reference Image Analysis

The reference image contains the following characteristics:

- Floating pill-shaped navigation container.
- Dark navy background.
- Rounded white outer border.
- Five evenly distributed navigation icons.
- White inactive icons.
- Bright blue active selection background.
- Capsule-shaped active tab indicator.
- Minimal interface without permanent text labels.
- Subtle decorative pattern within the dark background.
- Floating appearance above the bottom edge of the device.

Recreate this design language while adapting the icons and colors to IITJ One.

Do not copy the reference application's navigation destinations.

---

# 3. Official IITJ One Navigation Destinations

Implement exactly five primary tabs.

| Position | Tab | Icon Concept | Destination |
|---|---|---|---|
| 1 | Home | House | Home Dashboard |
| 2 | Map | Folded Map | Campus Map |
| 3 | Search | Magnifying Glass | Global Search |
| 4 | PHC | Medical Bag / Medical Cross | Primary Health Centre |
| 5 | Transport | Bus | Transportation |

### Important

The ordering must remain:

**Home → Map → Search → PHC → Transport**

Do not change this ordering to match the reference image.

Use consistent outline icons from the application's existing icon library.

---

# 4. Navigation Bar Container

Create a floating, horizontally centered pill-shaped container.

### Shape

- Fully rounded capsule.
- Smooth curved ends.
- Consistent height.
- Equal padding on the left and right.
- No sharp corners.

### Position

- Float above the device's bottom safe area.
- Maintain horizontal margins.
- Do not touch the physical screen edges.
- Respect Android gesture navigation and iOS home indicator areas.
- Keep the bar accessible across different screen sizes.

### Suggested Dimensions

Use these as starting values, not absolute fixed requirements:

- Height: approximately 64–72 dp.
- Horizontal screen margin: approximately 16–24 dp.
- Outer corner radius: fully rounded.
- Border thickness: approximately 3–4 dp.
- Active capsule height: approximately 42–46 dp.

Adjust responsively to preserve the reference image's visual proportions.

---

# 5. Blue Matcha Theme Integration

Use the official IITJ One color palette.

| Color | HEX |
|---|---|
| Deep Ocean | `#31465A` |
| Matcha Green | `#C7DFA3` |
| Vanilla Milk | `#FFFDF7` |
| Airy Blue | `#89B9E6` |
| Frozen Aqua | `#D9F0FF` |
| Pure Black | `#000000` |
| Pure White | `#FFFFFF` |

### Navigation Color Mapping

**Main navbar background**

`#31465A` — Deep Ocean

**Outer border**

`#FFFFFF` — Pure White

**Inactive icons**

`#FFFFFF` — Pure White

**Active selection capsule**

`#89B9E6` — Airy Blue

**Active icon**

`#31465A` — Deep Ocean

**Optional pressed-state accent**

`#C7DFA3` — Matcha Green

**Optional subtle background pattern**

Use a low-opacity variation of Deep Ocean, Frozen Aqua, or White.

Avoid adding unrelated brand colors.

---

# 6. Active Tab Indicator

The selected tab must have a horizontally oriented capsule-shaped background.

Follow the reference image's styling.

### Active State

When a tab is selected:

- Display a rounded capsule behind its icon.
- Use Airy Blue as the capsule background.
- Change the active icon color to Deep Ocean.
- Keep the active icon centered.
- Maintain a consistent selected-state size.

### Inactive State

For inactive tabs:

- Do not display the capsule.
- Show a white outline icon.
- Preserve equal icon spacing.

### Example

When the Home Dashboard is open:

- Home is highlighted.
- Map, Search, PHC, and Transport remain inactive.

When the user navigates to PHC:

- The capsule moves from Home to PHC.
- PHC becomes active.
- Home returns to its inactive state.

Never highlight multiple tabs simultaneously.

---

# 7. Animated Active Indicator

Implement a smooth transition when switching between navigation tabs.

The highlighted capsule should move horizontally to the selected icon.

### Animation Requirements

- Smooth horizontal movement.
- No sudden jumps.
- No excessive bouncing.
- Consistent timing.
- Responsive interaction.
- No visible layout shifting.

Recommended animation duration:

**200–300 milliseconds**

Use an appropriate animation solution already available in the project.

If React Native Reanimated is installed and supported, reuse it.

Otherwise use the existing navigation or animation framework.

Do not install a large animation dependency for this component unnecessarily.

### Icon Animation

A subtle icon scale or opacity transition may be used.

Avoid excessive movement or rotation.

Respect reduced-motion accessibility preferences.

---

# 8. Background Pattern

The reference image contains a subtle dark decorative pattern inside the navigation bar.

Recreate this only if it can be done without reducing readability or performance.

Requirements:

- Keep the pattern very subtle.
- Use low-opacity shapes or an appropriate reusable asset.
- Avoid distracting textures.
- Do not place high-contrast patterns directly behind icons.
- Preserve clear visibility of the active capsule.

The pattern is decorative and must not interfere with navigation behavior.

If the pattern creates unnecessary complexity, prioritize the dark pill-shaped background and animated active capsule.

---

# 9. Navigation Interactions

Each icon must be fully interactive.

### Home

Navigate to Screen 01 — Home Dashboard.

### Map

Navigate to the Campus Map feature.

### Search

Navigate to Global Search.

### PHC

Navigate to the Primary Health Centre.

### Transport

Navigate to the Transportation feature.

### Interaction Rules

- A single tap should activate the selected destination.
- The highlighted tab must reflect the actual current navigation route.
- Avoid duplicated navigation events.
- Preserve appropriate tab state when switching.
- Use existing navigation history behavior.
- Do not create a separate navigation state disconnected from the navigator.

When a secondary screen is opened from a tab, keep the correct parent tab associated with that navigation stack.

---

# 10. Global Navigation Visibility

The floating navbar should appear on the five primary application destinations.

### Visible On

- Home Dashboard
- Campus Map
- Global Search
- PHC
- Transportation

### Secondary Screens

The following screens are currently defined as secondary feature screens:

- Screen 02 — Reminder List
- Screen 03 — New Reminder
- Screen 04 — Full Mess Menu
- Screen 05 — Add QR Popup
- Screen 06 — QR Preview / Caption
- Screen 07 — Quick Links & Services Directory

Do not automatically duplicate the navbar on every secondary screen.

For modal-based features, preserve the underlying screen and its existing navigation state.

Use the existing navigation hierarchy to determine when the navbar should be visible.

---

# 11. Floating Position and Safe Area

Position the navbar so that it appears floating above the screen's bottom edge.

### Requirements

- Respect safe-area insets.
- Support Android navigation buttons and gesture navigation.
- Support iPhone home indicators.
- Maintain consistent horizontal spacing.
- Avoid clipping on smaller devices.
- Prevent content from being hidden behind the navbar.

### Content Handling

Primary screens should include sufficient bottom content padding to allow scrolling above the floating navbar.

Do not position the navbar as part of the ordinary scrollable content.

The navbar must remain visible while the main screen scrolls.

---

# 12. Responsive Behavior

The component must work across:

- Small Android phones.
- Large Android phones.
- iPhones with home indicators.
- Tablets.
- Responsive web layouts where the mobile-style navigation is used.

On mobile:

- Maintain the floating capsule appearance.
- Keep all five destinations visible.
- Preserve adequate touch-target sizes.

On tablets and web:

- Adapt width appropriately.
- Do not stretch the navbar across an excessively wide screen.
- Maintain its centered floating appearance where this navigation pattern is appropriate.

---

# 13. Accessibility Requirements

The navbar contains icons without permanent visible labels.

Therefore, accessible labels are mandatory.

Each tab must expose its destination name to assistive technologies.

Examples:

- Home
- Campus Map
- Search
- Primary Health Centre
- Transportation

### Additional Requirements

- Minimum usable touch targets.
- Clear active/inactive distinction.
- Screen-reader support.
- Keyboard navigation on web.
- Accessible focus indication.
- Reduced-motion support.
- Appropriate icon/background contrast.

Ensure the active capsule remains recognizable without relying only on color.

---

# 14. Component Architecture

Implement the navbar as a reusable global component.

Suggested component responsibilities:

- FloatingBottomNavigation
- NavigationTab
- ActiveTabIndicator
- NavigationIcon
- NavigationBackgroundPattern

These are suggested responsibilities rather than mandatory file names.

Use the existing project structure and navigation system.

Avoid duplicated navbar implementations across multiple screens.

---

# 15. Implementation Strategy

Before writing code:

1. Inspect the existing IITJ One navigation structure.
2. Identify the current bottom navigation implementation.
3. Determine whether Expo Router, React Navigation, or another navigation framework is being used.
4. Identify the installed icon library.
5. Identify existing animation dependencies.
6. Locate global theme tokens.
7. Review safe-area handling.
8. Check whether the current navbar is shared across the five primary routes.

Then replace or enhance the existing bottom navigation appearance.

### Important Rules

- Preserve the five existing destinations.
- Preserve navigation behavior.
- Apply the Blue Matcha palette.
- Match the reference image's capsule design.
- Keep the active indicator animated.
- Do not unnecessarily restructure screen navigation.
- Avoid breaking existing secondary-screen navigation.
- Do not introduce unrelated UI components.
- Preserve accessibility and responsive behavior.

---

# 16. Testing Requirements

Test:

1. Rendering of all five icons.
2. Correct default Home selection.
3. Navigation to each destination.
4. Correct active capsule position.
5. Smooth indicator animation.
6. Rapid repeated tab switching.
7. Android safe-area handling.
8. iOS safe-area handling.
9. Small-screen responsiveness.
10. Tablet layout.
11. Web keyboard interaction.
12. Screen-reader labels.
13. Reduced-motion behavior.
14. Content scrolling behind the floating navbar.
15. Returning from secondary screens.
16. Theme consistency.
17. Active and inactive icon contrast.

---

# 17. Expected Deliverables

After implementation, provide:

- Reusable floating navbar component.
- Active tab indicator animation.
- Integration with the existing navigation framework.
- Blue Matcha styling.
- Responsive sizing and safe-area handling.
- Accessibility support.
- Updated or added tests.
- Summary of files changed.
- Any identified navigation limitations.

---

# 18. Final Implementation Objective

Recreate the **floating, pill-shaped, animated bottom navigation style** from the provided reference image.

Adapt it to IITJ One using:

- Deep Ocean navbar background.
- Pure White outer border.
- Five evenly spaced outline icons.
- Airy Blue active capsule.
- Deep Ocean active icon.
- White inactive icons.
- Smooth animated transitions.
- Safe-area-aware floating positioning.

**The result should feel visually close to the reference image while remaining completely consistent with IITJ One's Blue Matcha design system and existing navigation structure.**

This is the official **IITJ One Global Bottom Navigation Specification** and must be applied consistently across the application's primary screens.

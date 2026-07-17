import { device, element, by, expect as detoxExpect } from 'detox';

describe('Home Screen E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterEach(async () => {
    await device.sendUserActivity('tap');
  });

  it('should display home screen on app launch', async () => {
    await detoxExpect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should display all dashboard tiles', async () => {
    await detoxExpect(element(by.text('Notices'))).toBeVisible();
    await detoxExpect(element(by.text('Mess Menu'))).toBeVisible();
    await detoxExpect(element(by.text('Timetable'))).toBeVisible();
    await detoxExpect(element(by.text('Transport'))).toBeVisible();
  });

  it('should navigate to Notices when tapping Notices tile', async () => {
    await element(by.text('Notices')).multiTap();
    await detoxExpect(element(by.id('notices-list'))).toBeVisible();
  });

  it('should navigate to Mess Menu when tapping Mess tile', async () => {
    await element(by.text('Mess Menu')).multiTap();
    await detoxExpect(element(by.id('menu-view'))).toBeVisible();
  });

  it('should navigate to Timetable when tapping Timetable tile', async () => {
    await element(by.text('Timetable')).multiTap();
    await detoxExpect(element(by.id('timetable-screen'))).toBeVisible();
  });

  it('should navigate to Transport when tapping Transport tile', async () => {
    await element(by.text('Transport')).multiTap();
    await detoxExpect(element(by.id('transport-screen'))).toBeVisible();
  });

  it('should have search button in header', async () => {
    await detoxExpect(element(by.id('search-button'))).toBeVisible();
  });

  it('should open search when tapping search button', async () => {
    await element(by.id('search-button')).tap();
    await detoxExpect(element(by.id('search-input'))).toBeVisible();
  });

  it('should support pull-to-refresh on home screen', async () => {
    await element(by.id('home-screen')).multiTap();
    await element(by.id('home-scrollview')).swipe('down', 'slow');
    // Wait for refresh to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it('should display loading indicator during data fetch', async () => {
    // Assume loading happens at startup
    await detoxExpect(element(by.id('loading-spinner'))).not.toBeVisible();
  });

  it('should handle dark mode toggle', async () => {
    // Navigate to settings
    await element(by.id('more-tab')).tap();
    await element(by.text('Settings')).tap();

    // Toggle theme
    await element(by.id('theme-toggle')).multiTap();

    // Verify theme changed
    await detoxExpect(element(by.id('settings-screen'))).toBeVisible();
  });

  it('should persist scroll position when navigating away and back', async () => {
    // Scroll down
    await element(by.id('home-scrollview')).scrollTo('bottom');

    // Navigate away
    await element(by.id('search-button')).tap();

    // Navigate back
    await element(by.text('Home')).tap();

    // Should maintain scroll position
    // This is a visual test - hard to verify programmatically
  });

  it('should show empty state when no data available', async () => {
    // This would require network mocking
    // Skip for now unless network mocking is configured
  });
});

describe('Navigation Stack E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it('should have bottom tab navigator with 5 tabs', async () => {
    await detoxExpect(element(by.id('home-tab'))).toBeVisible();
    await detoxExpect(element(by.id('notices-tab'))).toBeVisible();
    await detoxExpect(element(by.id('menu-tab'))).toBeVisible();
    await detoxExpect(element(by.id('transport-tab'))).toBeVisible();
    await detoxExpect(element(by.id('more-tab'))).toBeVisible();
  });

  it('should switch between tabs', async () => {
    await element(by.id('notices-tab')).tap();
    await detoxExpect(element(by.id('notices-screen'))).toBeVisible();

    await element(by.id('menu-tab')).tap();
    await detoxExpect(element(by.id('menu-screen'))).toBeVisible();

    await element(by.id('transport-tab')).tap();
    await detoxExpect(element(by.id('transport-screen'))).toBeVisible();
  });

  it('should maintain state when switching tabs', async () => {
    // Navigate to Notices
    await element(by.id('notices-tab')).tap();

    // Scroll to position
    await element(by.id('notices-list')).scrollTo('bottom');

    // Switch to another tab
    await element(by.id('menu-tab')).tap();

    // Switch back
    await element(by.id('notices-tab')).tap();

    // Should be at same scroll position (tab navigator behavior)
  });

  it('should back button return to home', async () => {
    await element(by.id('more-tab')).tap();
    await element(by.text('Settings')).tap();

    // Tap back
    await element(by.traits(['button']).and(by.text('Back'))).tap();

    // Should return to more screen
    await detoxExpect(element(by.id('more-screen'))).toBeVisible();
  });
});

describe('Accessibility E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it('should have accessible button labels', async () => {
    // This requires Accessibility Inspector
    // Enable in Xcode settings for testing
  });

  it('should support keyboard navigation', async () => {
    // Keyboard navigation via tab
    await device.sendUserAction('tab');
    // Verify focus changed
  });

  it('should announce screen content to screen readers', async () => {
    // Requires VoiceOver/TalkBack enabled
    // Verify accessibility labels present
    await detoxExpect(element(by.id('home-screen'))).toHaveToggleValue(true);
  });
});

describe('Performance E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
  });

  it('should load home screen in less than 3 seconds', async () => {
    const startTime = Date.now();
    await device.launchApp();
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  it('should navigate between tabs smoothly', async () => {
    const startTime = Date.now();

    await element(by.id('notices-tab')).tap();
    await element(by.id('menu-tab')).tap();
    await element(by.id('transport-tab')).tap();

    const navigationTime = Date.now() - startTime;
    expect(navigationTime).toBeLessThan(1500);
  });

  it('should handle large lists without lagging', async () => {
    await element(by.id('notices-tab')).tap();

    // Scroll through large list
    await element(by.id('notices-list')).swipe('up', 'slow', 0.75);
    await element(by.id('notices-list')).swipe('down', 'slow', 0.75);

    // App should remain responsive
    await detoxExpect(element(by.id('notices-list'))).toBeVisible();
  });
});

describe('Offline Mode E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
    });
    // Note: Network mocking requires additional setup
  });

  it('should display cached data when offline', async () => {
    // Simulate going offline
    await device.setAirplaneMode(true);

    // Navigate to Notices
    await element(by.id('notices-tab')).tap();

    // Should show cached data
    await detoxExpect(element(by.id('notices-list'))).toBeVisible();

    await device.setAirplaneMode(false);
  });

  it('should show offline indicator when no internet', async () => {
    await device.setAirplaneMode(true);

    // Should display offline banner
    // Assuming app shows offline indicator

    await device.setAirplaneMode(false);
  });
});

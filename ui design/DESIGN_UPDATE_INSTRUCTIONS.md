# Chat-Z UI Redesign Instructions

## Mission

Update the existing React Native Expo app in `D:\pg\chat-z\ChatApp` so every current screen visually matches the approved **Blush Dusk** reference designs in:

```text
D:\pg\chat-z\ui design\blush-dusk
```

Preserve all existing features, API calls, navigation routes, Zustand stores, Socket.IO behavior, encryption, uploads, validation, and backend contracts. This is a UI implementation task, not a feature rewrite.

## Source Of Truth

Treat these PNG files as visual specifications:

| Existing screen | Reference design |
|---|---|
| `LoginScreen.jsx` | `blush-dusk/01-login.png` |
| `RegisterScreen.jsx` | `blush-dusk/02-register.png` |
| `FeedScreen.jsx` | `blush-dusk/03-feed.png` |
| `PeopleScreen.jsx` | `blush-dusk/04-friends.png` |
| `ChatListScreen.jsx` | `blush-dusk/05-chats.png` |
| `ChatScreen.jsx` | `blush-dusk/06-chat-detail.png` |
| `GroupListScreen.jsx` | `blush-dusk/07-groups.png` |
| `CreateGroupScreen.jsx` | `blush-dusk/08-create-group.png` |
| `GroupChatScreen.jsx` | `blush-dusk/09-group-chat.png` |
| `ProfileScreen.jsx` | `blush-dusk/10-profile.png` |
| `UsersScreen.jsx` | `blush-dusk/11-discover-users.png` |

Use assets from:

```text
D:\pg\chat-z\ui design\blush-dusk\assets
```

Do not use screenshots themselves as full-screen backgrounds. Rebuild layouts with native React Native components and use supplied assets only in their intended slots.

## Required Visual System

Create a shared theme file, preferably:

```text
ChatApp/src/theme/blushDusk.js
```

Use these exact base tokens:

```js
export const colors = {
  background: '#F7F1F4',
  backgroundAlt: '#F1E8ED',
  surface: '#FFF9FB',
  surfaceMuted: '#EBDDE4',
  surfaceStrong: '#DDCAD4',
  primary: '#B98298',
  primaryPressed: '#A56F86',
  primarySoft: '#E8CDD8',
  secondary: '#8798B2',
  secondarySoft: '#DCE3ED',
  text: '#382F38',
  textMuted: '#81747D',
  textSoft: '#A2979E',
  border: '#E3D5DC',
  success: '#789B8A',
  danger: '#B96F7E',
  white: '#FFFFFF',
  overlay: 'rgba(56, 47, 56, 0.42)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};

export const radii = {
  small: 10,
  medium: 16,
  large: 22,
  pill: 999,
};
```

Visual character:

- Light pearl and blush background.
- Muted mauve primary actions.
- Dusty-blue secondary accents.
- Deep plum text instead of pure black.
- Soft shadows and low-contrast borders.
- No neon, harsh pink, dominant brown, or Facebook blue.
- Avoid nested cards and excessive pills.

## Assets

Copy required assets into a project-owned folder such as:

```text
ChatApp/assets/blush-dusk/
```

Use:

- `auth-background.png`: Login and Register background.
- `profile-cover.png`: profile cover.
- `avatar-aarif.png`, `avatar-anika.png`, `avatar-farhan.png`, `avatar-nusrat.png`: fallback/demo avatars only.
- `group-*.png`: fallback/demo group avatars.
- `post-developer-desk.png`, `post-blush-workspace.png`: fallback/demo post media.
- `chat-team-collaboration.png`: fallback/demo chat media.
- `empty-friends.png`, `empty-chats.png`, `empty-groups.png`: empty states.

Remote user-uploaded images must still take priority. Use local assets only when current data has no image or when rendering static empty-state art.

Use Ionicons for interface icons. Do not recreate icons with text, emoji, CSS shapes, or generated bitmap icons.

## Shared Components

Create reusable UI primitives where useful:

```text
ChatApp/src/components/ui/Screen.jsx
ChatApp/src/components/ui/SoftHeader.jsx
ChatApp/src/components/ui/SoftInput.jsx
ChatApp/src/components/ui/PrimaryButton.jsx
ChatApp/src/components/ui/Avatar.jsx
ChatApp/src/components/ui/EmptyState.jsx
```

Do not force a refactor when a screen is too coupled. Large files such as `FeedScreen.jsx` and `ProfileScreen.jsx` may consume shared tokens directly.

## Screen Requirements

### Login And Register

- Match auth references: centered brand, welcoming heading, soft inputs, mauve primary button.
- Keep keyboard avoidance, password visibility, validation, login, and registration logic unchanged.
- Inputs must remain readable when keyboard is open.

### Feed

- Recreate header, stories, composer, people suggestions, posts, and bottom navigation hierarchy.
- Preserve all story, post, image, reaction, comment, share, edit, delete, loading, and modal states.
- Do not hardcode reference people or posts over API data.

### Friends

- Recreate search, tabs, rows, avatars, and contextual action buttons.
- Preserve Friends, Requests, Sent, and Suggestions behavior.
- Keep Accept, Decline, Add, Chat, Pending, and Unfriend states.

### Chats

- Recreate header and conversation rows.
- Preserve private/group conversations, unread counts, timestamps, refresh, and empty state.
- Do not add filtering logic unless already supported.

### Chat Detail And Group Chat

- Sent bubbles: muted mauve.
- Received bubbles: warm white.
- Preserve encryption, socket updates, uploads, typing state, timestamps, read state, modals, and composer behavior.
- Account for keyboard and safe-area insets.

### Groups And Create Group

- Match list rows, group avatars, empty state, floating action, avatar picker, member selection, and create button.
- Preserve refresh, image picker, selection, validation, navigation, and submission logic.

### Profile And User Profile

- Use supplied cover asset with correctly cropped `ImageBackground`.
- Recreate avatar overlap, profile details, owner/visitor actions, stats, and posts.
- Preserve edit, logout, friend/chat controls, post editing/deletion, and owner/visitor differences.

### Discover Users

- Match the discover people list and use existing user data/navigation.
- Preserve loading, empty state, and user-profile navigation.

## Navigation

Update `MainTabNavigator.jsx` and stack screen options:

- Background: `colors.surface`.
- Active tab: `colors.primary`.
- Inactive tab: `colors.textMuted`.
- Badge: `colors.primaryPressed`.
- Labels and icons must remain visible.
- Keep all route names and route params unchanged.

Do not create a custom absolute-positioned tab bar that overlaps content or behaves differently between emulator and APK unless thoroughly tested. Prefer React Navigation tab-bar styling.

## Cross-Device Consistency

Target reference viewport is approximately `390 x 844`, but implementation must adapt to other mobile sizes.

Required rules:

- Use `SafeAreaView` or `useSafeAreaInsets()` for top and bottom spacing.
- Use flex layout, `ScrollView`, `FlatList`, and relative sizing.
- Never position main content using fixed screen coordinates.
- Avoid fixed full-screen heights.
- Use `useWindowDimensions()` only when layout truly depends on width.
- Set horizontal page padding around `16`.
- Constrain large content width when running on tablets/web.
- Use `aspectRatio` for cover and post images.
- Use `resizeMode="cover"` for photos and cover images.
- Use `resizeMode="contain"` for empty-state illustrations.
- Minimum touch target: `44 x 44`.
- Minimum body text: `14`.
- Test long names, long bios, empty lists, loading, keyboard-open state, and image failures.

Reference spacing may scale slightly, but hierarchy, palette, component shape, and visual weight must remain equivalent.

## Emulator And APK Parity

The final design must look consistent in Expo development, Android emulator, and release APK.

- Do not use web-only CSS or DOM elements.
- Do not depend on unsupported shadows alone. Pair iOS `shadow*` styles with Android `elevation`.
- Avoid platform-specific fonts unless bundled through Expo.
- Use native-compatible `@expo/vector-icons`.
- Verify status-bar style and background on Android.
- Avoid transparent overlays that render differently without a fallback surface.
- Check keyboard behavior on Android using `KeyboardAvoidingView` plus appropriate offsets.
- Ensure bottom content clears gesture/navigation bars.
- Test image imports through static `require()` where local assets are used.
- Do not reference assets through absolute Windows paths in application code.

## Implementation Order

1. Copy assets into `ChatApp/assets/blush-dusk`.
2. Add shared theme tokens.
3. Restyle navigation and status bar.
4. Implement shared primitives.
5. Update Login and Register.
6. Update Feed and Profile.
7. Update Friends and Discover Users.
8. Update Chats and Chat Detail.
9. Update Groups, Create Group, and Group Chat.
10. Verify all loading, empty, error, modal, and keyboard states.

## Verification Commands

From:

```text
D:\pg\chat-z\ChatApp
```

Run:

```powershell
npm run build:web
npx expo start --clear
```

Also run the existing Android build workflow used by this repository. Do not claim APK parity from web preview alone.

## Visual QA Checklist

For every screen:

- Compare implementation beside matching reference PNG at `390 x 844`.
- Confirm background, spacing, typography hierarchy, radii, colors, icon size, and image crop.
- Confirm no content is clipped.
- Confirm tab bar and headers do not overlap content.
- Confirm keyboard does not cover inputs or composer.
- Confirm loading and empty states use Blush Dusk styling.
- Confirm API data still renders.
- Confirm every existing button still performs its original action.
- Confirm Android emulator and release APK screenshots match closely.

## Definition Of Done

Work is complete only when:

- All 11 existing screens match their assigned reference design.
- All current features still work.
- No backend/API/store behavior changed.
- Local assets resolve in production builds.
- Expo web build succeeds.
- Android emulator has been visually checked.
- Release APK has been installed and visually checked on a phone or emulator.
- No major visible difference exists between development and release rendering.


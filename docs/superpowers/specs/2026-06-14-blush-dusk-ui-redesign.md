# Blush Dusk UI Redesign

## Goal

Redesign every existing Chat-Z mobile screen with one calm, premium, light pink visual system while preserving all current features, navigation, API calls, state, and data behavior.

## Visual Direction

Name: **Blush Dusk**

- Airy light theme with soft dusk depth.
- Warm pearl and blush backgrounds.
- Dusty rose and muted mauve for primary actions.
- Dusty periwinkle-blue for secondary accents.
- Deep plum-gray text instead of pure black.
- Low-contrast gradients and soft shadows.
- No neon, harsh saturation, dominant brown, or aggressive contrast.

## Design Tokens

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

export const radii = {
  small: 10,
  medium: 16,
  large: 22,
  pill: 999,
};
```

Typography uses system fonts with a Manrope-like hierarchy: 30-32px display, 22-24px page title, 16-18px section title, 14-16px body, and 12-13px metadata.

## Shared Components

- `Screen`: safe-area-aware pearl background and consistent horizontal spacing.
- `SoftHeader`: title, back action, and optional trailing actions.
- `SoftInput`: blush-tinted input with deep plum text and mauve focus treatment.
- `PrimaryButton`: muted mauve fill, white label, 50-54px touch height.
- `Avatar`: consistent sizing, warm placeholder, optional status ring.
- `EmptyState`: soft icon tile, title, supporting text, and optional action.
- `ListRow`: calm grouped surface with lightweight separators.
- `BottomTabs`: warm translucent dock with mauve active state and dusty-blue inactive icons.

## Screen Designs

### Login

Pearl-to-blush background, compact Chat-Z brand mark, welcoming copy, two soft fields, mauve login button, and muted registration link. Keyboard behavior and authentication logic remain unchanged.

### Register

Same authentication shell as Login. Name, email, password, visibility control, validation, and registration behavior remain unchanged.

### Feed

Use approved master composition: compact header, stories, composer, friend suggestions, posts, and bottom tabs. Posts use warm surfaces, subtle separators, and restrained action icons. Existing story, post, comment, reaction, share, edit, delete, and modal behavior remains unchanged.

### Friends

Soft search field, horizontally scrollable blush tabs, grouped person rows, consistent avatars, mauve primary actions, dusty-blue chat actions, and muted danger controls. Existing friend/request/suggestion states remain unchanged.

### Chats

Page title and group shortcut above grouped conversation rows. Unread states use a mauve badge and stronger plum text. Empty state gets an illustrated icon tile and existing discovery action.

### Chat Detail

Warm pearl conversation background. Sent bubbles use muted mauve; received bubbles use warm white. Composer uses a soft floating bar with dusty-blue media action and mauve send action. Encryption, image upload, reply, modal, and socket behavior remain unchanged.

### Groups

Grouped list rows with soft avatar tiles and member metadata. Floating create action uses muted mauve with a gentle shadow. Existing navigation and refresh behavior remain unchanged.

### Create Group

Large blush avatar picker, warm input, member rows with mauve selection states, and anchored create button. Existing image picker, member selection, validation, and submission behavior remain unchanged.

### Group Chat

Matches Chat Detail while retaining sender names and group-specific metadata. Other-user bubbles use warm white; current-user bubbles use mauve.

### Profile

Replace saturated cover with subtle pearl-blush-periwinkle gradient. Use elevated avatar, deep plum typography, mauve edit action, outlined logout action, quiet stat strip, and Feed-style posts. Existing owner/visitor states and edit/delete actions remain unchanged.

### User List And User Profile

User list follows Friends row styling. User profile reuses Profile shell but preserves existing visitor-specific controls and data.

## Navigation

Keep all current route names and navigation behavior. Restyle stack headers and bottom tabs only. Active tab uses muted mauve; inactive tabs use dusty periwinkle-gray. Badges use deep mauve with white text.

## Accessibility

- Minimum 44px touch targets.
- Body text remains at least 14px.
- Deep plum text maintains readable contrast on pearl and blush surfaces.
- Status must not rely only on color; existing labels and icons stay visible.
- Inputs retain clear placeholders and focus states.

## Implementation Boundaries

- Do not modify backend code, API contracts, Zustand stores, socket behavior, encryption, or data models.
- Do not remove existing controls, states, modals, or flows.
- Do not manually edit lockfiles.
- Prefer shared theme constants and small reusable UI primitives.
- Large Feed and Profile files may adopt shared tokens without unrelated structural refactors.

## Verification

- Run Expo web export to catch bundling and syntax errors.
- Open key screens at a 390x844 viewport.
- Verify Login, Feed, Friends, Chats, Chat Detail, Groups, Create Group, Group Chat, Profile, and visitor profile.
- Confirm navigation, forms, scrolling, modals, image pickers, and empty/loading states remain functional.

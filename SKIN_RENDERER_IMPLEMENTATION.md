# Data-Driven Skin Renderer Implementation

## 🎉 Overview

This document describes the implementation of a fully **data-driven Skin renderer** that allows the entire chatbot UI to be controlled from the database, not just colors, but components, layout, and states.

## ✨ What Was Implemented

### 1. **Complete Skin Configuration Schema** (`backend/src/types/skinConfig.ts`)

A comprehensive TypeScript interface system that defines:

- **Theme Colors**: `primaryColor`, `secondaryColor`, `backgroundColor`, `textColor`, `borderColor`, `accentColor`
- **Component Configurations**:
  - `ButtonConfig`: Type (circular/rounded/square), size, icon, position, label
  - `WindowConfig`: Width, height, border radius, shadow, resizable
  - `HeaderConfig`: Show/hide, height, title, minimize/close buttons, avatar
  - `MessagesConfig`: Layout (bubbles/list/cards), alignment, avatars, bubble style, timestamps
  - `InputConfig`: Placeholder, send button, multiline, max length, character count
  - `QuickRepliesConfig`: Show/hide, layout (horizontal/vertical/grid), style (buttons/chips/links)
- **State Configurations**:
  - `LoadingStateConfig`: Type (dots/spinner/skeleton/pulse), color
  - `EmptyStateConfig`: Message, icon, button
  - `ErrorStateConfig`: Message, retry button

### 2. **Skin Service** (`backend/src/services/skinService.ts`)

Core service for managing skin configurations:

- **`parseSkinConfig()`**: Parses skin `theme_config` from database (supports legacy color-only format)
- **`parseVariationConfig()`**: Parses A/B variation overrides
- **`mergeSkinConfig()`**: Merges base skin with A/B variation overrides
  - Supports dot-notation overrides: `{ "theme.primaryColor": "#ff0000" }`
  - Supports structured overrides: `{ theme: { primaryColor: "#ff0000" } }`
- **`getActiveSkinForWebsite()`**: Gets active skin for a website
- **`getActiveVariationForSkin()`**: Gets active A/B variation for a skin
- **`getMergedSkinConfigForWebsite()`**: Gets complete merged configuration

### 3. **Skin Renderer Utilities** (`backend/src/services/skinRenderer.ts`)

Helper functions for rendering:

- Color getters: `getThemeColor()`
- Component config getters: `getButtonConfig()`, `getWindowConfig()`, etc.
- Utility functions: `getButtonSize()`, `getShadowCSS()`, `getPositionCSS()`
- Validation: `validateSkinConfig()`

### 4. **Updated Widget API** (`backend/src/routes/widget.ts`)

The `/api/widget/config` endpoint now:

- Returns full `skin.config` object with complete configuration
- Maintains backward compatibility with legacy `theme` object
- Includes `variation` metadata
- Automatically merges A/B variation overrides

**Response Format:**
```json
{
  "websiteId": 1,
  "websiteName": "TechStore Pro",
  "treeId": 1,
  "theme": { /* legacy format */ },
  "skin": {
    "id": 1,
    "name": "Default Theme",
    "config": { /* full MergedSkinConfig */ }
  },
  "variation": {
    "id": 1,
    "name": "Control"
  }
}
```

### 5. **React Component Library** (`frontend/components/DynamicComponents/`)

Fully data-driven React components:

- **`DynamicButton.tsx`**: Renders button based on config (type, size, icon, position)
- **`DynamicWindow.tsx`**: Renders window container (width, height, shadow, border radius)
- **`DynamicHeader.tsx`**: Renders header (title, buttons, avatar)
- **`DynamicMessages.tsx`**: Renders messages (layout, alignment, avatars, timestamps)
- **`DynamicInput.tsx`**: Renders input field (placeholder, send button, multiline)
- **`DynamicQuickReplies.tsx`**: Renders quick replies (layout, style, max visible)

### 6. **Skin Renderer Component** (`frontend/components/SkinRenderer.tsx`)

Main orchestrator component that:

- Uses all dynamic components
- Manages chat state (messages, session, loading)
- Handles API communication
- Renders UI entirely from `MergedSkinConfig`

### 7. **Updated ChatbotWidget** (`frontend/components/ChatbotWidget.tsx`)

Now uses `SkinRenderer` for data-driven UI:

- Maintains backward compatibility with legacy `theme` prop
- Automatically loads skin config from API
- Falls back to legacy theme format if no skin config available
- Supports passing `skinConfig` directly as prop

## 🔄 How It Works

### Data Flow

```
1. Widget loads → Fetches /api/widget/config
2. Backend finds website → Gets active skin
3. Backend gets A/B variation → Merges overrides
4. Returns MergedSkinConfig
5. Frontend uses SkinRenderer → Renders UI from config
6. Database changes → UI updates on next load
```

### A/B Variation Overrides

A/B variations can override any part of the base skin:

**Dot Notation:**
```json
{
  "overrides": {
    "theme.primaryColor": "#ff0000",
    "components.button.size": "small",
    "components.window.width": 320
  }
}
```

**Structured:**
```json
{
  "theme": {
    "primaryColor": "#ff0000"
  },
  "components": {
    "button": {
      "size": "small"
    }
  }
}
```

## 📝 Example Skin Configuration

```json
{
  "theme": {
    "primaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937"
  },
  "components": {
    "button": {
      "type": "circular",
      "size": "large",
      "icon": "bot",
      "position": "bottom-right"
    },
    "window": {
      "width": 384,
      "height": 600,
      "borderRadius": 8,
      "shadow": "large"
    },
    "header": {
      "show": true,
      "height": 48,
      "title": "Chat Assistant",
      "showMinimize": true,
      "showClose": true
    },
    "messages": {
      "layout": "bubbles",
      "userAlignment": "right",
      "botAlignment": "left",
      "showAvatars": true,
      "bubbleStyle": "rounded"
    },
    "input": {
      "placeholder": "Type your message...",
      "showSendButton": true,
      "allowMultiline": false
    },
    "quickReplies": {
      "show": true,
      "layout": "horizontal",
      "style": "buttons"
    }
  },
  "states": {
    "loading": {
      "type": "dots",
      "color": "primary"
    },
    "empty": {
      "message": "Starting conversation..."
    }
  }
}
```

## 🚀 Usage

### In React (Next.js)

```tsx
import ChatbotWidget from '@/components/ChatbotWidget'

<ChatbotWidget
  apiUrl="http://localhost:3001/api"
  websiteId={1}
  // Or pass skin config directly:
  // skinConfig={mergedConfig}
/>
```

### API Response

The widget automatically loads the skin config from `/api/widget/config` when `websiteId` or `domain` is provided.

## ✅ Backward Compatibility

- Legacy `theme` prop still works
- Old color-only `theme_config` format is automatically converted
- Widget API returns both `theme` (legacy) and `skin.config` (new)
- Falls back gracefully if no skin config available

## 🔮 Future Enhancements

1. **Real-time Updates**: WebSocket or polling to update UI when DB changes
2. **Skin Designer UI**: Visual editor for creating skins
3. **Component Extensions**: Custom component types
4. **Mobile Support**: React Native renderer
5. **Standalone Widget**: Update `widget.js` to use skin renderer

## 📁 File Structure

```
backend/
  src/
    types/
      skinConfig.ts          # TypeScript interfaces
    services/
      skinService.ts          # Core skin logic
      skinRenderer.ts         # Renderer utilities
    routes/
      widget.ts              # Updated API endpoint

frontend/
  types/
    skinConfig.ts            # Frontend types (matches backend)
  components/
    SkinRenderer.tsx         # Main renderer component
    DynamicComponents/
      DynamicButton.tsx
      DynamicWindow.tsx
      DynamicHeader.tsx
      DynamicMessages.tsx
      DynamicInput.tsx
      DynamicQuickReplies.tsx
    ChatbotWidget.tsx        # Updated to use SkinRenderer
```

## 🎯 Key Features

✅ **Fully Data-Driven**: Entire UI controlled from database  
✅ **A/B Overrides**: Variations can override any skin property  
✅ **Backward Compatible**: Works with existing theme system  
✅ **Type-Safe**: Full TypeScript support  
✅ **Extensible**: Easy to add new components/states  
✅ **React & Web Ready**: Works in Next.js and can extend to mobile  

## 🧪 Testing

To test the implementation:

1. Create a skin in the database with full `theme_config`
2. Create an A/B variation with `variation_config` overrides
3. Load widget with `websiteId` or `domain`
4. Verify UI matches configuration
5. Update database → Reload → UI updates

---

**Status**: ✅ Core implementation complete  
**Next**: Standalone widget.js update, real-time updates, designer UI


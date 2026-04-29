/**
 * Data-Driven Skin Configuration Types
 * 
 * This defines the complete structure for a skin that can control
 * the entire UI, not just colors, but components, layout, and states.
 */

// Theme colors
export interface ThemeColors {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
}

// Button component configuration
export interface ButtonConfig {
  type?: 'circular' | 'rounded' | 'square';
  size?: 'small' | 'medium' | 'large';
  icon?: 'bot' | 'chat' | 'message' | 'custom' | null;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showLabel?: boolean;
  label?: string;
}

// Window component configuration
export interface WindowConfig {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  borderRadius?: number;
  shadow?: 'none' | 'small' | 'medium' | 'large';
  resizable?: boolean;
}

// Header component configuration
export interface HeaderConfig {
  show?: boolean;
  height?: number;
  showTitle?: boolean;
  title?: string;
  showMinimize?: boolean;
  showClose?: boolean;
  showAvatar?: boolean;
  avatarIcon?: string;
}

// Messages component configuration
export interface MessagesConfig {
  layout?: 'bubbles' | 'list' | 'cards';
  userAlignment?: 'left' | 'right';
  botAlignment?: 'left' | 'right';
  showAvatars?: boolean;
  userAvatar?: string;
  botAvatar?: string;
  bubbleStyle?: 'rounded' | 'square' | 'minimal';
  showTimestamps?: boolean;
  timestampFormat?: 'relative' | 'absolute';
}

// Input component configuration
export interface InputConfig {
  placeholder?: string;
  showSendButton?: boolean;
  sendButtonIcon?: string;
  allowMultiline?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  autoFocus?: boolean;
}

// Quick Replies configuration
export interface QuickRepliesConfig {
  show?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  maxVisible?: number;
  style?: 'buttons' | 'chips' | 'links';
}

// Loading state configuration
export interface LoadingStateConfig {
  type?: 'dots' | 'spinner' | 'skeleton' | 'pulse';
  color?: 'primary' | 'secondary' | 'custom';
  customColor?: string;
  message?: string;
}

// Empty state configuration
export interface EmptyStateConfig {
  message?: string;
  showIcon?: boolean;
  icon?: string;
  showButton?: boolean;
  buttonText?: string;
}

// Error state configuration
export interface ErrorStateConfig {
  message?: string;
  showRetry?: boolean;
  retryText?: string;
}

// All component configurations
export interface ComponentsConfig {
  button?: ButtonConfig;
  window?: WindowConfig;
  header?: HeaderConfig;
  messages?: MessagesConfig;
  input?: InputConfig;
  quickReplies?: QuickRepliesConfig;
}

// All state configurations
export interface StatesConfig {
  loading?: LoadingStateConfig;
  empty?: EmptyStateConfig;
  error?: ErrorStateConfig;
}

// Complete Skin Configuration
export interface SkinConfig {
  theme?: ThemeColors;
  components?: ComponentsConfig;
  states?: StatesConfig;
  version?: string; // Schema version for future compatibility
}

// A/B Variation Overrides
// Uses dot notation for nested property overrides
export interface VariationOverrides {
  overrides?: Record<string, any>; // e.g., { "theme.primaryColor": "#ff0000", "components.button.size": "small" }
  // Or structured overrides
  theme?: Partial<ThemeColors>;
  components?: Partial<ComponentsConfig>;
  states?: Partial<StatesConfig>;
}

// Merged configuration (base skin + variation overrides)
export interface MergedSkinConfig extends SkinConfig {
  _meta?: {
    skinId: number;
    skinName: string;
    variationId?: number;
    variationName?: string;
    mergedAt: Date;
  };
}

// Default configuration
export const DEFAULT_SKIN_CONFIG: SkinConfig = {
  theme: {
    primaryColor: '#6366f1',
    secondaryColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderColor: '#e5e7eb',
    accentColor: '#6366f1',
  },
  components: {
    button: {
      type: 'circular',
      size: 'large',
      icon: 'bot',
      position: 'bottom-right',
      showLabel: false,
    },
    window: {
      width: 384,
      height: 600,
      minWidth: 320,
      minHeight: 400,
      borderRadius: 8,
      shadow: 'large',
      resizable: false,
    },
    header: {
      show: true,
      height: 48,
      showTitle: true,
      title: 'Chat Assistant',
      showMinimize: true,
      showClose: true,
      showAvatar: false,
    },
    messages: {
      layout: 'bubbles',
      userAlignment: 'right',
      botAlignment: 'left',
      showAvatars: true,
      bubbleStyle: 'rounded',
      showTimestamps: false,
    },
    input: {
      placeholder: 'Type your message...',
      showSendButton: true,
      allowMultiline: false,
      autoFocus: true,
    },
    quickReplies: {
      show: true,
      layout: 'horizontal',
      style: 'buttons',
    },
  },
  states: {
    loading: {
      type: 'dots',
      color: 'primary',
    },
    empty: {
      message: 'Starting conversation...',
      showIcon: false,
    },
    error: {
      message: "Sorry, I'm having trouble. Please try again.",
      showRetry: true,
      retryText: 'Retry',
    },
  },
  version: '1.0.0',
};


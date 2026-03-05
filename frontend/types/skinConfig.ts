/**
 * Data-Driven Skin Configuration Types
 * Frontend version - matches backend types
 */

export interface ThemeColors {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  accentColor?: string;
}

export interface ButtonConfig {
  type?: 'circular' | 'rounded' | 'square';
  size?: 'small' | 'medium' | 'large';
  icon?: 'bot' | 'chat' | 'message' | 'custom' | null;
  /** URL to image for chat icon when icon is 'custom' */
  customIconUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showLabel?: boolean;
  label?: string;
}

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

export interface MessagesConfig {
  layout?: 'bubbles' | 'list' | 'cards';
  userAlignment?: 'left' | 'right';
  botAlignment?: 'left' | 'right';
  showAvatars?: boolean;
  /** When false, hide the chatbot avatar in messages. Defaults to same as showAvatars. */
  showBotAvatar?: boolean;
  /** When false, hide the user avatar in messages. Defaults to same as showAvatars. */
  showUserAvatar?: boolean;
  userAvatar?: string;
  botAvatar?: string;
  bubbleStyle?: 'rounded' | 'square' | 'minimal';
  showTimestamps?: boolean;
  timestampFormat?: 'relative' | 'absolute';
}

export interface InputConfig {
  placeholder?: string;
  showSendButton?: boolean;
  sendButtonIcon?: string;
  allowMultiline?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  autoFocus?: boolean;
}

export interface QuickRepliesConfig {
  show?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  maxVisible?: number;
  style?: 'buttons' | 'chips' | 'links';
}

export interface LoadingStateConfig {
  type?: 'dots' | 'spinner' | 'skeleton' | 'pulse';
  color?: 'primary' | 'secondary' | 'custom';
  customColor?: string;
  message?: string;
}

export interface EmptyStateConfig {
  message?: string;
  showIcon?: boolean;
  icon?: string;
  showButton?: boolean;
  buttonText?: string;
}

export interface ErrorStateConfig {
  message?: string;
  showRetry?: boolean;
  retryText?: string;
}

export interface ComponentsConfig {
  button?: ButtonConfig;
  window?: WindowConfig;
  header?: HeaderConfig;
  messages?: MessagesConfig;
  input?: InputConfig;
  quickReplies?: QuickRepliesConfig;
}

export interface StatesConfig {
  loading?: LoadingStateConfig;
  empty?: EmptyStateConfig;
  error?: ErrorStateConfig;
}

export interface SkinConfig {
  theme?: ThemeColors;
  components?: ComponentsConfig;
  states?: StatesConfig;
  version?: string;
}

export interface VariationOverrides {
  overrides?: Record<string, any>;
  theme?: Partial<ThemeColors>;
  components?: Partial<ComponentsConfig>;
  states?: Partial<StatesConfig>;
}

export interface MergedSkinConfig extends SkinConfig {
  _meta?: {
    skinId: number;
    skinName: string;
    variationId?: number;
    variationName?: string;
    mergedAt: Date | string;
  };
}


export type ActionType =
  | 'custom_action'
  | 'custom_buttons'
  | 'web_search'
  | 'collect_leads'
  | 'escalate_human'
  | 'slack'
  | 'calendly'
  | 'stripe'
  | 'shopify'
  | 'salesforce'

export type ExecutionMode = 'server_side' | 'client_side'
export type InputFieldType = 'string' | 'number' | 'boolean'

export interface ActionInputField {
  name: string
  description: string
  required: boolean
  type: InputFieldType
}

export interface ActionKeyValuePair {
  key: string
  value: string
  source?: 'user_input' | 'static' | 'context' | 'from_context'
  userInputField?: string
  contextKey?: 'chatbot_name' | 'current_url' | 'session_id' | string
}

export interface ActionPathParam {
  key: string
  source: 'static' | 'user_input' | 'from_context'
  value: string
}

export interface CustomActionConfig {
  executionMode: ExecutionMode
  apiUrl?: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  pathParams?: ActionPathParam[]
  headers?: ActionKeyValuePair[]
  queryParams?: ActionKeyValuePair[]
  bodyParams?: ActionKeyValuePair[]
  triggerInstructions: string
  actionFunctionName: string
  inputFields: ActionInputField[]
  responseMapping?: string
}

export interface CustomButtonsButton {
  id: string
  label: string
  url: string
  openInNewTab: boolean
}

export interface CustomButtonsConfig {
  buttons: CustomButtonsButton[]
  triggerInstructions: string
}

export type SupportedActionConfig = CustomActionConfig | CustomButtonsConfig

export interface ChatbotAction {
  id: string
  chatbotId: number
  type: ActionType
  name: string
  isEnabled: boolean
  config: SupportedActionConfig
  createdAt: string
  updatedAt: string
}

export interface ActionsByType {
  [key: string]: ChatbotAction[]
}

export interface ActionTypeMeta {
  type: ActionType
  title: string
  description: string
  comingSoon: boolean
}

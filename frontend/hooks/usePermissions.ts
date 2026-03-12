'use client'

import { useDashboardOptional } from '@/contexts/DashboardContext'
import { useAuth } from '@/contexts/AuthContext'
import { PLANS } from '@/lib/plans'

export type FeatureKey = 
  | 'createAgent' 
  | 'inviteMembers' 
  | 'apiAccess' 
  | 'uploadFiles'
  | 'createQA'
  | 'connectWebsite'
  | 'connectApps'
  | 'analytics'
  | 'chatLogs'
  | 'customBranding'
  | 'advancedSettings'

export interface PermissionCheck {
  allowed: boolean
  reason?: string
  upgradeRequired: boolean
  currentPlan: string
  suggestedPlan?: string
  currentUsage?: number
  maxAllowed?: number
}

export interface UpgradeContext {
  feature: string
  currentPlan: string
  suggestedPlan: string
  reason: string
  benefits: string[]
}

/**
 * Comprehensive permissions hook that provides feature gating based on subscription plans
 * and usage limits. Returns permission checks and upgrade prompts.
 */
export function usePermissions() {
  // Use optional context so we never throw when outside DashboardProvider
  const dashboard = useDashboardOptional()
  const workspaceLimits = dashboard?.workspaceLimits ?? null
  const currentWorkspace = dashboard?.currentWorkspace ?? null
  const contextAvailable = dashboard != null

  const { user } = useAuth()

  const currentPlan = workspaceLimits?.plan || currentWorkspace?.plan || 'free'
  const planInfo = PLANS.find(p => p.name === currentPlan) || PLANS[0]
  const isOwner = currentWorkspace?.role === 'owner'

  /**
   * Check if a specific feature is allowed for the current plan and usage
   */
  const checkFeature = (feature: FeatureKey): PermissionCheck => {
    const baseCheck = {
      currentPlan,
      upgradeRequired: false,
      allowed: true
    }

    // Role-based restrictions (members can't access certain features)
    if (!isOwner && ['inviteMembers', 'apiAccess', 'customBranding', 'advancedSettings'].includes(feature)) {
      return {
        ...baseCheck,
        allowed: false,
        reason: 'Only workspace owners can access this feature',
        upgradeRequired: false
      }
    }

    switch (feature) {
      case 'createAgent':
        if (!workspaceLimits) {
          return { ...baseCheck, allowed: false, reason: 'Loading limits...' }
        }
        return {
          ...baseCheck,
          allowed: workspaceLimits.canCreateAgent,
          reason: workspaceLimits.canCreateAgent ? undefined : `You've reached your agent limit (${workspaceLimits.currentAgents}/${workspaceLimits.maxAgents}). Upgrade to create more agents.`,
          upgradeRequired: !workspaceLimits.canCreateAgent,
          suggestedPlan: getSuggestedPlanForAgents(workspaceLimits.currentAgents + 1),
          currentUsage: workspaceLimits.currentAgents,
          maxAllowed: workspaceLimits.maxAgents
        }

      case 'inviteMembers':
        if (!workspaceLimits) return { ...baseCheck, allowed: false, reason: 'Loading limits...' }
        return {
          ...baseCheck,
          allowed: workspaceLimits.canInviteMember,
          reason: workspaceLimits.canInviteMember ? undefined : `You've reached your member limit (${workspaceLimits.currentMembers}/${workspaceLimits.maxMembers}). Upgrade to invite more team members.`,
          upgradeRequired: !workspaceLimits.canInviteMember,
          suggestedPlan: getSuggestedPlanForMembers(workspaceLimits.currentMembers + 1),
          currentUsage: workspaceLimits.currentMembers,
          maxAllowed: workspaceLimits.maxMembers
        }

      case 'apiAccess':
        if (!workspaceLimits) return { ...baseCheck, allowed: false, reason: 'Loading limits...' }
        const hasApiAccess = workspaceLimits.hasApiAccess
        return {
          ...baseCheck,
          allowed: hasApiAccess,
          reason: hasApiAccess ? undefined : 'API access requires Standard plan or higher. Upgrade to create and manage API keys.',
          upgradeRequired: !hasApiAccess,
          suggestedPlan: 'standard' // API access starts with Standard plan
        }

      case 'uploadFiles':
      case 'createQA':
      case 'connectWebsite':
        // These features are available to all plans but may have storage limits
        // Storage limits are checked server-side during upload
        return baseCheck

      case 'connectApps':
        // Connected apps might be a premium feature
        const allowConnectedApps = currentPlan !== 'free'
        return {
          ...baseCheck,
          allowed: allowConnectedApps,
          reason: allowConnectedApps ? undefined : 'Connected apps require a paid plan',
          upgradeRequired: !allowConnectedApps,
          suggestedPlan: 'hobby'
        }

      case 'analytics':
      case 'chatLogs':
        // Analytics might be limited on free plan
        const allowAnalytics = currentPlan !== 'free'
        return {
          ...baseCheck,
          allowed: allowAnalytics,
          reason: allowAnalytics ? undefined : 'Advanced analytics require a paid plan',
          upgradeRequired: !allowAnalytics,
          suggestedPlan: 'hobby'
        }

      case 'customBranding':
        // Custom branding for higher tier plans
        const allowBranding = ['standard', 'pro'].includes(currentPlan)
        return {
          ...baseCheck,
          allowed: allowBranding,
          reason: allowBranding ? undefined : 'Custom branding requires Standard plan or higher',
          upgradeRequired: !allowBranding,
          suggestedPlan: 'standard'
        }

      case 'advancedSettings':
        // Advanced settings for pro plans
        const allowAdvanced = currentPlan === 'pro'
        return {
          ...baseCheck,
          allowed: allowAdvanced,
          reason: allowAdvanced ? undefined : 'Advanced settings require Pro plan',
          upgradeRequired: !allowAdvanced,
          suggestedPlan: 'pro'
        }

      default:
        return baseCheck
    }
  }

  /**
   * Get upgrade context for showing upgrade modals
   */
  const getUpgradeContext = (feature: FeatureKey): UpgradeContext | null => {
    const check = checkFeature(feature)
    if (!check.upgradeRequired || !check.suggestedPlan) return null

    const suggestedPlanInfo = PLANS.find(p => p.name === check.suggestedPlan)
    if (!suggestedPlanInfo) return null

    const featureLabels: Record<FeatureKey, string> = {
      createAgent: 'Create Additional Agents',
      inviteMembers: 'Invite Team Members',
      apiAccess: 'API Access',
      uploadFiles: 'Upload Files',
      createQA: 'Q&A Training',
      connectWebsite: 'Website Integration',
      connectApps: 'Connected Apps',
      analytics: 'Advanced Analytics',
      chatLogs: 'Chat History',
      customBranding: 'Custom Branding',
      advancedSettings: 'Advanced Settings'
    }

    const benefits: Record<string, string[]> = {
      hobby: [
        '500 monthly credits',
        'Up to 2 team members',
        '10MB training data',
        'Connected apps access',
        'Advanced analytics'
      ],
      standard: [
        '4,000 monthly credits',
        'Up to 3 team members', 
        '20MB training data',
        'API access included',
        'Custom branding options',
        'Priority support'
      ],
      pro: [
        '15,000 monthly credits',
        'Up to 5 team members',
        '40MB training data',
        'Full API access',
        'Advanced settings',
        'Custom integrations',
        'Dedicated support'
      ]
    }

    return {
      feature: featureLabels[feature] || feature,
      currentPlan: planInfo.displayName,
      suggestedPlan: suggestedPlanInfo.displayName,
      reason: check.reason || `Upgrade to ${suggestedPlanInfo.displayName} to unlock this feature`,
      benefits: benefits[check.suggestedPlan] || []
    }
  }

  /**
   * Helper to get suggested plan based on agent requirements
   */
  const getSuggestedPlanForAgents = (requiredAgents: number): string => {
    // Currently all plans support 1 agent, so suggest based on other features
    if (currentPlan === 'free') return 'hobby'
    return currentPlan
  }

  /**
   * Helper to get suggested plan based on member requirements
   */
  const getSuggestedPlanForMembers = (requiredMembers: number): string => {
    if (requiredMembers <= 2) return 'hobby'
    if (requiredMembers <= 3) return 'standard'
    return 'pro'
  }

  /**
   * Check multiple features at once
   */
  const checkFeatures = (features: FeatureKey[]): Record<FeatureKey, PermissionCheck> => {
    return features.reduce((acc, feature) => {
      acc[feature] = checkFeature(feature)
      return acc
    }, {} as Record<FeatureKey, PermissionCheck>)
  }

  /**
   * Get current plan information
   */
  const getCurrentPlan = () => planInfo

  /**
   * Check if user has any plan limits that might need attention
   */
  const getPlanWarnings = (): Array<{ type: string, message: string, action?: string }> => {
    const warnings: Array<{ type: string, message: string, action?: string }> = []
    
    if (!workspaceLimits) return warnings

    // Agent limit warning
    if (workspaceLimits.currentAgents >= workspaceLimits.maxAgents * 0.8) {
      warnings.push({
        type: 'agent-limit',
        message: `You're using ${workspaceLimits.currentAgents} of ${workspaceLimits.maxAgents} agents`,
        action: workspaceLimits.currentAgents >= workspaceLimits.maxAgents ? 'upgrade' : 'warning'
      })
    }

    // Member limit warning
    if (workspaceLimits.currentMembers >= workspaceLimits.maxMembers * 0.8) {
      warnings.push({
        type: 'member-limit',
        message: `You're using ${workspaceLimits.currentMembers} of ${workspaceLimits.maxMembers} members`,
        action: workspaceLimits.currentMembers >= workspaceLimits.maxMembers ? 'upgrade' : 'warning'
      })
    }

    return warnings
  }

  return {
    checkFeature,
    checkFeatures,
    getUpgradeContext,
    getCurrentPlan,
    getPlanWarnings,
    currentPlan,
    isOwner,
    workspaceLimits
  }
}
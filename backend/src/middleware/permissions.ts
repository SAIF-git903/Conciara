/**
 * Permission middleware for API endpoints - enforces feature restrictions based on subscription plans
 */

import { Request, Response, NextFunction } from 'express';
import { getPlanForWorkspace, checkAgentLimit, checkMemberLimit, workspaceHasApiAccess } from '../domains/billing/plan.service.js';
import { getWorkspaceMember } from '../domains/workspace/workspace.service.js';
import { PlanLimitError } from '../common/errors/planLimit.js';

export type PermissionFeature = 
  | 'createAgent'
  | 'inviteMembers'
  | 'apiAccess'
  | 'uploadFiles'
  | 'advancedAnalytics'
  | 'customBranding'
  | 'connectedApps';

interface PermissionOptions {
  /** Required feature for this endpoint */
  feature: PermissionFeature;
  /** Whether workspace owner role is required */
  requireOwner?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Middleware factory to check permissions for specific features
 */
export function requirePermission(options: PermissionOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      const userId = req.user?.id;

      if (isNaN(workspaceId)) {
        return res.status(400).json({ error: 'Invalid workspace ID' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Check workspace membership
      const member = await getWorkspaceMember(workspaceId, userId);
      if (!member) {
        return res.status(403).json({ error: 'Access denied to this workspace' });
      }

      // Check owner requirement
      if (options.requireOwner && member.role !== 'owner') {
        return res.status(403).json({ 
          error: 'Only workspace owners can access this feature',
          code: 'OWNER_REQUIRED'
        });
      }

      // Check feature-specific permissions
      const hasPermission = await checkFeaturePermission(workspaceId, options.feature);
      if (!hasPermission.allowed) {
        const errorCode = getErrorCodeForFeature(options.feature);
        return res.status(hasPermission.upgradeRequired ? 402 : 403).json({
          error: options.errorMessage || hasPermission.reason,
          code: errorCode,
          feature: options.feature,
          upgradeRequired: hasPermission.upgradeRequired,
          currentUsage: hasPermission.currentUsage,
          maxAllowed: hasPermission.maxAllowed
        });
      }

      // Store permission info in request for later use
      req.permission = {
        workspaceId,
        feature: options.feature,
        memberRole: member.role
      };

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Check if a workspace has permission for a specific feature
 */
async function checkFeaturePermission(workspaceId: number, feature: PermissionFeature) {
  const plan = await getPlanForWorkspace(workspaceId);

  switch (feature) {
    case 'createAgent':
      const agentLimit = await checkAgentLimit(workspaceId);
      return {
        allowed: agentLimit.allowed,
        reason: agentLimit.allowed ? undefined : 'Agent limit reached for your plan',
        upgradeRequired: !agentLimit.allowed,
        currentUsage: agentLimit.current,
        maxAllowed: agentLimit.max
      };

    case 'inviteMembers':
      const memberLimit = await checkMemberLimit(workspaceId);
      return {
        allowed: memberLimit.allowed,
        reason: memberLimit.allowed ? undefined : 'Member limit reached for your plan',
        upgradeRequired: !memberLimit.allowed,
        currentUsage: memberLimit.current,
        maxAllowed: memberLimit.max
      };

    case 'apiAccess':
      const hasApiAccess = await workspaceHasApiAccess(workspaceId);
      return {
        allowed: hasApiAccess,
        reason: hasApiAccess ? undefined : 'API access not included in your plan',
        upgradeRequired: !hasApiAccess
      };

    case 'uploadFiles':
      // File uploads are allowed for all plans but have storage limits (checked during upload)
      return { allowed: true };

    case 'advancedAnalytics':
      // Advanced analytics for paid plans only
      const allowAnalytics = plan.name !== 'free';
      return {
        allowed: allowAnalytics,
        reason: allowAnalytics ? undefined : 'Advanced analytics require a paid plan',
        upgradeRequired: !allowAnalytics
      };

    case 'customBranding':
      // Custom branding for Standard+ plans
      const allowBranding = ['standard', 'pro'].includes(plan.name);
      return {
        allowed: allowBranding,
        reason: allowBranding ? undefined : 'Custom branding requires Standard plan or higher',
        upgradeRequired: !allowBranding
      };

    case 'connectedApps':
      // Connected apps for paid plans
      const allowApps = plan.name !== 'free';
      return {
        allowed: allowApps,
        reason: allowApps ? undefined : 'Connected apps require a paid plan',
        upgradeRequired: !allowApps
      };

    default:
      return { allowed: true };
  }
}

/**
 * Get standardized error codes for different features
 */
function getErrorCodeForFeature(feature: PermissionFeature): string {
  const errorCodes: Record<PermissionFeature, string> = {
    createAgent: 'AGENT_LIMIT_EXCEEDED',
    inviteMembers: 'MEMBER_LIMIT_EXCEEDED',
    apiAccess: 'API_ACCESS_REQUIRED',
    uploadFiles: 'STORAGE_LIMIT_EXCEEDED',
    advancedAnalytics: 'ANALYTICS_ACCESS_REQUIRED',
    customBranding: 'BRANDING_ACCESS_REQUIRED',
    connectedApps: 'APPS_ACCESS_REQUIRED'
  };
  return errorCodes[feature] || 'PERMISSION_DENIED';
}

/**
 * Middleware to check if workspace has sufficient credits for an operation
 */
export function requireCredits(minCredits: number = 1) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      
      if (isNaN(workspaceId)) {
        return res.status(400).json({ error: 'Invalid workspace ID' });
      }

      // Import credits service dynamically to avoid circular dependencies
      const { getWorkspaceCredits } = await import('../domains/billing/credits.service.js');
      const credits = await getWorkspaceCredits(workspaceId);
      
      const availableCredits = credits.monthlyRemaining + credits.bonusCredits;
      
      if (availableCredits < minCredits) {
        return res.status(402).json({
          error: 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          required: minCredits,
          available: availableCredits,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('Credits middleware error:', error);
      return res.status(500).json({ error: 'Credit check failed' });
    }
  };
}

/**
 * Middleware to validate file upload permissions and size limits
 */
export function requireFileUploadPermission() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId, 10);
      const agentId = parseInt(req.params.agentId, 10);
      
      if (isNaN(workspaceId) || isNaN(agentId)) {
        return res.status(400).json({ error: 'Invalid workspace or agent ID' });
      }

      // Check if file size is provided (should be in request body or headers)
      const fileSize = req.body?.fileSize || req.headers['content-length'];
      if (!fileSize) {
        return res.status(400).json({ error: 'File size not provided' });
      }

      const fileSizeBytes = BigInt(fileSize);
      
      // Import plan service to check training bytes limit
      const { checkTrainingBytesLimit } = await import('../domains/billing/plan.service.js');
      const storageCheck = await checkTrainingBytesLimit(workspaceId, agentId, fileSizeBytes);
      
      if (!storageCheck.allowed) {
        return res.status(402).json({
          error: 'Storage limit exceeded',
          code: 'STORAGE_LIMIT_EXCEEDED',
          current: storageCheck.current.toString(),
          max: storageCheck.max.toString(),
          additional: fileSizeBytes.toString(),
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('File upload permission error:', error);
      return res.status(500).json({ error: 'File upload permission check failed' });
    }
  };
}

// Extend Express Request type to include permission info
declare global {
  namespace Express {
    interface Request {
      permission?: {
        workspaceId: number;
        feature: PermissionFeature;
        memberRole: string;
      };
    }
  }
}
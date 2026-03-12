'use client'

import PermissionButton from './PermissionButton'
import PermissionGate from './PermissionGate'
import { Plus, Users, Key } from 'lucide-react'

/**
 * Test component to verify permission system is working
 */
export default function PermissionTest() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900">Permission System Test</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Create Agent (Plan Limited)</h4>
          <p className="text-xs text-gray-500 mb-2">Click to see upgrade modal if limit reached</p>
          <PermissionButton
            feature="createAgent"
            onClick={() => {}}
            variant="primary"
            showCrownIcon
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </PermissionButton>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Invite Members (Plan Limited)</h4>
          <p className="text-xs text-gray-500 mb-2">Click to see upgrade modal if limit reached</p>
          <PermissionButton
            feature="inviteMembers"
            onClick={() => {}}
            variant="secondary"
            showCrownIcon
          >
            <Users className="w-4 h-4" />
            Invite Members
          </PermissionButton>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Create API Key (Plan Gated)</h4>
          <p className="text-xs text-gray-500 mb-2">Click to see upgrade modal if API access not available</p>
          <PermissionButton
            feature="apiAccess"
            onClick={() => {}}
            variant="outline"
            showCrownIcon
          >
            <Key className="w-4 h-4" />
            Create API Key
          </PermissionButton>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">API Access Status (Plan Gated)</h4>
          <PermissionGate 
            feature="apiAccess"
            showUpgradeButton
            upgradeButtonText="Upgrade for API Access"
            fallback={
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">API access requires a Standard plan or higher.</p>
              </div>
            }
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">API access is available! You can create API keys.</p>
              </div>
            </div>
          </PermissionGate>
        </div>
      </div>
    </div>
  )
}
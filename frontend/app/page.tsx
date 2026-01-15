'use client'

import { useState } from 'react'
import DialogTreeManager from '@/components/DialogTreeManager'
import MultiTenantNavigator from '@/components/MultiTenantNavigator'
import { DialogTree, Website } from '@/lib/api'

export default function Home() {
  const [selectedTree, setSelectedTree] = useState<DialogTree | null>(null)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Multi-Tenant Navigator Sidebar */}
      <div className="w-80 flex-shrink-0">
        <MultiTenantNavigator 
          onSelectTree={setSelectedTree}
          selectedTreeId={selectedTree?.id || null}
          onWebsiteChange={setSelectedWebsite}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {selectedTree ? (
          <DialogTreeManager initialTree={selectedTree} website={selectedWebsite} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Dialog Tree</h3>
              <p className="text-gray-600 text-sm">
                Navigate through the multi-tenant structure on the left to select a dialog tree to manage.
              </p>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h4 className="font-semibold text-blue-900 mb-2 text-sm">Structure:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <strong>Customer Type</strong> (e.g., Winery)</li>
                  <li>• <strong>Website</strong> (e.g., Domaine Carneros)</li>
                  <li>• <strong>Skin</strong> (React theme/page)</li>
                  <li>• <strong>A/B Variation</strong> (variation of a skin)</li>
                  <li>• <strong>Dialog Tree</strong> (conversation flow)</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

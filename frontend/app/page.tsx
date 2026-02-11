'use client'

import { useState, useEffect, useRef } from 'react'
import DialogTreeManager from '@/components/DialogTreeManager'
import MultiTenantNavigator from '@/components/MultiTenantNavigator'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppHeader from '@/components/AppHeader'
import { DialogTree, Website } from '@/lib/api'

export default function Home() {
  const [selectedTree, setSelectedTree] = useState<DialogTree | null>(null)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        <AppHeader />
        <main className="flex-1 flex">
          {/* Multi-Tenant Navigator Sidebar */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white">
            <MultiTenantNavigator 
              onSelectTree={setSelectedTree}
              selectedTreeId={selectedTree?.id || null}
              onWebsiteChange={setSelectedWebsite}
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            {selectedTree ? (
              <DialogTreeManager initialTree={selectedTree} website={selectedWebsite} />
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center max-w-lg mx-auto">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6 shadow-sm">
                    <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to ConversaTree</h3>
                  <p className="text-gray-600 mb-6">
                    Select a dialog tree from the sidebar to start managing your conversation flows.
                  </p>
                  <div className="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl text-left shadow-sm">
                    <h4 className="font-semibold text-indigo-900 mb-3 text-sm uppercase tracking-wide">Hierarchy Structure</h4>
                    <ul className="text-sm text-indigo-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">1.</span>
                        <span><strong>Customer Type</strong> - Top-level category (e.g., Winery, E-commerce)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">2.</span>
                        <span><strong>Website</strong> - Domain/website (e.g., domaine-carneros.com)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">3.</span>
                        <span><strong>Skin</strong> - UI theme configuration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">4.</span>
                        <span><strong>A/B Variation</strong> - Test different variations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold text-indigo-600">5.</span>
                        <span><strong>Dialog Tree</strong> - Conversation flow nodes</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import UpgradeModal from '@/components/UpgradeModal'
import type { UpgradeContext as UpgradeContextType } from '@/hooks/usePermissions'

interface UpgradeContextState {
  showUpgrade: (context: UpgradeContextType) => void
  hideUpgrade: () => void
  isUpgradeModalOpen: boolean
}

const UpgradeContext = createContext<UpgradeContextState | undefined>(undefined)

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [upgradeContext, setUpgradeContext] = useState<UpgradeContextType | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const showUpgrade = (context: UpgradeContextType) => {
    setUpgradeContext(context)
    setIsOpen(true)
  }

  const hideUpgrade = () => {
    setIsOpen(false)
    setUpgradeContext(null)
  }

  return (
    <UpgradeContext.Provider 
      value={{ 
        showUpgrade, 
        hideUpgrade, 
        isUpgradeModalOpen: isOpen 
      }}
    >
      {children}
      {upgradeContext && (
        <UpgradeModal
          open={isOpen}
          onClose={hideUpgrade}
          context={upgradeContext}
        />
      )}
    </UpgradeContext.Provider>
  )
}

export function useUpgrade() {
  const context = useContext(UpgradeContext)
  if (context === undefined) {
    // Return a no-op implementation if context is not available
    return {
      showUpgrade: () => {},
      hideUpgrade: () => {},
      isUpgradeModalOpen: false
    }
  }
  return context
}
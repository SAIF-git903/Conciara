'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Globe, ChevronDown, Check } from 'lucide-react'

export default function DomainSelector() {
  const { user, isAdmin, selectedDomainId, setSelectedDomainId, availableDomains } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Auto-select if only one domain (must be before early return to follow Rules of Hooks)
  useEffect(() => {
    if (availableDomains.length === 1 && selectedDomainId !== availableDomains[0].id) {
      setSelectedDomainId(availableDomains[0].id)
    }
  }, [availableDomains, selectedDomainId, setSelectedDomainId])

  if (!user || availableDomains.length === 0) return null

  const selectedDomain = availableDomains.find(d => d.id === selectedDomainId) || availableDomains[0]

  const handleSelect = (domainId: number) => {
    setSelectedDomainId(domainId)
    setIsOpen(false)
  }

  // If only one domain, show it without dropdown
  if (availableDomains.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200">
        <Globe className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
          {selectedDomain.domain || selectedDomain.name}
        </span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-w-[160px]"
        aria-label="Select domain"
      >
        <Globe className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm font-medium text-gray-700 truncate flex-1 text-left">
          {selectedDomain?.domain || selectedDomain?.name || 'Select Domain'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-[300px] overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {isAdmin ? 'All Domains' : 'Your Domains'}
              </div>
            </div>
            <div className="py-1">
              {availableDomains.map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => handleSelect(domain.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {domain.domain || domain.name}
                    </div>
                    {domain.name !== domain.domain && (
                      <div className="text-xs text-gray-500 truncate">{domain.name}</div>
                    )}
                  </div>
                  {selectedDomainId === domain.id && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

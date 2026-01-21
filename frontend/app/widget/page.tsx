'use client'

import { useEffect, useState } from 'react'
import ChatbotWidget from '@/components/ChatbotWidget'

export default function WidgetPage() {
  const [treeId, setTreeId] = useState<number | null>(null)
  const [websiteId, setWebsiteId] = useState<number | null>(null)
  const [domain, setDomain] = useState<string | null>(null)
  const [skinId, setSkinId] = useState<number | null>(null)
  const [apiUrl, setApiUrl] = useState<string>('http://localhost:3001/api')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Get parameters from URL query string
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const treeIdParam = params.get('treeId')
      const websiteIdParam = params.get('websiteId')
      const domainParam = params.get('domain')
      const skinIdParam = params.get('skinId')
      const apiUrlParam = params.get('apiUrl')
      
      if (treeIdParam) {
        setTreeId(parseInt(treeIdParam))
      }
      
      if (websiteIdParam) {
        setWebsiteId(parseInt(websiteIdParam))
      }
      
      if (domainParam) {
        setDomain(domainParam)
      }
      
      if (skinIdParam) {
        setSkinId(parseInt(skinIdParam))
      }
      
      if (apiUrlParam) {
        setApiUrl(apiUrlParam)
      } else {
        // Default to environment variable or localhost
        setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
      }
    }
  }, [])

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0,
      overflow: 'hidden',
      position: 'relative'
    }}>
      <ChatbotWidget
        apiUrl={apiUrl}
        treeId={treeId || undefined}
        websiteId={websiteId || undefined}
        domain={domain || undefined}
        skinId={skinId || undefined}
        position="bottom-right"
      />
    </div>
  )
}


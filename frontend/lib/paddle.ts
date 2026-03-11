/**
 * Paddle checkout: overlay (Paddle.js) or hosted checkout URL redirect.
 * - Overlay: set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN and default payment link in Paddle Dashboard (Checkout → Checkout settings).
 * - Hosted: set NEXT_PUBLIC_PADDLE_HOSTED_CHECKOUT_URL to your hosted checkout URL; Upgrade will redirect with ?price_id=.
 */

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string; eventCallback?: (e: unknown) => void }) => void
      Environment: { set: (env: 'sandbox' | 'production') => void }
      Checkout: {
        open: (opts: {
          items?: Array<{ priceId: string; quantity: number }>
          customData?: Record<string, unknown>
          settings?: { displayMode?: string; successUrl?: string }
        }) => void
      }
    }
  }
}

const PADDLE_SCRIPT = 'https://cdn.paddle.com/paddle/v2/paddle.js'

function getClientToken(): string {
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) || ''
}

/** Optional: use Hosted Checkout URL instead of overlay (avoids "default checkout url not set"). */
function getHostedCheckoutUrl(): string {
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PADDLE_HOSTED_CHECKOUT_URL) || ''
}

let scriptLoaded = false
let initPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (scriptLoaded && window.Paddle) return Promise.resolve()
  if (document.querySelector(`script[src="${PADDLE_SCRIPT}"]`)) {
    scriptLoaded = true
    return initPromise ?? Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = PADDLE_SCRIPT
    s.async = true
    s.onload = () => {
      scriptLoaded = true
      resolve()
    }
    s.onerror = () => reject(new Error('Failed to load Paddle.js'))
    document.head.appendChild(s)
  })
}

function ensurePaddle(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    await loadScript()
    const token = getClientToken()
    if (!token || !window.Paddle) return
    try {
      if (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production') {
        window.Paddle.Environment?.set('production')
      } else {
        window.Paddle.Environment?.set('sandbox')
      }
      window.Paddle.Initialize({
        token,
        eventCallback: (e: unknown) => {
          const ev = e as { name?: string; type?: string; code?: string; detail?: string }
          if (ev?.name?.includes('error') || ev?.type === 'front-end_error' || ev?.code) {
            console.warn('[Paddle] Event:', ev)
          }
        },
      })
    } catch (e) {
      console.warn('[Paddle] Initialize failed:', e)
    }
  })()
  return initPromise
}

/**
 * Open Paddle Checkout for the given price and workspace.
 * If NEXT_PUBLIC_PADDLE_HOSTED_CHECKOUT_URL is set, redirects to that URL with ?price_id= (no custom_data).
 * Otherwise uses Paddle.js overlay (requires default payment link set in Paddle Dashboard).
 * @param priceId - Paddle price ID (e.g. pri_01...)
 * @param workspaceId - Workspace ID for custom_data (overlay only; hosted URL does not support custom_data)
 */
export async function openPaddleCheckout(priceId: string, workspaceId: number | null): Promise<void> {
  const hostedUrl = getHostedCheckoutUrl()
  if (hostedUrl) {
    const sep = hostedUrl.includes('?') ? '&' : '?'
    const url = `${hostedUrl}${sep}price_id=${encodeURIComponent(priceId)}`
    if (typeof window !== 'undefined') window.location.href = url
    return
  }

  await ensurePaddle()
  if (!window.Paddle?.Checkout) {
    console.warn('[Paddle] Not initialized — set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN or NEXT_PUBLIC_PADDLE_HOSTED_CHECKOUT_URL')
    return
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const successUrl = workspaceId
    ? `${origin}/dashboard/${workspaceId}/settings/billing`
    : `${origin}/dashboard`
  const customData =
    workspaceId != null ? { workspace_id: String(workspaceId) } : undefined
  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData,
    settings: {
      displayMode: 'overlay',
      successUrl,
    },
  })
}

export function isPaddleConfigured(): boolean {
  return !!getClientToken() || !!getHostedCheckoutUrl()
}

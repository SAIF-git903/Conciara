import Link from 'next/link'

export default function ContactUsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contact</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Contact Us</h1>
      <p className="mt-4 max-w-2xl text-base text-slate-600">
        We would love to hear from you. Reach out for product questions, demos, onboarding help, or partnership requests.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">How to reach us</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <p>
            Email: <a className="font-medium text-slate-900 underline" href="mailto:support@conciara.com">support@conciara.com</a>
          </p>
          <p>Business hours: Monday to Friday, 9:00 AM - 6:00 PM</p>
          <p>Typical response time: within one business day</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/docs" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
          View docs
        </Link>
        <Link href="/pricing" className="rounded-lg bg-[var(--v2-primary)] px-4 py-2 text-sm font-medium text-[var(--v2-primary-foreground)]">
          See pricing
        </Link>
      </div>
    </div>
  )
}

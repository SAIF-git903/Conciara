import { notFound } from 'next/navigation'
import { DOC_TOPIC_BY_SLUG, DOC_TOPICS } from '@/lib/docs'

export function generateStaticParams() {
  return DOC_TOPICS.map((topic) => ({ slug: topic.slug }))
}

export default function DocTopicPage({ params }: { params: { slug: string } }) {
  const topic = DOC_TOPIC_BY_SLUG[params.slug]
  if (!topic) return notFound()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,900px)_240px]">
      <article className="min-w-0 border-r border-white/10 px-5 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Documentation</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">{topic.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{topic.description}</p>
        <p className="mt-2 font-mono text-xs text-slate-500">Route: {topic.route}</p>
        <p className="mt-1 text-xs text-slate-500">Access: {topic.access}</p>
        <p className="mt-1 text-xs text-slate-500">Last updated: {topic.updatedAt}</p>

        {topic.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 border-t border-white/10 py-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{section.title}</h2>
            {section.paragraphs && section.paragraphs.length > 0 ? (
              <div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-300">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {section.milestones && section.milestones.length > 0 ? (
              <div className="mt-6">
                {section.milestones.map((milestone, index) => (
                  <div key={milestone.title} className="relative pl-14 pb-7 last:pb-0">
                    {index < section.milestones!.length - 1 ? (
                      <span className="absolute left-6 top-11 h-[calc(100%-20px)] w-px bg-white/15" />
                    ) : null}
                    <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <h3 className="pt-1 text-2xl font-semibold tracking-tight text-slate-100">{milestone.title}</h3>
                    <p className="mt-2 text-[15px] leading-7 text-slate-300">{milestone.description}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {section.steps && section.steps.length > 0 ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-slate-200">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}

            {section.points && section.points.length > 0 ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-300">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}

            {section.imagePlaceholder ? (
              <div className="mt-5 rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-4 text-sm text-slate-400">
                {section.imagePlaceholder}
              </div>
            ) : null}
          </section>
        ))}
      </article>

      <aside className="hidden h-[calc(100vh-56px)] overflow-y-auto bg-black lg:sticky lg:top-14 lg:block">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">On this page</p>
          <nav className="mt-3 space-y-2">
            {topic.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-sm text-slate-400 hover:text-white"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  )
}


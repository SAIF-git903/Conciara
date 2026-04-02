'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useState, useEffect } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  Bot,
  MessageSquare,
  ShoppingCart,
  Headphones,
  FileText,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Sparkles,
  Database,
  ChevronDown,
  MessageCircle,
  Users,
  Layout,
  Code2,
} from 'lucide-react'
import Footer from '@/components/Footer'

const CONTENT_PADDING = 'px-4 sm:px-5'
const CONTENT_MAX = 'max-w-7xl mx-auto'

const smoothEase = [0.32, 0.72, 0, 1] as const

const fadeInUp = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.65, ease: smoothEase },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: i * 0.08, duration: 0.5, ease: smoothEase },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.5, ease: smoothEase },
  }),
}

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: smoothEase },
  }),
}

// ——— Looping typewriter: types, pauses, deletes, repeats every time ———
function Typewriter({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState('')
  const cancelledRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!text) return
    cancelledRef.current = false
    const typeSpeed = 50
    const deleteSpeed = 32
    const pauseFull = 2200
    const pauseEmpty = 700

    const runCycle = () => {
      if (cancelledRef.current) return
      let i = 0
      intervalRef.current = setInterval(() => {
        if (cancelledRef.current) return
        if (i <= text.length) {
          setDisplay(text.slice(0, i))
          i++
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          const t1 = setTimeout(() => {
            if (cancelledRef.current) return
            let j = text.length
            intervalRef.current = setInterval(() => {
              if (cancelledRef.current) return
              if (j >= 0) {
                setDisplay(text.slice(0, j))
                j--
              } else {
                if (intervalRef.current) clearInterval(intervalRef.current)
                intervalRef.current = null
                const t2 = setTimeout(() => {
                  if (!cancelledRef.current) runCycle()
                }, pauseEmpty)
                timeoutIdsRef.current.push(t2)
              }
            }, deleteSpeed)
          }, pauseFull)
          timeoutIdsRef.current.push(t1)
        }
      }, typeSpeed)
    }

    runCycle()
    return () => {
      cancelledRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      timeoutIdsRef.current.forEach((id) => clearTimeout(id))
      timeoutIdsRef.current = []
    }
  }, [text])

  return (
    <span className={className}>
      {display}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.55, repeat: Infinity, ease: [0.4, 0, 0.6, 1] }}
        className="inline-block"
      >
        |
      </motion.span>
    </span>
  )
}

// ——— Floating chat bubbles (AI chat theme) ———
function FloatingBubbles() {
  const bubbles = [
    { x: '12%', y: '18%', w: 48, h: 32, delay: 0, duration: 6 },
    { x: '78%', y: '25%', w: 56, h: 36, delay: 1.5, duration: 7 },
    { x: '8%', y: '65%', w: 44, h: 28, delay: 3, duration: 8 },
    { x: '82%', y: '70%', w: 52, h: 34, delay: 0.8, duration: 6.5 },
    { x: '45%', y: '12%', w: 40, h: 26, delay: 2, duration: 7.5 },
    { x: '25%', y: '78%', w: 50, h: 32, delay: 2.5, duration: 6 },
    { x: '70%', y: '55%', w: 46, h: 30, delay: 1, duration: 8 },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
          style={{
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h,
          }}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            y: [0, -15, 0],
            x: [0, 8, 0],
            scale: 1,
          }}
          transition={{
            type: 'tween',
            duration: b.duration,
            delay: b.delay,
            repeat: Infinity,
            ease: [0.45, 0, 0.55, 1],
          }}
        />
      ))}
    </div>
  )
}

// ——— Live chat preview: messages appear one by one like real AI chat ———
function LiveChatPreview() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const messages = [
    { from: 'user', text: 'What\'s your return policy for international orders?' },
    { from: 'bot', text: 'We offer 30-day returns for most items. International orders may take 10–14 business days for the return to reach our warehouse.' },
    { from: 'user', text: 'Can I get a refund to my original payment method?' },
    { from: 'bot', text: 'Yes. Refunds are processed within 5–7 business days to your original payment method once we receive the return.' },
  ]
  return (
    <div ref={ref} className="rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium text-slate-500">Live chat preview</span>
      </div>
      <div className="min-h-[280px] space-y-3 p-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={
              isInView
                ? {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { delay: 0.6 + i * 0.45, duration: 0.45, ease: [0.32, 0.72, 0, 1] },
                  }
                : {}
            }
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.from === 'user'
                  ? 'bg-[var(--v2-primary)] text-[var(--v2-primary-foreground)]'
                  : 'bg-[var(--v2-primary-soft)] text-slate-800'
              }`}
            >
              {msg.from === 'bot' && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: 0.6 + i * 0.45 + 0.15 }}
                  className="inline-block"
                >
                  <span className="font-medium text-[var(--v2-primary)]">AI · </span>
                </motion.span>
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isInView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ delay: 3.2, duration: 1, repeat: Infinity }}
            className="flex justify-start"
          >
            <div className="flex gap-1 rounded-2xl bg-slate-100 px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="h-2 w-2 rounded-full bg-slate-400" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ——— Primary CTA (project theme) ———
function PrimaryCTA({
  href,
  children,
  className = '',
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-xl bg-[var(--v2-primary)] px-8 py-4 text-base font-semibold text-[var(--v2-primary-foreground)] shadow-lg transition hover:bg-[var(--v2-primary-hover)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--v2-primary)] ${className}`}
    >
      {children}
      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
    </Link>
  )
}

function SectionWrapper({
  children,
  className = '',
  id,
  contentClass = '',
}: {
  children: React.ReactNode
  className?: string
  id?: string
  contentClass?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <section ref={ref} id={id} className={className}>
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{
          visible: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
          hidden: {},
        }}
        className={`${CONTENT_MAX} ${CONTENT_PADDING} ${contentClass}`}
      >
        {children}
      </motion.div>
    </section>
  )
}

function FullBleed({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <div id={id} className={`w-full ${className}`}>
      {children}
    </div>
  )
}

// ——— Product video: auto-play at 3x when section is in view (muted for autoplay policy) ———
function ProductVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { amount: 0.4, once: false })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isInView) {
      video.muted = true
      video.playbackRate = 3
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isInView])

  return (
    <div ref={containerRef}>
      <video
        ref={videoRef}
        className="aspect-video w-full"
        src="/train_your_chatbot.webm"
        playsInline
        preload="metadata"
        muted
        aria-label="Watch how to build and train your chatbot"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

const faqs = [
  { q: 'Do I need to code to build a chatbot?', a: 'No. Conciara is fully no-code. You add your data, configure personality and behavior in the visual editor, and embed with a snippet or API.' },
  { q: 'What kind of data can I train my bot on?', a: 'You can connect websites (we crawl and index), upload PDFs and documents, or add Q&A pairs manually. We support multiple data sources per chatbot.' },
  { q: 'Can I use this for ecommerce and support?', a: 'Yes. You can build different chatbot types—ecommerce (product recommendations, orders), customer support (tickets, handoff), or a custom knowledge-base bot.' },
  { q: 'Is there a free plan?', a: 'Yes. You can sign up for free with no credit card. Free tier includes a limited number of conversations and one chatbot so you can try the full experience.' },
]

export default function LandingPage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 180])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.92])

  return (
    <div className="overflow-x-hidden">
      {/* ——— Hero (full width) ——— */}
      <FullBleed id="hero" className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-[var(--v2-primary)]">
        <FloatingBubbles />
        <motion.div
          ref={heroRef}
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, -25, 0] }}
            transition={{ type: 'tween', duration: 10, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
            className="absolute top-1/4 left-1/4 h-[420px] w-[420px] rounded-full bg-slate-500/20 blur-[100px]"
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
            transition={{ type: 'tween', duration: 12, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
            className="absolute bottom-1/4 right-1/4 h-[360px] w-[360px] rounded-full bg-slate-400/15 blur-[90px]"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ type: 'tween', duration: 6, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
            className="absolute top-1/2 left-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-[70px]"
          />
        </motion.div>

        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        <div className={`relative z-10 ${CONTENT_MAX} ${CONTENT_PADDING} py-24 text-center`}>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            AI-powered chatbots
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.06, ease: smoothEase }}
            className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Build chatbots that{' '}
            <span className="bg-gradient-to-r from-slate-300 to-white bg-clip-text text-transparent">
              know your business
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: smoothEase }}
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl"
          >
            Train custom AI on your data. Deploy in minutes—no code, no credit card.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5, ease: smoothEase }}
            className="mt-3 min-h-[1.5rem] font-mono text-sm text-slate-400"
          >
            <Typewriter text="Your data. Your voice. Your chatbot." />
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: smoothEase }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <PrimaryCTA href="/signup">Sign up for free</PrimaryCTA>
            <p className="text-sm text-slate-500">No credit card required</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: smoothEase }}
            className="relative mx-auto mt-20 max-w-5xl"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur ring-1 ring-white/5">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-red-500/80" />
                <div className="h-2 w-2 rounded-full bg-slate-500/80" />
                <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
              </div>
              <div className="relative bg-slate-800">
                <Image
                  src="/hero-chat-widget.png"
                  alt="Conciara chat widget — customize theme, components, and embed on your site"
                  width={1200}
                  height={720}
                  className="w-full object-contain object-top"
                  priority
                  sizes="(max-width: 1024px) 100vw, 1200px"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </FullBleed>

      {/* ——— Stats (full width strip) ——— */}
      <FullBleed className="border-y border-slate-200 bg-white py-12">
        <div className={`${CONTENT_MAX} ${CONTENT_PADDING}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-8 md:grid-cols-4"
          >
            {[
              { value: '10x', label: 'Faster first response' },
              { value: '40%', label: 'Tickets deflected' },
              { value: '24/7', label: 'Always-on support' },
              { value: '0', label: 'Code required' },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="block font-display text-3xl font-bold text-[var(--v2-primary)] sm:text-4xl"
                >
                  {stat.value}
                </motion.span>
                <span className="mt-1 block text-sm text-slate-600">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </FullBleed>

      {/* ——— Features ——— */}
      <FullBleed className="bg-slate-50 py-24">
        <SectionWrapper id="features">
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            Why Conciara
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to launch AI chatbots
          </motion.h2>
          <motion.p variants={fadeInUp} custom={2} className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Train on your data, customize behavior, and embed anywhere in minutes.
          </motion.p>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Database, title: 'Train on your data', description: 'Upload docs, websites, or Q&A. Our AI learns your content and answers with your voice.', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
              { icon: Bot, title: 'Multiple chatbot types', description: 'Ecommerce, support, lead gen, or custom—build the bot that fits your use case.', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
              { icon: Zap, title: 'No-code builder', description: 'Configure personality, tone, and flows in a visual editor. No engineering required.', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
              { icon: Globe, title: 'Embed anywhere', description: 'Widget for your site, Slack, or use our API to integrate into any channel.', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={scaleIn}
                custom={i + 3}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[var(--v2-primary)]/30 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor} transition group-hover:scale-110`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Live chat preview (full width, AI chat feel) ——— */}
      <FullBleed className="bg-white py-24">
        <SectionWrapper>
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            See your bot in action
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Real conversations, powered by your data
          </motion.h2>
          <motion.p variants={fadeInUp} custom={2} className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Messages appear as they would for your customers—instant, accurate, on-brand.
          </motion.p>
          <motion.div variants={scaleIn} custom={3} className="mx-auto mt-12 max-w-lg">
            <LiveChatPreview />
          </motion.div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— How it works ——— */}
      <FullBleed className="bg-slate-50 py-24">
        <SectionWrapper>
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            How it works
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From data to live chatbot in three steps
          </motion.h2>

          <div className="mt-20 grid gap-12 md:grid-cols-3">
            {[
              { step: '01', title: 'Add your data', desc: 'Connect websites, upload PDFs, or paste Q&A. We index and vectorize your content automatically.' },
              { step: '02', title: 'Configure your bot', desc: 'Set personality, greeting, and fallback behavior. Preview in real time in the playground.' },
              { step: '03', title: 'Deploy & embed', desc: 'Get a widget snippet or use our API. Your chatbot is live in minutes.' },
            ].map((item, i) => (
              <motion.div key={item.step} variants={fadeInUp} custom={i + 2} className="relative text-center">
                <span className="text-5xl font-bold text-[var(--v2-primary-soft)]">{item.step}</span>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-slate-600">{item.desc}</p>
                {i < 2 && <div className="absolute top-8 left-[60%] hidden h-0.5 w-[80%] bg-gradient-to-r from-slate-200 to-transparent md:block" />}
              </motion.div>
            ))}
          </div>
          <motion.div variants={fadeInUp} custom={5} className="mt-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <Image
              src="/website-data-sources.png"
              alt="Add website URLs to crawl and feed your agent — data sources, retrain, and crawled links"
              width={1100}
              height={660}
              className="w-full object-contain object-top"
              sizes="(max-width: 1024px) 100vw, 1100px"
            />
            <p className="border-t border-slate-100 px-4 py-3 text-center text-sm text-slate-500">
              Add URLs, retrain your agent, and see crawled links in one place.
            </p>
          </motion.div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Customize your widget ——— */}
      <FullBleed className="bg-white py-24">
        <SectionWrapper>
          <div className="grid gap-12 md:grid-cols-2 md:gap-16 md:items-center">
            <div>
              <motion.p variants={fadeInUp} custom={0} className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
                Theme &amp; embed
              </motion.p>
              <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Customize your widget
              </motion.h2>
              <motion.p variants={fadeInUp} custom={2} className="mt-4 text-slate-600">
                Set your brand colors, pick components, and get the embed code. Changes appear in the live preview and in Playground—no deploy needed.
              </motion.p>
            </div>
            <motion.div variants={scaleIn} custom={3} className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
              <Image
                src="/chat-widget-customize.png"
                alt="Chat widget theme — color palette and live preview"
                width={900}
                height={580}
                className="w-full object-contain object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Use cases ——— */}
      <FullBleed className="bg-white py-24">
        <SectionWrapper>
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            Use cases
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for how you work
          </motion.h2>

          <div className="mt-16 space-y-20">
            {[
              { title: 'Ecommerce chatbots', description: 'Recommend products, answer shipping and returns, capture leads—24/7 on your store.', icon: ShoppingCart, image: 'left', iconBg: 'bg-green-100', iconColor: 'text-green-600', imageSrc: null },
              { title: 'Customer support chatbots', description: 'Resolve common tickets instantly, hand off to humans when needed. Connect Slack, WhatsApp, Zendesk, and more.', icon: Headphones, image: 'right', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', imageSrc: '/connected-apps.png' },
              { title: 'Knowledge-base & docs', description: 'Users ask in plain language and get accurate answers from your docs. Add Q&A pairs for exact answers—no training delay.', icon: FileText, image: 'left', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', imageSrc: '/qa-pairs.png' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeIn}
                custom={i}
                className={`grid gap-12 md:grid-cols-2 md:gap-16 ${item.image === 'right' ? 'md:grid-flow-dense' : ''}`}
              >
                <div className={item.image === 'right' ? 'md:col-start-2' : ''}>
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconBg} ${item.iconColor}`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-slate-600">{item.description}</p>
                </div>
                <div className={`relative aspect-video overflow-hidden rounded-2xl bg-slate-100 ${item.image === 'right' ? 'md:col-start-1 md:row-start-1' : ''}`}>
                  {item.imageSrc ? (
                    <Image
                      src={item.imageSrc}
                      alt={item.title}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Add your store or support screenshot here</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Integrations (full width, redesigned) ——— */}
      <FullBleed className="relative overflow-hidden border-y border-slate-200 py-24" id="integrations">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,var(--v2-primary-soft)_0%,transparent_50%)]" />
        <div className={`relative ${CONTENT_MAX} ${CONTENT_PADDING}`}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } }, hidden: {} }}
            className="text-center"
          >
            <motion.p variants={fadeInUp} className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
              Integrations
            </motion.p>
            <motion.h2 variants={fadeInUp} className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Works where you work
            </motion.h2>
            <motion.p variants={fadeInUp} className="mx-auto mt-3 max-w-xl text-slate-600">
              Connect your chatbot to WhatsApp, Teams, Zendesk, Shopify, WordPress, and more—one platform, every channel.
            </motion.p>

            <motion.div variants={scaleIn} custom={2} className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <Image
                src="/connected-apps.png"
                alt="Connected Apps — Slack, WhatsApp, Zendesk, Shopify and more in your dashboard"
                width={1000}
                height={560}
                className="w-full object-contain object-top"
                sizes="(max-width: 1024px) 100vw, 1000px"
              />
            </motion.div>

            {/* Integration cards: icon + name, grouped in a responsive grid */}
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {[
                { name: 'Website', icon: Globe, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
                { name: 'Slack', icon: MessageSquare, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
                { name: 'WhatsApp', icon: MessageCircle, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
                { name: 'Teams', icon: Users, iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
                { name: 'Zendesk', icon: Headphones, iconBg: 'bg-rose-100', iconColor: 'text-rose-600' },
                { name: 'Shopify', icon: ShoppingCart, iconBg: 'bg-green-100', iconColor: 'text-green-600' },
                { name: 'WordPress', icon: Layout, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
                { name: 'API', icon: Code2, iconBg: 'bg-slate-100', iconColor: 'text-slate-700' },
                { name: 'Zapier', icon: Zap, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
                { name: 'Notion', icon: FileText, iconBg: 'bg-neutral-100', iconColor: 'text-neutral-700' },
                { name: 'Docs', icon: FileText, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
              ].map((item, i) => (
                <motion.div
                  key={item.name}
                  variants={scaleIn}
                  custom={i}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-5 shadow-sm backdrop-blur-sm transition hover:border-[var(--v2-primary)]/25 hover:shadow-md"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor} transition group-hover:scale-110`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    {item.name}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.p variants={fadeInUp} className="mt-8 text-xs font-medium uppercase tracking-wider text-slate-400">
              More integrations coming soon
            </motion.p>
          </motion.div>
        </div>
      </FullBleed>

      {/* ——— Product video ——— */}
      <FullBleed id="video-demo" className="bg-slate-950 py-24">
        <SectionWrapper contentClass="!text-center">
          <motion.p variants={fadeInUp} custom={0} className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            See it in action
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Watch how easy it is to build and train your bot
          </motion.h2>
          <motion.div variants={scaleIn} custom={2} className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <ProductVideo />
          </motion.div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Testimonials ——— */}
      <FullBleed className="bg-white py-24">
        <SectionWrapper>
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            Trusted by teams
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Loved by support and marketing teams
          </motion.h2>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { quote: 'We cut first-response time by 60% and our bot handles 40% of tickets without human touch.', name: 'Sarah Chen', role: 'Support Lead' },
              { quote: 'Our product recommender bot increased add-to-cart rate. Setup took an afternoon.', name: 'James Wilson', role: 'Ecommerce Manager' },
              { quote: 'Finally a chatbot that actually uses our docs. No more wrong answers from generic AI.', name: 'Priya Patel', role: 'Head of Product' },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={slideInRight}
                custom={i + 2}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
              >
                <p className="text-slate-700">"{item.quote}"</p>
                <p className="mt-4 font-medium text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">{item.role}</p>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Scale / Enterprise (full width) ——— */}
      <FullBleed className="border-t border-slate-200 bg-slate-50 py-20">
        <SectionWrapper>
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            Scale with confidence
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Enterprise-ready from day one
          </motion.h2>
          <motion.p variants={fadeInUp} custom={2} className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Security, reliability, and support so you can deploy your chatbot everywhere without worry.
          </motion.p>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              { title: 'Secure by default', desc: 'SOC 2 aligned, encryption at rest and in transit. Your data stays yours.', icon: Shield, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
              { title: '99.9% uptime', desc: 'Built for reliability. Your chatbot is always on when your customers need it.', icon: Zap, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
              { title: 'Dedicated support', desc: 'Documentation, API reference, and support when you need to move fast.', icon: Headphones, iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeInUp}
                custom={i + 3}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.iconBg} ${item.iconColor}`}>
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— FAQ (full width) ——— */}
      <FullBleed className="bg-slate-50 py-24">
        <SectionWrapper>
          <motion.p variants={fadeInUp} custom={0} className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--v2-primary)]">
            FAQ
          </motion.p>
          <motion.h2 variants={fadeInUp} custom={1} className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Common questions
          </motion.h2>

          <div className="mx-auto mt-14 max-w-2xl space-y-4">
            {faqs.map((faq, i) => (
              <motion.details
                key={faq.q}
                variants={fadeInUp}
                custom={i + 2}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                  <span>{faq.q}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-slate-600">{faq.a}</p>
              </motion.details>
            ))}
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Trust strip ——— */}
      <FullBleed className="border-t border-slate-200 bg-white py-12">
        <SectionWrapper>
          <div className="flex flex-wrap items-center justify-center gap-10 text-slate-500">
            {[
              { icon: Shield, label: 'SOC 2 compliant', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
              { icon: Zap, label: 'Fast responses', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
              { icon: MessageSquare, label: 'Human handoff', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
            ].map((item, i) => (
              <motion.div key={item.label} variants={fadeIn} custom={i} className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Final CTA ——— */}
      <FullBleed className="bg-[var(--v2-primary)] py-24">
        <SectionWrapper contentClass="!text-center">
          <motion.h2 variants={fadeInUp} custom={0} className="text-3xl font-bold tracking-tight text-[var(--v2-primary-foreground)] sm:text-4xl">
            Ready to build your AI chatbot?
          </motion.h2>
          <motion.p variants={fadeInUp} custom={1} className="mx-auto mt-4 max-w-xl text-slate-300">
            Join teams that ship smarter support and sales. Start free—no credit card required.
          </motion.p>
          <motion.div variants={fadeInUp} custom={2} className="mt-10 flex justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[var(--v2-primary)] shadow-lg transition hover:bg-[var(--v2-primary-soft)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--v2-primary)]"
            >
              Sign up for free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </SectionWrapper>
      </FullBleed>

      {/* ——— Footer (full width) ——— */}
      <FullBleed>
        <Footer />
      </FullBleed>
    </div>
  )
}

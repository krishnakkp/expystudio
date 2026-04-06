'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    icon: Zap,
    price: '$299',
    period: 'per event',
    description: 'Perfect for small meetups and workshops',
    features: [
      'Up to 100 attendees',
      '2 QR code locations',
      '3 AI background scenes',
      'Basic LinkedIn-ready exports',
      'Email support',
      '48-hour delivery',
    ],
    cta: 'Get Started',
    variant: 'heroOutline' as const,
    popular: false,
  },
  {
    name: 'Professional',
    icon: Sparkles,
    price: '$799',
    period: 'per event',
    description: 'Ideal for conferences and corporate events',
    features: [
      'Up to 500 attendees',
      '5 QR code locations',
      '10 AI background scenes',
      'Premium LinkedIn-ready exports',
      'Custom event branding',
      'Priority support',
      'Real-time generation',
      'Analytics dashboard',
    ],
    cta: 'Start Free Trial',
    variant: 'hero' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    icon: Building2,
    price: 'Custom',
    period: 'tailored pricing',
    description: 'For large-scale events and multi-event contracts',
    features: [
      'Unlimited attendees',
      'Unlimited QR locations',
      'Unlimited AI scenes',
      'White-label solution',
      'API access',
      'Dedicated account manager',
      'On-site support available',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    variant: 'heroOutline' as const,
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 gradient-hero">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-foreground mb-4"
          >
            Simple, transparent{' '}
            <span className="text-gradient-accent">pricing</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Choose the plan that fits your event. No hidden fees, no surprises.
          </motion.p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-24 px-6 -mt-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? 'bg-card shadow-card border-2 border-accent scale-[1.03]'
                  : 'bg-card shadow-soft border border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="gradient-accent text-accent-foreground text-xs font-bold px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular ? 'gradient-accent' : 'bg-secondary'
                  }`}
                >
                  <plan.icon
                    className={`w-5 h-5 ${
                      plan.popular ? 'text-accent-foreground' : 'text-secondary-foreground'
                    }`}
                  />
                </div>
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
              </div>

              <div className="mb-2">
                <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground ml-2 text-sm">/ {plan.period}</span>
              </div>
              <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} size="lg" className="w-full" asChild>
                <Link href="/book-demo">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

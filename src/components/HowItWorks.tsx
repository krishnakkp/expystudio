'use client';

import { motion } from 'framer-motion';
import { QrCode, Camera, Sparkles, Check, ArrowRight } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin.png';

const LinkedInIcon = ({ className }: { className?: string }) => (
  <img src={linkedinIcon.src} alt="LinkedIn" className={className} />
);

const steps = [
  {
    icon: QrCode,
    title: 'Scan QR Code',
    description: 'Find QR codes at key event locations',
  },
  {
    icon: Camera,
    title: 'Upload Selfie',
    description: 'Take a quick selfie or upload a photo',
  },
  {
    icon: Sparkles,
    title: 'AI Magic',
    description: 'Get 4 stunning event photos generated',
  },
  {
    icon: LinkedInIcon,
    title: 'Post Ready',
    description: 'Auto-created LinkedIn post with images',
  },
  {
    icon: Check,
    title: 'Review & Share',
    description: 'Approve and publish to your profile',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From scan to share in under 60 seconds
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center group">
                  {/* Icon container */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                      <step.icon className="w-7 h-7 text-accent-foreground" />
                    </div>
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-4">
                    <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

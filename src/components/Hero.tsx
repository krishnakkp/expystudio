'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Camera } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin.png';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden gradient-hero">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Event Photos
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
              Capture Events.{' '}
              <span className="text-gradient-accent">Share Instantly.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
              Attendees scan a QR, upload a selfie, and get stunning AI-generated 
              event photos with a ready-to-post LinkedIn caption — all in 60 seconds.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="xl" asChild>
                <a href="#demo">
                  Try the Demo <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link href="/book-demo">Book a Demo</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              {[
                { value: '60s', label: 'Scan to Share' },
                { value: '4', label: 'Photos Generated' },
                { value: '100%', label: 'User Approval' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Phone mockup */}
              <div className="relative mx-auto w-72 h-[580px] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground rounded-b-2xl" />
                <div className="w-full h-full bg-card rounded-[2.5rem] overflow-hidden">
                  {/* Screen content */}
                  <div className="p-6 h-full flex flex-col">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto rounded-2xl gradient-accent flex items-center justify-center mb-3">
                        <Camera className="w-8 h-8 text-accent-foreground" />
                      </div>
                      <h3 className="font-bold text-foreground">TechSummit 2025</h3>
                      <p className="text-xs text-muted-foreground">Upload your selfie</p>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full border-4 border-dashed border-accent/50 flex items-center justify-center">
                        <Camera className="w-12 h-12 text-accent/50" />
                      </div>
                    </div>

                    <Button variant="hero" className="w-full">
                      Take Selfie
                    </Button>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <motion.div
                className="absolute -left-8 top-1/4 bg-card rounded-xl shadow-card p-4 border border-border max-w-[180px]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <img src={linkedinIcon.src} alt="LinkedIn" className="w-5 h-5" />
                  <span className="text-xs font-medium text-foreground">LinkedIn Ready</span>
                </div>
                <p className="text-xs text-muted-foreground">Auto-generated caption with hashtags</p>
              </motion.div>

              <motion.div
                className="absolute -right-4 top-1/2 bg-card rounded-xl shadow-card p-4 border border-border"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span className="text-xs font-medium text-foreground">4 AI Photos</span>
                </div>
              </motion.div>

              <motion.div
                className="absolute -right-8 bottom-1/4 bg-card rounded-xl shadow-card p-3 border border-border"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              >
                <div className="grid grid-cols-2 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded bg-gradient-to-br from-primary/60 to-accent/40" />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

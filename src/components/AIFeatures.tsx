'use client';

import { motion } from 'framer-motion';
import { Wand2, Sun, ZoomIn, Layers } from 'lucide-react';

const features = [
  {
    icon: Sun,
    title: 'Smart Lighting',
    description: 'Automatic lighting correction for perfect exposure',
  },
  {
    icon: Wand2,
    title: 'Image Enhancement',
    description: 'AI-powered clarity and color optimization',
  },
  {
    icon: ZoomIn,
    title: 'HD Upscaling',
    description: 'Crystal clear images at any resolution',
  },
  {
    icon: Layers,
    title: 'Seamless Compositing',
    description: 'Realistic blending with event backgrounds',
  },
];

export function AIFeatures() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              AI-Powered
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Professional Photos,{' '}
              <span className="text-gradient-accent">Zero Effort</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Our AI automatically processes every selfie to create stunning, 
              professional-quality images that look like they were taken by an 
              event photographer.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-3xl" />
              
              {/* Main card */}
              <div className="relative bg-card rounded-3xl shadow-card border border-border/50 p-8 h-full flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-full gradient-accent flex items-center justify-center mb-6 animate-pulse-soft">
                  <Wand2 className="w-16 h-16 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2 text-center">
                  AI Photo Magic
                </h3>
                <p className="text-muted-foreground text-center">
                  4 professional photos generated in seconds
                </p>
                
                {/* Floating badges */}
                <div className="absolute -left-4 top-1/4 px-3 py-1.5 rounded-full bg-card shadow-card border border-border text-xs font-medium text-foreground animate-float">
                  ✨ Enhanced
                </div>
                <div className="absolute -right-4 top-1/3 px-3 py-1.5 rounded-full bg-card shadow-card border border-border text-xs font-medium text-foreground animate-float" style={{ animationDelay: '0.5s' }}>
                  🎨 On-Brand
                </div>
                <div className="absolute -right-2 bottom-1/4 px-3 py-1.5 rounded-full bg-card shadow-card border border-border text-xs font-medium text-foreground animate-float" style={{ animationDelay: '1s' }}>
                  📸 HD Quality
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

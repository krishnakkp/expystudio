'use client';

import { motion } from 'framer-motion';
import { Hash, AtSign, Sparkles } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin.png';

export function LinkedInPreview() {
  return (
    <section className="py-24 px-6 bg-secondary/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Ready to Post
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            LinkedIn Post, <span className="text-gradient-accent">Auto-Created</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional caption with event branding, hashtags, and your AI-generated photos
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          {/* LinkedIn-style card */}
          <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <span className="text-lg font-bold text-accent-foreground">JD</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Jane Doe</h4>
                <p className="text-xs text-muted-foreground">Product Manager at TechCorp</p>
              </div>
              <img src={linkedinIcon.src} alt="LinkedIn" className="w-6 h-6" />
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="text-foreground space-y-2">
                <p>
                  <Sparkles className="w-4 h-4 inline mr-1 text-accent" />
                  Thrilled to be at <span className="font-semibold">TechSummit 2025</span>! 🚀
                </p>
                <p className="text-muted-foreground">
                  Amazing sessions, incredible networking, and so much inspiration. 
                  The future of tech is being shaped right here!
                </p>
                <p className="text-accent">
                  <Hash className="w-3 h-3 inline" />TechSummit2025{' '}
                  <Hash className="w-3 h-3 inline" />Innovation{' '}
                  <Hash className="w-3 h-3 inline" />Networking{' '}
                  <Hash className="w-3 h-3 inline" />TechLeaders
                </p>
              </div>

              {/* Image grid preview */}
              <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-video bg-gradient-to-br from-muted to-secondary flex items-center justify-center"
                  >
                    <span className="text-xs text-muted-foreground">Photo {i}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
              <span>Edit caption before posting</span>
              <span className="text-accent font-medium">Preview only</span>
            </div>
          </div>

          {/* Features below */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: Sparkles, label: 'AI-Written Caption' },
              { icon: Hash, label: 'Smart Hashtags' },
              { icon: AtSign, label: 'Event Mentions' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 text-center"
              >
                <item.icon className="w-5 h-5 text-accent" />
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl gradient-primary p-12 md:p-16 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Event Experience?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Give your attendees unforgettable memories and boost your event's social reach. 
              Setup takes less than an hour.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="xl" 
                className="bg-accent-foreground text-accent hover:bg-accent-foreground/90 font-semibold shadow-lg"
                asChild
              >
                <Link href="/book-demo">
                  <Calendar className="w-5 h-5 mr-2" />
                  Book a Demo
                </Link>
              </Button>
              <Button 
                size="xl" 
                variant="outline"
                className="border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 font-semibold"
              >
                Learn More <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-primary-foreground/70">
              <span>✓ No app download required</span>
              <span>✓ Works on any device</span>
              <span>✓ Full brand customization</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

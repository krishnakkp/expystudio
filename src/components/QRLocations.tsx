'use client';

import { motion } from 'framer-motion';
import { MapPin, Users, Building, DoorOpen } from 'lucide-react';

const locations = [
  {
    icon: DoorOpen,
    name: 'Event Entrance',
    description: 'Welcome banner and entry point',
  },
  {
    icon: Users,
    name: 'Registration Desk',
    description: 'Check-in and badge pickup',
  },
  {
    icon: Building,
    name: 'Main Stage',
    description: 'Keynotes and presentations',
  },
  {
    icon: MapPin,
    name: 'Exhibition Booths',
    description: 'Sponsor and partner displays',
  },
];

export function QRLocations() {
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
            Strategic Placement
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            QR Codes Everywhere
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Each location creates unique, on-brand photos for your attendees
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {locations.map((location, index) => (
            <motion.div
              key={location.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-card rounded-2xl p-6 shadow-card hover:shadow-lg transition-all duration-300 h-full border border-border/50 hover:border-accent/30">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                  <location.icon className="w-6 h-6 text-accent group-hover:text-accent-foreground transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {location.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {location.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, ArrowLeft, Building2, User, Mail, Phone, Globe, MapPin, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function BookDemo() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    venueName: '',
    venueType: '',
    city: '',
    website: '',
    eventsPerYear: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto rounded-full gradient-accent flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">You're All Set!</h1>
          <p className="text-muted-foreground mb-8">
            Thanks for signing up as a venue partner. Our team will reach out within 24 hours to schedule your personalized demo.
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left - Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Building2 className="w-4 h-4" />
                Venue Partner Program
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Become a <span className="text-gradient-accent">Venue Partner</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Offer your attendees an unforgettable AI photo experience. Sign up and our team will set up everything for your next event.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Camera, text: 'AI-powered event photos in 60 seconds' },
                  { icon: Users, text: 'Boost attendee engagement & social reach' },
                  { icon: Globe, text: 'No app download — works on any device' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <form
                onSubmit={handleSubmit}
                className="bg-card border border-border rounded-2xl p-8 shadow-card space-y-5"
              >
                <h2 className="text-xl font-semibold text-foreground mb-2">Sign Up for a Demo</h2>
                <p className="text-sm text-muted-foreground mb-4">Fill in your details and we'll get back to you within 24 hours.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" /> First Name
                    </label>
                    <Input name="firstName" value={form.firstName} onChange={handleChange} required placeholder="John" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" /> Last Name
                    </label>
                    <Input name="lastName" value={form.lastName} onChange={handleChange} required placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Work Email
                  </label>
                  <Input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="john@venue.com" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone Number
                  </label>
                  <Input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Venue / Company Name
                  </label>
                  <Input name="venueName" value={form.venueName} onChange={handleChange} required placeholder="Grand Convention Center" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> City
                    </label>
                    <Input name="city" value={form.city} onChange={handleChange} placeholder="San Francisco" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" /> Website
                    </label>
                    <Input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://venue.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" /> Events Per Year
                  </label>
                  <select
                    name="eventsPerYear"
                    value={form.eventsPerYear}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select...</option>
                    <option value="1-10">1–10</option>
                    <option value="11-50">11–50</option>
                    <option value="51-100">51–100</option>
                    <option value="100+">100+</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Anything else we should know?</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Tell us about your upcoming events..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>

                <Button type="submit" variant="hero" size="lg" className="w-full">
                  Request a Demo
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

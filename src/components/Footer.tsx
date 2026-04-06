'use client';

import { motion } from 'framer-motion';
import { Camera, Twitter, Instagram } from 'lucide-react';
import linkedinIcon from '@/assets/icons8-linkedin-96.png';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Camera className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold">EventSnap AI</span>
            </div>
            <p className="text-primary-foreground/70 max-w-sm mb-6">
              Transform event experiences with AI-powered photo generation. 
              From QR scan to LinkedIn post in 60 seconds.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors">
                <img src={linkedinIcon.src} alt="LinkedIn" className="w-5 h-5 brightness-0 invert" />
              </a>
              {[Twitter, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-primary-foreground transition-colors">Pricing</a></li>
              <li><a href="#demo" className="hover:text-primary-foreground transition-colors">Demo</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Case Studies</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Privacy</a></li>
              <li><a href="/terms" className="hover:text-primary-foreground transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-foreground/50">
          <span>© 2026 EventSnap AI. All rights reserved.</span>
          <span>​                        </span>
        </div>
      </div>
    </footer>);

}
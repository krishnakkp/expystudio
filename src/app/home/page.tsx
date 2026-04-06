import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { QRLocations } from '@/components/QRLocations';
import { AIFeatures } from '@/components/AIFeatures';
import { LinkedInPreview } from '@/components/LinkedInPreview';
import { DemoFlow } from '@/components/DemoFlow';
import { CTA } from '@/components/CTA';
import { Footer } from '@/components/Footer';

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <QRLocations />
      <AIFeatures />
      <LinkedInPreview />
      <DemoFlow />
      <CTA />
      <Footer />
    </div>
  );
}


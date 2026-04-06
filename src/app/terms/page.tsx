'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera } from 'lucide-react';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using EventSnap (the "App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use EventSnap.',
  },
  {
    title: '2. Description of Service',
    content:
      'The App provides AI-powered image transformation services, including but not limited to: uploading selfies or pictures, generating AI-enhanced images, creating LinkedIn captions, posting content directly to your LinkedIn account, and tracking post reach and engagement data.',
  },
  {
    title: '3. User Content and AI Transformation',
    subsections: [
      {
        label: '3.1 Ownership of Input',
        text: 'You retain all ownership rights to the original photos and data you upload to EventSnap ("Input"). By uploading Input, you represent and warrant that you have all necessary rights and permissions to do so.',
      },
      {
        label: '3.2 AI Output',
        text: 'The App uses artificial intelligence algorithms to transform your Input and generate new images and captions ("Output"). While you generally own the rights to the Output generated specifically for you, you acknowledge that AI-generated content may not always be unique and that EventSnap may generate similar results for other users.',
      },
      {
        label: '3.3 License to EventSnap',
        text: 'You affirm that by using EventSnap, you provide a non-exclusive, worldwide, royalty-free license to EventSnap to use, process, and store your Input solely for the purpose of delivering the services you request.',
      },
    ],
  },
  {
    title: '4. LinkedIn Integration and Posting',
    subsections: [
      {
        label: '4.1 Authorization',
        text: 'To use the LinkedIn posting feature, you must authorize EventSnap to access your LinkedIn account via OAuth. You are responsible for maintaining the security of your LinkedIn credentials.',
      },
      {
        label: '4.2 Content Responsibility',
        text: "You are solely responsible for any content posted to your LinkedIn account through EventSnap. The App does not pre-screen or monitor posts, and you agree to comply with LinkedIn's User Agreement and Professional Community Policies.",
      },
      {
        label: '4.3 Automation Limits',
        text: "You acknowledge that LinkedIn has strict rules regarding automated posting. You agree not to use EventSnap in any manner that violates LinkedIn's API Terms of Use or results in spamming or deceptive behavior.",
      },
    ],
  },
  {
    title: '5. Data Tracking and Analytics',
    subsections: [
      {
        label: '5.1 Reach Tracking',
        text: 'EventSnap uses LinkedIn APIs to track the reach, impressions, and engagement of posts made through EventSnap. This data will be shared with event organizers to provide them with insights into post performance, but will not be shared with any other third parties.',
      },
      {
        label: '5.2 Privacy of Data',
        text: 'Your LinkedIn analytics data will be treated in accordance with our Privacy Policy. We will not share your personal performance data with third parties without your explicit consent.',
      },
    ],
  },
  {
    title: '6. Prohibited Conduct',
    content: 'You agree not to use EventSnap to:',
    list: [
      'Upload or generate content that is illegal, harmful, threatening, abusive, or defamatory.',
      'Impersonate any person or entity or misrepresent your affiliation with a person or entity.',
      'Infringe upon any patent, trademark, trade secret, copyright, or other proprietary rights.',
      'Distribute viruses or any other computer code designed to interrupt or destroy computer functionality.',
    ],
  },
  {
    title: '7. Disclaimers and Limitation of Liability',
    subsections: [
      {
        label: '7.1 "As Is" Basis',
        text: 'The App and all Output are provided on an "as is" and "as available" basis without warranties of any kind.',
      },
      {
        label: '7.2 AI Accuracy',
        text: 'You acknowledge that AI-generated images and captions may contain inaccuracies, biases, or unexpected results. The App is not liable for any damages arising from the use of AI-generated content.',
      },
      {
        label: '7.3 Third-Party Services',
        text: "The App is not responsible for any changes, outages, or restrictions imposed by LinkedIn that may affect EventSnap's functionality.",
      },
    ],
  },
  {
    title: '8. Termination',
    content:
      'We reserve the right to suspend or terminate your access to EventSnap at any time, without notice, for conduct that we believe violates these Terms and Conditions or is harmful to other users or our business interests.',
  },
  {
    title: '9. Modifications to Terms',
    content:
      'We reserve the right to modify these Terms and Conditions at any time. Your continued use of EventSnap after such modifications constitutes your acceptance of the new terms.',
  },
  {
    title: '10. Governing Law',
    content:
      'These Terms and Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which EventSnap operator is based.',
  },
] as const;

export default function TermsPage() {
  return (
    <div className="min-h-screen gradient-hero">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg gradient-accent flex items-center justify-center">
              <Camera className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">EventSnap AI</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms and Conditions</h1>
          <p className="text-muted-foreground mb-10">Last Updated: March 25, 2026</p>

          <div className="space-y-8">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-soft"
              >
                <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>

                {'content' in section && section.content && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                )}

                {'list' in section && section.list && (
                  <ul className="mt-2 space-y-1.5">
                    {section.list.map((item, j) => (
                      <li key={j} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                        <span className="text-accent mt-0.5 shrink-0">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {'subsections' in section &&
                  section.subsections?.map((sub, j) => (
                    <div key={j} className={j > 0 ? 'mt-4' : ''}>
                      <h3 className="text-sm font-medium text-foreground mb-1">{sub.label}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{sub.text}</p>
                    </div>
                  ))}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

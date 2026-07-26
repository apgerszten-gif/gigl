'use client'

import { LegalPageShell } from '@/components/LegalPageShell'
import { DEFAULT_THEME as T } from '@/lib/theme'

function H2({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, marginTop: 22, marginBottom: 8, color: '#4A3528' }}>{children}</div>
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>
}
function Ul({ children }: { children: React.ReactNode }) {
  return <ul style={{ marginBottom: 12, paddingLeft: 18 }}>{children}</ul>
}

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated="Last updated: July 26, 2026">
      <div style={{
        background: T.card, border: T.cardBorder, borderRadius: 5,
        padding: '12px 14px', fontSize: 12, color: T.muted, fontStyle: 'italic',
        marginBottom: 20, lineHeight: 1.5,
      }}>
        This is a template. Have it reviewed by a lawyer before publishing — in particular the governing law/jurisdiction section, and liability limitations, which vary by region and by whether you&apos;re operating as an individual or a formed business entity.
      </div>

      <P>Welcome to Gigl. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Gigl website and application (the &quot;Service&quot;), operated by Gigl, Inc. (&quot;Gigl,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using the Service, you agree to these Terms.</P>

      <H2>1. Eligibility</H2>
      <P>You must be at least 13 years old (or the applicable minimum age in your jurisdiction) to use Gigl. By using the Service, you represent that you meet this requirement.</P>

      <H2>2. Your Account</H2>
      <P>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us promptly of any unauthorized use.</P>

      <H2>3. User Content</H2>
      <P>You retain ownership of the ratings, reviews, tags, photos, and other content you submit to Gigl (&quot;User Content&quot;). By submitting User Content, you grant Gigl a non-exclusive, worldwide, royalty-free license to host, store, display, and distribute that content as part of operating the Service (for example, showing your rating on an artist&apos;s page, or your rankings on your public profile).</P>
      <P>You are solely responsible for your User Content. You agree not to submit content that:</P>
      <Ul>
        <li>Is unlawful, defamatory, harassing, or infringes on someone else&apos;s rights</li>
        <li>Contains someone else&apos;s private information without their consent</li>
        <li>Infringes copyright or other intellectual property rights</li>
        <li>Impersonates another person or entity</li>
      </Ul>
      <P>We may remove User Content that violates these Terms at our discretion.</P>

      <H2>4. Acceptable Use</H2>
      <P>You agree not to:</P>
      <Ul>
        <li>Use the Service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems</li>
        <li>Interfere with or disrupt the Service&apos;s operation</li>
        <li>Scrape, harvest, or collect data from the Service in an automated manner without our permission</li>
        <li>Use the Service to harass, abuse, or harm another person</li>
      </Ul>

      <H2>5. Third-Party Trademarks</H2>
      <P>Festival and artist names, logos, and marks referenced within Gigl (for example, festival names or performing artists) are the property of their respective owners. Gigl is an independent platform for fan-submitted ratings and rankings and is not affiliated with, endorsed by, or sponsored by any festival organizer, artist, or venue unless explicitly stated.</P>

      <H2>6. Third-Party Services</H2>
      <P>The Service uses third-party providers (including Supabase for backend infrastructure, Google for optional sign-in, and Vercel for hosting) to operate. Your use of sign-in options like Google is also subject to that provider&apos;s own terms.</P>

      <H2>7. Disclaimers</H2>
      <P>The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee the Service will be uninterrupted, error-free, or secure at all times.</P>

      <H2>8. Limitation of Liability</H2>
      <P>To the fullest extent permitted by law, Gigl and its operators will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, arising from your use of the Service.</P>

      <H2>9. Termination</H2>
      <P>We may suspend or terminate your access to the Service at any time, with or without notice, for conduct that violates these Terms or is otherwise harmful to the Service or other users. You may stop using the Service and request account deletion at any time.</P>

      <H2>10. Changes to These Terms</H2>
      <P>We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</P>

      <H2>11. Governing Law</H2>
      <P>These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles.</P>

      <H2>12. Contact Us</H2>
      <P>Questions about these Terms can be directed to: <a href="mailto:a.p.gerszten@gmail.com" style={{ color: T.accent }}>a.p.gerszten@gmail.com</a></P>
    </LegalPageShell>
  )
}

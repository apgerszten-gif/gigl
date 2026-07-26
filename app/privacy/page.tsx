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

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="Last updated: July 26, 2026">
      <P>This Privacy Policy explains how Gigl (&quot;Gigl,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and shares information when you use our website and application (the &quot;Service&quot;).</P>

      <H2>1. Information We Collect</H2>
      <P><strong>Account information.</strong> When you sign up, we collect an email address and a username. If you sign up using Google, we receive basic profile information from Google (name, email address, and profile picture) as permitted by the scopes you approve during sign-in.</P>
      <P><strong>Content you create.</strong> We collect the information you submit while using Gigl, including:</P>
      <Ul>
        <li>Festival and artist selections</li>
        <li>Show ratings (performance, venue, and vibe scores)</li>
        <li>Written reviews and tags you attach to a show</li>
        <li>Photos or media you upload</li>
        <li>Head-to-head comparisons and resulting rankings</li>
      </Ul>
      <P><strong>Usage and device information.</strong> We may automatically collect limited technical information, such as your browser type, device type, and general usage patterns, to help us maintain and improve the Service.</P>
      <P><strong>Local storage.</strong> We use your browser&apos;s local storage to remember preferences such as your currently selected festival, so you don&apos;t have to re-select it each visit.</P>

      <H2>2. How We Use Information</H2>
      <P>We use the information we collect to:</P>
      <Ul>
        <li>Provide, operate, and maintain the Service</li>
        <li>Display your ratings, rankings, and reviews to you and, where public-facing (such as public profile or artist pages), to other users</li>
        <li>Authenticate your account and keep it secure</li>
        <li>Improve and troubleshoot the Service</li>
        <li>Communicate with you about your account, if necessary</li>
      </Ul>
      <P>We do not sell your personal information.</P>

      <H2>3. Third-Party Services</H2>
      <P>Gigl relies on third-party service providers to operate:</P>
      <Ul>
        <li><strong>Supabase</strong> — our backend provider, which stores your account data, ratings, reviews, and uploaded media, and handles authentication.</li>
        <li><strong>Google</strong> — if you choose to sign in with Google, Google&apos;s own privacy policy governs the information Google collects and shares with us as part of that sign-in.</li>
        <li><strong>Vercel</strong> — our hosting provider, which may process technical/usage data as part of serving the Service.</li>
      </Ul>
      <P>We do not control these providers&apos; own data practices beyond the data we choose to send them, and encourage you to review their respective privacy policies.</P>

      <H2>4. Public Content</H2>
      <P>Some content you submit — such as your username, public ratings, reviews, and rankings — may be visible to other users or visible publicly (for example, on a shareable profile page). Please don&apos;t include information in reviews or profile fields that you don&apos;t want to be seen publicly.</P>

      <H2>5. Data Retention &amp; Deletion</H2>
      <P>We retain your account information and content for as long as your account is active. You may request deletion of your account and associated data by contacting us at <a href="mailto:a.p.gerszten@gmail.com" style={{ color: T.accent }}>a.p.gerszten@gmail.com</a>. Some information may be retained where required for legal, security, or fraud-prevention purposes.</P>

      <H2>6. Children&apos;s Privacy</H2>
      <P>Gigl is not directed to children under 13 (or the relevant minimum age in your jurisdiction), and we do not knowingly collect personal information from children under that age. If you believe a child has provided us with personal information, please contact us so we can remove it.</P>

      <H2>7. Data Security</H2>
      <P>We take reasonable measures to protect your information, but no method of transmission or storage is completely secure. We cannot guarantee absolute security.</P>

      <H2>8. Changes to This Policy</H2>
      <P>We may update this Privacy Policy from time to time. If we make material changes, we will update the &quot;Last updated&quot; date above and, where appropriate, provide additional notice.</P>

      <H2>9. Contact Us</H2>
      <P>Questions about this Privacy Policy can be directed to: <a href="mailto:a.p.gerszten@gmail.com" style={{ color: T.accent }}>a.p.gerszten@gmail.com</a></P>
    </LegalPageShell>
  )
}

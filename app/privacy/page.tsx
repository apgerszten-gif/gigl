'use client'

import Link from 'next/link'
import { LegalPageShell, LegalH2 as H2, LegalP as P, LegalUl as Ul } from '@/components/LegalPageShell'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/contact'

// Keep this in step with what the app actually does. Apple compares it with
// the App Store privacy answers, so a new kind of data, a new provider, or a
// new place something is shown publicly means an edit here and a new date.

const linkClass = 'text-accent underline underline-offset-[3px]'
const Email = () => <a href={SUPPORT_MAILTO} className={linkClass}>{SUPPORT_EMAIL}</a>

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="Last updated: November 6, 2026">
      <P>This Privacy Policy explains what Gigl (&quot;Gigl,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects when you use the Gigl website and app (the &quot;Service&quot;), how we use it, who we share it with, and the choices you have.</P>

      <H2>1. Information You Give Us</H2>
      <Ul>
        <li><strong>Your account.</strong> Your phone number, which you sign in with using a code we text you. Accounts made before phone sign-up use an email address and password instead. Your username, display name, and profile photo if you add one.</li>
        <li><strong>What you post.</strong> The shows you log; your performance, venue, and crowd ratings; reviews and highlight tags; photos and videos; your Battle Mode picks; comments, likes, and reactions; the people you follow; and the people you tag as having gone with you.</li>
        <li><strong>Shows you save.</strong> Upcoming shows you save so we can remind you to review them, and whether you asked to be texted about one.</li>
        <li><strong>Shows you add.</strong> Details of shows you submit to Gigl&apos;s search.</li>
        <li><strong>Reports and blocks.</strong> Reports you file about content, and the accounts you block.</li>
        <li><strong>Messages to us.</strong> Anything you send to our support email.</li>
      </Ul>

      <H2>2. Information Collected Automatically</H2>
      <Ul>
        <li><strong>Visit counts.</strong> When you open Gigl, your browser stores a random ID, and we record that a visit happened and whether you arrived from a Gigl QR code, a shared profile link, or directly. Scanning a Gigl QR code also sets a cookie holding a random ID for one year, so a repeat scan isn&apos;t counted twice. When you sign up, we note on your account which of those three ways you first arrived.</li>
        <li><strong>Your location, if you allow it.</strong> The &quot;Near me&quot; filter in show search asks your browser for your location. Your device rounds it to about a kilometer before sending it with a search, and we use it only to find shows near you. We don&apos;t store it in our database. Your device remembers your most recent location so the filter loads quickly, and our hosting provider&apos;s request logs may hold the rounded location briefly.</li>
        <li><strong>Technical information.</strong> Like any website, our hosting provider receives your IP address, browser type, and the pages you request, and keeps them in logs for a short time for security and troubleshooting.</li>
        <li><strong>Storage on your device.</strong> Gigl keeps some things in your browser&apos;s local storage: settings like your search city and festival, a copy of the feed so it opens quickly, and logs that haven&apos;t finished sending, so a bad connection can&apos;t lose them.</li>
      </Ul>
      <P>We don&apos;t use advertising cookies or third-party analytics, and we don&apos;t track you across other websites or apps.</P>

      <H2>3. Your Contacts</H2>
      <P>On devices that support it (currently Chrome on Android), &quot;Find friends&quot; lets you pick contacts to see which of them are on Gigl. Your device turns each phone number into a one-way hash before sending it. We compare those hashes with our members&apos; numbers in memory and don&apos;t store them, so nothing is kept about anyone who isn&apos;t on Gigl.</P>
      <P>If someone who has your phone number uses Find friends, they can learn that you have a Gigl account. To be left out of contact matching, email us at <Email />.</P>

      <H2>4. How We Use Information</H2>
      <Ul>
        <li>To run the Service: signing you in; showing your logs, ratings, and profile; building rankings and the feed; and features like search, reminders, and tagging.</li>
        <li>To send the texts you ask for: sign-in codes, and reminders about saved shows if you choose to be texted about them.</li>
        <li>To keep Gigl safe: reviewing reports, removing content that breaks our <Link href="/terms" className={linkClass}>Terms of Service</Link>, and preventing abuse.</li>
        <li>To understand and improve Gigl, for example by counting visits and sign-ups.</li>
        <li>To contact you about your account when we need to.</li>
      </Ul>
      <P>We do not sell or rent your personal information, and we don&apos;t use it for advertising.</P>

      <H2>5. What Other People Can See</H2>
      <P>Gigl is a public, social app. Anyone, including people without an account, can see your username, display name, profile photo, logged shows, ratings, reviews, highlight tags, photos and videos, Battle Mode record, comments and reactions, who you follow and who follows you, and the logs you&apos;ve been tagged on. Please don&apos;t post anything you don&apos;t want seen publicly.</P>
      <P>These stay private: your phone number or email address, your saved shows, the accounts you block, and the reports you file. Someone you report isn&apos;t told who reported them, and someone you block isn&apos;t told either.</P>
      <P>When you tag someone, their username appears on your log, and your log appears under &quot;Tagged in&quot; on their profile. Anyone tagged can remove the tag from their own profile. Once either person has blocked the other, they can&apos;t tag each other, and neither sees the other&apos;s logs or comments while signed in.</P>

      <H2>6. Service Providers</H2>
      <P>We use these providers to run Gigl. They process data on our behalf, under their own terms and privacy policies:</P>
      <Ul>
        <li><strong>Supabase</strong>: stores accounts, posts, photos, and videos, and handles sign-in.</li>
        <li><strong>Vercel</strong>: hosts the Service.</li>
        <li><strong>Prelude</strong>: sends sign-in codes by text message, and so receives your phone number.</li>
        <li><strong>Twilio</strong>: handles Gigl&apos;s other text-message features, such as rating a show by text, and receives your phone number and the messages you send it.</li>
      </Ul>
      <P>Show listings come from Ticketmaster, setlist.fm, and venues&apos; own websites. Our servers send them search terms such as artist and venue names, never your personal information. Artist photos load directly from Ticketmaster&apos;s image servers, which, like any site you load an image from, see your device&apos;s IP address.</P>
      <P>We may also disclose information when the law requires it, to protect someone&apos;s safety, or as part of a merger, acquisition, or sale of Gigl.</P>

      <H2>7. Data Retention &amp; Deletion</H2>
      <P>We keep your account information and content for as long as your account is open. You can delete your account at any time from inside Gigl: tap <strong>Delete account</strong> at the bottom of your profile, or go to <Link href="/delete-account" className={linkClass}>gigl.space/delete-account</Link>. This immediately deletes your profile, phone number or email address, profile photo, logged shows, ratings, reviews, photos and videos, comments, reactions, follows, tags, and saved shows. Shows you added to Gigl&apos;s search stay listed, without your name attached. Reports you made about other people&apos;s content are kept, without your name, as a record of what we reviewed.</P>
      <P>If you can&apos;t sign in, you can ask us to delete your account at <Email />. Copies in our providers&apos; backups and logs expire on their own schedules, and some information may be kept where the law requires it or to prevent fraud and abuse.</P>

      <H2>8. Your Choices &amp; Rights</H2>
      <Ul>
        <li>Edit or delete your logs, reviews, photos, and profile photo in the app, and untag yourself from &quot;Tagged in&quot;.</li>
        <li>Block anyone, and report content that breaks our Terms, from the &bull;&bull;&bull; menu beside it.</li>
        <li>Turn off &quot;Near me&quot; in search, or deny location access in your browser or device settings.</li>
        <li>Choose not to use Find friends; we never read your contacts unless you pick them.</li>
      </Ul>
      <P>To get a copy of your data, correct it, or be left out of contact matching, email us at <Email />. Depending on where you live, for example California, the EU, or the UK, you may have further rights to access, correct, delete, or move your data, or to object to how we use it. We&apos;ll honor those requests, and won&apos;t treat you differently for making them.</P>

      <H2>9. Children&apos;s Privacy</H2>
      <P>Gigl is not directed to children under 13 (or the relevant minimum age in your jurisdiction), and we do not knowingly collect personal information from children under that age. If you believe a child has provided us with personal information, please contact us so we can remove it.</P>

      <H2>10. Data Security</H2>
      <P>We take reasonable measures to protect your information, but no method of transmission or storage is completely secure. We cannot guarantee absolute security.</P>

      <H2>11. Where Your Data Is Stored</H2>
      <P>Gigl and its providers store and process data in the United States. If you use Gigl from elsewhere, your information is transferred to the United States.</P>

      <H2>12. Changes to This Policy</H2>
      <P>We may update this Privacy Policy from time to time. If we make material changes, we will update the &quot;Last updated&quot; date above and, where appropriate, provide additional notice.</P>

      <H2>13. Contact Us</H2>
      <P>Questions about this Privacy Policy can be directed to: <Email /></P>
    </LegalPageShell>
  )
}

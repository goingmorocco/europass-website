export default function Privacy() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">Privacy Policy</h1>
          <p className="text-lg text-primary-foreground/80">
            Last updated: October 1, 2023
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl prose prose-lg">
          <p>
            At EuroPass, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect information that you voluntarily provide to us when registering for courses, filling out contact forms, or subscribing to our newsletter. This may include:</p>
          <ul>
            <li>Personal Data: Name, email address, phone number, date of birth.</li>
            <li>Educational Data: Previous degrees, language proficiency levels.</li>
            <li>Financial Data: Payment history (we do not store full credit card numbers).</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect primarily to provide, maintain, protect, and improve our current services. Specifically, we use it to:</p>
          <ul>
            <li>Process your enrollment and manage your student portal account.</li>
            <li>Communicate with you regarding course updates, schedules, and administrative matters.</li>
            <li>Assist with visa applications and partner company placements (with your explicit consent).</li>
            <li>Send marketing communications, which you can opt out of at any time.</li>
          </ul>

          <h2>3. Data Sharing and Disclosure</h2>
          <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
          <ul>
            <li>Partner companies in Germany or Europe strictly for Ausbildung or employment placement purposes (only with your explicit consent).</li>
            <li>Service providers who assist us in operating our school (e.g., payment processors, email services), under strict confidentiality agreements.</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal data against accidental or unlawful destruction, loss, alteration, or unauthorized disclosure.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            You have the right to request access to the personal data we hold about you, to request that your data be corrected or deleted, and to object to the processing of your data.
          </p>
          <p>
            For any privacy-related inquiries, please contact us at privacy@europass.ma.
          </p>
        </div>
      </section>
    </div>
  );
}

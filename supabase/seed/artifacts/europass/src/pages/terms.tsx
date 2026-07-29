export default function Terms() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">Terms of Service</h1>
          <p className="text-lg text-primary-foreground/80">
            Last updated: October 1, 2023
          </p>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl prose prose-lg">
          <p>
            Welcome to EuroPass. By accessing our website and utilizing our services, you agree to comply with and be bound by the following Terms of Service.
          </p>

          <h2>1. Enrollment and Payment</h2>
          <ul>
            <li>Enrollment is confirmed only upon receipt of the required deposit or full payment for the course.</li>
            <li>Course fees are non-refundable after the first week of classes, except under exceptional circumstances documented by official proof (e.g., severe medical emergencies).</li>
            <li>EuroPass reserves the right to change course schedules or cancel classes due to insufficient enrollment. In such cases, full refunds or alternative schedules will be offered.</li>
          </ul>

          <h2>2. Student Conduct</h2>
          <p>Students are expected to maintain a respectful and professional demeanor. EuroPass reserves the right to dismiss any student whose behavior is disruptive to the learning environment, without refund.</p>

          <h2>3. Intellectual Property</h2>
          <p>All materials provided during courses, including digital content in the student portal, physical handouts, and course outlines, are the intellectual property of EuroPass and may not be reproduced or distributed without permission.</p>

          <h2>4. Ausbildung and Placement Services</h2>
          <p>While EuroPass provides extensive support and direct connections to partner companies for the Ausbildung program, we do not guarantee employment or visa approval, as these depend on the receiving company and German immigration authorities.</p>

          <h2>5. Limitation of Liability</h2>
          <p>EuroPass is not liable for any indirect, incidental, or consequential damages arising out of the use of our educational services. Our total liability shall not exceed the total amount paid by the student for the specific service.</p>

          <h2>6. Governing Law</h2>
          <p>These terms shall be governed by and construed in accordance with the laws of Morocco. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts in Khemisset, Morocco.</p>
        </div>
      </section>
    </div>
  );
}

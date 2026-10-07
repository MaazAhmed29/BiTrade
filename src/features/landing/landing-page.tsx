import { AboutSection } from "./about-section";
import { FaqSection } from "./faq-section";
import { FeaturesSection } from "./features-section";
import { FinalCtaSection } from "./final-cta-section";
import { Hero } from "./hero";
import { HowItWorksSection } from "./how-it-works-section";
import { LandingFooter } from "./landing-footer";
import { LandingNav } from "./landing-nav";
import { LearningSection } from "./learning-section";
import { SupportedAssetsSection } from "./supported-assets-section";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <LandingNav />
      <main>
        <Hero />
        <FeaturesSection />
        <AboutSection />
        <HowItWorksSection />
        <LearningSection />
        <SupportedAssetsSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}

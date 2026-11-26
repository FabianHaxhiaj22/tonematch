import { CONTAINER } from "@/components/layout/container";
import { Hero } from "@/features/landing/Hero";
import { HowItWorks } from "@/features/landing/HowItWorks";
import { PrivacyPromise } from "@/features/landing/PrivacyPromise";

/** Landing page (SPEC §3, §13): promise + upload, how it works, privacy promise. */
export default function Home() {
  return (
    <>
      <div className={CONTAINER}>
        <Hero />
        <HowItWorks />
      </div>
      <PrivacyPromise />
    </>
  );
}

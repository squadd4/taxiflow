import Hero from "@/components/Hero";
import Navigation from "@/components/Navigation";
import AppReveal from "@/components/sections/AppReveal";
import Contact from "@/components/sections/Contact";
import Features from "@/components/sections/Features";
import Footer from "@/components/sections/Footer";
import HowItWorks from "@/components/sections/HowItWorks";

export default function Home() {
  return (
    <>
      <Navigation />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <AppReveal />
        <Features />
        <HowItWorks />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

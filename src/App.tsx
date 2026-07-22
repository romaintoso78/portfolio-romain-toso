import { Nav } from "./components/Nav";
import { StatusRail } from "./components/StatusRail";
import { KoiFish } from "./components/KoiFish";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { Experience } from "./components/Experience";
import { Projects } from "./components/Projects";
import { Skills } from "./components/Skills";
import { Education } from "./components/Education";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { WaveDivider } from "./components/ui/WaveDivider";
import { useActiveSection } from "./hooks/useActiveSection";

const sections = [
  { id: "hero", label: "Accueil" },
  { id: "profil", label: "Profil" },
  { id: "experience", label: "Expérience" },
  { id: "projets", label: "Projets" },
  { id: "competences", label: "Compétences" },
  { id: "formation", label: "Formation" },
  { id: "contact", label: "Contact" },
];

function App() {
  const activeId = useActiveSection(sections.map((s) => s.id));

  return (
    <>
      <KoiFish />
      <Nav sections={sections} activeId={activeId} />
      <StatusRail sections={sections} activeId={activeId} />
      <main className="relative z-10">
        <Hero />
        <WaveDivider />
        <About />
        <WaveDivider />
        <Experience />
        <WaveDivider />
        <Projects />
        <WaveDivider />
        <Skills />
        <WaveDivider />
        <Education />
        <WaveDivider />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default App;

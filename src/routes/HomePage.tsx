import { HeroParticles } from '@/components/hero/HeroParticles'
import { Hero } from '@/components/hero/Hero'
import { EcosystemSection } from '@/components/ecosystem/EcosystemSection'
import { DEMOS } from '@/data/demos'
import { DemoSection } from '@/components/demo/DemoSection'
import { DotNav } from '@/components/demo/DotNav'
import { useDemoScrollSpy } from '@/hooks/useDemoScrollSpy'

// Matches the legacy markup order: hero, ecosystem, three demo sections,
// dot nav.
export function HomePage() {
  const { setSectionRef, activeId, isVisible } = useDemoScrollSpy()

  return (
    <>
      <HeroParticles />
      <Hero />
      <EcosystemSection />

      {DEMOS.map((demo) => (
        <DemoSection key={demo.id} demo={demo} ref={setSectionRef(demo.id)} />
      ))}

      <DotNav activeId={activeId} isVisible={isVisible} />
    </>
  )
}

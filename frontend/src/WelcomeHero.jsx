import heroImage from "./assets/images/hero_reading_adventure_1795046657309.jpg";

const worlds = [
  { label: "Sounds", icon: "♪" },
  { label: "Phonics", icon: "Aa" },
  { label: "Sight words", icon: "★" },
  { label: "Stories", icon: "📖" },
];

export default function WelcomeHero() {
  return <section className="welcome-hero" aria-labelledby="welcome-hero-title">
    <div className="welcome-hero-copy">
      <p className="eyebrow">Small steps. Big reading adventures.</p>
      <h2 id="welcome-hero-title">Every reader can find their next quest.</h2>
      <p>Practice sounds, blend words, and explore stories with lessons that adapt as confidence grows.</p>
      <ul className="world-list" aria-label="Reading worlds">
        {worlds.map(world => <li key={world.label}><span aria-hidden="true">{world.icon}</span>{world.label}</li>)}
      </ul>
    </div>
    <img className="welcome-hero-image" src={heroImage} alt="Children exploring a colorful reading adventure" />
  </section>;
}

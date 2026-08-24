import { getDatabaseConnection, saveReflectorNode } from '../server/db/database.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

/**
 * Montreal (MUTEK / Experimental & New Media) Seed Script
 * 30 Landmark Towers + 8 Initial Memory Reflectors
 * Accurate WGS-84 coordinates for Carto map provider within 5km radius of downtown / SAT.
 */

const MONTREAL_30_TOWERS = [
  // ── Zone 1: MUTEK & Quartier des Spectacles Core ────────────────────────────
  {
    name: { en: 'SAT — Satosphère 360° Dome', fr: 'Société des arts technologiques (SAT)' },
    lat: 45.51056, lng: -73.56346, alt: 35.0,
    intentText: '18-meter geodetic dome with 157 spatialized speakers, 360-degree acoustic immersion, clustered sine partials and multi-channel spatial diffusion',
    description: {
      en: '18m geodetic dome with 157 spatialized speakers — multi-channel spatial diffusion and modular sine clusters.',
      fr: 'Dôme géodésique de 18 m doté de 157 haut-parleurs spatialisés — diffusion sonore multicanale et clusters sinusoïdaux.'
    }
  },
  {
    name: { en: 'MTELUS — MUTEK Nocturne Hub', fr: 'MTELUS — Scène Principale Nocturne' },
    lat: 45.51132, lng: -73.56308, alt: 32.0,
    intentText: 'Historic 1884 music hall host to MUTEK Nocturnes, physical sub-bass drop resonance, tight lowpass impact, and crowded hall reverberation',
    description: {
      en: 'Historic 1884 music hall host to MUTEK Nocturnes — physical sub-bass drops and heavy crowd presence.',
      fr: 'Salle historique de 1884 accueillant les Nocturnes MUTEK — impacts sous-basses physiques et présence de la foule.'
    }
  },
  {
    name: { en: 'Esplanade Tranquille (Digital Stage)', fr: 'Esplanade Tranquille (Scène Extérieure)' },
    lat: 45.50785, lng: -73.56702, alt: 30.0,
    intentText: 'Open-air refrigerated rink turned summer digital stage, high-frequency spatial dispersion over granite pavers, outdoor festival crowd murmur',
    description: {
      en: 'Open-air refrigerated rink turned digital stage — spatial dispersion over granite pavers and summer breeze.',
      fr: 'Patinoire extérieure devenue scène numérique — dispersion spatiale sur pavés de granit et brise estivale.'
    }
  },
  {
    name: { en: 'Place des Arts (Théâtre Maisonneuve)', fr: 'Place des Arts (Théâtre Maisonneuve)' },
    lat: 45.50882, lng: -73.56545, alt: 33.0,
    intentText: 'Quebec premier performing arts complex, deep acoustic reflections, brass resonance, symphonic decay, and golden ratio spectral bells',
    description: {
      en: 'Premier performing arts complex — rich architectural acoustic reflections and symphonic resonance.',
      fr: 'Complexe majeur des arts de la scène — riches réflexions acoustiques architecturales et résonance symphonique.'
    }
  },
  {
    name: { en: 'Musée d\'art contemporain (MAC)', fr: 'Musée d\'art contemporain de Montréal' },
    lat: 45.50812, lng: -73.56610, alt: 31.0,
    intentText: 'Brutalist contemporary art museum undergoing metamorphosis, micro-glitches, digital artifacts, bitcrushed noise bursts, and architectural friction',
    description: {
      en: 'Brutalist contemporary art museum — micro-glitches, digital artifacts, and architectural transformation.',
      fr: 'Musée d\'art contemporain brutaliste — micro-glitches, artefacts numériques et métamorphose architecturale.'
    }
  },
  {
    name: { en: 'Monument-National (A/Visions)', fr: 'Monument-National (Série A/Visions)' },
    lat: 45.50998, lng: -73.56155, alt: 28.0,
    intentText: 'Historic 1893 stone theatre hosting MUTEK seated audiovisual concerts, warm plush theatre acoustics, spectral drone resonance, delicate harmonic overtones',
    description: {
      en: '1893 stone theatre for seated A/V concerts — plush acoustics and delicate spectral harmonic overtones.',
      fr: 'Théâtre de pierre de 1893 pour concerts A/V assis — acoustique feutrée et riches harmoniques spectrales.'
    }
  },
  {
    name: { en: 'Club Soda (Saint-Laurent)', fr: 'Club Soda (Boulevard Saint-Laurent)' },
    lat: 45.51184, lng: -73.56362, alt: 34.0,
    intentText: 'Intimate Boulevard Saint-Laurent club venue, punchy kick transients, high-density electronic dance energy, sub-bass pressure waves',
    description: {
      en: 'Intimate Saint-Laurent club venue — punchy kick transients and high-density electronic dance energy.',
      fr: 'Club mythique du boulevard Saint-Laurent — attaques percutantes et haute densité d\'énergie électronique.'
    }
  },

  // ── Zone 2: Old Port, Silos & Riverfront ────────────────────────────────────
  {
    name: { en: 'Silo No. 5 (Grain Elevator)', fr: 'Silo no 5 — Monument Industriel' },
    lat: 45.49655, lng: -73.55180, alt: 45.0,
    intentText: 'Monolithic half-kilometer concrete grain elevator, monumental 8-second cavernous cavity reverberation, deep industrial drone and metallic wind',
    description: {
      en: 'Monolithic 0.5km concrete grain elevator — monumental 8-second cavernous reverberation and industrial wind.',
      fr: 'Élévateur à grain monumental en béton de 500 m — réverbération caverneuse de 8 secondes et vent industriel.'
    }
  },
  {
    name: { en: 'Farine Five Roses Neon Beacon', fr: 'Enseigne Lumineuse Farine Five Roses' },
    lat: 45.49122, lng: -73.55390, alt: 50.0,
    intentText: '1948 iconic red neon skyline beacon, 60Hz North American power grid hum, high-voltage transformer buzz, and harbor breeze',
    description: {
      en: '1948 iconic red neon landmark — 60Hz power grid hum, tube transformer buzz, and harbor breeze.',
      fr: 'Balise néon rouge emblématique de 1948 — ronflement électrique à 60 Hz, transformateurs et vent portuaire.'
    }
  },
  {
    name: { en: 'Centre Phi (XR & Immersive Lab)', fr: 'Centre Phi — Arts Immersifs & XR' },
    lat: 45.50205, lng: -73.55525, alt: 18.0,
    intentText: 'Cutting-edge digital and VR art laboratory in historic stone Old Montreal, micro-sound textures, spatial panning, granular audio reflections',
    description: {
      en: 'Cutting-edge VR and digital art center in Old Montreal — micro-sound textures and spatialized panning.',
      fr: 'Centre d\'art immersif et XR dans le Vieux-Montréal — micro-textures sonores et panoramisation spatiale.'
    }
  },
  {
    name: { en: 'Notre-Dame Basilica (AURA)', fr: 'Basilique Notre-Dame (AURA)' },
    lat: 45.50485, lng: -73.55622, alt: 24.0,
    intentText: 'Neo-Gothic cathedral housing 1891 Casavant pipe organ and Moment Factory AURA light installation, massive cathedral reverb, inharmonic sacred bell decay',
    description: {
      en: 'Neo-Gothic cathedral — 1891 pipe organ echoes, inharmonic spectral bell decay, and light immersion.',
      fr: 'Basilique néo-gothique — échos de l\'orgue Casavant de 1891, cloches spectrales et immersion lumineuse.'
    }
  },
  {
    name: { en: 'Habitat 67 (Brutalist Wave)', fr: 'Habitat 67 — Moshe Safdie' },
    lat: 45.50002, lng: -73.54350, alt: 22.0,
    intentText: 'Moshe Safdie 1967 modular brutalist cube complex jutting into the St. Lawrence river, water current friction, wind whistling through geometric concrete gaps',
    description: {
      en: 'Moshe Safdie 1967 brutalist cube complex — St. Lawrence river current friction and wind through concrete gaps.',
      fr: 'Ensemble modulaire brutaliste de Moshe Safdie (1967) — frottement du courant fluvial et vent entre les blocs.'
    }
  },
  {
    name: { en: 'Old Port Clock Tower', fr: 'Quai de l\'Horloge — Vieux-Port' },
    lat: 45.51190, lng: -73.54575, alt: 40.0,
    intentText: '45-meter memorial clock tower overlooking the shipping channel, St. Lawrence river ice cracking, hydrophone transients, and distant ship foghorn',
    description: {
      en: '45m harbor clock tower — St. Lawrence river ice cracking, hydrophone transients, and shipping channel echoes.',
      fr: 'Tour de l\'horloge de 45 m — craquements de la glace fluviale, transitoires d\'hydrophone et échos maritimes.'
    }
  },
  {
    name: { en: 'Pointe-à-Callière Underground Crypt', fr: 'Pointe-à-Callière — Crypte Archéologique' },
    lat: 45.50280, lng: -73.55385, alt: 12.0,
    intentText: 'Montreal archaeological birthplace built directly over 18th-century stone sewers and subterranean crypts, low-frequency damp drone, dripping water echo',
    description: {
      en: 'Archaeological birthplace over 18th-century stone sewers — low damp drone and subterranean water echo.',
      fr: 'Lieu de fondation de Montréal sur les anciens égouts de pierre — bourdonnement sourd et écho souterrain.'
    }
  },

  // ── Zone 3: Mile End & Mile-Ex Creative Labs ────────────────────────────────
  {
    name: { en: 'Eastern Bloc (New Media Lab)', fr: 'Eastern Bloc — Centre d\'arts nouveaux médias' },
    lat: 45.53400, lng: -73.61800, alt: 52.0,
    intentText: 'DIY new media production lab and digital arts incubator, circuit bending, optical sound pulses, modular synth clock jitter, hardware hacking resonance',
    description: {
      en: 'New media artist incubator — circuit bending, optical sound pulses, and modular clock jitter.',
      fr: 'Incubateur d\'arts numériques — circuits modifiés (circuit bending), impulsions optiques et jitter modulaire.'
    }
  },
  {
    name: { en: 'Van Horne Water Tower & Viaduc', fr: 'Château d\'eau Van Horne & Passerelle' },
    lat: 45.52830, lng: -73.59760, alt: 55.0,
    intentText: 'Industrial water tower overlooking CPR railway corridor and skatepark, freight train steel squeals, wind through rusted iron tank supports, micro-glitches',
    description: {
      en: 'Industrial water tower over CPR railway corridor — freight train steel squeals and wind through iron tanks.',
      fr: 'Château d\'eau industriel sur le corridor ferroviaire du CP — grincement d\'acier et vent sur cuves rouillées.'
    }
  },
  {
    name: { en: 'La Sala Rossa (Saint-Laurent)', fr: 'La Sala Rossa — Salle de Concert' },
    lat: 45.52185, lng: -73.58550, alt: 48.0,
    intentText: 'Legendary indie and experimental music sanctuary in former Spanish hall, spring reverb twang, microphone feedback, guitar cabinet hum, wood floor creaks',
    description: {
      en: 'Legendary experimental music hall — spring reverb twang, microphone feedback, and wood floor creaks.',
      fr: 'Salle de concert expérimentale mythique — réverbération à ressorts, larsen et craquements de plancher.'
    }
  },
  {
    name: { en: 'Rialto Theatre (Neo-Baroque)', fr: 'Théâtre Rialto — Cabaret Baroque' },
    lat: 45.52415, lng: -73.60150, alt: 54.0,
    intentText: 'Opulent 1924 neo-baroque theatre hosting darkwave and avant-garde electronic shows, gilded plaster acoustic diffusion, algorithmic spectral bell ring',
    description: {
      en: '1924 neo-baroque palace — gilded plaster acoustic diffusion and avant-garde electronic reverberation.',
      fr: 'Palais néo-baroque de 1924 — diffusion acoustique des plâtres dorés et réverbération électronique.'
    }
  },
  {
    name: { en: 'Mile End Modular Atelier (5445 Gaspe)', fr: 'Atelier Modulaire du Mile End (5445 Gaspe)' },
    lat: 45.52740, lng: -73.59920, alt: 50.0,
    intentText: 'Massive former garment factory turned artist studios and modular synth workshops, Eurorack analog oscillator drift, rapid stepped clock pulses, bitcrushed noise',
    description: {
      en: 'Former garment factory housing synth workshops — Eurorack analog drift and stepped clock pulses.',
      fr: 'Ancienne manufacture textile abritant des ateliers de synthétiseurs — dérive Eurorack et pulsations de micro-horloges.'
    }
  },
  {
    name: { en: 'Cinéma Moderne (Micro-Cinema)', fr: 'Cinéma Moderne — Espace Micro-Cinéma' },
    lat: 45.52480, lng: -73.59370, alt: 49.0,
    intentText: 'Boutique micro-cinema dedicated to expanded cinema and surround audiovisual art, intimate acoustic damping, spatialized sub-frequencies, optical audio clicks',
    description: {
      en: 'Boutique micro-cinema — intimate acoustic damping, spatialized sub-frequencies, and optical audio clicks.',
      fr: 'Micro-cinéma d\'auteur — insonorisation feutrée, basses spatialisées et cliquetis audio optique.'
    }
  },

  // ── Zone 4: Underground RÉSO & Brutalism ───────────────────────────────────
  {
    name: { en: 'Station Berri-UQAM (Metro Hub)', fr: 'Station Berri-UQAM — Nœud Souterrain' },
    lat: 45.51520, lng: -73.56110, alt: 15.0,
    intentText: 'Three-line underground metro hub, rubber-tired STM train friction, three-note ascending traction inverter chime, pedestrian footstep echo through tiled tunnel',
    description: {
      en: 'Major 3-line subterranean metro hub — rubber-tired train friction, 3-note inverter chimes, and tunnel reverb.',
      fr: 'Nœud central de 3 lignes de métro — frottement des rames sur pneus, carillon d\'onduleur et écho sous les voûtes.'
    }
  },
  {
    name: { en: 'Place Ville Marie & Le Ring', fr: 'Place Ville Marie & L\'Anneau Géant' },
    lat: 45.50070, lng: -73.56840, alt: 42.0,
    intentText: 'I.M. Pei 1962 cruciform skyscraper with 30-meter suspended steel Ring, urban canyon wind turbulence, deep metallic hum, subterranean shopping concourse',
    description: {
      en: 'I.M. Pei cruciform tower with suspended 30m steel Ring — wind turbulence and subterranean concourse pulse.',
      fr: 'Tour cruciforme d\'I.M. Pei avec l\'Anneau d\'acier suspendu de 30 m — turbulence éolienne et pulsation du RÉSO.'
    }
  },
  {
    name: { en: 'Complexe Desjardins Atrium', fr: 'Atrium du Complexe Desjardins' },
    lat: 45.50740, lng: -73.56410, alt: 30.0,
    intentText: 'Massive brutalist underground atrium connecting the RÉSO network, multi-story indoor fountain acoustics, concrete corridor footsteps, HVAC air pressure waves',
    description: {
      en: 'Massive brutalist underground atrium — indoor water fountain acoustics and concrete pedway footsteps.',
      fr: 'Grand atrium souterrain brutaliste — acoustique de fontaine intérieure et bruits de pas dans le réseau piétonnier.'
    }
  },
  {
    name: { en: 'Gare Windsor Historic Hall', fr: 'Gare Windsor — Hall Historique' },
    lat: 45.49750, lng: -73.57020, alt: 36.0,
    intentText: 'Historic 1889 Romanesque railway terminus, massive vaulted timber and iron roof, stone corridor echoes, nostalgic train memory, deep bell resonance',
    description: {
      en: '1889 Romanesque railway hall — vaulted timber roof acoustics and deep stone corridor echoes.',
      fr: 'Hall ferroviaire roman de 1889 — acoustique sous toit de bois voûté et profonds échos de pierre.'
    }
  },
  {
    name: { en: 'Mary Queen of the World Cathedral', fr: 'Cathédrale Marie-Reine-du-Monde' },
    lat: 45.49940, lng: -73.56810, alt: 38.0,
    intentText: 'Scaled replica of St. Peter Basilica in Rome, massive copper patron statues, bronze baldachin, long cathedral reverb, deep sacred bronze bell strikes',
    description: {
      en: 'Neo-baroque cathedral replica of St. Peter\'s — copper statues, bronze baldachin, and deep bell decay.',
      fr: 'Cathédrale néo-baroque inspirée de Saint-Pierre de Rome — statues de cuivre et longue résonance de cloches.'
    }
  },

  // ── Zone 5: Industrial Sanctuaries & Iconic Topography ──────────────────────
  {
    name: { en: 'Usine C (Black Box Theater)', fr: 'Usine C — Centre de création' },
    lat: 45.52350, lng: -73.55390, alt: 25.0,
    intentText: 'Repurposed 1920s bag factory transformed into black-box theater for MUTEK and contemporary dance, tight sub-bass response, industrial brick resonance',
    description: {
      en: 'Former 1920s factory turned black-box theatre — tight sub-bass response and industrial brick acoustics.',
      fr: 'Ancienne usine de 1920 devenue théâtre boîte noire — réponse sub-basse précise et acoustique de brique industrielle.'
    }
  },
  {
    name: { en: 'Bain Mathieu (Electronic Sanctuary)', fr: 'Bain Mathieu — Sanctuaire Électronique' },
    lat: 45.53030, lng: -73.54270, alt: 22.0,
    intentText: '1931 public bathhouse converted into an underground electronic music sanctuary, empty tiled swimming pool reverberation, modular analog drone phasing',
    description: {
      en: '1931 public bathhouse converted into electronic venue — empty tiled pool reverb and modular drone phasing.',
      fr: 'Bain public de 1931 transformé en sanctuaire électronique — réverbération des tuiles de la piscine et drones modulaires.'
    }
  },
  {
    name: { en: 'Biosphère (Île Sainte-Hélène)', fr: 'La Biosphère — Dôme Géodésique' },
    lat: 45.51410, lng: -73.53150, alt: 20.0,
    intentText: 'Buckminster Fuller 1967 geodesic sphere rising above the St. Lawrence river, wind whistling through open steel triangular lattice, river wave slaps',
    description: {
      en: 'Buckminster Fuller 1967 geodesic sphere — river wind whistling through open steel triangular struts.',
      fr: 'Dôme géodésique de Buckminster Fuller (1967) — vent fluvial sifflant à travers la structure triangulaire d\'acier.'
    }
  },
  {
    name: { en: 'Jacques-Cartier Bridge (Digital Lights)', fr: 'Pont Jacques-Cartier — Éclairage Vivant' },
    lat: 45.51950, lng: -73.53580, alt: 55.0,
    intentText: 'Illuminated steel cantilever bridge spanning the river, interactive digital light pulses synced to city data, high-velocity wind shear, hydro-optic laser chirps',
    description: {
      en: 'Interactive illuminated steel cantilever bridge — wind shear and data-driven optical light rhythms.',
      fr: 'Pont cantilever en acier à éclairage interactif — cisaillement du vent et pulsations lumineuses connectées.'
    }
  },
  {
    name: { en: 'Mount Royal Kondiaronk Lookout', fr: 'Belvédère Kondiaronk (Mont-Royal)' },
    lat: 45.50420, lng: -73.58750, alt: 233.0,
    intentText: 'Highest vantage point overlooking Montreal skyline, mountain ridge wind shear, distant city drone, winter frost, hydrophone and ambient optical pulses',
    description: {
      en: 'Highest vantage point over the city — mountain ridge wind shear, distant urban drone, and panoramic expanse.',
      fr: 'Point culminant surplombant la ville — vent de crête montagneuse, bourdonnement urbain lointain et vaste panorama.'
    }
  }
];

const MONTREAL_8_REFLECTORS = [
  {
    name: 'MUTEK Nocturne Rain Trace (Place des Festivals)',
    lat: 45.50850, lng: -73.56620, alt: 32.0,
    intentText: 'MUTEK Nocturne afterhours bass reverberations bleeding into summer rain over granite pavement tiles'
  },
  {
    name: 'Canal de Lachine Lock No. 1 Hydro-Lock',
    lat: 45.49880, lng: -73.55100, alt: 15.0,
    intentText: 'Iron lock gate groan, canal water eddy beneath Silo 5 concrete walls, and distant grain elevator drone'
  },
  {
    name: 'Champ-de-Mars Ferron Stained Glass Prism',
    lat: 45.51010, lng: -73.55650, alt: 20.0,
    intentText: 'Marcelle Ferron stained glass light refraction, subterranean metro air drafts, and soft spectral bell harmonics'
  },
  {
    name: 'Mile End Saint-Viateur Alley Modular Drift',
    lat: 45.52280, lng: -73.59550, alt: 50.0,
    intentText: 'Wood-fired oven smoke mingling with Eurorack modular oscillator drift across the narrow brick alley'
  },
  {
    name: 'Square Saint-Louis Victorian Fountain Resonance',
    lat: 45.51700, lng: -73.57050, alt: 42.0,
    intentText: 'Victorian stone facade echoes, water droplets in the bronze basin, and poet ghost whispers'
  },
  {
    name: 'Belvédère Camillien-Houde Dawn Shear',
    lat: 45.51150, lng: -73.58420, alt: 185.0,
    intentText: 'Dawn cyclist wind shear, rustling oak leaves, and distant St. Lawrence port crane horns'
  },
  {
    name: 'Place Émilie-Gamelin Subterranean Pulse',
    lat: 45.51580, lng: -73.56020, alt: 24.0,
    intentText: 'Subterranean bass pulses vibrating through concrete paving tiles from the underground metro hub'
  },
  {
    name: 'Parque Jean-Drapeau Seaway Current Friction',
    lat: 45.50800, lng: -73.53200, alt: 18.0,
    intentText: 'St. Lawrence shipping current friction against the concrete embankment and high-frequency laser chirps'
  }
];

async function seedMontreal() {
  console.log('=======================================================');
  console.log(' SEEDING MONTREAL: 30 TOWERS + 8 INITIAL REFLECTORS   ');
  console.log('=======================================================');

  const db = getDatabaseConnection();

  console.log('[SEED] Clearing existing Montreal nodes...');
  db.prepare('DELETE FROM nodes WHERE city = ?').run('montreal');

  // 1. Seed 30 Landmark Towers
  console.log(`\n[SEED] Generating acoustic presets for 30 Montreal Towers...`);
  for (let i = 0; i < MONTREAL_30_TOWERS.length; i++) {
    const loc = MONTREAL_30_TOWERS[i];
    const nameStr = typeof loc.name === 'object' ? loc.name.en : loc.name;
    console.log(`[TOWER ${i + 1}/30] Synthesizing: ${nameStr}...`);

    const stateVector = await generateReflectorPresetFromPrompt(loc.intentText, 'montreal');

    const node = {
      nodeId: `tower_montreal_${i + 1}`,
      nodeType: 'TOWER',
      city: 'montreal',
      name: loc.name,
      description: loc.description,
      coordinates: {
        lat: loc.lat,
        lng: loc.lng,
        alt: loc.alt || 0.0
      },
      stateVector,
      scarIndex: 0.0,
      interactionCount: 0
    };

    saveReflectorNode(node);
    console.log(`  -> Saved: "${nameStr}" [${stateVector.soundType} | ${stateVector.baseFrequency}Hz | Cutoff: ${stateVector.filterCutoff}Hz]`);
  }

  // 2. Seed 8 Memory Reflectors
  console.log(`\n[SEED] Generating acoustic presets for 8 Initial Montreal Reflectors...`);
  for (let j = 0; j < MONTREAL_8_REFLECTORS.length; j++) {
    const ref = MONTREAL_8_REFLECTORS[j];
    console.log(`[REFLECTOR ${j + 1}/8] Synthesizing: ${ref.name}...`);

    const stateVector = await generateReflectorPresetFromPrompt(ref.intentText, 'montreal');

    const node = {
      nodeId: `reflector_montreal_${Date.now()}_${j + 1}`,
      nodeType: 'REFLECTOR',
      city: 'montreal',
      name: ref.name,
      description: ref.intentText,
      coordinates: {
        lat: ref.lat,
        lng: ref.lng,
        alt: ref.alt || 0.0
      },
      stateVector,
      scarIndex: 0.02 * (j + 1),
      interactionCount: (j + 1) * 3
    };

    saveReflectorNode(node);
    console.log(`  -> Saved Reflector: "${ref.name}" [${stateVector.soundType} | ${stateVector.baseFrequency}Hz]`);
  }

  const finalCount = db.prepare('SELECT COUNT(*) as count FROM nodes WHERE city = ?').get('montreal');
  console.log(`\n=======================================================`);
  console.log(` [SUCCESS] Montreal seeded with ${finalCount.count} active acoustic nodes!`);
  console.log(`=======================================================`);
}

seedMontreal().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

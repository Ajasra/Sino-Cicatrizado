// ponytail: seed script for ~40 São Paulo city center reflectors using POST /api/reflectors endpoint with direct DB fallback.
import { getDatabaseConnection, saveReflectorNode } from '../server/db/database.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

const API_ENDPOINT = process.env.API_URL || 'http://localhost:3000/api/reflectors';

const SAO_PAULO_REFLECTORS = [
  // ── 1. Independent Underground & Art Spaces ────────────────────────────────
  {
    name: 'Estúdio Lâmina (Centro Histórico)',
    coordinates: { lat: -23.54724, lng: -46.63782, alt: 760.0 },
    intentText: 'Independent underground art studio and gallery in Centro, raw concrete walls, experimental noise performance, screenprinting, tape delay feedback.'
  },
  {
    name: 'Museu das Favelas (Palacete Franco de Mello)',
    coordinates: { lat: -23.53502, lng: -46.64351, alt: 742.0 },
    intentText: 'Cultural space celebrating favela heritage and street art, hip-hop vocal echoes, spray can rattle, marginal poetry, community drum resonance.'
  },
  {
    name: 'Casa do Povo (Bom Retiro)',
    coordinates: { lat: -23.52881, lng: -46.63922, alt: 735.0 },
    intentText: 'Autonomous counter-culture space, radical publishing, experimental sound performances, reverberant concrete stairwells.'
  },
  {
    name: 'Galeria Metrópole & Beco do Lear',
    coordinates: { lat: -23.54612, lng: -46.64153, alt: 765.0 },
    intentText: 'Historic modernist arcade filled with independent zine shops, rare vinyl archives, counter-culture fashion, vinyl record needle hum.'
  },
  {
    name: 'Centro Cultural Zapata',
    coordinates: { lat: -23.54851, lng: -46.64924, alt: 775.0 },
    intentText: 'Underground punk and hardcore DIY venue near Roosevelt, distorted bass amp hum, spray paint mural walls, crowd chatter decay.'
  },
  {
    name: 'Trackers Subterrâneo',
    coordinates: { lat: -23.54423, lng: -46.63902, alt: 750.0 },
    intentText: 'Secret underground electronic music lab and vinyl sanctuary in Centro, sub-bass reverberation, glitch sound art, graffiti stairwell.'
  },
  {
    name: 'Ocupação Cultural Ouvidor 63',
    coordinates: { lat: -23.54791, lng: -46.63582, alt: 758.0 },
    intentText: '13-story artist occupation in Centro, independent art studios, graffiti-covered elevator shaft, experimental sound art, wind through broken glass.'
  },
  {
    name: 'Casa de Luz (Rua Mauá - Luz)',
    coordinates: { lat: -23.53504, lng: -46.63521, alt: 732.0 },
    intentText: 'Underground multi-disciplinary art house in historic mansion, video installations, cabaret, sub-bass synth drones, visual art exhibitions.'
  },
  {
    name: 'Ateliê Alagados (Residência Centro)',
    coordinates: { lat: -23.54892, lng: -46.63812, alt: 752.0 },
    intentText: 'Underground independent art residency in Centro, oil paint smells, ambient drone synth, woodcut printing press clatter.'
  },

  // ── 2. Cemitério da Consolação (Consolação Cemetery - 4 Spots) ────────────
  {
    name: 'Pórtico Principal de Ferro',
    coordinates: { lat: -23.55121, lng: -46.65382, alt: 810.0 },
    intentText: 'Neoclassical iron gates and Victor Brecheret sculptures entrance, heavy stone arch reverb, wind through ornamental iron lattice.'
  },
  {
    name: 'Mausoléu Ramos de Azevedo',
    coordinates: { lat: -23.55183, lng: -46.65424, alt: 812.0 },
    intentText: 'Monumental granite mausoleum by sculptor Victor Brecheret, open-air modernist art gallery acoustics, parabolic marble reflection.'
  },
  {
    name: 'Túmulo de Tarsila do Amaral',
    coordinates: { lat: -23.55234, lng: -46.65481, alt: 814.0 },
    intentText: 'Resting place of Modernist painter Tarsila do Amaral (creator of Abaporu), quiet bird calls in cypress branches, subtle stone resonance.'
  },
  {
    name: 'Túmulo do Antoninho da Rocha Marmo',
    coordinates: { lat: -23.55322, lng: -46.65554, alt: 816.0 },
    intentText: 'Folk saint child grave surrounded by ex-votos, popular devotion art, flickering candle hum, soft prayers echoing off marble.'
  },

  // ── 3. Graffiti Murals & Pixação Corridors ─────────────────────────────────
  {
    name: 'Painel Os Gêmeos (Vale do Anhangabaú)',
    coordinates: { lat: -23.54622, lng: -46.63683, alt: 740.0 },
    intentText: 'Monumental multi-story street art mural by Os Gêmeos overlooking Anhangabaú, spray paint aerosol hiss, skateboard wheel clicks below.'
  },
  {
    name: 'Kobra Ayrton Senna Mural (Consolação x Paulista)',
    coordinates: { lat: -23.55702, lng: -46.65901, alt: 825.0 },
    intentText: 'Vivid kaleidoscopic street art mural by Eduardo Kobra, high-frequency urban traffic rumble, spray art energy.'
  },
  {
    name: 'Beco da Atibaia (Cambuci / Os Gêmeos origins)',
    coordinates: { lat: -23.55951, lng: -46.62623, alt: 750.0 },
    intentText: 'Cambuci street corner wall where Os Gêmeos painted early murals, hip-hop boombox sub-bass, spray paint rattle.'
  },
  {
    name: 'Edifício Copan Arcade',
    coordinates: { lat: -23.54653, lng: -46.64382, alt: 805.0 },
    intentText: 'Pedestrian arcade behind Copan covered in calligraphic pixação tags and street art murals, concrete wave echoes.'
  },
  {
    name: 'Rampa de Grafite da Galeria do Rock',
    coordinates: { lat: -23.54392, lng: -46.63781, alt: 745.0 },
    intentText: 'Spiral concrete ramps covered in rock, metal, and hip-hop murals, skate polyurethane wheel grinding.'
  },
  {
    name: 'Escadaria Rua Taguá',
    coordinates: { lat: -23.55822, lng: -46.63421, alt: 760.0 },
    intentText: 'Steep stone staircase covered in colorful stencil art and urban tags, footsteps echoing off painted brick.'
  },
  {
    name: 'Mural Criola',
    coordinates: { lat: -23.54781, lng: -46.63452, alt: 755.0 },
    intentText: 'Vivid Afro-Brazilian street art mural celebrating black feminist counter-culture, street samba acoustic echoes.'
  },
  {
    name: 'Viaduto Major Quedinho',
    coordinates: { lat: -23.54922, lng: -46.64503, alt: 780.0 },
    intentText: 'Concrete overpass pillars covered in iconic São Paulo pixação lettering, traffic hum echoing beneath.'
  },
  {
    name: 'Beco do Batman (Vila Madalena)',
    coordinates: { lat: -23.55621, lng: -46.68652, alt: 745.0 },
    intentText: 'Open-air street art sanctuary, aerosol spray can hiss, vivid mural walls, indie acoustic buskers, cobblestone step echo.'
  },

  // ── 4. Iconic Centro Acoustic Spots ─────────────────────────────────────────
  {
    name: 'Cripta de Anchieta (Pátio do Colégio)',
    coordinates: { lat: -23.54812, lng: -46.63231, alt: 765.0 },
    intentText: 'Underground stone crypt beneath 1554 city foundation site, damp masonry echo, historic chapel chime.'
  },
  {
    name: 'CCBB SP Rotunda',
    coordinates: { lat: -23.54602, lng: -46.63481, alt: 755.0 },
    intentText: '1900s banking vault rotunda, marble floor step decay, glass atrium acoustic reflections.'
  },
  {
    name: 'Praça da República',
    coordinates: { lat: -23.54321, lng: -46.64223, alt: 750.0 },
    intentText: 'Open plaza under tree canopy, street musicians, spray paint artists, pigeon wing flutters.'
  },
  {
    name: 'Largo do Arouche Mercado das Flores',
    coordinates: { lat: -23.53982, lng: -46.64451, alt: 742.0 },
    intentText: 'Historic flower market arcade and underground metro ventilation grate hum.'
  },
  {
    name: 'Viaduto Santa Ifigênia Sub-porão',
    coordinates: { lat: -23.54252, lng: -46.63631, alt: 740.0 },
    intentText: 'Under-bridge space beneath Belgian wrought iron viaduct, river valley wind acoustic channel.'
  },
  {
    name: 'Cripta da Igreja do Carmo',
    coordinates: { lat: -23.54881, lng: -46.63282, alt: 760.0 },
    intentText: '18th-century underground church crypt, baroque pipe organ resonance, thick stone wall isolation.'
  },

  // ── 5. Underground Counter-Culture & Radical Venues ────────────────────────
  {
    name: 'Madame Satã / Madame Club (Bixiga)',
    coordinates: { lat: -23.55681, lng: -46.64723, alt: 770.0 },
    intentText: 'Legendary 1980s post-punk, goth, and darkwave underground sanctuary in Bixiga, dark bassline echo, drum machine pulse, velvet reverb.'
  },
  {
    name: 'Teatro Oficina Uzyna Uzona (Zé Celso)',
    coordinates: { lat: -23.55831, lng: -46.64412, alt: 765.0 },
    intentText: 'Lina Bo Bardi designed radical counter-culture theater with glass street-corridor stage, passionate vocal chants, wild percussive echo.'
  },
  {
    name: 'Subterrâneo Alberta 3 (Av. São Luís)',
    coordinates: { lat: -23.54632, lng: -46.64302, alt: 760.0 },
    intentText: 'Underground basement bar in Centro, vintage rock vinyl spinning, lowpass bass resonance, cocktail glass clink.'
  },
  {
    name: 'Espaço Desmanche (Rua Augusta)',
    coordinates: { lat: -23.55341, lng: -46.65212, alt: 790.0 },
    intentText: 'Alternative subculture club on Augusta, indie soundscapes, urban art installations, neon light hum, distorted synth bass.'
  },
  {
    name: 'Funhouse (Rua Consolação)',
    coordinates: { lat: -23.55212, lng: -46.65412, alt: 800.0 },
    intentText: 'Underground indie rock hub, noisy synth-pop, vintage 8-bit arcade game soundscapes, crowd cheer decay.'
  },
  {
    name: 'Slam das Minas (Praça Roosevelt)',
    coordinates: { lat: -23.54894, lng: -46.64752, alt: 780.0 },
    intentText: 'Underground feminist poetry slam battle on Roosevelt plaza, powerful spoken word acoustics, concrete amphitheatre reverb, applause.'
  },
  {
    name: 'Passagem Literária da Consolação',
    coordinates: { lat: -23.55581, lng: -46.65752, alt: 795.0 },
    intentText: 'Underground pedestrian tunnel under Consolação with damp concrete reverb, footsteps echoing over old book stalls, subway rail hum filtering from below.'
  },
  {
    name: 'Cine Bijou / Belas Artes (Consolação)',
    coordinates: { lat: -23.55432, lng: -46.65621, alt: 805.0 },
    intentText: 'Historic underground art-house cinema displaying independent films, 35mm film projector mechanical whir, velvet acoustic dampening.'
  },
  {
    name: 'Sebo do Messias (Acervo Subterrâneo)',
    coordinates: { lat: -23.55021, lng: -46.63412, alt: 745.0 },
    intentText: 'Epicenter of second-hand underground literature and rare vinyl records in Centro, rustling paper dust, quiet wooden floorboard creak.'
  }
];

async function seedReflector(item, index, total) {
  const payload = {
    city: 'sao_paulo',
    name: item.name,
    coordinates: item.coordinates,
    intentText: item.intentText
  };

  // Try HTTP endpoint first
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const node = data.node;
      console.log(`[${index + 1}/${total}] [API] Added reflector: "${node.name}" (${node.stateVector.soundType}, ${node.stateVector.baseFrequency}Hz, cutoff ${node.stateVector.filterCutoff}Hz)`);
      return node;
    }
  } catch (_err) {
    // ponytail: fallback to direct synthesis & DB save if API server is not running
  }

  // Fallback: direct LLM/synthesis and SQLite database write
  const preset = await generateReflectorPresetFromPrompt(item.intentText, 'sao_paulo');
  const node = {
    nodeId: `reflector_sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    nodeType: 'REFLECTOR',
    city: 'sao_paulo',
    name: item.name,
    coordinates: item.coordinates,
    stateVector: preset,
    scarIndex: 0.0,
    interactionCount: 0
  };

  saveReflectorNode(node);
  console.log(`[${index + 1}/${total}] [DB Direct] Added reflector: "${node.name}" (${preset.soundType}, ${preset.baseFrequency}Hz, cutoff ${preset.filterCutoff}Hz)`);
  return node;
}

async function run() {
  console.log(`=======================================================`);
  console.log(` Seeding ${SAO_PAULO_REFLECTORS.length} São Paulo Reflector Spots`);
  console.log(` Target Endpoint: ${API_ENDPOINT}`);
  console.log(`=======================================================\n`);

  // Ensure DB initialized for direct fallback
  getDatabaseConnection();

  let count = 0;
  for (let i = 0; i < SAO_PAULO_REFLECTORS.length; i++) {
    const loc = SAO_PAULO_REFLECTORS[i];
    await seedReflector(loc, i, SAO_PAULO_REFLECTORS.length);
    count++;
  }

  console.log(`\n=======================================================`);
  console.log(` SUCCESS: ${count} Reflectors added to São Paulo!`);
  console.log(`=======================================================`);
}

run().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

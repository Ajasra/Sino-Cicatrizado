import { getDatabaseConnection, saveReflectorNode } from '../server/db/database.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

const EDMONTON_30_LOCATIONS = [
  // ── Bridges & River Valley ──────────────────────────────────────────────────
  {
    name: { en: 'High Level Bridge', fr: 'Pont High Level' },
    lat: 53.5192, lng: -113.4978, alt: 623.0,
    intentText: '113-year steel truss bridge, tire drone over deep river valley canyon, wind shear through iron lattice girders',
    description: {
      en: '113-year-old steel truss bridge — tire drone over the valley canyon floor, wind shear through iron lattice.',
      fr: 'Pont en treillis d\'acier de 113 ans — bourdonnement des pneus dans le canyon de la vallée, cisaillement du vent à travers les lattis de fer.'
    }
  },
  {
    name: { en: 'Walterdale Bridge (Through-Arch)', fr: 'Pont Walterdale (arc traversant)' },
    lat: 53.5278, lng: -113.4949, alt: 621.0,
    intentText: '2017 steel through-arch bridge, wind vibration in suspension cables, pedestrian footstep resonance over river',
    description: {
      en: '2017 steel through-arch spanning the North Saskatchewan — wind vibrating suspension cables and pedestrian footsteps.',
      fr: 'Arc traversant en acier de 2017 — vibration du vent dans les câbles suspendus et résonance des pas des piétons.'
    }
  },
  {
    name: { en: 'Tawatinâ Bridge — Valley Line LRT Crossing', fr: 'Pont Tawatinâ — traversée LRT' },
    lat: 53.5403, lng: -113.4772, alt: 620.0,
    intentText: 'Concrete LRT bridge crossing river valley, electric rail motor whine and inverter hum at low altitude',
    description: {
      en: 'Valley Line LRT concrete river crossing — electric motor inverter whine echoing from the valley floor.',
      fr: 'Traversée LRT en béton au-dessus de la rivière — sifflement électrique du moteur résonant dans la vallée.'
    }
  },
  {
    name: { en: 'Low Level Bridge (1912 Steel Girder)', fr: 'Pont Low Level (poutrelle d\'acier 1912)' },
    lat: 53.5239, lng: -113.4970, alt: 619.0,
    intentText: 'Historic 1912 steel girder bridge, river fog below, heavy vehicle rumble through open metal grating deck',
    description: {
      en: 'Historic 1912 steel girder bridge — vehicle rumble through open metal grating over river fog.',
      fr: 'Pont historique en poutrelle de 1912 — grondement des véhicules sur la grille métallique ouverte au-dessus du brouillard.'
    }
  },
  {
    name: { en: 'Mill Creek Trestle Bridge (1913 Railway Footpath)', fr: 'Pont trestle Mill Creek (1913)' },
    lat: 53.5100, lng: -113.4800, alt: 625.0,
    intentText: 'Decommissioned 1913 railway timber trestle turned pedestrian footpath, timber plank creak, valley wind whistling through iron supports',
    description: {
      en: 'Decommissioned 1913 railway trestle repurposed as footpath — timber plank creak and valley wind through iron supports.',
      fr: 'Viaduc ferroviaire de 1913 reconverti en sentier — grincement du bois et vent de vallée à travers les supports de fer.'
    }
  },

  // ── Murals & Street Art ─────────────────────────────────────────────────────
  {
    name: { en: 'YEG Dignity Mural — Churchill Pedway (127 ft)', fr: 'Mural Dignité YEG — Passerelle Churchill' },
    lat: 53.5451, lng: -113.4931, alt: 637.0,
    intentText: 'Underground pedway tunnel 127-foot mural, crowd footstep echo, concrete reverb, distant LRT hum filtered through tunnel walls',
    description: {
      en: '127-ft pedway mural by Carla Rae Taylor — underground concrete reverb, footstep echo, LRT hum filtering through walls.',
      fr: 'Mural de 127 pieds de Carla Rae Taylor — réverbération de béton souterrain, écho de pas, bourdonnement du LRT filtrant les murs.'
    }
  },
  {
    name: { en: 'HERO Mural (103 Ave & 104 St — Hardthirteen / Curly Whitebear)', fr: 'Mural HERO (103 Ave & 104 St)' },
    lat: 53.5471, lng: -113.5059, alt: 636.0,
    intentText: 'Outdoor alley wall mural in open concrete corridor, wind across painted brick surface, busker brass reverb echoing from nearby street',
    description: {
      en: 'Cree artist Curly Whitebear\'s "Indigenous futurism" mural — alley corridor wind and busker brass reverb from Jasper Ave.',
      fr: 'Mural "futurisme autochtone" de Curly Whitebear — vent de ruelle et réverbération de cuivres de rue.'
    }
  },
  {
    name: { en: 'Spur Line Alley — Character Street Art (104 St & Whyte Ave)', fr: 'Ruelle Spur Line — art de rue (104 St & Whyte)' },
    lat: 53.5173, lng: -113.5044, alt: 634.0,
    intentText: 'Covered alley street art narrow acoustic channel, footstep echo off painted walls, rain on corrugated metal roof, wind tunnel whistle',
    description: {
      en: 'Whyte Ave covered alley — footstep echo off painted walls, corrugated metal rain drops, narrow wind tunnel whistle.',
      fr: 'Ruelle couverte de Whyte — écho des pas sur les murs peints, pluie sur métal ondulé, sifflement du vent dans le couloir.'
    }
  },
  {
    name: { en: '7 Nations Turtles Crosswalk (101 St & Whyte Ave — Jessica Desmoulin)', fr: 'Passage Tortues 7 Nations (Whyte Ave)' },
    lat: 53.5168, lng: -113.5015, alt: 634.0,
    intentText: 'Ojibway ceremonial crosswalk art at street intersection, tire rumble over textured raised surface, community drum gathering sound',
    description: {
      en: 'Ojibway artist Jessica Desmoulin\'s crosswalk — tire rumble over raised textured surface and community drum resonance.',
      fr: 'Passage de l\'artiste ojibway Jessica Desmoulin — grondement sur la surface texturée et résonance du tambour communautaire.'
    }
  },
  {
    name: { en: 'Wîhkwêntôwin Tunnel Mural — High Level Bridge Underpass (Kayla Bellerose, 2025)', fr: 'Mural tunnel Wîhkwêntôwin (sous le pont High Level)' },
    lat: 53.5195, lng: -113.4985, alt: 620.0,
    intentText: 'Concrete underpass tunnel mural, cyclist and footstep resonance echo, valley wind entering from both ends, Indigenous voice memory',
    description: {
      en: 'Kayla Bellerose\'s 2025 tunnel mural — cyclist echo, valley wind through the underpass, Indigenous voice memory.',
      fr: 'Mural de tunnel 2025 de Kayla Bellerose — écho de cycliste, vent de vallée dans le passage, mémoire vocale autochtone.'
    }
  },
  {
    name: { en: '124 Street Mural Project — Full Building Takeover (10507 124 St)', fr: 'Projet mural rue 124 (bâtiment complet)' },
    lat: 53.5380, lng: -113.5442, alt: 638.0,
    intentText: 'Gallery Walk painted building exterior, vinyl record shop ambient drone, café chatter echo off painted concrete wall, street breeze',
    description: {
      en: '124 Street Gallery Walk full building mural — vinyl shop ambient drone and café echo off a painted concrete facade.',
      fr: 'Mural couvrant un bâtiment entier de la rue 124 — bourdonnement de disquaire et écho de café sur façade peinte.'
    }
  },

  // ── Indigenous & Cultural Memory ────────────────────────────────────────────
  {
    name: { en: 'Rossdale Flats — Pehonan (Cree: Gathering Place)', fr: 'Plaines Rossdale — Pehonan (lieu de rassemblement cri)' },
    lat: 53.5300, lng: -113.4942, alt: 616.0,
    intentText: 'Ancient Cree and Métis ceremonial gathering place and sacred burial ground on the river flats, deep ceremonial drum pulse and river memory',
    description: {
      en: 'Ancient multi-nation ceremonial gathering place and sacred burial site on the river flats — deep drum pulse and river memory.',
      fr: 'Lieu de rassemblement cérémonial ancestral et site funéraire sacré sur les plaines de la rivière — pulsation du tambour et mémoire fluviale.'
    }
  },
  {
    name: { en: 'kihcihkaw askî — "Sacred Land" Ceremony Site', fr: 'kihcihkaw askî — "Terre sacrée" (lieu cérémoniel)' },
    lat: 53.5190, lng: -113.4850, alt: 618.0,
    intentText: 'City-sanctioned Indigenous river valley ceremony and knowledge-transfer space, ceremonial song resonance through cottonwood canopy',
    description: {
      en: 'City-sanctioned Indigenous ceremony and knowledge-transfer space in the river valley — ceremonial song through cottonwood canopy.',
      fr: 'Espace cérémoniel autochtone et de transmission du savoir dans la vallée — chant cérémonial sous la voûte de peupliers.'
    }
  },
  {
    name: { en: 'ᐄᓃᐤ (ÎNÎW) River Lot 11∞ — Queen Elizabeth Park', fr: 'ᐄᓃᐤ (ÎNÎW) Lot de rivière 11 — Parc Queen Elizabeth' },
    lat: 53.5150, lng: -113.4980, alt: 620.0,
    intentText: 'Indigenous public art site honouring ancestral river lands, coyote calls across the valley at dusk, wind through prairie grass',
    description: {
      en: 'Indigenous art site honoring ancestral river lands — coyote calls across the valley at dusk, wind through prairie grass.',
      fr: 'Site d\'art autochtone honorant les terres ancestrales — appels de coyotes au crépuscule, vent dans les herbes des prairies.'
    }
  },
  {
    name: { en: 'Fort Edmonton Park (1846 Fur Trading Post)', fr: 'Parc Fort Edmonton (poste de traite 1846)' },
    lat: 53.5050, lng: -113.5620, alt: 628.0,
    intentText: 'Reconstructed 1846 fur trading fort, musket fire echo across palisade logs, blacksmith hammer on iron, horse-drawn wagon creak on gravel',
    description: {
      en: 'Reconstructed 1846 trading fort — musket echo across palisade logs, blacksmith hammer, horse-drawn wagon creak.',
      fr: 'Fort de traite reconstruit de 1846 — écho de mousquet sur les palissades, marteau de forgeron, grincement de charrette à cheval.'
    }
  },

  // ── Architecture & Institutions ─────────────────────────────────────────────
  {
    name: { en: 'Alberta Legislature — "Magic Spot" Acoustic Rotunda', fr: 'Assemblée législative — Rotonde acoustique "Magic Spot"' },
    lat: 53.5346, lng: -113.5030, alt: 632.0,
    intentText: 'Marble rotunda parabolic acoustic focal point, whisper carries 20 meters across the floor, bronze dome reverb and echo',
    description: {
      en: 'Marble rotunda parabolic "magic spot" — whisper carries 20m, bronze dome reverb and long decay tail.',
      fr: 'Point acoustique parabolique de la rotonde de marbre — le chuchotement porte 20 m, réverbération de la coupole de bronze.'
    }
  },
  {
    name: { en: 'Muttart Conservatory — Glass Pyramid Quartet', fr: 'Conservatoire Muttart — Quatuor de pyramides de verre' },
    lat: 53.5352, lng: -113.4798, alt: 619.0,
    intentText: 'Four glass pyramid structures, condensation water drops on panes, tropical heat updraft hum, crystalline glass pane vibration in wind',
    description: {
      en: 'Four glass pyramids — condensation drips, tropical updraft hum, crystalline pane vibration in prairie wind.',
      fr: 'Quatre pyramides de verre — gouttes de condensation, bourdonnement de courant chaud tropical, vibration des vitres dans le vent.'
    }
  },
  {
    name: { en: 'Winspear Centre for Music', fr: 'Centre Winspear pour la musique' },
    lat: 53.5439, lng: -113.4904, alt: 635.0,
    intentText: 'Shoebox concert hall with superb acoustic design, pipe organ deep bass resonance, acoustic reflections from balcony overhangs',
    description: {
      en: 'Shoebox concert hall — pipe organ sub-bass resonance and warm reflection from overhanging balconies.',
      fr: 'Salle de concert en boîte à chaussures — résonance de basses de l\'orgue à tuyaux et réflexions chaleureuses des balcons.'
    }
  },
  {
    name: { en: 'Art Gallery of Alberta — Curvilinear Steel Shell', fr: 'Galerie d\'art de l\'Alberta — coque d\'acier curviligne' },
    lat: 53.5450, lng: -113.4910, alt: 637.0,
    intentText: 'Curving steel and glass ribbon facade, wind resonance across the exterior spiral steel form, downtown canyon acoustic channel',
    description: {
      en: 'Curving steel-ribbon facade — wind resonance on the exterior spiral steel form and downtown acoustic canyon.',
      fr: 'Façade en ruban d\'acier incurvé — résonance du vent sur la spirale extérieure et canyon acoustique urbain.'
    }
  },
  {
    name: { en: 'Rogers Place Arena — Ice District', fr: 'Rogers Place — District de la glace' },
    lat: 53.5469, lng: -113.4997, alt: 642.0,
    intentText: 'Ice surface refrigeration compressor sub-bass drone, crowd roar echo in concrete bowl, Zamboni resurfacing machine motor',
    description: {
      en: 'Ice arena — refrigeration compressor sub-bass, crowd roar echo in concrete bowl, Zamboni motor drone.',
      fr: 'Aréna de glace — basse du compresseur de réfrigération, rugissement de foule dans le bol de béton, bourdonnement du Zamboni.'
    }
  },
  {
    name: { en: 'Churchill Square — Civic Festival Hub', fr: 'Place Churchill — centre civique de festival' },
    lat: 53.5451, lng: -113.4941, alt: 638.0,
    intentText: 'Open civic plaza wind tunnel between City Hall and library towers, outdoor festival stage brass ensemble, summer street music',
    description: {
      en: 'Open plaza wind tunnel between downtown towers — outdoor festival brass and summer street music.',
      fr: 'Tunnel de vent dans la place civique entre les tours — cuivres de festival en plein air et musique estivale.'
    }
  },
  {
    name: { en: 'TELUS World of Science — Geodesic IMAX Dome', fr: 'Monde des sciences TELUS — Dôme IMAX géodésique' },
    lat: 53.5610, lng: -113.4650, alt: 640.0,
    intentText: 'Geodesic dome acoustic diffusion, IMAX subwoofer sub-bass resonance spillover, planetarium interior darkness drone',
    description: {
      en: 'Geodesic dome acoustic diffusion — IMAX subwoofer sub-bass resonance and planetarium darkness drone.',
      fr: 'Diffusion acoustique du dôme géodésique — résonance des basses IMAX et bourdonnement d\'obscurité du planétarium.'
    }
  },

  // ── University & Arts District ──────────────────────────────────────────────
  {
    name: { en: 'University of Alberta — Convocation Hall (1920s)', fr: 'Salle de collation des grades U of A (années 1920)' },
    lat: 53.5264, lng: -113.5257, alt: 650.0,
    intentText: '1920s terracotta brick auditorium, warm 2-second reverb tail, pipe organ sub-bass, wooden floor creak under audience footsteps',
    description: {
      en: '1920s terracotta brick auditorium — warm 2s reverb tail, pipe organ sub-bass, audience footstep creak.',
      fr: 'Auditorium en briques de terracotta des années 1920 — queue de réverbération chaleureuse de 2 s, basses d\'orgue, grincement du parquet.'
    }
  },
  {
    name: { en: 'Garneau Theatre — 1940 Heritage Cinema', fr: 'Cinéma Garneau — cinéma patrimonial de 1940' },
    lat: 53.5220, lng: -113.5178, alt: 643.0,
    intentText: '1940 art deco interior cinema, projector motor mechanical hum, ventilation pipe whistle, velvet-dampened audience murmur decay',
    description: {
      en: '1940 art deco cinema — projector motor hum, ventilation whistle, velvet-dampened audience murmur decay.',
      fr: 'Cinéma Art déco de 1940 — bourdonnement du projecteur, sifflement de ventilation, décroissance étouffée par le velours.'
    }
  },

  // ── River Valley Ecology & Parks ───────────────────────────────────────────
  {
    name: { en: 'Hawrelak Park Amphitheatre', fr: 'Amphithéâtre du parc Hawrelak' },
    lat: 53.5082, lng: -113.5323, alt: 630.0,
    intentText: 'Open-air natural bowl amphitheatre, summer festival crowd roar, wind through spruce trees, lake surface water shimmer',
    description: {
      en: 'Natural bowl amphitheatre — summer festival crowd, wind through spruce, lake surface shimmer.',
      fr: 'Amphithéâtre naturel en cuvette — foule de festival, vent dans les épinettes, miroitement de la surface du lac.'
    }
  },
  {
    name: { en: 'Victoria Park Promenade — River Valley Lookout', fr: 'Promenade du parc Victoria — belvédère de la vallée' },
    lat: 53.5320, lng: -113.5020, alt: 620.0,
    intentText: 'Panoramic river valley lookout point, coyote howls echo at dusk, Canada geese honk, prairie wind sweep across open valley',
    description: {
      en: 'Panoramic valley lookout — coyote howls at dusk, geese honk, prairie wind sweeping across the open valley.',
      fr: 'Point de vue panoramique sur la vallée — hurlements de coyotes au crépuscule, oies du Canada, vent des prairies.'
    }
  },
  {
    name: { en: 'Rundle Park Footbridge & Mill Creek', fr: 'Pont piétonnier Rundle et ruisseau Mill Creek' },
    lat: 53.5530, lng: -113.4100, alt: 630.0,
    intentText: 'Wooden creek footbridge, water trickle below the planks, cottonwood leaves rustling in riverside wind',
    description: {
      en: 'Wooden creek footbridge — water trickling below planks, cottonwood leaves rustling in riverside wind.',
      fr: 'Pont de bois sur le ruisseau — bruissement de l\'eau sous les planches, feuilles de peupliers frémissant dans le vent.'
    }
  },
  {
    name: { en: 'Whitemud Creek Ravine', fr: 'Ravin du ruisseau Whitemud' },
    lat: 53.4850, lng: -113.5400, alt: 630.0,
    intentText: 'Deep narrow clay ravine, sound trapped between clay valley walls, creek babble echo, coyote territory howl',
    description: {
      en: 'Deep clay ravine — sound trapped between walls, creek babble, coyote territory howl.',
      fr: 'Ravin d\'argile profond — son emprisonné entre les parois, babillage du ruisseau, hurlement de territoire de coyote.'
    }
  },
  {
    name: { en: 'Rossdale Power Plant (Decommissioned 1902 — Sacred Ground)', fr: 'Centrale Rossdale (désaffectée 1902 — site sacré)' },
    lat: 53.5298, lng: -113.4940, alt: 617.0,
    intentText: 'Decommissioned 1902 power station on ancestral Indigenous burial ground, iron turbine hall resonance, frost cracking concrete',
    description: {
      en: 'Decommissioned 1902 power station on sacred burial ground — turbine hall iron resonance and frost-cracked concrete.',
      fr: 'Centrale désaffectée de 1902 sur un site funéraire sacré — résonance de la salle des turbines et béton fissuré par le gel.'
    }
  },

  // ── Community & Fringe Festival ─────────────────────────────────────────────
  {
    name: { en: 'Old Strathcona Fringe Festival Hub — Whyte Avenue', fr: 'Festival Fringe de Strathcona — Avenue Whyte' },
    lat: 53.5167, lng: -113.5007, alt: 635.0,
    intentText: 'Edmonton International Fringe Festival outdoor stages, busker brass ensemble, crowd murmur and laughter, portable PA feedback squeal',
    description: {
      en: 'Edmonton International Fringe outdoor stages — busker brass ensemble, crowd laughter, portable PA feedback.',
      fr: 'Scènes de plein air du Festival Fringe — cuivres de rue, rires de la foule, retour de son du système PA portable.'
    }
  }
];

async function seedEdmonton30Towers() {
  console.log('[SEED] Connecting to database...');
  const db = getDatabaseConnection();

  console.log('[SEED] Clearing all existing nodes for Edmonton...');
  db.prepare('DELETE FROM nodes WHERE city = ?').run('edmonton');

  console.log(`[SEED] Starting LLM synthesis and seeding for ${EDMONTON_30_LOCATIONS.length} Edmonton acoustic locations...`);

  for (let i = 0; i < EDMONTON_30_LOCATIONS.length; i++) {
    const loc = EDMONTON_30_LOCATIONS[i];
    const nameStr = typeof loc.name === 'object' ? loc.name.en : loc.name;
    console.log(`[SEED] [${i + 1}/${EDMONTON_30_LOCATIONS.length}] Synthesizing preset for: ${nameStr}...`);

    const stateVector = await generateReflectorPresetFromPrompt(loc.intentText, 'edmonton');

    const node = {
      nodeId: `tower_edmonton_${i + 1}`,
      nodeType: 'TOWER',
      city: 'edmonton',
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
    console.log(`  -> Saved: "${nameStr}" (${stateVector.soundType}, ${stateVector.baseFrequency}Hz, cutoff ${stateVector.filterCutoff}Hz)`);
  }

  console.log(`\n[SUCCESS] Successfully generated and seeded ${EDMONTON_30_LOCATIONS.length} Edmonton acoustic towers!`);
}

seedEdmonton30Towers().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

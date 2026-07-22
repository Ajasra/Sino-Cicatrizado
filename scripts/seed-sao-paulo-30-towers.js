import { getDatabaseConnection, saveReflectorNode } from '../server/db/database.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

const SAO_PAULO_30_LOCATIONS = [
  {
    name: {
      en: 'Metropolitan Cathedral of Sé',
      pt: 'Catedral Metropolitana da Sé'
    },
    lat: -23.55052, lng: -46.63331, alt: 760.0,
    intentText: 'Historic neo-Gothic bronze cathedral bell tolls interweaving with deep subterranean Metrô station junction pulse',
    description: {
      en: 'Neo-Gothic cathedral bronze bell tolls interweaving with subterranean Metrô station air pressure bursts.',
      pt: 'Sinos de bronze da Catedral Neogótica entrelaçados aos pulsares de ar do Metrô subterrâneo na Praça da Sé.'
    }
  },
  {
    name: {
      en: 'MASP - São Paulo Museum of Art',
      pt: 'MASP - Museu de Arte de São Paulo'
    },
    lat: -23.56141, lng: -46.65588, alt: 825.0,
    intentText: 'Brutalist 74-meter suspended concrete span resonance and lowpass traffic rumble along Avenida Paulista',
    description: {
      en: 'Massive suspended concrete span low-frequency resonance and wet asphalt traffic rumble along Paulista canyon.',
      pt: 'Ressonância de baixa frequência do vão livre de concreto do MASP e o rugido do tráfego na Av. Paulista.'
    }
  },
  {
    name: {
      en: 'Minhocão Elevated Highway',
      pt: 'Elevado Presidente João Goulart (Minhocão)'
    },
    lat: -23.53812, lng: -46.64893, alt: 745.0,
    intentText: 'Sub-highway concrete tunnel acoustics, squealing iron rail friction and urban pedestrian echo',
    description: {
      en: '3.4km elevated concrete highway underpass reverberation and distant subway track screeching.',
      pt: 'Reverberação sob a estrutura de concreto do Minhocão e o estridular metálico dos trilhos urbanos.'
    }
  },
  {
    name: {
      en: 'Copan Building',
      pt: 'Edifício Copan'
    },
    lat: -23.54639, lng: -46.64412, alt: 810.0,
    intentText: 'Sinuous concrete residential wave acoustics slicing skyward helicopter rotor Doppler shifts',
    description: {
      en: 'Oscar Niemeyer sinuous concrete wave facade capturing skyward helicopter rotor blade Doppler modulation.',
      pt: 'Ondulações de concreto do Edifício Copan refletindo o ruído doppler das pás de helicópteros no céu.'
    }
  },
  {
    name: {
      en: 'Luz Railway Station',
      pt: 'Estação da Luz'
    },
    lat: -23.53489, lng: -46.63534, alt: 730.0,
    intentText: 'Victorian ironwork roof structure echoing with braking train steel squeals and commuter echoes',
    description: {
      en: '19th-century British ironwork station hall reverberating with steel rail friction and commuter echoes.',
      pt: 'Estrutura britânica de ferro do século XIX ecoando a fricção de freios e passos na Estação da Luz.'
    }
  },
  {
    name: {
      en: 'Ibirapuera Park (Marquise & Oca)',
      pt: 'Parque Ibirapuera (Marquise e Oca)'
    },
    lat: -23.58742, lng: -46.65763, alt: 750.0,
    intentText: 'Convex concrete dome echo inside Niemeyer Oca and tropical rain shimmer over subtropical park canopy',
    description: {
      en: 'Convex concrete dome spatial decay and subtropical rain shimmer under the vast park marquise.',
      pt: 'Eco na cúpula de concreto da Oca e o sussurro da chuva tropical sob a Marquise do Ibirapuera.'
    }
  },
  {
    name: {
      en: 'Pátio do Colégio (City Foundation)',
      pt: 'Pátio do Colégio (Fundação da Cidade)'
    },
    lat: -23.54802, lng: -46.63221, alt: 765.0,
    intentText: 'Colonial foundation site bronze bell tolling softly above city canyon traffic',
    description: {
      en: 'Historical 1554 city foundation colonial chapel bell echoing over surrounding stone lanes.',
      pt: 'Sino da histórica capela de fundação de São Paulo (1554) ressoando sobre o centro histórico.'
    }
  },
  {
    name: {
      en: 'Monastery of Saint Benedict',
      pt: 'Mosteiro de São Bento'
    },
    lat: -23.54415, lng: -46.63412, alt: 755.0,
    intentText: 'Gregorian chant harmonic drone and massive German pipe organ bass resonance',
    description: {
      en: 'Centuries-old German pipe organ sub-bass drone and monastic Gregorian chant acoustics.',
      pt: 'Ressonância grave do grande órgão de tubos alemão e cantos gregorianos no Mosteiro de São Bento.'
    }
  },
  {
    name: {
      en: 'Edifício Itália Lookout',
      pt: 'Terraço do Edifício Itália'
    },
    lat: -23.54581, lng: -46.64475, alt: 865.0,
    intentText: 'High-altitude panoramic wind whistling over 46-story skyscraper rooftop',
    description: {
      en: 'High-altitude wind shear whistling over concrete balustrades overlooking the central megalopolis.',
      pt: 'Assobio do vento em alta altitude no topo do Edifício Itália contemplando o mar de prédios.'
    }
  },
  {
    name: {
      en: 'Viaduto do Chá (Tea Bridge)',
      pt: 'Viaduto do Chá (Vale do Anhangabaú)'
    },
    lat: -23.54652, lng: -46.63661, alt: 740.0,
    intentText: 'Pedestrian metal-and-stone bridge echo spanning the urban valley canyon',
    description: {
      en: 'Historic bridge footstep reflections spanning the wide concrete plaza of Vale do Anhangabaú.',
      pt: 'Eco de passos e vozes na estrutura do Viaduto do Chá sobre a grande esplanada do Anhangabaú.'
    }
  },
  {
    name: {
      en: 'Bixiga Italian & Afro-Brazilian Staircase',
      pt: 'Escadaria do Bixiga'
    },
    lat: -23.55621, lng: -46.64683, alt: 775.0,
    intentText: 'Afro-Brazilian atabaque drum strikes, street samba acoustic memory and stone staircase echo',
    description: {
      en: 'Afro-Brazilian percussive pulse and street samba memory echoing up steep stone staircases.',
      pt: 'Batucada de atabaques e memória acústica do samba ecoando pela Escadaria do Bixiga.'
    }
  },
  {
    name: {
      en: 'Liberdade Asian Square',
      pt: 'Praça da Liberdade'
    },
    lat: -23.55524, lng: -46.63584, alt: 765.0,
    intentText: 'Asian torii archway wind chimes, lantern street bustle and underground metro vent air drafts',
    description: {
      en: 'Traditional Asian archway metallic chimes interweaving with bustling street market hum.',
      pt: 'Sinos metálicos nos portais orientais mesclados ao burburinho do bairro da Liberdade.'
    }
  },
  {
    name: {
      en: 'São Paulo Municipal Market',
      pt: 'Mercado Municipal de São Paulo (Mercadão)'
    },
    lat: -23.54183, lng: -46.62951, alt: 725.0,
    intentText: 'Stained glass dome reverberation, bustling market chatter and high ceiling echoes',
    description: {
      en: 'Stained-glass ceiling acoustic reflections and vibrant market chatter echoing through vaulted halls.',
      pt: 'Reverberação dos vitrais e eco das vozes sob as abóbadas do Mercado Municipal.'
    }
  },
  {
    name: {
      en: 'Sala São Paulo Concert Hall',
      pt: 'Sala São Paulo (Estação Júlio Prestes)'
    },
    lat: -23.53442, lng: -46.63974, alt: 732.0,
    intentText: 'Symphonic orchestra hall acoustic adjustable ceiling resonance merged with rail yard thrum',
    description: {
      en: 'World-class symphonic concert hall acoustic clarity merging with adjacent train yard iron rumble.',
      pt: 'Acústica sinfônica ajustável da Sala São Paulo entrelaçada ao ruído de trens da Júlio Prestes.'
    }
  },
  {
    name: {
      en: 'Roosevelt Square Skate Bowl',
      pt: 'Praça Roosevelt (Bowl de Skate)'
    },
    lat: -23.54894, lng: -46.64752, alt: 780.0,
    intentText: 'Skateboard urethane wheel vibrations grinding over concrete bowls and brutalist plaza ramps',
    description: {
      en: 'Brutalist concrete bowl vibrations and skateboard wheel grinding harmonics across the open plaza.',
      pt: 'Vibrações de rodinhas de skate sobre a pista de concreto brutalista da Praça Roosevelt.'
    }
  },
  {
    name: {
      en: 'Pinacoteca Art Museum',
      pt: 'Pinacoteca do Estado de São Paulo'
    },
    lat: -23.53421, lng: -46.63391, alt: 735.0,
    intentText: 'Exposed red brick courtyard acoustics with skylight glass reflections and quiet gallery decay',
    description: {
      en: 'Warm 19th-century exposed brick courtyard acoustics and natural light glass atrium reverberation.',
      pt: 'Acústica acolhedora dos tijolos aparentes e iluminação natural no pátio interno da Pinacoteca.'
    }
  },
  {
    name: {
      en: 'São Paulo Cultural Center (CCSP)',
      pt: 'Centro Cultural São Paulo (CCSP)'
    },
    lat: -23.57143, lng: -46.64032, alt: 790.0,
    intentText: 'Low horizontal concrete ramp spatial decay and quiet library sub-drone',
    description: {
      en: 'Sprawling horizontal concrete ramp architecture offering warm, diffuse acoustic reflections.',
      pt: 'Arquitetura de rampas horizontais de concreto do CCSP proporcionando reflexões acústicas suaves.'
    }
  },
  {
    name: {
      en: 'Sesc Paulista Rooftop',
      pt: 'Sesc Paulista (Mirante Rooftop)'
    },
    lat: -23.57082, lng: -46.64554, alt: 840.0,
    intentText: 'Panoramic rooftop breeze and Avenida Paulista high-altitude helicopter blade Doppler',
    description: {
      en: 'Open-air 17th-floor glass terrace overlooking the high-altitude chopper corridor of Paulista.',
      pt: 'Mirante de vidro no 17º andar do Sesc Paulista captando o vento e helicópteros na avenida.'
    }
  },
  {
    name: {
      en: 'Gazeta Antenna Tower',
      pt: 'Edifício Gazeta (Antena da Paulista)'
    },
    lat: -23.56531, lng: -46.65142, alt: 885.0,
    intentText: 'High-frequency radio transmission mast resonance and TV broadcast electromagnetic hum',
    description: {
      en: 'Iconic broadcast antenna tower high-frequency wind whistle and radio wave electromagnetic pulse.',
      pt: 'Zumbido eletromagnético e vento na icônica antena de transmissão de rádio e TV da Gazeta.'
    }
  },
  {
    name: {
      en: 'Trianon Subtropical Park',
      pt: 'Parque Trianon (Mata Atlântica Urbana)'
    },
    lat: -23.56192, lng: -46.65751, alt: 820.0,
    intentText: 'Dense Atlantic forest canopy leaf rustle and urban cicadas filtering avenue traffic noise',
    description: {
      en: 'Dense urban rainforest canopy leaf rustling and cicada song insulating against avenue traffic.',
      pt: 'Sussurrar das folhas da Mata Atlântica e cigarras filtrando o barulho dos carros da Paulista.'
    }
  },
  {
    name: {
      en: 'Santa Ifigênia Wrought Iron Viaduct',
      pt: 'Viaduto Santa Ifigênia'
    },
    lat: -23.54284, lng: -46.63612, alt: 745.0,
    intentText: 'Belgian wrought iron pedestrian bridge vibration under foot traffic and valley wind',
    description: {
      en: 'Belgian ornamental wrought iron bridge frame resonant hum under continuous pedestrian flow.',
      pt: 'Vibração da estrutura ornamental de ferro belga do Viaduto Santa Ifigênia sob passos humanos.'
    }
  },
  {
    name: {
      en: 'Sé Subterranean Metrô Station',
      pt: 'Estação Sé (Estação Subterrânea do Metrô)'
    },
    lat: -23.55031, lng: -46.63395, alt: 720.0,
    intentText: 'Subterranean Linha 1 and Linha 3 multi-level metro track screeching and air piston shockwaves',
    description: {
      en: 'Deep multi-level subterranean concrete concourse echoing with arrival sirens and air pressure waves.',
      pt: 'Concurso subterrâneo profundo de concreto do Metrô Sé reverberando sirenes e pressão de ar.'
    }
  },
  {
    name: {
      en: 'Church of Our Lady of the Rosary of Black Men',
      pt: 'Igreja de N. Sra. do Rosário dos Homens Pretos'
    },
    lat: -23.54352, lng: -46.63821, alt: 748.0,
    intentText: 'Historic Afro-Brazilian brotherhood church bronze bell tolls and sacred drum memory',
    description: {
      en: 'Historic Afro-Brazilian Catholic brotherhood chapel bell ringing with deep sacred cultural memory.',
      pt: 'Sino da Igreja dos Homens Pretos no Largo da Paissandu, marco da memória e resistência negra.'
    }
  },
  {
    name: {
      en: 'Moreira Salles Institute (IMS Paulista)',
      pt: 'Instituto Moreira Salles (IMS Paulista)'
    },
    lat: -23.55981, lng: -46.65863, alt: 830.0,
    intentText: 'Elevated glass-and-steel escalator hall acoustics and tranquil exhibition atrium echo',
    description: {
      en: 'Translucent glass facade escalator atrium spatial decay and quiet gallery reverberation.',
      pt: 'Espaço de vidro e aço do IMS Paulista filtrando a luz e os sons da avenida para o atrio silencioso.'
    }
  },
  {
    name: {
      en: 'Largo São Francisco Law School',
      pt: 'Largo São Francisco (Faculdade de Direito USP)'
    },
    lat: -23.54961, lng: -46.63672, alt: 762.0,
    intentText: 'Colonial law academy cloister archway echoes and historic bronze bell chimes',
    description: {
      en: 'Historic 1827 law school stone cloister archway reverberation and academic bell tolls.',
      pt: 'Arcadas de pedra da centenária Faculdade de Direito da USP ecoando o sino acadêmico.'
    }
  },
  {
    name: {
      en: 'Tietê Bus Terminal',
      pt: 'Terminal Rodoviário Tietê'
    },
    lat: -23.51621, lng: -46.62473, alt: 720.0,
    intentText: 'Massive intercity bus terminal diesel motor idling hum and sprawling transit hall echo',
    description: {
      en: 'Latin America’s largest bus terminal deep diesel engine low-frequency hum and hall announcements.',
      pt: 'Grave constante dos motores a diesel e anúncios ecoando no maior terminal rodoviário da América Latina.'
    }
  },
  {
    name: {
      en: 'Jaraguá Peak Transmission Tower',
      pt: 'Pico do Jaraguá (Torre de Transmissão)'
    },
    lat: -23.45601, lng: -46.76452, alt: 1135.0,
    intentText: 'Highest mountain peak transmission mast wind shear whistling high above the metropolis',
    description: {
      en: 'Highest peak altitude (1,135m) howling ridge wind shear and telecommunications mast resonance.',
      pt: 'O ponto mais alto de São Paulo (1.135m): vento forte na torre de transmissão sobre o pico.'
    }
  },
  {
    name: {
      en: 'Interlagos Racetrack (Senna S-Curve)',
      pt: 'Autódromo de Interlagos (S do Senna)'
    },
    lat: -23.70112, lng: -46.69723, alt: 760.0,
    intentText: 'High FM engine Doppler pitch shift and asphalt tire squeal at the historic Senna S-curve',
    description: {
      en: 'High-frequency engine Doppler pitch sweeps and rubber tire friction echoing off grandstands.',
      pt: 'Arraste doppler de alta rotação dos motores e fricção de pneus na curva do S do Senna.'
    }
  },
  {
    name: {
      en: 'Tomie Ohtake Institute',
      pt: 'Instituto Tomie Ohtake'
    },
    lat: -23.56061, lng: -46.69222, alt: 750.0,
    intentText: 'Sinuous colored concrete façade spatial reflections and contemporary art hall decay',
    description: {
      en: 'Sculptural curved colored concrete facade reverberation and serene gallery space acoustics.',
      pt: 'Reflexões acústicas nas formas curvas de concreto colorido desenhadas por Tomie Ohtake.'
    }
  },
  {
    name: {
      en: 'Latin America Memorial (Niemeyer Hand)',
      pt: 'Memorial da América Latina (Mão de Niemeyer)'
    },
    lat: -23.52682, lng: -46.66421, alt: 735.0,
    intentText: 'Open concrete plaza acoustics echoing off Niemeyer hand sculpture and auditorium dome',
    description: {
      en: 'Vast open concrete plaza spatial reflections echoing off the iconic 7-meter concrete hand sculpture.',
      pt: 'Eco na grande praça aberta de concreto do Memorial da América Latina junto à escultura da Mão.'
    }
  }
];

async function seedSaoPaulo30Towers() {
  console.log('[SEED] Connecting to database...');
  const db = getDatabaseConnection();

  console.log('[SEED] Clearing all existing nodes for São Paulo...');
  db.prepare('DELETE FROM nodes WHERE city = ?').run('sao_paulo');

  console.log(`[SEED] Starting LLM synthesis and seeding for ${SAO_PAULO_30_LOCATIONS.length} São Paulo acoustic locations...`);

  for (let i = 0; i < SAO_PAULO_30_LOCATIONS.length; i++) {
    const loc = SAO_PAULO_30_LOCATIONS[i];
    const nameStr = typeof loc.name === 'object' ? loc.name.en : loc.name;
    console.log(`[SEED] [${i + 1}/${SAO_PAULO_30_LOCATIONS.length}] Synthesizing preset for: ${nameStr}...`);
    
    // Synthesize audio parameters via LLM membrane
    const stateVector = await generateReflectorPresetFromPrompt(loc.intentText, 'sao_paulo');

    const node = {
      nodeId: `tower_sao_paulo_${i + 1}`,
      nodeType: 'TOWER',
      city: 'sao_paulo',
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

  console.log(`\n[SUCCESS] Successfully generated and seeded ${SAO_PAULO_30_LOCATIONS.length} São Paulo acoustic towers!`);
}

seedSaoPaulo30Towers().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

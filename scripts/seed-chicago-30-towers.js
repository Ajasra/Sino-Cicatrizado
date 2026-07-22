import { getDatabaseConnection, saveReflectorNode } from '../server/db/database.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

const CHICAGO_30_LOCATIONS = [
  {
    name: {
      en: 'Willis Tower (Sears Tower Skydeck)',
      es: 'Torre Willis (Sears Tower)'
    },
    lat: 41.87887, lng: -87.63591, alt: 442.0,
    intentText: 'High-altitude skyscraper wind shear whistling through steel girders and pneumatic elevator shaft hum',
    description: {
      en: 'High-altitude wind shear through steel girders and deep sub-bass pneumatic elevator shaft pressure hum.',
      es: 'Silbido del viento en vigas de acero a alta altura y zumbido neumático de ascensor en rascacielos.'
    }
  },
  {
    name: {
      en: 'The Loop Elevated Train Curve (Wabash & Adams)',
      es: 'Curva del Tren Elevado (Wabash y Adams)'
    },
    lat: 41.87932, lng: -87.62604, alt: 12.0,
    intentText: 'Metallic steel wheel screeching on tight iron curve of the CTA L-train elevated superstructure',
    description: {
      en: 'High-pitched metal friction and rhythmic structural vibration from CTA L-train wheels rounding the iron Loop curve.',
      es: 'Fricción metálica de ruedas de tren CTA sobre la curva de hierro del tren elevado en The Loop.'
    }
  },
  {
    name: {
      en: 'Michigan Avenue DuSable Bridge (Chicago River Bascule)',
      es: 'Puente DuSable de la Avenida Michigan'
    },
    lat: 41.88891, lng: -87.62452, alt: 18.0,
    intentText: 'Truss bascule bridge iron grating tire drone over Chicago River water reflections',
    description: {
      en: 'Rhythmic tire hum over open steel mesh deck interweaving with river water reverberation beneath massive trunnion bascules.',
      es: 'Zumbido de neumáticos sobre la rejilla de acero del puente basculante sobre el río Chicago.'
    }
  },
  {
    name: {
      en: 'Cloud Gate (The Bean - Millennium Park)',
      es: 'Cloud Gate (El Frijol - Parque del Milenio)'
    },
    lat: 41.88270, lng: -87.62334, alt: 180.0,
    intentText: 'Stainless steel concave parabolic acoustic focus capturing crowd chatter and city skyline reflections',
    description: {
      en: 'Parabolic concave stainless steel shell focusing urban noise into crystalline acoustic focal points.',
      es: 'Concha parabólica de acero inoxidable que enfoca los sonidos urbanos en puntos acústicos reflectantes.'
    }
  },
  {
    name: {
      en: 'Jay Pritzker Pavilion Sound Canopy',
      es: 'Pabellón Jay Pritzker'
    },
    lat: 41.88315, lng: -87.62176, alt: 182.0,
    intentText: 'Frank Gehry stainless steel ribbon acoustics and overhead trellis distributed speaker array resonance',
    description: {
      en: 'Curved stainless steel ribbon sound shell and overhead steel pipe lattice spatial acoustic reflections.',
      es: 'Concha acústica de acero de Frank Gehry y celosía metálica aérea con distribución espacial.'
    }
  },
  {
    name: {
      en: 'Chicago Cultural Center (Tiffany Dome)',
      es: 'Centro Cultural de Chicago (Cúpula Tiffany)'
    },
    lat: 41.88375, lng: -87.62491, alt: 183.0,
    intentText: '38-foot stained glass dome reverberation echoing classical organ and marble stairwell whispers',
    description: {
      en: 'Massive stained-glass dome reverberation chamber with Carrara marble stairwell spatial diffusion.',
      es: 'Cámara de reverberación en la cúpula de vitrales Tiffany y escalinatas de mármol de Carrara.'
    }
  },
  {
    name: {
      en: 'Navy Pier Light Tower & Centennial Wheel',
      es: 'Muelle Navy Pier y Rueda Centennial'
    },
    lat: 41.89172, lng: -87.60862, alt: 180.0,
    intentText: 'Lake Michigan wave crashes on iron pylons, foghorn blasts, and Ferris wheel mechanical creaks',
    description: {
      en: 'Lake Michigan breakwater wave impacts, low harbor foghorn blasts, and mechanical steel wheel rotation.',
      es: 'Olas del Lago Michigan chocando contra pilotes de hierro, sirenas de foghorn y rotación mecánica.'
    }
  },
  {
    name: {
      en: 'Wrigley Building Clock Tower',
      es: 'Torre del Reloj del Edificio Wrigley'
    },
    lat: 41.88936, lng: -87.62534, alt: 220.0,
    intentText: 'Terracotta facade clock chime reverberating down North Michigan Avenue river canyon',
    description: {
      en: 'Bright terracotta clock tower bell tolling over Michigan Avenue vertical concrete canyon.',
      es: 'Campanadas de la torre de terracota resonando a lo largo del cañón urbano de Michigan Avenue.'
    }
  },
  {
    name: {
      en: 'Tribune Tower Gothic Buttresses',
      es: 'Arbotantes Góticos de la Torre Tribune'
    },
    lat: 41.89045, lng: -87.62367, alt: 225.0,
    intentText: 'Neo-Gothic carved stone flying buttress wind whistle and historic newspaper printing press resonance',
    description: {
      en: 'Gothic stone gargoyle wind turbulence and low-frequency resonance embedded with fragments of historic masonry.',
      es: 'Turbulencia del viento en gárgolas góticas de piedra y resonancia histórica de la imprenta.'
    }
  },
  {
    name: {
      en: 'Holy Name Cathedral',
      es: 'Catedral del Santo Nombre'
    },
    lat: 41.89582, lng: -87.62804, alt: 185.0,
    intentText: 'Victorian Gothic bronze bell tolling and vaulted timber roof interior decay tail',
    description: {
      en: 'Deep bronze church bell tolls with long decay tails in a high-vaulted wooden roof sanctuary.',
      es: 'Campanadas de bronze con larga estela de reverberación en bóvedas de madera de la catedral.'
    }
  },
  {
    name: {
      en: '875 North Michigan Avenue (John Hancock Center Antenna)',
      es: '875 North Michigan Avenue (Torre John Hancock)'
    },
    lat: 41.89877, lng: -87.62291, alt: 457.0,
    intentText: 'X-braced steel exterior truss wind roar and twin broadcast antenna high frequency static',
    description: {
      en: 'Structural roar from giant external steel X-bracing subjected to Lake Michigan gales.',
      es: 'Rugido estructural de los refuerzos en X de acero sometidos a los vientos helados del lago.'
    }
  },
  {
    name: {
      en: 'Water Tower & Pumping Station (1869 Landmark)',
      es: 'Torre del Agua de Chicago (1869)'
    },
    lat: 41.89718, lng: -87.62439, alt: 188.0,
    intentText: 'Joliet limestone castle turret echo interweaving with underground water pumping piston rhythm',
    description: {
      en: 'Historic Joliet limestone tower echo surrounding subterranean municipal water suction pumps.',
      es: 'Eco de la torre de piedra caliza de 1869 combinado con el bombeo de agua subterráneo.'
    }
  },
  {
    name: {
      en: 'Merchandise Mart (THE MART Riverfront)',
      es: 'Merchandise Mart'
    },
    lat: 41.88851, lng: -87.63542, alt: 182.0,
    intentText: 'Massive Art Deco stone envelope reverberation and riverwalk projection mapping audio reflections',
    description: {
      en: '4 million square foot Art Deco masonry wall reflections along the Chicago River junction.',
      es: 'Reflexiones de mampostería Art Decó de cuatro millones de pies cuadrados en la confluencia del río.'
    }
  },
  {
    name: {
      en: 'Old Main Post Office (Eisenhower Expressway Portal)',
      es: 'Antigua Oficina Postal (Portal de la Autopista Eisenhower)'
    },
    lat: 41.87532, lng: -87.63918, alt: 180.0,
    intentText: 'Highway traffic rushing directly through building cavernous central concrete tunnel portal',
    description: {
      en: 'Low-pass highway roar echoing through the open central building tunnel underpass.',
      es: 'Rugido del tráfico de la autopista atravesando el túnel central de concreto del edificio.'
    }
  },
  {
    name: {
      en: 'Union Station Great Hall (Vaulted Skylight)',
      es: 'Gran Salón de la Estación Union'
    },
    lat: 41.87865, lng: -87.64038, alt: 181.0,
    intentText: 'Beaux-Arts 110-foot vaulted barrel atrium echo with train announcements and footstep reverberation',
    description: {
      en: '110-foot barrel-vaulted skylight atrium producing cathedral-like 6-second reverberation tails.',
      es: 'Bóveda de cristal de 110 pies produciendo ecos de reverberación catedralicia de 6 segundos.'
    }
  },
  {
    name: {
      en: 'Green Mill Cocktail Lounge (Uptown Jazz & Gangster Tunnel)',
      es: 'Green Mill Lounge (Uptown Jazz)'
    },
    lat: 41.96914, lng: -87.65982, alt: 180.0,
    intentText: 'Muted brass trumpet resonances, vintage tube amplifier warm saturation, and underground tunnel echo',
    description: {
      en: 'Warm brass harmonic overtones and prohibition-era subterranean escape tunnel acoustic dampening.',
      es: 'Armónicos de trompeta de jazz y acústica amortiguada de los túneles subterráneos de la prohibición.'
    }
  },
  {
    name: {
      en: 'Chess Records Studios (2120 S Michigan Ave)',
      es: 'Estudios Chess Records (2120 S Michigan)'
    },
    lat: 41.85431, lng: -87.62419, alt: 179.0,
    intentText: 'Overdriven electric blues tube amp feedback, slide guitar resonance, and vintage echo chamber tail',
    description: {
      en: 'Raw Electric Chicago Blues tube amplifier saturation and concrete basement echo chamber response.',
      es: 'Saturación de amplificadores de tubo de blues eléctrico de Chicago y cámara de eco de concreto.'
    }
  },
  {
    name: {
      en: 'Chicago Theatre Marquee',
      es: 'Marquesina del Teatro Chicago'
    },
    lat: 41.88456, lng: -87.62791, alt: 182.0,
    intentText: '6-story vertical neon sign buzz interweaving with grand Wurlitzer pipe organ reverberation',
    description: {
      en: 'High-voltage neon transformer hum merging with Wurlitzer theatre pipe organ acoustic swell.',
      es: 'Zumbido del letrero de neón de 6 pisos e impulsos del gran órgano de tubos Wurlitzer.'
    }
  },
  {
    name: {
      en: 'Adler Planetarium Lakefront Point',
      es: 'Planetario Adler (Punta del Lago)'
    },
    lat: 41.86634, lng: -87.60682, alt: 178.0,
    intentText: 'Open Lake Michigan offshore wind gusts, granite seawall spray, and skyline spatial distance wave decay',
    description: {
      en: 'Unobstructed Lake Michigan wind gusts and low-frequency water wall crashing at Northerly Island tip.',
      es: 'Ráfagas de viento del lago Michigan y oleaje contra el muro de granito en la península.'
    }
  },
  {
    name: {
      en: 'Shedd Aquarium Oceanarium Dome',
      es: 'Acuario Shedd (Domo Oceanarium)'
    },
    lat: 41.86758, lng: -87.61404, alt: 180.0,
    intentText: 'Submerged hydrophone low rumble, glass tank acoustic reflections, and indoor waterfall spray noise',
    description: {
      en: 'Underwater hydrophone sub-bass thrum and aquatic glass dome reverberation.',
      es: 'Resonancia hidro-acústica bajo agua y ecos dentro del domo de cristal marino.'
    }
  },
  {
    name: {
      en: 'Field Museum of Natural History (Stanley Field Hall)',
      es: 'Museo Field de Historia Natural'
    },
    lat: 41.86624, lng: -87.61698, alt: 182.0,
    intentText: 'Neoclassical white Georgia marble hall echo surrounding prehistoric skeleton exhibits',
    description: {
      en: 'Massive white Georgia marble hall reverberation with long, bright high-frequency reflections.',
      es: 'Eco brillante en el hall neoclasico de mármol blanco de Georgia rodeando fósiles.'
    }
  },
  {
    name: {
      en: 'Buckingham Fountain (Grant Park Central Matrix)',
      es: 'Fuente Buckingham (Parque Grant)'
    },
    lat: 41.87579, lng: -87.61894, alt: 180.0,
    intentText: '1.5 million gallon water jet cascade rumble, pump motor sub-bass, and central Grant Park wind delay',
    description: {
      en: 'Massive water jet cascade white noise masking urban traffic, driven by 800-horsepower pumps.',
      es: 'Cascada de 1.5 millones de galones de agua amortiguando el ruido urbano con bombas de 800 HP.'
    }
  },
  {
    name: {
      en: 'Marina City Towers (Corncob Garages)',
      es: 'Torres Marina City (Garajes de Mazorca)'
    },
    lat: 41.88804, lng: -87.62885, alt: 181.0,
    intentText: 'Bertrand Goldberg twin cylindrical concrete corncob spiral echo over Chicago River marina',
    description: {
      en: 'Cylindrical concrete garage spiral acoustic reflections and boat engine reverberations along the river.',
      es: 'Reflexiones acústicas en los garajes cilíndricos de concreto y motores de barcos en la marina.'
    }
  },
  {
    name: {
      en: 'Aon Center (Standard Oil Building)',
      es: 'Centro Aon'
    },
    lat: 41.88531, lng: -87.62153, alt: 346.0,
    intentText: 'Monolithic granite-sheathed skyscraper wind channel shear and underground plaza subterranean vents',
    description: {
      en: 'High-velocity wind funneling through monolithic vertical granite piers at East Randolph canyon.',
      es: 'Canal de viento a alta velocidad entre pilares verticales de granito blanco.'
    }
  },
  {
    name: {
      en: 'St. Patrick Church (Oldest City Sanctuary 1854)',
      es: 'Iglesia de San Patricio (1854)'
    },
    lat: 41.87852, lng: -87.64389, alt: 182.0,
    intentText: 'Celtic knot stained glass reflection, 1854 brick mortar dampening, and historic bell chime',
    description: {
      en: 'Historic 1854 red brick and timber sanctuary acoustic dampening with soft bronze bell overtones.',
      es: 'Acústica de ladrillo rojo y madera de 1854 sobreviviente al Gran Incendio de Chicago.'
    }
  },
  {
    name: {
      en: 'Lurie Garden Acoustic Hedge (Millennium Park)',
      es: 'Jardín Lurie (Parque del Milenio)'
    },
    lat: 41.88142, lng: -87.62182, alt: 180.0,
    intentText: '15-foot Yew hedge acoustic barrier dampening city traffic into soft wind rustles and perennial prairie insects',
    description: {
      en: '15-foot living hedge sound wall filtering urban traffic into soft prairie wind rustles.',
      es: 'Muro vegetal de 15 pies que filtra el tráfico urbano convirtiéndolo en murmullo de pradera.'
    }
  },
  {
    name: {
      en: 'Chinatown Square Pagoda & Dragon Gate',
      es: 'Pagoda y Puerta del Dragón de Chinatown'
    },
    lat: 41.85278, lng: -87.63245, alt: 179.0,
    intentText: 'Traditional bronze bell tolling over red timber courtyard and Wentworth Avenue marketplace chatter',
    description: {
      en: 'Bronze bell tolling over Chinese courtyard pagodas interweaving with CTA Red Line train rumble.',
      es: 'Campana de bronce sobre pagodas de madera e interconexión con el estruendo de la Línea Roja.'
    }
  },
  {
    name: {
      en: 'Pilsen Murals & Resurrection Church',
      es: 'Murales de Pilsen e Iglesia de la Resurrección'
    },
    lat: 41.85764, lng: -87.66452, alt: 181.0,
    intentText: 'Acoustic guitar strums reverberating against brick alleyway murals and Mexican folk heritage bells',
    description: {
      en: 'Resonant acoustic guitar overtones and community church bells echoing through historic brick corridors.',
      es: 'Acordes de guitarra acústica y campanas comunitarias resonando en callejones de ladrillo.'
    }
  },
  {
    name: {
      en: 'Lincoln Park Conservatory Glasshouse',
      es: 'Invernadero del Parque Lincoln'
    },
    lat: 41.92482, lng: -87.63518, alt: 179.0,
    intentText: 'Victorian glass dome rainfall drips, tropical palm foliage echo dampening, and steam pipe hiss',
    description: {
      en: 'Humid glasshouse dome acoustic damping with condensation water drops and low steam pipe hiss.',
      es: 'Amortiguación acústica en el domo de cristal tropical con gotas de agua y siseo de tuberías.'
    }
  },
  {
    name: {
      en: 'Wrigley Field Friendly Confines (Clark & Addison)',
      es: 'Estadio Wrigley Field (Clark y Addison)'
    },
    lat: 41.94844, lng: -87.65533, alt: 183.0,
    intentText: 'Ivy-covered brick wall crowd roar, steel girder grandstand echo, and organ musical stingers',
    description: {
      en: 'Historic 1914 steel-and-brick ballpark grandstand echo and ivy-covered outfield wall sound reflection.',
      es: 'Eco de tribunas de acero y ladrillo de 1914 y pared de hiedra del histórico estadio de béisbol.'
    }
  }
];

async function seedChicago30Towers() {
  console.log('[SEED] Connecting to database...');
  const db = getDatabaseConnection();

  console.log('[SEED] Clearing all existing nodes for Chicago...');
  db.prepare('DELETE FROM nodes WHERE city = ?').run('chicago');

  console.log(`[SEED] Starting LLM synthesis and seeding for ${CHICAGO_30_LOCATIONS.length} Chicago acoustic locations...`);

  for (let i = 0; i < CHICAGO_30_LOCATIONS.length; i++) {
    const loc = CHICAGO_30_LOCATIONS[i];
    const nameStr = typeof loc.name === 'object' ? loc.name.en : loc.name;
    console.log(`[SEED] [${i + 1}/${CHICAGO_30_LOCATIONS.length}] Synthesizing preset for: ${nameStr}...`);
    
    // Synthesize audio parameters via LLM membrane
    const stateVector = await generateReflectorPresetFromPrompt(loc.intentText, 'chicago');

    const node = {
      nodeId: `tower_chicago_${i + 1}`,
      nodeType: 'TOWER',
      city: 'chicago',
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

  console.log(`\n[SUCCESS] Successfully generated and seeded ${CHICAGO_30_LOCATIONS.length} Chicago acoustic towers!`);
}

seedChicago30Towers().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

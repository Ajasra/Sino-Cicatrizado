import { getDatabaseConnection, saveReflectorNode } from '../server/db/database.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

const SHANGHAI_30_LOCATIONS = [
  {
    name: 'The Bund Custom House Clock Tower (外滩海关大楼钟楼)',
    lat: 31.2378, lng: 121.4862, alt: 79.0,
    intentText: 'Historic Westminster and East is Red bronze clock tower bell tolling over stone facades and river',
    description: {
      en: 'Historic bronze clock chime tolling over colonial granite facades and reverberating across the Huangpu River.',
      cn: '百年海关大楼铜钟钟声，在花岗岩建筑与黄浦江面回响。'
    }
  },
  {
    name: 'Oriental Pearl TV Tower (东方明珠广播电视塔)',
    lat: 31.2397, lng: 121.4998, alt: 468.0,
    intentText: 'Electromagnetic broadcast tower, high altitude wind whistling through steel sphere structure',
    description: {
      en: 'High-altitude glass-steel sphere wind whistle and electromagnetic broadcast wave resonance.',
      cn: '高空玻璃钢球体的高亢风鸣与电磁广播波段共振。'
    }
  },
  {
    name: 'Shanghai Tower - Lujiazui (上海中心大厦)',
    lat: 31.2335, lng: 121.5056, alt: 632.0,
    intentText: 'Deep sub-bass structural drone and pneumatic elevator pressure hum in a 632m skyscraper',
    description: {
      en: 'Ultra-deep sub-bass structural resonance from tuned mass dampers and pneumatic elevator hum.',
      cn: '超高层阻尼器发出的深沉低频共振与高速电梯的气压嗡鸣。'
    }
  },
  {
    name: 'Huangpu River Shiliupu Ferry Terminal (黄浦江十六铺码头)',
    lat: 31.2295, lng: 121.4948, alt: 5.0,
    intentText: 'Low frequency vessel foghorns, barge diesel engines and Huangpu river boat traffic',
    description: {
      en: 'Low vessel foghorns, thrumming ferry diesel engines, and river water lapping iron piers.',
      cn: '轮渡柴油引擎的低沉轰鸣、江水拍击铁泊位与过往船只汽笛声。'
    }
  },
  {
    name: "Jing'an Temple Sacred Bronze Hall (静安寺大雄宝殿)",
    lat: 31.2238, lng: 121.4463, alt: 20.0,
    intentText: 'Deep bronze temple gong tolling with rich harmonic partials and Buddhist chant resonance',
    description: {
      en: 'Deep bronze temple gong reverberation echoing through golden eaves amidst urban traffic.',
      cn: '金顶古刹中大铜钟的悠鸣，穿透市井车水马龙。'
    }
  },
  {
    name: 'Longhua Temple Bell Tower (龙华寺钟楼)',
    lat: 31.1768, lng: 121.4482, alt: 25.0,
    intentText: 'Ancient bronze bell tolling at twilight with long exponential decay tail',
    description: {
      en: 'Traditional New Year bronze bell toll echoing over centuries-old pagodas and courtyard gardens.',
      cn: '龙华晚钟古老青铜钟声，在千年古塔与庭院中沉静回荡。'
    }
  },
  {
    name: 'Longyang Road Maglev Terminal (龙阳路磁浮列车站)',
    lat: 31.2032, lng: 121.5578, alt: 15.0,
    intentText: 'High frequency FM pitch sweep, electromagnetic magnetic levitation glide at 430 km/h',
    description: {
      en: 'High-speed electromagnetic pitch sweep and aerodynamic friction whistle of levitating train.',
      cn: '磁浮列车极速驶过时的电磁频率滑音与空气动力学风嘶声。'
    }
  },
  {
    name: 'Yu Garden Bridge of Nine Turns (豫园九曲桥)',
    lat: 31.2275, lng: 121.4920, alt: 5.0,
    intentText: 'Bamboo flute resonance and gentle water trickles echoing in ancient wooden garden pavilions',
    description: {
      en: 'Gentle aquatic trickles, koi splashes, and bamboo flute resonance inside Ming-dynasty courtyards.',
      cn: '明代园林亭台水榭间的涓涓流水声、锦鲤跃水与笛音袅袅。'
    }
  },
  {
    name: 'Yuyintang Livehouse (育音堂 Livehouse)',
    lat: 31.2132, lng: 121.4170, alt: -5.0,
    intentText: 'Harsh guitar feedback, overdriven sub-bass impact and small room acoustic reflections',
    description: {
      en: 'Raw basement live rock feedback, thumping kick drum sub-bass, and distorted crowd roar.',
      cn: '地下摇滚 Livehouse 的过载吉他反馈、沉闷贝斯低音与极具碰撞感的声场。'
    }
  },
  {
    name: 'ALL Club Bunker (ALL 俱乐部地下防空洞)',
    lat: 31.2178, lng: 121.4542, alt: -8.0,
    intentText: 'Sub-bass sub rumble 45Hz, concrete air-raid shelter resonance and electronic glitch',
    description: {
      en: 'Subterranean bass pressure, experimental electronic glitch, and low-frequency bunker resonance.',
      cn: '防空洞地下俱乐部的极低频重低音震荡与实验电子数字脉冲。'
    }
  },
  {
    name: 'M50 Art District Warehouses (M50 创意园莫干山路仓库)',
    lat: 31.2478, lng: 121.4485, alt: 10.0,
    intentText: 'Industrial metal impacts, metallic clanking and cavernous brick warehouse reverb',
    description: {
      en: 'High-ceiling textile factory reverberation, steel art sculpture clinks, and industrial hum.',
      cn: '老纺织厂高顶仓库的工业回响、钢构雕塑敲击声与艺术空间共鸣。'
    }
  },
  {
    name: 'Suzhou Creek Zhejiang Road Bridge (浙江路桥铁桥)',
    lat: 31.2435, lng: 121.4748, alt: 8.0,
    intentText: 'Vibrating steel bridge structure, clanking iron rivets and water sound reflections',
    description: {
      en: 'Metallic clatter of riveted steel bridge girders vibrating over quiet creek waters.',
      cn: '铆接钢渡桥车辆过桥时的金铁交鸣与苏州河水波映衬的震响。'
    }
  },
  {
    name: 'Shanghai Railway Station South Square (上海站南广场)',
    lat: 31.2495, lng: 121.4565, alt: 12.0,
    intentText: 'Squealing iron train wheels, echoing station announcements and urban transit hub chatter',
    description: {
      en: 'Railway iron wheel squeals, echoing station horn announcements, and vast crowd chatter.',
      cn: '铁轨车轮摩擦高鸣、车站广播回音与人潮熙攘的交响。'
    }
  },
  {
    name: "People's Park Metro Hub - Line 1/2/8 (人民广场地铁枢纽)",
    lat: 31.2325, lng: 121.4720, alt: -15.0,
    intentText: 'Subterranean tunnel wind howl, repetitive metro door chimes and high pitch brake squeals',
    description: {
      en: 'Subterranean tunnel wind howls, high-density metro door chimes, and electric brake squeals.',
      cn: '地下换乘大厅的风洞风吼、地铁关门提示音与电磁刹车高频鸣响。'
    }
  },
  {
    name: 'Wukang Mansion (武康大楼 - 诺曼底公寓)',
    lat: 31.2008, lng: 121.4418, alt: 18.0,
    intentText: 'Wind rustling sycamore leaves, light bicycle bell chimes and vintage brass jazz echoes',
    description: {
      en: 'Plane tree leaf rustles, classic bicycle bell chimes, and vintage jazz echoing down brick avenues.',
      cn: '梧桐树叶簌簌声、复古自行车叮铛铃声与街角飘出的爵士萨克斯音符。'
    }
  },
  {
    name: 'North Bund Green Land Riverside (北外滩绿地码头)',
    lat: 31.2465, lng: 121.4988, alt: 6.0,
    intentText: 'Wide open riverfront wind chorus, sub-bass boat whistles and water chorus modulation',
    description: {
      en: 'Expansive waterfront wind chorus, distant tugboat whistles, and river wave acoustics.',
      cn: '江畔绿地广阔的风声合唱、远航拖船汽笛与黄浦江潮音。'
    }
  },
  {
    name: 'Qibao Ancient Water Town Bell Tower (七宝古镇钟楼)',
    lat: 31.1558, lng: 121.3538, alt: 8.0,
    intentText: 'Creaking wooden oars on water canal, small bronze bell chimes and stone bridge echoes',
    description: {
      en: 'Canal water rippling against stone embankments, wooden oar creaks, and ancient town bells.',
      cn: '小桥流水拍岸、摇橹船木桨吱呀与古镇沿街铜铃声。'
    }
  },
  {
    name: 'Tianzifang Shikumen Alleyways (田子坊石库门弄堂)',
    lat: 31.2082, lng: 121.4682, alt: 6.0,
    intentText: 'Narrow brick alleyway echo, high pitch tea kettle whistle and intimate courtyard acoustic',
    description: {
      en: 'Narrow brick alleyway acoustic compression, copper tea kettle whistles, and lively chatter.',
      cn: '狭窄石库门弄堂的风声压缩、铜壶水沸哨音与邻里声浪。'
    }
  },
  {
    name: 'Shanghai West Railway Freight Yard (上海西站货场)',
    lat: 31.2625, lng: 121.3985, alt: 10.0,
    intentText: 'Heavy industrial rail couplings, steel wheel impact on rail switches and diesel engine thrum',
    description: {
      en: 'Heavy freight locomotive shunting, steel train coupling impacts, and low diesel rumble.',
      cn: '货运火车编组切轨时的重型金属撞击声与柴油机车低频轰鸣。'
    }
  },
  {
    name: 'Century Park Mirror Lake (世纪公园镜天湖)',
    lat: 31.2185, lng: 121.5518, alt: 5.0,
    intentText: 'High frequency summer cicada tremolo 4200Hz chorus and gentle park water acoustics',
    description: {
      en: 'Dense summer cicada tremolo chorus, bird chirps, and soft wind across peaceful lake waters.',
      cn: '夏日浓荫中密集的蝉鸣震音、鸟语与开阔湖面的清风声。'
    }
  },
  {
    name: 'Baoshan Cruise Terminal Port (宝山国际邮轮码头)',
    lat: 31.4082, lng: 121.4912, alt: 8.0,
    intentText: 'Ultra-deep 55Hz ocean liner foghorn resonance, marine estuary wind and port motor hum',
    description: {
      en: 'Deep sea liner horn blasts reverberating across the massive Yangtze estuary waters.',
      cn: '长江入海口巨型邮轮汽笛的长鸣，与海风和码头吊车电机的共振。'
    }
  },
  {
    name: 'Nanjing Road Pedestrian Mall (南京东路步行街)',
    lat: 31.2355, lng: 121.4750, alt: 10.0,
    intentText: 'Repetitive tram bell chimes, electronic neon transformer buzz and dense urban crowd soundscape',
    description: {
      en: "Rhythmic 'Dang-Dang' electric tram bells, neon light transformers, and endless commercial crowd noise.",
      cn: '铛铛车经典复古铜铃、霓虹变压器电流声与步行街人潮喧嚣。'
    }
  },
  {
    name: 'The Trigger Noise & Experimental Space (The Trigger 实验音乐空间)',
    lat: 31.2512, lng: 121.4625, alt: 5.0,
    intentText: 'Aggressive FM synthesis feedback sweep, circuit bending noise and high resonance filter',
    description: {
      en: 'Aggressive analog synth feedback sweeps, raw circuit bending, and voltage noise resonance.',
      cn: '极具侵略性的模拟合成器反馈长鸣、电路折弯与电压噪波。'
    }
  },
  {
    name: 'West Bund Art Center Hangar (西岸艺术中心老航站楼)',
    lat: 31.1685, lng: 121.4622, alt: 12.0,
    intentText: 'Cavernous hangar echo, long impulse reverb tail and wind through industrial architecture',
    description: {
      en: 'Immense cavernous airplane hangar acoustic reverberation and river wind through steel beams.',
      cn: '巨大废弃飞机库穹顶的空旷回音与穿过钢构桁架的江风声。'
    }
  },
  {
    name: 'Lujiazui Circular Pedestrian Bridge (陆家嘴环形天桥)',
    lat: 31.2372, lng: 121.5015, alt: 15.0,
    intentText: 'Traffic canyon multi-directional roar, wind funneling between glass skyscrapers',
    description: {
      en: 'Circular 360-degree traffic canyon reverberation and skyscraper wind funnel acoustics.',
      cn: '环形天桥上360度车流峡谷轰鸣与摩天楼群交织的风洞效应。'
    }
  },
  {
    name: 'Jiading Confucian Temple Pool (嘉定孔庙泮池)',
    lat: 31.3852, lng: 121.2485, alt: 6.0,
    intentText: 'Quiet reflective water acoustics, delicate bronze wind bell and academic stone court echo',
    description: {
      en: 'Serene stone pond reflections, ancient scholar courtyard winds, and delicate bell chimes.',
      cn: '泮池古石桥畔的幽静风声、儒学圣地的清雅与微风铜铃声。'
    }
  },
  {
    name: 'Songjiang Thames Town Square (松江泰晤士小镇广场)',
    lat: 31.0365, lng: 121.1962, alt: 8.0,
    intentText: 'Bright European church steeple bell tolling, cobble stone plaza reverb and fountain water',
    description: {
      en: 'Gothic church steeple bell tolling over stone cobbled European-style town square.',
      cn: '哥特式教堂尖顶的清脆钟声，在欧式石板路广场上回荡。'
    }
  },
  {
    name: 'Pudong Airport T2 Runway (浦东国际机场T2跑道)',
    lat: 31.1435, lng: 121.8052, alt: 10.0,
    intentText: 'Jet engine turbine roar with steep Doppler pitch shift and sub-bass exhaust impact',
    description: {
      en: 'Thundering jet engine turbine Doppler effect and coastal airstrip wind shear.',
      cn: '喷气式客机起飞时的巨幅多普勒轰鸣与海滨跑道的切变风音。'
    }
  },
  {
    name: 'Disneyland Storybook Castle (迪士尼奇幻童话城堡)',
    lat: 31.1412, lng: 121.6578, alt: 25.0,
    intentText: 'High frequency sparkling bell arpeggio, orchestral bell tree and fireworks boom reverb',
    description: {
      en: 'Sparkling high-frequency chime arpeggios and lake reflections of evening fireworks.',
      cn: '梦幻城堡的清亮晶莹琴音与夜间烟花在湖面激起的空灵回响。'
    }
  },
  {
    name: 'Chongming Dongtan Wetland Reserve (崇明东滩湿地)',
    lat: 31.5182, lng: 121.9585, alt: 2.0,
    intentText: 'Wind rustling through vast coastal reed beds, high pitch bird calls and soft sea tide',
    description: {
      en: 'Wild migratory bird flock calls, rustling coastal reed beds, and soft sea tide whisper.',
      cn: '东滩湿地候鸟群鸣、广袤芦苇荡的沙沙风响与东海潮声。'
    }
  }
];

async function seedShanghai30Towers() {
  console.log('[SEED] Connecting to database...');
  const db = getDatabaseConnection();

  console.log('[SEED] Clearing all existing nodes for Shanghai...');
  db.prepare('DELETE FROM nodes WHERE city = ?').run('shanghai');

  console.log(`[SEED] Starting LLM synthesis and seeding for ${SHANGHAI_30_LOCATIONS.length} Shanghai acoustic locations...`);

  for (let i = 0; i < SHANGHAI_30_LOCATIONS.length; i++) {
    const loc = SHANGHAI_30_LOCATIONS[i];
    console.log(`[SEED] [${i + 1}/${SHANGHAI_30_LOCATIONS.length}] Synthesizing preset for: ${loc.name}...`);
    
    // Synthesize audio parameters via LLM membrane
    const stateVector = await generateReflectorPresetFromPrompt(loc.intentText, 'shanghai');

    const node = {
      nodeId: `tower_shanghai_${i + 1}`,
      nodeType: 'TOWER',
      city: 'shanghai',
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
    console.log(`  -> Saved: "${node.name}" (${stateVector.soundType}, ${stateVector.baseFrequency}Hz, cutoff ${stateVector.filterCutoff}Hz)`);
  }

  console.log(`\n[SUCCESS] Successfully generated and seeded ${SHANGHAI_30_LOCATIONS.length} Shanghai acoustic towers!`);
}

seedShanghai30Towers().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});

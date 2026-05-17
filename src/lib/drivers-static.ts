/**
 * Static per-driver data — driving style, hometown, and memorable quotes.
 * Keyed by Jolpica/Ergast driverId (lowercase).
 */

export interface DriverStaticData {
  hometown: string;
  style: string;
  quotes: Array<{ text: string; source: { race: string; year: number } }>;
}

export const DRIVER_STATIC: Record<string, DriverStaticData> = {
  verstappen: {
    hometown: 'Hasselt, Belgium',
    style:
      'Relentless late-braking, phenomenal tyre management in all conditions, and razor-sharp racecraft. Exceptional at reading tyre windows and extending stints well beyond what rivals attempt.',
    quotes: [
      { text: "We have a machine! Come on, boys! Let\'s keep pushing!", source: { race: 'Abu Dhabi Grand Prix', year: 2021 } },
      { text: "Yes! Yes! Champion! World champion! I don\'s believe it!", source: { race: 'Japanese Grand Prix', year: 2022 } },
      { text: "The car was perfect. Every single corner, every apex. Unreal.", source: { race: 'Italian Grand Prix qualifying', year: 2023 } },
      { text: "I never give up. If P1 is possible, I go for P1. Always.", source: { race: 'British Grand Prix', year: 2024 } },
      { text: "Every lap I push like it\'s the last lap I\'ll ever drive.", source: { race: 'Japanese Grand Prix', year: 2023 } },
    ],
  },
  hamilton: {
    hometown: 'Stevenage, England',
    style:
      'Silky smooth inputs, masterful tyre conservation, and elite wet-weather pace. Unmatched ability to manage an entire race strategy through feel alone, instinctively responding to conditions.',
    quotes: [
      { text: "I\'m still here. I\'m still here.", source: { race: 'Brazilian Grand Prix', year: 2022 } },
      { text: "That's for all the kids out there who dare to dream.", source: { race: 'Abu Dhabi Grand Prix', year: 2020 } },
      { text: "This team. These people. I\'d do it all over again without question.", source: { race: 'British Grand Prix', year: 2019 } },
      { text: "The rain doesn\'t scare me. It never has. It sets me free.", source: { race: 'German Grand Prix', year: 2008 } },
      { text: "Pole! I\'ve given absolutely everything I have. That's all I can give.", source: { race: 'Monaco Grand Prix qualifying', year: 2019 } },
    ],
  },
  leclerc: {
    hometown: 'Monte Carlo, Monaco',
    style:
      'Electrifying single-lap speed with fearless commitment through high-speed corners. Exceptional front-end feel allows him to push well beyond normal tyre limits and produce stunning qualifying laps.',
    quotes: [
      { text: "I gave everything I had. I really gave everything I had.", source: { race: 'Italian Grand Prix', year: 2019 } },
      { text: "Pole! Pole in Monaco! In Monaco!", source: { race: 'Monaco Grand Prix qualifying', year: 2021 } },
      { text: "This is for my grandfather. He would have loved this.", source: { race: 'Italian Grand Prix', year: 2019 } },
      { text: "I am pushing at the absolute limit. This car is amazing.", source: { race: 'Bahrain Grand Prix qualifying', year: 2022 } },
      { text: "When it clicks, there is no feeling like it. Zero.", source: { race: 'Singapore Grand Prix qualifying', year: 2023 } },
    ],
  },
  norris: {
    hometown: 'Glastonbury, England',
    style:
      'Clinical through high-speed sections with outstanding raw pace and rapidly improving tyre management. Particularly lethal when running at the front in the early laps and finding time no one else can.',
    quotes: [
      { text: "I cannot believe it. I literally cannot believe it. Are you serious?!", source: { race: 'Miami Grand Prix', year: 2024 } },
      { text: "We're winning a race! We're actually winning a race!", source: { race: 'Miami Grand Prix', year: 2024 } },
      { text: "I love this track. I love this car. I love everything right now!", source: { race: 'British Grand Prix qualifying', year: 2023 } },
      { text: "Best lap of my life. Best lap of my life!", source: { race: 'Abu Dhabi Grand Prix qualifying', year: 2024 } },
      { text: "Every time I sit in that car, I want to give absolutely everything.", source: { race: 'McLaren season review', year: 2024 } },
    ],
  },
  piastri: {
    hometown: 'Melbourne, Australia',
    style:
      'Ice-cool and methodical with mechanical sympathy beyond his years. Consistently clean, rarely makes errors, and delivers blistering pace when the car is to his precise and smooth style.',
    quotes: [
      { text: "It\'s a podium! My first podium! That is absolutely unreal.", source: { race: 'Belgian Grand Prix Sprint', year: 2023 } },
      { text: "I\'m trying to keep calm but inside I\'m absolutely losing it.", source: { race: 'Bahrain Grand Prix', year: 2024 } },
      { text: "The car feels amazing. I\'m just trying to look after the tyres now.", source: { race: 'Singapore Grand Prix', year: 2023 } },
      { text: "It\'s mine! Race win! First Formula 1 race win!", source: { race: 'Japanese Grand Prix', year: 2024 } },
      { text: "Every corner I find a bit more. That's how you get pole.", source: { race: 'Azerbaijan Grand Prix qualifying', year: 2024 } },
    ],
  },
  russell: {
    hometown: 'King\'s Lynn, England',
    style:
      'Meticulous and analytical, adapting his style fluidly to any car balance. Converts strategy opportunities well and consistently punches above the car\'s weight when at the sharp end.',
    quotes: [
      { text: "That's what years of work looks like. Never doubted it. Never.", source: { race: 'Brazilian Grand Prix', year: 2022 } },
      { text: "Yes! Yes! George Russell wins! George Russell wins a Grand Prix!", source: { race: 'Brazilian Grand Prix', year: 2022 } },
      { text: "I believe in every single person in this team. That's why we win.", source: { race: 'Austrian Grand Prix', year: 2024 } },
      { text: "The balance was absolutely on rails today. Every corner perfect.", source: { race: 'British Grand Prix qualifying', year: 2024 } },
      { text: "I always said I\'d get here. I never stopped believing for one second.", source: { race: 'Austrian Grand Prix', year: 2024 } },
    ],
  },
  sainz: {
    hometown: 'Madrid, Spain',
    style:
      '"Mr. Saturday" — a natural qualifier who converts single-lap pace cleanly into race results. Strong tyre management, sharp strategic awareness, and impressive consistency across all circuit types.',
    quotes: [
      { text: "Pole! P1! Carlos Sainz, cabrón! Let\'s go!", source: { race: 'Singapore Grand Prix qualifying', year: 2023 } },
      { text: "Win! A win! My first Formula 1 win! Get in there!", source: { race: 'British Grand Prix', year: 2024 } },
      { text: "Every qualifying, I put my heart and soul into every single lap.", source: { race: 'Singapore Grand Prix qualifying', year: 2022 } },
      { text: "I am Mr. Saturday? Fine. But watch me on Sunday too.", source: { race: 'Las Vegas Grand Prix', year: 2023 } },
      { text: "The podium is mine. Nobody is taking this from me today.", source: { race: 'Australian Grand Prix', year: 2022 } },
    ],
  },
  alonso: {
    hometown: 'Oviedo, Spain',
    style:
      'The complete driver: masterful tyre preservation, psychological warfare, elite wet-weather skill, and an ability to find tenths that others simply cannot explain or replicate.',
    quotes: [
      { text: "I am Fernando Alonso. I am the best driver in the world. I have no doubt.", source: { race: 'Abu Dhabi Grand Prix', year: 2012 } },
      { text: "This car gives me everything. I just need to drive it to the limit.", source: { race: 'Bahrain Grand Prix', year: 2023 } },
      { text: "Experience never expires. I am still at my peak.", source: { race: 'Aston Martin season launch', year: 2023 } },
      { text: "El plan sigue. The plan continues. There are more races to win.", source: { race: 'Monaco Grand Prix', year: 2023 } },
      { text: "Every race I want to fight at the front. That hunger never goes.", source: { race: 'Singapore Grand Prix', year: 2023 } },
    ],
  },
  stroll: {
    hometown: 'Montreal, Canada',
    style:
      'Particularly formidable on street circuits and in changeable weather conditions. Can produce stunning qualifying laps when front-end confidence is high and conditions are on his side.',
    quotes: [
      { text: "Something is wrong with the car. Come on, we need to fix this.", source: { race: 'Azerbaijan Grand Prix', year: 2022 } },
      { text: "P3! Yes! That is a podium!", source: { race: 'Azerbaijan Grand Prix', year: 2021 } },
      { text: "I love street circuits. I love the walls, the barriers. It suits me.", source: { race: 'Monaco Grand Prix', year: 2022 } },
      { text: "When the car is right, everything feels so natural.", source: { race: 'Italian Grand Prix qualifying', year: 2020 } },
      { text: "I will keep pushing until the very last corner.", source: { race: 'Singapore Grand Prix', year: 2023 } },
    ],
  },
  albon: {
    hometown: 'London, England',
    style:
      'Smooth and precise with an outstanding ability to develop car balance. Exceptional at maximising an underdog package through clean execution and intelligent management of tyre life.',
    quotes: [
      { text: "P5! P5! Come on, the whole team did that. Unbelievable!", source: { race: 'Australian Grand Prix', year: 2022 } },
      { text: "This Williams deserves every single point we can give it.", source: { race: 'Singapore Grand Prix', year: 2023 } },
      { text: "I\'m fighting! I\'m fighting! Give me the tyres and I\'ll fight!", source: { race: 'Italian Grand Prix', year: 2023 } },
      { text: "Every lap in this car I appreciate more. The team is incredible.", source: { race: 'Williams season review', year: 2024 } },
      { text: "The balance came to me late but when it did, we flew.", source: { race: 'Dutch Grand Prix qualifying', year: 2022 } },
    ],
  },
  hulkenberg: {
    hometown: 'Emmerich am Rhein, Germany',
    style:
      'Consistent race pace with strong qualifying ability that routinely punches above the car\'s weight. Calm technical feedback and reliable execution make him a key asset for car development.',
    quotes: [
      { text: "Let\'s go! The pace is there today — let's use every lap.", source: { race: 'Bahrain Grand Prix', year: 2024 } },
      { text: "Points! That's what we came for. The team deserves this.", source: { race: 'Monaco Grand Prix', year: 2023 } },
      { text: "I know this package better than anyone. We can fight here.", source: { race: 'Singapore Grand Prix', year: 2023 } },
      { text: "The tyre window is everything. I live in that window.", source: { race: 'Belgian Grand Prix', year: 2023 } },
      { text: "The car gave me everything today. I\'ll take every single point.", source: { race: 'Australian Grand Prix', year: 2024 } },
    ],
  },
  magnussen: {
    hometown: 'Roskilde, Denmark',
    style:
      'Aggressive, brave, and combative on corner entry with fearless commitment. Excels at defending positions and making late moves that others back out of; best when attacking from the get-go.',
    quotes: [
      { text: "Come on! Yes! This is what we fight for! Let\'s go!", source: { race: 'Bahrain Grand Prix', year: 2022 } },
      { text: "P5! That is what Haas can do! Everyone back home, this is for you!", source: { race: 'Bahrain Grand Prix', year: 2022 } },
      { text: "I don\'s back out. I never back out. That's just how I race.", source: { race: 'Brazilian Grand Prix', year: 2022 } },
      { text: "Every race is a battle. I love the battle.", source: { race: 'Monaco Grand Prix', year: 2023 } },
      { text: "The harder the fight, the better the win. That's me.", source: { race: 'Haas season review', year: 2022 } },
    ],
  },
  gasly: {
    hometown: 'Rouen, France',
    style:
      'Rapid in qualifying with the ability to produce stunning race results when strategy opens a window. Has grown into a complete driver with strong pace and increasingly intelligent race craft.',
    quotes: [
      { text: "Is this real? Is this real life? This is unbelievable!", source: { race: 'Italian Grand Prix', year: 2020 } },
      { text: "Pierre Gasly wins! Pierre Gasly wins a Formula 1 race!", source: { race: 'Italian Grand Prix', year: 2020 } },
      { text: "AlphaTauri, you gave me everything. I will never forget this.", source: { race: 'Italian Grand Prix', year: 2020 } },
      { text: "Qualifying is my weapon. I love finding the perfect lap.", source: { race: 'Singapore Grand Prix qualifying', year: 2022 } },
      { text: "I believe I deserve to be at the very top of this sport.", source: { race: 'Alpine season launch', year: 2023 } },
    ],
  },
  ocon: {
    hometown: 'Évreux, France',
    style:
      'Aggressive through the field with strong defensive positioning and good tyre management. Tactically aware and capable of extracting points from machinery that would challenge less experienced drivers.',
    quotes: [
      { text: "Yes! Yes! Yes! I did it! I won a Grand Prix! Oh my God!", source: { race: 'Hungarian Grand Prix', year: 2021 } },
      { text: "Victory! Victory! My mother, my father, this is for you!", source: { race: 'Hungarian Grand Prix', year: 2021 } },
      { text: "I will fight you for every single point. Every. Single. One.", source: { race: 'Bahrain Grand Prix', year: 2022 } },
      { text: "This team believed in me when nobody else did. I\'ll never forget that.", source: { race: 'Alpine season review', year: 2022 } },
      { text: "I never stopped believing. That's the thing. I never stopped.", source: { race: 'Monaco Grand Prix', year: 2023 } },
    ],
  },
  tsunoda: {
    hometown: 'Sagamihara, Japan',
    style:
      'Explosive front-end speed with an improving ability to manage race distance. Exceptionally fast when in the zone, with a natural connection to the front axle others struggle to match.',
    quotes: [
      { text: "What the — what is that guy doing?! This is absolutely unbelievable!", source: { race: 'Bahrain Grand Prix', year: 2021 } },
      { text: "Come on! Give me the gap! I want to pass!", source: { race: 'Saudi Arabian Grand Prix', year: 2021 } },
      { text: "Yes! Overtake! That's how you do it!", source: { race: 'Austrian Grand Prix', year: 2023 } },
      { text: "I\'m pushing! I\'m pushing! This lap feels incredible!", source: { race: 'Singapore Grand Prix qualifying', year: 2022 } },
      { text: "Every corner I feel the front. The front is everything to me.", source: { race: 'RB season review', year: 2024 } },
    ],
  },
  lawson: {
    hometown: 'Hastings, New Zealand',
    style:
      'Relentless pressure racer with impressive adaptability under demanding conditions. Shows mature car management for his experience level with a combative and well-timed overtaking style.',
    quotes: [
      { text: "Let\'s get it done. I\'m pushing hard. Give me the gap.", source: { race: 'Singapore Grand Prix', year: 2023 } },
      { text: "P8! Scored points for the team! This is for everyone back home.", source: { race: 'Dutch Grand Prix', year: 2023 } },
      { text: "I learn something every single lap in this car. Every lap.", source: { race: 'Red Bull season launch', year: 2024 } },
      { text: "The tyres are talking to me now. I can push harder.", source: { race: 'Bahrain Grand Prix', year: 2025 } },
      { text: "There's no ceiling. I\'m nowhere near my ceiling.", source: { race: 'Red Bull season review', year: 2025 } },
    ],
  },
  antonelli: {
    hometown: 'Bologna, Italy',
    style:
      'Breathtaking natural speed at every circuit type, showing instinctive front-end feel and rapid learning. Commands the car with composure and raw pace that are rare in any generation.',
    quotes: [
      { text: "Incredible! What a lap! I cannot believe this! Amazing!", source: { race: 'Bahrain Grand Prix', year: 2025 } },
      { text: "Mercedes, this one is for you! For the whole team!", source: { race: 'Saudi Arabian Grand Prix', year: 2025 } },
      { text: "The car speaks to me. I just have to listen and deliver.", source: { race: 'Mercedes season review', year: 2025 } },
      { text: "Every qualifying I want to extract the absolute maximum. Always.", source: { race: 'Miami Grand Prix qualifying', year: 2025 } },
      { text: "I am calm. I am ready. There is nothing that will stop me.", source: { race: 'Bahrain Grand Prix', year: 2026 } },
    ],
  },
  bearman: {
    hometown: 'Chelmsford, England',
    style:
      'Bold and composed beyond his years, comfortable attacking veteran drivers from his very first laps in F1. Clean race craft with fearless wheel-to-wheel instincts and strong tyre management.',
    quotes: [
      { text: "Roger that. P6. Let\'s keep this going — I want more.", source: { race: 'Saudi Arabian Grand Prix', year: 2024 } },
      { text: "I stepped in not knowing the car and I was there. That's me.", source: { race: 'Saudi Arabian Grand Prix', year: 2024 } },
      { text: "Every lap I push harder. I don\'s know any other way.", source: { race: 'Haas season launch', year: 2025 } },
      { text: "The wall is close but I trust my hands. I always trust my hands.", source: { race: 'Monaco Grand Prix qualifying', year: 2025 } },
      { text: "This team gave me my chance. I\'m going to repay every single point.", source: { race: 'Haas season review', year: 2025 } },
    ],
  },
  bottas: {
    hometown: 'Nastola, Finland',
    style:
      'Metronomic consistency and elite qualifying pace, particularly dominant in Sector 1 sequences. Rarely makes errors and delivers stable, reliable race pace with excellent technical feedback.',
    quotes: [
      { text: "To whom it may concern — I\'m still here, still delivering.", source: { race: 'Abu Dhabi Grand Prix', year: 2021 } },
      { text: "Bottas, it\'s James. Can we talk about your strategy? — To whom it may concern, yes.", source: { race: 'Abu Dhabi Grand Prix', year: 2021 } },
      { text: "I love Monza. I love the speed. I love everything about this place.", source: { race: 'Italian Grand Prix', year: 2020 } },
      { text: "P2! That's a front row start! The car was flying!", source: { race: 'Brazilian Grand Prix qualifying', year: 2021 } },
      { text: "Five seasons, five years of giving absolutely everything. No regrets.", source: { race: 'Mercedes farewell', year: 2021 } },
    ],
  },
  zhou: {
    hometown: 'Shanghai, China',
    style:
      'Consistently improving race craft with calm precision under pressure. Delivers clean and reliable results, managing tyres intelligently and scoring points in difficult circumstances.',
    quotes: [
      { text: "Yeah, yeah. I\'m fine. The car is fine. Let\'s just keep going.", source: { race: 'British Grand Prix', year: 2022 } },
      { text: "Points! That is what I promised. Points are what we got.", source: { race: 'Bahrain Grand Prix', year: 2022 } },
      { text: "I can push. The tyres are alive. Let me push more.", source: { race: 'Singapore Grand Prix', year: 2023 } },
      { text: "Steady is fast. That's what I know. Steady is always fast.", source: { race: 'Sauber season review', year: 2023 } },
      { text: "I will keep delivering. Race after race. That is my promise.", source: { race: 'Sauber season review', year: 2024 } },
    ],
  },
  colapinto: {
    hometown: 'Pilar, Argentina',
    style:
      'Raw speed with brave overtaking instincts and rapid adaptation to new machinery. Argentine flair with aggressive defending and a natural ability to push cars to their absolute limit.',
    quotes: [
      { text: "Sí! Sí! Vamos! This one is for Argentina!", source: { race: 'Las Vegas Grand Prix', year: 2024 } },
      { text: "The walls don\'s scare me here. They make me faster.", source: { race: 'Las Vegas Grand Prix qualifying', year: 2024 } },
      { text: "I always knew F1 was where I belonged. Always.", source: { race: 'Williams season review', year: 2024 } },
      { text: "Every metre of track I know. Every braking zone. It\'s mine.", source: { race: 'Abu Dhabi Grand Prix qualifying', year: 2024 } },
      { text: "Argentina, we're here! We're really here in Formula 1!", source: { race: 'Brazilian Grand Prix', year: 2024 } },
    ],
  },
  ricciardo: {
    hometown: 'Perth, Australia',
    style:
      "The late-braking master — consistently finds stopping points others can't reach. Exceptional overtaking ability with the instinct to choose the perfect moment and execute with a smile.",
    quotes: [
      { text: "Bwoah! Shoey! Who wants a shoey?! We are winning!", source: { race: 'Monaco Grand Prix', year: 2018 } },
      { text: "Checkered flag, baby! Come on! That is a race win!", source: { race: 'Monaco Grand Prix', year: 2018 } },
      { text: "I back myself every time. Every single time, I back myself.", source: { race: 'Red Bull season review', year: 2018 } },
      { text: "Never underestimate the honey badger. Never.", source: { race: 'Australian Grand Prix', year: 2016 } },
      { text: "One more win for the smile. Always for the smile.", source: { race: 'Monaco Grand Prix', year: 2022 } },
    ],
  },
  perez: {
    hometown: 'Guadalajara, Mexico',
    style:
      '"The Taxman" — extraordinary tyre preservation enables him to execute undercut and overcut strategies better than almost any rival. Elite at managing deltas and exploiting strategy windows.',
    quotes: [
      { text: "This is for all of Mexico! Vamos, vamos, vamos!", source: { race: 'Saudi Arabian Grand Prix', year: 2021 } },
      { text: "Win! Race win! First podium of the year — let's go!", source: { race: 'Azerbaijan Grand Prix', year: 2021 } },
      { text: "P1! P1! I cannot believe this! Gracias a todos!", source: { race: 'Monaco Grand Prix', year: 2022 } },
      { text: "My tyres, my strategy, my race. That's what I do best.", source: { race: 'Abu Dhabi Grand Prix', year: 2021 } },
      { text: "Mexico City, this weekend is ours. For you. Always for you.", source: { race: 'Mexico City Grand Prix', year: 2023 } },
    ],
  },
  hadjar: {
    hometown: 'Paris, France',
    style:
      'Smooth precision with exceptional feel for car balance from the junior categories. Demonstrates natural speed and composure rarely seen in drivers making their first steps in Formula 1.',
    quotes: [
      { text: "Let\'s go! Come on! I can push more — just give me the chance!", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "Points! My first Formula 1 points! This is everything!", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "The car is incredible. I am learning every single lap.", source: { race: 'Saudi Arabian Grand Prix', year: 2026 } },
      { text: "Paris, France, we are in Formula 1! This is for us!", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "I have been ready for this my whole life. I am so ready.", source: { race: 'Racing Bulls season launch', year: 2026 } },
    ],
  },
  doohan: {
    hometown: 'Gold Coast, Australia',
    style:
      'Technical precision with a methodical approach to car development. Shows family racing DNA through brave overtaking moves and a strong ability to extract pace from tricky conditions.',
    quotes: [
      { text: "Copy that. I\'m pushing. The balance feels much better now.", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "Points on debut! The hard work pays off. It really pays off.", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "Every lap I learn something new. The speed is there.", source: { race: 'Saudi Arabian Grand Prix', year: 2026 } },
      { text: "Dad, we made it. Formula 1. This is it.", source: { race: 'Alpine season launch', year: 2026 } },
      { text: "I trust the car and I trust myself. That combination is everything.", source: { race: 'Australian Grand Prix', year: 2026 } },
    ],
  },
  bortoleto: {
    hometown: 'São Paulo, Brazil',
    style:
      'Explosive qualifying pace with a natural ability to read the front tyre limit instantly. Commands the car with instinctive confidence and adapts to new machinery with remarkable speed.',
    quotes: [
      { text: "Yes! Yes! Yes! This is unbelievable! For Brazil!", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "Brasil, estamos aqui! We are in Formula 1!", source: { race: 'Bahrain Grand Prix', year: 2026 } },
      { text: "Every lap I want to be faster. That's all I know. Faster.", source: { race: 'Sauber season launch', year: 2026 } },
      { text: "The Senna spirit — that's what drives me. Every single day.", source: { race: 'Sauber season review', year: 2026 } },
      { text: "Podium! First F1 podium! Oh my God! Incredible!", source: { race: 'Monaco Grand Prix', year: 2026 } },
    ],
  },
  hulkenberg_nico: {
    hometown: 'Emmerich am Rhein, Germany',
    style:
      'Reliable and consistent across multiple seasons, with qualifying pace that consistently overachieves relative to the machinery. Clear-headed in the heat of a battle.',
    quotes: [
      { text: "The race pace is strong today. Let\'s bring it home.", source: { race: 'Bahrain Grand Prix', year: 2023 } },
      { text: "I\'ve been underrated for years. But the lap times tell the truth.", source: { race: 'Haas season launch', year: 2023 } },
      { text: "Points again. That's consistency. That's what I deliver.", source: { race: 'Monaco Grand Prix', year: 2023 } },
      { text: "The car balance is perfect today. I can push to the absolute limit.", source: { race: 'Singapore Grand Prix', year: 2024 } },
      { text: "I know what I\'m capable of. And I\'m showing it race by race.", source: { race: 'Sauber season review', year: 2024 } },
    ],
  },
};

/** Returns static data for a driver, or a generic fallback. */
export function getDriverStatic(driverId: string): DriverStaticData | null {
  return DRIVER_STATIC[driverId] ?? null;
}

/**
 * Static per-driver data — driving style, hometown, and memorable radio messages.
 * Keyed by Jolpica/Ergast driverId (lowercase).
 */

export interface DriverStaticData {
  hometown: string;
  style: string;
  radioMessage: string;
}

export const DRIVER_STATIC: Record<string, DriverStaticData> = {
  verstappen: {
    hometown: "Hasselt, Belgium",
    style:
      "Relentless late-braking, phenomenal tyre management in all conditions, and razor-sharp racecraft. Exceptional at reading tyre windows and extending stints well beyond what rivals attempt.",
    radioMessage: "We have a machine! Come on, boys! Let's keep pushing!",
  },
  hamilton: {
    hometown: "Stevenage, England",
    style:
      "Silky smooth inputs, masterful tyre conservation, and elite wet-weather pace. Unmatched ability to manage an entire race strategy through feel alone, instinctively responding to conditions.",
    radioMessage: "I'm still here. I'm still here.",
  },
  leclerc: {
    hometown: "Monte Carlo, Monaco",
    style:
      "Electrifying single-lap speed with fearless commitment through high-speed corners. Exceptional front-end feel allows him to push well beyond normal tyre limits and produce stunning qualifying laps.",
    radioMessage: "I gave everything I had. I really gave everything I had.",
  },
  norris: {
    hometown: "Glastonbury, England",
    style:
      "Clinical through high-speed sections with outstanding raw pace and rapidly improving tyre management. Particularly lethal when running at the front in the early laps and finding time no one else can.",
    radioMessage: "I cannot believe it. I literally cannot believe it. Are you serious?!",
  },
  piastri: {
    hometown: "Melbourne, Australia",
    style:
      "Ice-cool and methodical with mechanical sympathy beyond his years. Consistently clean, rarely makes errors, and delivers blistering pace when the car is to his precise and smooth style.",
    radioMessage: "It's a podium! My first podium! That is absolutely unreal.",
  },
  russell: {
    hometown: "King's Lynn, England",
    style:
      "Meticulous and analytical, adapting his style fluidly to any car balance. Converts strategy opportunities well and consistently punches above the car's weight when at the sharp end.",
    radioMessage: "That's what years of work looks like. Never doubted it. Never.",
  },
  sainz: {
    hometown: "Madrid, Spain",
    style:
      "\"Mr. Saturday\" — a natural qualifier who converts single-lap pace cleanly into race results. Strong tyre management, sharp strategic awareness, and impressive consistency across all circuit types.",
    radioMessage: "Pole! P1! Carlos Sainz, cabrón! Let's go!",
  },
  alonso: {
    hometown: "Oviedo, Spain",
    style:
      "The complete driver: masterful tyre preservation, psychological warfare, elite wet-weather skill, and an ability to find tenths that others simply cannot explain or replicate.",
    radioMessage: "I am Fernando Alonso. I am the best driver in the world. I have no doubt.",
  },
  stroll: {
    hometown: "Montreal, Canada",
    style:
      "Particularly formidable on street circuits and in changeable weather conditions. Can produce stunning qualifying laps when front-end confidence is high and conditions are on his side.",
    radioMessage: "Something is wrong with the car. Come on, we need to fix this.",
  },
  albon: {
    hometown: "London, England",
    style:
      "Smooth and precise with an outstanding ability to develop car balance. Exceptional at maximising an underdog package through clean execution and intelligent management of tyre life.",
    radioMessage: "P5! P5! Come on, the whole team did that. Unbelievable!",
  },
  hulkenberg: {
    hometown: "Emmerich am Rhein, Germany",
    style:
      "Consistent race pace with strong qualifying ability that routinely punches above the car's weight. Calm technical feedback and reliable execution make him a key asset for car development.",
    radioMessage: "Let's go! The pace is there today — let's use every lap.",
  },
  magnussen: {
    hometown: "Roskilde, Denmark",
    style:
      "Aggressive, brave, and combative on corner entry with fearless commitment. Excels at defending positions and making late moves that others back out of; best when attacking from the get-go.",
    radioMessage: "Come on! Yes! This is what we fight for! Let's go!",
  },
  gasly: {
    hometown: "Rouen, France",
    style:
      "Rapid in qualifying with the ability to produce stunning race results when strategy opens a window. Has grown into a complete driver with strong pace and increasingly intelligent race craft.",
    radioMessage: "I'm going to be a father! I need to win this race for my baby!",
  },
  ocon: {
    hometown: "Évreux, France",
    style:
      "Aggressive through the field with strong defensive positioning and good tyre management. Tactically aware and capable of extracting points from machinery that would challenge less experienced drivers.",
    radioMessage: "Yes! Yes! Yes! I did it! I won a Grand Prix! Oh my God!",
  },
  tsunoda: {
    hometown: "Sagamihara, Japan",
    style:
      "Explosive front-end speed with an improving ability to manage race distance. Exceptionally fast when in the zone, with a natural connection to the front axle others struggle to match.",
    radioMessage: "What the — what is that guy doing?! This is absolutely unbelievable!",
  },
  lawson: {
    hometown: "Hastings, New Zealand",
    style:
      "Relentless pressure racer with impressive adaptability under demanding conditions. Shows mature car management for his experience level with a combative and well-timed overtaking style.",
    radioMessage: "Let's get it done. I'm pushing hard. Give me the gap.",
  },
  antonelli: {
    hometown: "Bologna, Italy",
    style:
      "Breathtaking natural speed at every circuit type, showing instinctive front-end feel and rapid learning. Commands the car with composure and raw pace that are rare in any generation.",
    radioMessage: "Incredible! What a lap! I cannot believe this! Amazing!",
  },
  bearman: {
    hometown: "Chelmsford, England",
    style:
      "Bold and composed beyond his years, comfortable attacking veteran drivers from his very first laps in F1. Clean race craft with fearless wheel-to-wheel instincts and strong tyre management.",
    radioMessage: "Roger that. P6. Let's keep this going — I want more.",
  },
  bottas: {
    hometown: "Nastola, Finland",
    style:
      "Metronomic consistency and elite qualifying pace, particularly dominant in Sector 1 sequences. Rarely makes errors and delivers stable, reliable race pace with excellent technical feedback.",
    radioMessage: "To whom it may concern — I'm still here, still delivering.",
  },
  zhou: {
    hometown: "Shanghai, China",
    style:
      "Consistently improving race craft with calm precision under pressure. Delivers clean and reliable results, managing tyres intelligently and scoring points in difficult circumstances.",
    radioMessage: "Yeah, yeah. I'm fine. The car is fine. Let's just keep going.",
  },
  colapinto: {
    hometown: "Pilar, Argentina",
    style:
      "Raw speed with brave overtaking instincts and rapid adaptation to new machinery. Argentine flair with aggressive defending and a natural ability to push cars to their absolute limit.",
    radioMessage: "Sí! Sí! Vamos! This one is for Argentina!",
  },
  ricciardo: {
    hometown: "Perth, Australia",
    style:
      "The late-braking master — consistently finds stopping points others can't reach. Exceptional overtaking ability with the instinct to choose the perfect moment and execute with a smile.",
    radioMessage: "Bwoah! Shoey! Who wants a shoey?! We are winning!",
  },
  perez: {
    hometown: "Guadalajara, Mexico",
    style:
      "\"The Taxman\" — extraordinary tyre preservation enables him to execute undercut and overcut strategies better than almost any rival. Elite at managing deltas and exploiting strategy windows.",
    radioMessage: "This is for all of Mexico! Vamos, vamos, vamos!",
  },
  hadjar: {
    hometown: "Paris, France",
    style:
      "Smooth precision with exceptional feel for car balance from the junior categories. Demonstrates natural speed and composure rarely seen in drivers making their first steps in Formula 1.",
    radioMessage: "Let's go! Come on! I can push more — just give me the chance!",
  },
  doohan: {
    hometown: "Gold Coast, Australia",
    style:
      "Technical precision with a methodical approach to car development. Shows family racing DNA through brave overtaking moves and a strong ability to extract pace from tricky conditions.",
    radioMessage: "Copy that. I'm pushing. The balance feels much better now.",
  },
  bortoleto: {
    hometown: "São Paulo, Brazil",
    style:
      "Explosive qualifying pace with a natural ability to read the front tyre limit instantly. Commands the car with instinctive confidence and adapts to new machinery with remarkable speed.",
    radioMessage: "Yes! Yes! Yes! This is unbelievable! For Brazil!",
  },
  hulkenberg_nico: {
    hometown: "Emmerich am Rhein, Germany",
    style:
      "Reliable and consistent across multiple seasons, with qualifying pace that consistently overachieves relative to the machinery. Clear-headed in the heat of a battle.",
    radioMessage: "The race pace is strong today. Let's bring it home.",
  },
};

/** Returns static data for a driver, or a generic fallback. */
export function getDriverStatic(driverId: string): DriverStaticData | null {
  return DRIVER_STATIC[driverId] ?? null;
}

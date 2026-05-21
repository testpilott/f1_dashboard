// Maps Jolpica nationality demonyms → { flag, country }
export const DEMONYM_INFO: Record<string, { flag: string; country: string }> = {
  American:        { flag: "🇺🇸", country: "United States" },
  Australian:      { flag: "🇦🇺", country: "Australia" },
  Austrian:        { flag: "🇦🇹", country: "Austria" },
  Belgian:         { flag: "🇧🇪", country: "Belgium" },
  Brazilian:       { flag: "🇧🇷", country: "Brazil" },
  British:         { flag: "🇬🇧", country: "United Kingdom" },
  Canadian:        { flag: "🇨🇦", country: "Canada" },
  Chinese:         { flag: "🇨🇳", country: "China" },
  Danish:          { flag: "🇩🇰", country: "Denmark" },
  Dutch:           { flag: "🇳🇱", country: "Netherlands" },
  Finnish:         { flag: "🇫🇮", country: "Finland" },
  French:          { flag: "🇫🇷", country: "France" },
  German:          { flag: "🇩🇪", country: "Germany" },
  Hungarian:       { flag: "🇭🇺", country: "Hungary" },
  Italian:         { flag: "🇮🇹", country: "Italy" },
  Japanese:        { flag: "🇯🇵", country: "Japan" },
  Mexican:         { flag: "🇲🇽", country: "Mexico" },
  Monegasque:      { flag: "🇲🇨", country: "Monaco" },
  "New Zealander": { flag: "🇳🇿", country: "New Zealand" },
  Polish:          { flag: "🇵🇱", country: "Poland" },
  Russian:         { flag: "🇷🇺", country: "Russia" },
  Spanish:         { flag: "🇪🇸", country: "Spain" },
  Swedish:         { flag: "🇸🇪", country: "Sweden" },
  Swiss:           { flag: "🇨🇭", country: "Switzerland" },
  Thai:            { flag: "🇹🇭", country: "Thailand" },
};

export function getFlagByDemonym(demonym: string): string {
  return DEMONYM_INFO[demonym]?.flag ?? "🏁";
}

export function getCountryByDemonym(demonym: string): string {
  return DEMONYM_INFO[demonym]?.country ?? demonym;
}

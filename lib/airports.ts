export type Airport = {
  name: string;
  city: string;
  country: string;
  iata: string;
  icao?: string;
  keywords: string[];
};

export const airports: Airport[] = [
  { name: "Indira Gandhi International Airport", city: "Delhi", country: "India", iata: "DEL", icao: "VIDP", keywords: ["delhi", "new delhi", "del", "india"] },
  { name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India", iata: "BOM", icao: "VABB", keywords: ["mumbai", "bombay", "bom", "india"] },
  { name: "Kempegowda International Airport", city: "Bengaluru", country: "India", iata: "BLR", icao: "VOBL", keywords: ["bangalore", "bengaluru", "blr", "india"] },
  { name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", iata: "HYD", icao: "VOHS", keywords: ["hyderabad", "hyd", "india"] },
  { name: "Chennai International Airport", city: "Chennai", country: "India", iata: "MAA", icao: "VOMM", keywords: ["chennai", "madras", "maa", "india"] },
  { name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India", iata: "CCU", icao: "VECC", keywords: ["kolkata", "calcutta", "ccu", "india"] },
  { name: "Manohar International Airport", city: "Goa", country: "India", iata: "GOX", icao: "VOGA", keywords: ["goa", "gox", "india"] },
  { name: "Jaipur International Airport", city: "Jaipur", country: "India", iata: "JAI", icao: "VIJP", keywords: ["jaipur", "jai", "india"] },
  { name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India", iata: "AMD", icao: "VAAH", keywords: ["ahmedabad", "amd", "india"] },
  { name: "Maharana Pratap Airport", city: "Udaipur", country: "India", iata: "UDR", icao: "VAUD", keywords: ["udaipur", "udr", "india"] },
  { name: "Sheikh ul-Alam International Airport", city: "Srinagar", country: "India", iata: "SXR", icao: "VISR", keywords: ["srinagar", "sxr", "india"] },
  { name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", iata: "DXB", icao: "OMDB", keywords: ["dubai", "dxb", "uae", "united arab emirates"] },
  { name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", iata: "AUH", icao: "OMAA", keywords: ["abu dhabi", "auh", "uae"] },
  { name: "Hamad International Airport", city: "Doha", country: "Qatar", iata: "DOH", icao: "OTHH", keywords: ["doha", "doh", "qatar"] },
  { name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", iata: "SIN", icao: "WSSS", keywords: ["singapore", "changi", "sin"] },
  { name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", iata: "BKK", icao: "VTBS", keywords: ["bangkok", "bkk", "thailand"] },
  { name: "Velana International Airport", city: "Male", country: "Maldives", iata: "MLE", icao: "VRMM", keywords: ["maldives", "male", "mle"] },
  { name: "London Heathrow Airport", city: "London", country: "United Kingdom", iata: "LHR", icao: "EGLL", keywords: ["london", "heathrow", "lhr", "uk"] },
  { name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", iata: "CDG", icao: "LFPG", keywords: ["paris", "cdg", "france"] },
  { name: "Zurich Airport", city: "Zurich", country: "Switzerland", iata: "ZRH", icao: "LSZH", keywords: ["zurich", "zrh", "switzerland"] },
];

export function findAirport(value?: string | null) {
  if (!value) return airports[0];
  const needle = value.toLowerCase().trim();
  return airports.find((airport) =>
    [airport.name, airport.city, airport.country, airport.iata, airport.icao, ...airport.keywords]
      .filter((part): part is string => typeof part === "string")
      .some((part) => part.toLowerCase() === needle || part.toLowerCase().includes(needle)),
  ) || { ...airports[0], city: value, name: value, iata: value.slice(0, 3).toUpperCase(), keywords: [value] };
}

export function searchAirports(query: string) {
  const needle = query.toLowerCase().trim();
  if (!needle) return airports.slice(0, 8);
  return airports
    .filter((airport) =>
      [airport.name, airport.city, airport.country, airport.iata, airport.icao, ...airport.keywords]
        .filter((part): part is string => typeof part === "string")
        .some((part) => part.toLowerCase().includes(needle)),
    )
    .slice(0, 8);
}

export function airportCode(value?: string | null) {
  return findAirport(value).iata;
}

export type Airport = {
  name: string;
  city: string;
  country: string;
  iata: string;
  keywords: string[];
};

export const airports: Airport[] = [
  { name: "Indira Gandhi International Airport", city: "Delhi", country: "India", iata: "DEL", keywords: ["delhi", "new delhi", "del", "india"] },
  { name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India", iata: "BOM", keywords: ["mumbai", "bombay", "bom", "india"] },
  { name: "Kempegowda International Airport", city: "Bengaluru", country: "India", iata: "BLR", keywords: ["bangalore", "bengaluru", "blr", "india"] },
  { name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", iata: "HYD", keywords: ["hyderabad", "hyd", "india"] },
  { name: "Chennai International Airport", city: "Chennai", country: "India", iata: "MAA", keywords: ["chennai", "madras", "maa", "india"] },
  { name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India", iata: "CCU", keywords: ["kolkata", "calcutta", "ccu", "india"] },
  { name: "Manohar International Airport", city: "Goa", country: "India", iata: "GOX", keywords: ["goa", "gox", "india"] },
  { name: "Jaipur International Airport", city: "Jaipur", country: "India", iata: "JAI", keywords: ["jaipur", "jai", "india"] },
  { name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India", iata: "AMD", keywords: ["ahmedabad", "amd", "india"] },
  { name: "Maharana Pratap Airport", city: "Udaipur", country: "India", iata: "UDR", keywords: ["udaipur", "udr", "india"] },
  { name: "Sheikh ul-Alam International Airport", city: "Srinagar", country: "India", iata: "SXR", keywords: ["srinagar", "sxr", "india"] },
  { name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", iata: "DXB", keywords: ["dubai", "dxb", "uae", "united arab emirates"] },
  { name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", iata: "AUH", keywords: ["abu dhabi", "auh", "uae"] },
  { name: "Hamad International Airport", city: "Doha", country: "Qatar", iata: "DOH", keywords: ["doha", "doh", "qatar"] },
  { name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", iata: "SIN", keywords: ["singapore", "changi", "sin"] },
  { name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", iata: "BKK", keywords: ["bangkok", "bkk", "thailand"] },
  { name: "Velana International Airport", city: "Male", country: "Maldives", iata: "MLE", keywords: ["maldives", "male", "mle"] },
  { name: "London Heathrow Airport", city: "London", country: "United Kingdom", iata: "LHR", keywords: ["london", "heathrow", "lhr", "uk"] },
  { name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", iata: "CDG", keywords: ["paris", "cdg", "france"] },
  { name: "Zurich Airport", city: "Zurich", country: "Switzerland", iata: "ZRH", keywords: ["zurich", "zrh", "switzerland"] },
];

export function findAirport(value?: string | null) {
  if (!value) return airports[0];
  const needle = value.toLowerCase().trim();
  return airports.find((airport) =>
    [airport.name, airport.city, airport.country, airport.iata, ...airport.keywords]
      .some((part) => part.toLowerCase() === needle || part.toLowerCase().includes(needle)),
  ) || { ...airports[0], city: value, name: value, iata: value.slice(0, 3).toUpperCase(), keywords: [value] };
}

export function searchAirports(query: string) {
  const needle = query.toLowerCase().trim();
  if (!needle) return airports.slice(0, 8);
  return airports
    .filter((airport) =>
      [airport.name, airport.city, airport.country, airport.iata, ...airport.keywords]
        .some((part) => part.toLowerCase().includes(needle)),
    )
    .slice(0, 8);
}

export function airportCode(value?: string | null) {
  return findAirport(value).iata;
}

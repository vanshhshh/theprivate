import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import fs from "fs";
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });
const raw = JSON.parse(fs.readFileSync("lib/data.json", "utf8"));
function n(v:any){const x=Number(String(v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:null}
const AIRPORTS = [
  { name: "Indira Gandhi International Airport", city: "Delhi", country: "India", iata: "DEL", icao: "VIDP", latitude: 28.5562, longitude: 77.1, timezone: "Asia/Kolkata", privateJetRelevance: "Primary Indian hub" },
  { name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India", iata: "BOM", icao: "VABB", latitude: 19.0896, longitude: 72.8656, timezone: "Asia/Kolkata", privateJetRelevance: "Primary Indian hub" },
  { name: "Kempegowda International Airport", city: "Bengaluru", country: "India", iata: "BLR", icao: "VOBL", latitude: 13.1986, longitude: 77.7066, timezone: "Asia/Kolkata", privateJetRelevance: "Tech hub" },
  { name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India", iata: "HYD", icao: "VOHS", latitude: 17.2403, longitude: 78.4294, timezone: "Asia/Kolkata", privateJetRelevance: "Primary Indian hub" },
  { name: "Chennai International Airport", city: "Chennai", country: "India", iata: "MAA", icao: "VOMM", latitude: 12.9941, longitude: 80.1709, timezone: "Asia/Kolkata", privateJetRelevance: "South India hub" },
  { name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India", iata: "CCU", icao: "VECC", latitude: 22.6547, longitude: 88.4467, timezone: "Asia/Kolkata", privateJetRelevance: "East India hub" },
  { name: "Manohar International Airport", city: "Goa", country: "India", iata: "GOX", icao: "VOGA", latitude: 15.3808, longitude: 73.8314, timezone: "Asia/Kolkata", privateJetRelevance: "Leisure destination" },
  { name: "Jaipur International Airport", city: "Jaipur", country: "India", iata: "JAI", icao: "VIJP", latitude: 26.8242, longitude: 75.8122, timezone: "Asia/Kolkata", privateJetRelevance: "Leisure destination" },
  { name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India", iata: "AMD", icao: "VAAH", latitude: 23.0772, longitude: 72.6347, timezone: "Asia/Kolkata", privateJetRelevance: "West India hub" },
  { name: "Maharana Pratap Airport", city: "Udaipur", country: "India", iata: "UDR", icao: "VAUD", latitude: 24.6177, longitude: 73.8961, timezone: "Asia/Kolkata", privateJetRelevance: "Leisure destination" },
  { name: "Sheikh ul-Alam International Airport", city: "Srinagar", country: "India", iata: "SXR", icao: "VISR", latitude: 34.0046, longitude: 74.7973, timezone: "Asia/Kolkata", privateJetRelevance: "Leisure destination" },
  { name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", iata: "DXB", icao: "OMDB", latitude: 25.2532, longitude: 55.3657, timezone: "Asia/Dubai", privateJetRelevance: "Primary international hub" },
  { name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", iata: "AUH", icao: "OMAA", latitude: 24.433, longitude: 54.6511, timezone: "Asia/Dubai", privateJetRelevance: "International hub" },
  { name: "Hamad International Airport", city: "Doha", country: "Qatar", iata: "DOH", icao: "OTHH", latitude: 25.2731, longitude: 51.6081, timezone: "Asia/Qatar", privateJetRelevance: "International hub" },
  { name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", iata: "SIN", icao: "WSSS", latitude: 1.3644, longitude: 103.9915, timezone: "Asia/Singapore", privateJetRelevance: "Primary international hub" },
  { name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", iata: "BKK", icao: "VTBS", latitude: 13.69, longitude: 100.7501, timezone: "Asia/Bangkok", privateJetRelevance: "International hub" },
  { name: "Velana International Airport", city: "Male", country: "Maldives", iata: "MLE", icao: "VRMM", latitude: 4.1918, longitude: 73.5291, timezone: "Indian/Maldives", privateJetRelevance: "Leisure destination" },
  { name: "London Heathrow Airport", city: "London", country: "United Kingdom", iata: "LHR", icao: "EGLL", latitude: 51.47, longitude: -0.4543, timezone: "Europe/London", privateJetRelevance: "Primary international hub" },
  { name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", iata: "CDG", icao: "LFPG", latitude: 49.0097, longitude: 2.5479, timezone: "Europe/Paris", privateJetRelevance: "International hub" },
  { name: "Zurich Airport", city: "Zurich", country: "Switzerland", iata: "ZRH", icao: "LSZH", latitude: 47.4582, longitude: 8.5555, timezone: "Europe/Zurich", privateJetRelevance: "International hub" },
];
async function main(){
  for(const a of AIRPORTS){
    await db.airport.upsert({where:{iata:a.iata},update:{name:a.name,city:a.city,country:a.country,icao:a.icao,latitude:a.latitude,longitude:a.longitude,timezone:a.timezone,privateJetRelevance:a.privateJetRelevance},create:{name:a.name,city:a.city,country:a.country,iata:a.iata,icao:a.icao,latitude:a.latitude,longitude:a.longitude,timezone:a.timezone,privateJetRelevance:a.privateJetRelevance}});
  }
  for(const o of raw.operators){
    const name=o.operator_name||o.operator_name_raw?.split(" C/O")[0]||"Unknown";
    const op=await db.operator.upsert({where:{dgcaId:Number(o.operator_master_id)},update:{name,aopNumber:o.aop_no||null,phone:o.best_phone||null,email:o.best_email||null,website:o.website||null,address:o.communication_address||null,priority:o.priority||null,charterBusiness:o.charter_business||null,privateJetRelevance:o.private_jet_relevance||null,internationalCapability:o.international_capability||null,operatorType:o.operator_type||null,estimatedActivity:o.estimated_activity||null,revenueFy25:o.revenue_fy25||null,instagram:o.instagram||null,linkedin:o.linkedin||null,decisionMaker:o.decision_maker_y||o.decision_maker_x||null,decisionMakerTitle:o.decision_maker_title_y||o.decision_maker_title_x||null,decisionMakerContact:o.decision_maker_contact_y||o.decision_maker_contact_x||null},create:{dgcaId:Number(o.operator_master_id),name,aopNumber:o.aop_no||null,phone:o.best_phone||null,email:o.best_email||null,website:o.website||null,address:o.communication_address||null,priority:o.priority||null,charterBusiness:o.charter_business||null,privateJetRelevance:o.private_jet_relevance||null,internationalCapability:o.international_capability||null,operatorType:o.operator_type||null,estimatedActivity:o.estimated_activity||null,revenueFy25:o.revenue_fy25||null,instagram:o.instagram||null,linkedin:o.linkedin||null,decisionMaker:o.decision_maker_y||o.decision_maker_x||null,decisionMakerTitle:o.decision_maker_title_y||o.decision_maker_title_x||null,decisionMakerContact:o.decision_maker_contact_y||o.decision_maker_contact_x||null}});
    await db.operatorPricing.upsert({where:{operatorId:op.id},update:{},create:{operatorId:op.id}});
    for(const a of (o.aircraft||[])) if(a.registration){
      const seats=n(a.seating_capacity);
      await db.aircraft.upsert({where:{registration:a.registration},update:{operatorId:op.id,type:a.aircraft_type||null,model:a.model||null,seats},create:{operatorId:op.id,registration:a.registration,type:a.aircraft_type||null,model:a.model||null,seats}});
    }
  }
  console.log(`Seeded ${await db.airport.count()} airports / ${await db.operator.count()} operators / ${await db.aircraft.count()} aircraft`);
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());

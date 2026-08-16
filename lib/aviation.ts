import { db } from './prisma';
let token:{value:string,expires:number}|null=null;
async function auth(){if(token&&Date.now()<token.expires)return token.value;if(!process.env.OPENSKY_CLIENT_ID||!process.env.OPENSKY_CLIENT_SECRET)return null;const r=await fetch('https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:process.env.OPENSKY_CLIENT_ID,client_secret:process.env.OPENSKY_CLIENT_SECRET})});if(!r.ok)throw new Error(`OpenSky auth ${r.status}`);const j=await r.json();token={value:j.access_token,expires:Date.now()+Math.max(60000,(j.expires_in-60)*1000)};return token.value}
export async function syncTrackedAircraft(){
  const aircraft=await db.aircraft.findMany({where:{active:true,icao24:{not:null}},select:{id:true,icao24:true}}); if(!aircraft.length)return {matched:0,total:0,skipped:true};
  const headers:Record<string,string>={};const t=await auth();if(t)headers.Authorization=`Bearer ${t}`;
  const params=aircraft.slice(0,50).map(a=>`icao24=${encodeURIComponent(a.icao24!.toLowerCase())}`).join('&');
  const r=await fetch(`https://opensky-network.org/api/states/all?${params}`,{headers,cache:'no-store'});if(!r.ok)throw new Error(`OpenSky ${r.status}`);const j=await r.json();let matched=0;
  for(const s of j.states||[]){const a=aircraft.find(x=>x.icao24?.toLowerCase()===String(s[0]).toLowerCase());if(!a)continue;await db.flightPosition.create({data:{aircraftId:a.id,provider:'opensky',icao24:String(s[0]),callsign:s[1]?.trim()||null,latitude:s[6]??null,longitude:s[5]??null,altitude:s[7]??null,velocity:s[9]??null,heading:s[10]??null,onGround:Boolean(s[8]),observedAt:new Date((s[4]||Date.now()/1000)*1000),raw:s}});matched++;}
  return {matched,total:aircraft.length,skipped:false};
}

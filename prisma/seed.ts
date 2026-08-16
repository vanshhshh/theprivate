import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import fs from "fs";
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });
const raw = JSON.parse(fs.readFileSync("lib/data.json", "utf8"));
function n(v:any){const x=Number(String(v??"").replace(/[^0-9.-]/g,""));return Number.isFinite(x)?x:null}
async function main(){
  for(const o of raw.operators){
    const name=o.operator_name||o.operator_name_raw?.split(" C/O")[0]||"Unknown";
    const op=await db.operator.upsert({where:{dgcaId:Number(o.operator_master_id)},update:{name,aopNumber:o.aop_no||null,phone:o.best_phone||null,email:o.best_email||null,website:o.website||null,address:o.communication_address||null,priority:o.priority||null,charterBusiness:o.charter_business||null,privateJetRelevance:o.private_jet_relevance||null,internationalCapability:o.international_capability||null,operatorType:o.operator_type||null,estimatedActivity:o.estimated_activity||null,revenueFy25:o.revenue_fy25||null,instagram:o.instagram||null,linkedin:o.linkedin||null,decisionMaker:o.decision_maker_y||o.decision_maker_x||null,decisionMakerTitle:o.decision_maker_title_y||o.decision_maker_title_x||null,decisionMakerContact:o.decision_maker_contact_y||o.decision_maker_contact_x||null},create:{dgcaId:Number(o.operator_master_id),name,aopNumber:o.aop_no||null,phone:o.best_phone||null,email:o.best_email||null,website:o.website||null,address:o.communication_address||null,priority:o.priority||null,charterBusiness:o.charter_business||null,privateJetRelevance:o.private_jet_relevance||null,internationalCapability:o.international_capability||null,operatorType:o.operator_type||null,estimatedActivity:o.estimated_activity||null,revenueFy25:o.revenue_fy25||null,instagram:o.instagram||null,linkedin:o.linkedin||null,decisionMaker:o.decision_maker_y||o.decision_maker_x||null,decisionMakerTitle:o.decision_maker_title_y||o.decision_maker_title_x||null,decisionMakerContact:o.decision_maker_contact_y||o.decision_maker_contact_x||null}});
    await db.operatorPricing.upsert({where:{operatorId:op.id},update:{},create:{operatorId:op.id}});
    for(const a of (o.aircraft||[])) if(a.registration){
      const seats=n(a.seating_capacity);
      await db.aircraft.upsert({where:{registration:a.registration},update:{operatorId:op.id,type:a.aircraft_type||null,model:a.model||null,seats},create:{operatorId:op.id,registration:a.registration,type:a.aircraft_type||null,model:a.model||null,seats}});
    }
  }
  console.log(`Seeded ${await db.operator.count()} operators / ${await db.aircraft.count()} aircraft`);
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>db.$disconnect());

import raw from './data.json';
export const operators=raw.operators as any[];
export const aircraft=raw.aircraft as any[];
export function getOperator(id:string){return operators.find(o=>String(o.operator_master_id)===id)}
export function estimatePrice(a:any,from:string,to:string,passengers:number){
 const seats=Number(a.seating_capacity||8); const model=String(a.model||'Business Jet');
 const baseByType:any={Jet:950000,Helicopter:450000,Turboprop:650000,Airliner:1800000};
 const type=String(a.aircraft_type||'Jet'); const base=baseByType[type]||900000;
 const sizeFactor=Math.max(0.8,Math.min(1.8,seats/8));
 const routeFactor=(from.toLowerCase().includes('dubai')||to.toLowerCase().includes('dubai'))?1.55:1;
 const international=(from.toLowerCase().includes('dubai')||to.toLowerCase().includes('dubai')||from.toLowerCase().includes('london')||to.toLowerCase().includes('london'))?1.45:1;
 const buffer=100000 + Math.min(500000,Math.round(seats/2)*25000);
 const total=Math.round((base*sizeFactor*routeFactor*international+buffer)/50000)*50000;
 return {total,seats,model};
}

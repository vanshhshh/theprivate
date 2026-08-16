import { db } from './prisma';
export async function notifyUser(userId:string,title:string,body:string,type:'BOOKING'|'RFQ'|'CLAIM'|'SYSTEM'='SYSTEM'){return db.notification.create({data:{userId,title,body,type}})}
export async function notifyOperator(operatorId:string,title:string,body:string,type:'BOOKING'|'RFQ'|'CLAIM'|'SYSTEM'='SYSTEM'){return db.notification.create({data:{operatorId,title,body,type}})}

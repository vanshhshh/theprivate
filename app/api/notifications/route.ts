import {NextRequest,NextResponse} from 'next/server';import {db} from '@/lib/prisma';import {requireUser,errorResponse} from '@/lib/api';
export async function GET(req:NextRequest){try{const u=await requireUser(req);return NextResponse.json({notifications:await db.notification.findMany({where:{userId:u.id},orderBy:{createdAt:'desc'},take:50})})}catch(e){return errorResponse(e)}}

import { notFound } from '@/server/errors';
import { booking } from '@/server/mobile/dto';
import { mobile, must, preflight } from '@/server/mobile/http';
import { getCustomerBooking } from '@/server/services/bookings';

export const OPTIONS = preflight;

export const GET = mobile<{ ref: string }>({ auth: 'required' }, async ({ params, viewer }) => {
  const b = await getCustomerBooking(must(viewer).user.id, params.ref);
  if (!b) throw notFound('Booking');
  return booking(b);
});

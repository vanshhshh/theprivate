/** Plain-language "what happens next" for each booking state (customer screens). */
export const NEXT_STEP: Record<string, string> = {
  PENDING_OPERATOR_CONFIRMATION: 'The flight partner is checking the crew and aircraft and will confirm shortly. Nothing has been charged.',
  CONFIRMED: 'The flight partner has confirmed your trip. Payment has not been taken yet.',
  PAYMENT_PENDING: 'Your trip is confirmed. We will contact you to arrange payment. It is not paid until we have verified the payment.',
  PAID: 'Payment is verified. The flight partner will share final flight details before departure.',
  IN_PROGRESS: 'Your trip is under way.',
  COMPLETED: 'Trip completed. Thank you for flying with ThePrivate.',
  CANCELLED: 'This booking was cancelled.',
};

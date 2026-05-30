export const MOLLIE_PENDING_STATES = ['mollie-return', 'mollie-embedded-return'] as const
export const SUCCESS_LIKE_CHECKOUT_STATES = ['success', ...MOLLIE_PENDING_STATES] as const
export type CheckoutState = (typeof SUCCESS_LIKE_CHECKOUT_STATES)[number] | 'cancelled'

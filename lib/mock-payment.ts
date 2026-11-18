import {randomUUID} from 'node:crypto';

export type PaymentResult = {ok: true; reference: string} | {ok: false};

/**
 * Stands in for a payment provider. It always succeeds and takes no money.
 * Real payments replace only this function.
 */
export async function chargeMockPayment(): Promise<PaymentResult> {
  return {ok: true, reference: `mock_${randomUUID()}`};
}

export const BATCH_QUANTITIES = [1,2,3,4,5,6,7,8,9,10] as const
export function requireBatchQuantity(quantity: unknown): number {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('Choose a whole number from 1 to 10.')
  }
  return quantity
}

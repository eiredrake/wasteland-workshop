/** Round only a finished valuation, never an input to another calculation. */
export const roundCredits = (value: number): number => Math.ceil(value)
export const formatCreditAmount = (value: number | undefined): string =>
  value === undefined || !Number.isFinite(value) ? 'Unknown' : roundCredits(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
export const formatCredits = (value: number | undefined): string =>
  value === undefined || !Number.isFinite(value) ? 'Unknown' : `${formatCreditAmount(value)}cr`

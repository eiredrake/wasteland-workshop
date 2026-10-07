export const credits = (value: number | undefined) => value === undefined ? 'Unknown' : value.toLocaleString(undefined, { maximumFractionDigits: 4 }) + 'cr'
export function duration(ms: number): string {
  const seconds = Math.max(0,Math.ceil(ms / 1000))
  return [Math.floor(seconds / 3600),Math.floor(seconds / 60) % 60,seconds % 60].map(part => String(part).padStart(2,'0')).join(':')
}

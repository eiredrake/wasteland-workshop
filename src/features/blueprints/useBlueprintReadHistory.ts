import { createContext, useContext } from 'react'
export const BlueprintReadContext = createContext({readIds: [] as number[], markRead: (_id: number) => { void _id }})
export function useBlueprintReadHistory() { return useContext(BlueprintReadContext) }

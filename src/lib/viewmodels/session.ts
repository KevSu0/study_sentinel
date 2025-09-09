export type SessionPoint = { x: string; y: number }
export type TimeSeriesVM = { points: SessionPoint[]; summary?: { totalSeconds: number } }

export type CategorySplitVM = { labels: string[]; values: number[] }

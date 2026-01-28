// Utility: Generate pseudorandom data points for charts
export function generatePseudoRandomData(
    count: number,
    xStart: number,
    xStep: number,
    yMin: number,
    yMax: number,
    seed?: number
): { x: number; y: number }[] {
    // Simple seeded PRNG (Mulberry32)
    let s = seed ?? Date.now()
    function random() {
        s |= 0
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    const data = []
    for (let i = 0; i < count; i++) {
        const x = xStart + i * xStep
        const y = yMin + (yMax - yMin) * random()
        data.push({ x, y })
    }
    return data
}

// Utility: Generate a random walk (starts at 0, each y is previous y + random step)
function generateRandomWalk(
    count: number,
    xStart: number,
    xStep: number,
    stepMin: number,
    stepMax: number,
    seed: number
): { x: number; y: number }[] {
    let s = seed
    function random() {
        s |= 0
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    let y = 0
    const data = []
    for (let i = 0; i < count; i++) {
        const x = xStart + i * xStep
        if (i > 0) {
            y += stepMin + (stepMax - stepMin) * random()
        }
        data.push({ x, y })
    }
    return data
}

// Utility: Generate normal distribution values with gaussian noise
function generateNoisyNormalHistogram(
    count: number,
    xStart: number,
    xStep: number,
    mean: number,
    std: number,
    noiseStd: number,
    seed: number
): { x: number; value: number }[] {
    let s = seed
    function random() {
        s |= 0
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    // Box-Muller transform for gaussian noise
    function gaussian() {
        let u = 0,
            v = 0
        while (u === 0) u = random()
        while (v === 0) v = random()
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    }
    const data = []
    for (let i = 0; i < count; i++) {
        const x = xStart + i * xStep
        // Normal distribution (not normalized)
        const norm = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2))
        // Add gaussian noise
        const noisy = norm + noiseStd * gaussian()
        data.push({ x, value: Math.max(0, Math.round(noisy * 100)) })
    }
    return data
}

export const lineGraphSeries = [
    {
        name: 'Series A',
        data: generateRandomWalk(15, 0, 1, 0, 2, 1),
        color: '#8884d8',
    },
    {
        name: 'Series B',
        data: generateRandomWalk(15, 0, 1, 0, 3, 2),
        color: '#82ca9d',
    },
    {
        name: 'Series C',
        data: generateRandomWalk(15, 0, 1, -1, 2, 3),
        color: '#ff7300',
    },
    {
        name: 'Series D',
        data: generateRandomWalk(15, 0, 1, -2, 2, 4),
        color: '#0088FE',
    },
    {
        name: 'Series E',
        data: generateRandomWalk(15, 0, 1, 0, 1, 5),
        color: '#00C49F',
    },
]

export const histogramBars = generateNoisyNormalHistogram(15, 0, 1, 8, 3, 0.01, 42)

export const scatterPlotData = generatePseudoRandomData(18, 10, 2, 18, 34, 99)

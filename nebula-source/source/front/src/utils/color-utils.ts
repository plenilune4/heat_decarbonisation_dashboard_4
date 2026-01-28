import { useMemo } from 'react'

// Generate a visually distinct array of hex colors for any count
export function useChartColors(count: number): string[] {
    return useMemo(() => {
        if (count <= 0) return []
        // Use HSL color wheel, evenly spaced
        const colors: string[] = []
        const saturation = 65
        const lightness = 55
        for (let i = 0; i < count; i++) {
            // Golden angle for best distribution
            const hue = Math.round((360 * i) / count + ((i * 137.508) % 360))
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`)
        }
        // Convert HSL to hex for recharts compatibility
        return colors.map(hslToHex)
    }, [count])
}

// Helper: Convert HSL to hex
function hslToHex(hsl: string): string {
    // hsl(210, 65%, 55%)
    const match = hsl.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/)
    if (!match) return '#888888'
    const h = Number(match[1])
    const s = Number(match[2]) / 100
    const l = Number(match[3]) / 100
    let r: number, g: number, b: number
    if (s === 0) {
        r = g = b = l // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1
            if (t > 1) t -= 1
            if (t < 1 / 6) return p + (q - p) * 6 * t
            if (t < 1 / 2) return q
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
            return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h / 360 + 1 / 3)
        g = hue2rgb(p, q, h / 360)
        b = hue2rgb(p, q, h / 360 - 1 / 3)
    }
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

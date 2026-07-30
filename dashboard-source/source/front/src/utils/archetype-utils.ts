import {useMemo} from 'react'
import ROUTES from "@/ROUTES";
import {api} from "@/services/api.service";
import {Archetype, ArchetypeNames, Category} from "@/MODELS/caseStudy.model";
const getImageUrl = (filename) => {
  return new URL(`../../archetype images/${filename}`, import.meta.url).href;
};


/**
 * Comment...this may need moving to backend.
 * @param data
 */
export function processArchetypeData(data: string): Archetype[] {
    const atypes: Archetype[] = []
    const headers = data.split('\n')[0].split(',')
    const rowstrings = data.split('\n').slice(1)
    const non_empty_rowstrings = rowstrings.map((l) => l.trim()).filter((l) => l.length > 0)
    const emptyLineCount = rowstrings.length - non_empty_rowstrings.length
    const rows = non_empty_rowstrings.map((r) => r.split(','))

    //there must be a more concise way to use the headers as properties?
    rows.forEach((row) => {
            atypes.push({
                name: row[0] as string,
                display_name: row[1] as string,
                supertype: row[2] as string,
                image: getImageUrl(`${row[3]}.png`),
                bottom_level: row[4] as string,
                kWh_per_GFA: Number(row[5].trim()),
                kWh_per_GFA_stage_1 : Number(row[6].trim()) || null,
                kWh_per_GFA_stage_2 : Number(row[7].trim()) || null,
                kWh_per_GFA_stage_3 : Number(row[8].trim()) || null,
                kWh_per_GFA_stage_4 : Number(row[9].trim()) || null,
            })
        }
    )

    return atypes.filter((a) => (!!a.name))
}

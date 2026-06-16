/**
 * Just checks whether two bounding boxes overlap!
 * @param a
 * @param b
 */
export function bboxOverlaps(
    a: number[],
    b: number[]
): boolean {
    return !(
        a[2] < b[0] ||
        a[0] > b[2] ||
        a[3] < b[1] ||
        a[1] > b[3]
    );
}
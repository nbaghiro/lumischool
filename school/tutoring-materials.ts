import ten from "../content/curriculum/teaching/making-ten.json" with { type: "json" };
import reading from "../content/curriculum/teaching/reading-clues.json" with { type: "json" };
import food from "../content/curriculum/teaching/food-chains.json" with { type: "json" };
import { readTeachingMaterial, type TeachingMaterial } from "../engine/teaching";

export const TEACHING_MATERIALS: readonly TeachingMaterial[] = [ten, reading, food].map((raw) => {
    const material = readTeachingMaterial(raw);
    if (!material) throw new Error("Invalid teaching material");
    return material;
});
export const teachingMaterial = (id: string): TeachingMaterial | null =>
    TEACHING_MATERIALS.find((m) => m.id === id) ?? null;
export function teachingForLesson(
    id: string,
    skills: readonly string[] = [],
): TeachingMaterial | null {
    return (
        TEACHING_MATERIALS.find((m) => m.lessonIds.includes(id) || skills.includes(m.skill)) ?? null
    );
}

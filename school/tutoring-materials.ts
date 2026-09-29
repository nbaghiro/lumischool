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
/**
 * The material written for a lesson, by the lesson ids it names. It is not matched by skill, since a
 * skill recurs in later grades that the material's frames were not written for.
 */
export const teachingForLesson = (id: string): TeachingMaterial | null =>
    TEACHING_MATERIALS.find((m) => m.lessonIds.includes(id)) ?? null;

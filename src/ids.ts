import { thingIdFromLearnableId } from "memrise";
import type {
	CourseLevel,
	Learnable,
	LevelThing,
	MemriseThing,
} from "memrise/dist/types";

export interface NormalizedLevel {
	levelId: number;
	courseId: number;
	poolId: number;
	learnableIds: number[];
	index: number;
	kind: number;
	title: string;
}

export interface NormalizedLearnable {
	learnableId: number;
	thingId: number;
	learningElement: string;
	definitionElement: string;
	itemType: string;
	difficulty: string;
}

export interface NormalizedThing {
	thingId: number;
	poolId: number;
	columns: Record<string, unknown>;
	attributes: Record<string, unknown>;
}

export interface NormalizedLevelThing {
	thingId: number;
	learnableId: number;
	learningElement: string;
	definitionElement: string;
	itemType: string;
	difficulty: string;
}

export interface NormalizedSearchHit {
	thingId: number;
	columns: Record<string, { val: string }>;
}

export const LEVEL_ID_HINT =
	"levelId is a large number from levels_list, not a small position like 1 or 2.";

export function normalizeLevel(level: CourseLevel): NormalizedLevel {
	return {
		levelId: level.id,
		courseId: level.course_id,
		poolId: level.pool_id,
		learnableIds: level.learnable_ids ?? [],
		index: level.index,
		kind: level.kind,
		title: level.title,
	};
}

export function normalizeLearnable(learnable: Learnable): NormalizedLearnable {
	return {
		learnableId: learnable.id,
		thingId: thingIdFromLearnableId(learnable.id),
		learningElement: learnable.learning_element,
		definitionElement: learnable.definition_element,
		itemType: learnable.item_type,
		difficulty: learnable.difficulty,
	};
}

export function normalizeThing(thing: MemriseThing): NormalizedThing {
	return {
		thingId: thing.id,
		poolId: thing.pool_id,
		columns: thing.columns,
		attributes: thing.attributes,
	};
}

export function normalizeLevelThing(thing: LevelThing): NormalizedLevelThing {
	return { ...thing };
}

export function normalizeSearchHit(hit: {
	id: number;
	columns: Record<string, { val: string }>;
}): NormalizedSearchHit {
	return { thingId: hit.id, columns: hit.columns };
}

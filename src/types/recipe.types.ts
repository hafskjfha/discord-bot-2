export type Recipe = {
    name: string;
    group: "ingredient" | "normal" | "advanced";
    materials: { name: string, amount: number }[];
    result: string;
    /** 제작 시간 (분) */
    time: number;
    /** 이 아이템을 재료로 사용하는 결과물(또는 레시피) 리스트 */
    usedIn?: string[];
};
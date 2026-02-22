import { Recipe } from "@/types/recipe.types.js";

export const recipes: Recipe[] = [
    {
        name: "압축 밀",
        group: "ingredient",
        materials: [
            { name: "밀", amount: 64 }
        ],
        result: "압축 밀",
        time: 0,
        usedIn: ["당근 케이크", "모듬 초밥", "가재구이", "감자 튀김", "새우 튀김"],
    },
    {
        name: "고품질 압축 밀",
        group: "ingredient",
        materials: [
            { name: "고품질 밀", amount: 32 }
        ],
        result: "고품질 압축 밀",
        time: 0,
        usedIn: ["토마토 파스타", "속이 꽉 찬 버거", "과일 케이크"],
    },
    {
        name: "압축 당근",
        group: "ingredient",
        materials: [
            { name: "당근", amount: 64 }
        ],
        result: "압축 당근",
        time: 0,
        usedIn: ["당근 케이크"],
    },
    {
        name: "고품질 압축 당근",
        group: "ingredient",
        materials: [
            { name: "고품질 당근", amount: 32 }
        ],
        result: "고품질 압축 당근",
        time: 0,
        usedIn: ["속이 꽉 찬 버거"],
    },
    {
        name: "압축 감자",
        group: "ingredient",
        materials: [
            { name: "감자", amount: 64 }
        ],
        result: "압축 감자",
        time: 0,
        usedIn: ["피쉬 앤 칩스", "감자 튀김"],
    },
    {
        name: "고품질 압축 감자",
        group: "ingredient",
        materials: [
            { name: "고품질 감자", amount: 32 }
        ],
        result: "고품질 압축 감자",
        time: 0,
    },
    {
        name: "압축 비트",
        group: "ingredient",
        materials: [
            { name: "비트", amount: 64 },
        ],
        result: "압축 비트",
        time: 0,
    },
    {
        name: "고품질 압축 비트",
        group: "ingredient",
        materials: [
            { name: "고품질 비트", amount: 32 },
        ],
        result: "고품질 압축 비트",
        time: 0,
        usedIn: ["속이 꽉 찬 버거", "악어 꼬치 구이"],
    },
    {
        name: "달콤한 설탕",
        group: "ingredient",
        materials: [
            { name: "사탕수수", amount: 64 },
        ],
        result: "달콤한 설탕",
        time: 0,
        usedIn: ["당근 케이크"],
    },
    {
        name: "고품질 설탕",
        group: "ingredient",
        materials: [
            { name: "고품질 사탕수수", amount: 32 },
        ],
        result: "고품질 설탕",
        time: 0,
        usedIn: ["토마토 파스타", "짭짤 달콤한 팝콘", "속이 꽉 찬 버거", "과일 케이크"],
    },
    {
        name: "소형 체력 포션",
        group: "normal",
        materials: [
            { name: "그루트의 나무 뿌리", amount: 1 },
            { name: "선인장 꽃(Cactus Flower)", amount: 10 },
        ],
        result: "소형 체력 포션",
        time: 20,
    },
    {
        name: "중형 체력 포션",
        group: "normal",
        materials: [
            { name: "수호곰의 뿔", amount: 1 },
            { name: "그루트의 나무 뿌리", amount: 2 },
        ],
        result: "중형 체력 포션",
        time: 40,
    },
    {
        name: "당근 케이크",
        group: "normal",
        materials: [
            { name: "압축 밀", amount: 6 },
            { name: "압축 당근", amount: 4 },
            { name: "달콤한 설탕", amount: 2 },
        ],
        result: "당근 케이크",
        time: 40,
    },
    {
        name: "모듬 초밥",
        group: "normal",
        materials: [
            { name: "생선 살", amount: 32 },
            { name: "소금", amount: 8 },
            { name: "압축 밀", amount: 6 }
        ],
        result: "모듬 초밥",
        time: 40,
    },
    {
        name: "피쉬 앤 칩스",
        group: "normal",
        materials: [
            { name: "생선 살", amount: 32 },
            { name: "소금", amount: 8 },
            { name: "압축 감자", amount: 6 }
        ],
        result: "피쉬 앤 칩스",
        time: 40,
    },
    {
        name: "참치 캔",
        group: "normal",
        materials: [
            { name: "참다랑어", amount: 8 },
            { name: "찌그러진깡통", amount: 16 },
        ],
        result: "참치 캔",
        time: 40,
    },
    {
        name: "타코야끼",
        group: "normal",
        materials: [
            { name: "문어", amount: 10 },
            { name: "고품질 밀", amount: 6 },
            { name: "소금", amount: 10 },
        ],
        result: "타코야끼",
        time: 40,
    },
    {
        name: "가재구이",
        group: "normal",
        materials: [
            { name: "가재", amount: 10 },
            { name: "압축 밀", amount: 6 },
            { name: "소금", amount: 6 },
        ],
        result: "가재구이",
        time: 40,
    },
    {
        name: "감자 튀김",
        group: "normal",
        materials: [
            { name: "압축 감자", amount: 6 },
            { name: "압축 밀", amount: 4 },
            { name: "소금", amount: 8 },
        ],
        result: "감자 튀김",
        time: 40,
    },
    {
        name: "새우 튀김",
        group: "normal",
        materials: [
            { name: "새우", amount: 10 },
            { name: "압축 밀", amount: 6 },
            { name: "소금", amount: 8 },
        ],
        result: "새우 튀김",
        time: 40,
    },
    {
        name: "토마토 파스타",
        group: "advanced",
        materials: [
            { name: "토마토", amount: 32 },
            { name: "고품질 압축 밀", amount: 6 },
            { name: "고품질 설탕", amount: 6 },
        ],
        result: "토마토 파스타",
        time: 120,
    },
    {
        name: "짭짤 달콤한 팝콘",
        group: "advanced",
        materials: [
            { name: "옥수수", amount: 32 },
            { name: "소금", amount: 12 },
            { name: "고품질 설탕", amount: 12 },
        ],
        result: "짭짤 달콤한 팝콘",
        time: 120,
    },
    {
        name: "속이 꽉 찬 버거",
        group: "advanced",
        materials: [
            { name: "고품질 압축 밀", amount: 6 },
            { name: "고품질 설탕", amount: 6 },
            { name: "고품질 압축 비트", amount: 6 },
            { name: "고품질 압축 당근", amount: 6 },
            { name: "토마토", amount: 32 },
            { name: "소금", amount: 8 },
        ],
        result: "속이 꽉 찬 버거",
        time: 120,
    },
    {
        name: "악어 꼬치 구이",
        group: "advanced",
        materials: [
            { name: "악어 고기", amount: 3 },
            { name: "고품질 압축 비트", amount: 8 },
            { name: "소금", amount: 8 },
        ],
        result: "악어 꼬치 구이",
        time: 120,
    },
    {
        name: "과일 케이크",
        group: "advanced",
        materials: [
            { name: "포도", amount: 16 },
            { name: "딸기", amount: 32 },
            { name: "고품질 압축 밀", amount: 5 },
            { name: "고품질 설탕", amount: 5 },
        ],
        result: "과일 케이크",
        time: 120,
    }

]
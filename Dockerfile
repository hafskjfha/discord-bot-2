# --- 1단계: 빌드 스테이지 (Build Stage) ---
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치를 위해 패키지 파일 복사
COPY package*.json ./
# 빌드 도구(TypeScript 등)를 포함한 모든 모듈 설치
RUN npm install

# 소스 코드 전체 복사
COPY . .

# TypeScript 빌드 실행 (tsconfig.json 설정에 따라 dist 폴더 생성)
RUN npm run build

# ===================================== #
# --- 2단계: 실행 스테이지 (Run Stage) ---
FROM node:20-alpine

WORKDIR /app

# 실행에 필요한 최소한의 파일만 복사
COPY package*.json ./

# 배포(Production)용 라이브러리만 설치 (devDependencies 제외)
RUN npm install --production

# 1단계(builder)에서 생성된 빌드 결과물(dist)만 가져오기
COPY --from=builder /app/dist ./dist

# 봇 실행
CMD ["node", "dist/index.js"]
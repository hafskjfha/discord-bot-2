# Discord Bot

이 프로젝트는 TypeScript와 Discord.js를 사용하여 제작된 다기능 디스코드 봇입니다. 다양한 상호작용과 커뮤니티 기능을 제공하여 사용자 경험을 향상시키는 것을 목표로 합니다.

## ✨ 주요 기능

이 봇은 다음과 같은 다양한 기능을 제공합니다.

-   **경매**: 사용자들이 아이템을 등록하고 실시간으로 입찰할 수 있는 경매 시스템입니다.
-   **주사위**: 간단한 주사위 굴리기 기능입니다.
-   **추첨**: 랜덤으로 N명을 뽑는 기능입니다.
-   **가위바위보**: 다른 유저와 가위바위보 게임을 즐길 수 있습니다.
-   **핑퐁**: 봇의 응답 속도를 확인할 수 있는 간단한 명령어입니다.
-   **레시피**: 특정 아이템의 레시피 정보를 찾아볼 수 있습니다.
-   **거래**: 사용자 간에 아이템을 교환할 수 있는 거래 시스템입니다.
-   **환영 메시지**: 새로운 서버 멤버에게 자동으로 환영 인사를 보냅니다.

## 🛠️ 기술 스택

-   **언어**: TypeScript
-   **프레임워크**: Node.js
-   **라이브러리**:
    -   `discord.js` v14
    -   `better-sqlite3`
    -   `dotenv`
-   **개발 도구**:
    -   `tsx`
    -   `typescript`
-   **배포**: Docker

## 🚀 시작하기

### 사전 준비

-   [Node.js](https://nodejs.org/) (v20 이상 권장)
-   [Docker](https://www.docker.com/) (선택 사항)

### 설치 및 실행

1.  **저장소 복제**

    ```bash
    git clone https://github.com/hafskjfha/discord-bot-2.git
    cd discord-bot-2
    ```

2.  **의존성 설치**

    ```bash
    npm install
    ```

3.  **환경 변수 설정**

    프로젝트 루트에 `.env` 파일을 생성하고 디스코드 봇 토큰을 추가합니다.

    ```
    DISCORD_TOKEN=여러분의_디스코드_봇_토큰
    ```

4.  **슬래시 커맨드 배포**

    봇을 서버에 추가한 후, 다음 명령어를 실행하여 슬래시 커맨드를 등록합니다.

    ```bash
    npm run deploy
    ```

5.  **봇 실행**

    -   **개발 모드 (실시간 리로드)**

        ```bash
        npm run dev
        ```

    -   **프로덕션 모드**

        ```bash
        npm run build
        npm run start
        ```

### Docker로 실행하기

Docker를 사용하여 봇을 컨테이너 환경에서 실행할 수 있습니다.

1.  **Docker 이미지 빌드**

    ```bash
    docker build -t discord-bot-2 .
    ```

2.  **Docker 컨테이너 실행**

    `docker compose up -d` 명령어를 사용하여 컨테이너를 백그라운드에서 실행합니다.

    ```bash
    docker compose up -d
    ```
    자세한건 `docker-compose.yml` 파일을 참고해주세요.

## 📁 프로젝트 구조

```
.
├── Dockerfile
├── docker-compose.yml
├── package.json
├── readme.md
├── tsconfig.json
└── src
    ├── client.ts
    ├── deploy-commands.ts
    ├── index.ts
    ├── commands
    │   ├── auction.ts
    │   ├── dice.ts
    │   ├── drawing.ts
    │   ├── gawibawibo.ts
    │   ├── index.ts
    │   ├── ping.ts
    │   ├── recipe.ts
    │   ├── trade.ts
    │   └── welcome-message.ts
    ├── data
    │   └── recipe.ts
    ├── db
    │   └── index.ts
    ├── lib
    │   ├── trade-db.ts
    │   └── welcome-db.ts
    └── types
        ├── recipe.types.ts
        └── types.ts
```

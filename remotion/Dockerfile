FROM node:22-bookworm-slim

# Chrome Headless Shell 실행용 라이브러리 + 한글/이모지 폰트
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
      fonts-noto-cjk fonts-noto-color-emoji ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npx remotion browser ensure
COPY . .

ENV PORT=3000 DATA_DIR=/data NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.mjs"]

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

EXPOSE 3000 3001

CMD ["npx", "tsx", "src/index.ts"]

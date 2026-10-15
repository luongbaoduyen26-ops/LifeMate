FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node server ./server
COPY --chown=node:node index.html app.js account.js cloud.js config.js style.css ./
USER node
EXPOSE 3000
CMD ["npm", "start"]

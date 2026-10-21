FROM public.ecr.aws/docker/library/node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM public.ecr.aws/docker/library/node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_GA_ID=""
ARG NEXT_PUBLIC_IMAGE_HOSTS=""
ARG SITE_URL=""
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_IMAGE_HOSTS=$NEXT_PUBLIC_IMAGE_HOSTS \
    SITE_URL=$SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

FROM public.ecr.aws/docker/library/node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app ./
COPY --chown=node:node deploy/store-entrypoint.sh /usr/local/bin/store-entrypoint.sh
RUN chmod +x /usr/local/bin/store-entrypoint.sh && mkdir -p .next/cache uploads && chown -R node:node .next/cache uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.status<500||r.status===503?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["store-entrypoint.sh"]
CMD ["npm", "run", "start"]

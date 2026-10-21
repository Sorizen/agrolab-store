FROM public.ecr.aws/docker/library/postgres:17-alpine
RUN apk add --no-cache aws-cli bash curl tzdata
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh && echo "30 3 * * * /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
ENV TZ=Europe/Kyiv
CMD ["crond", "-f", "-l", "8"]

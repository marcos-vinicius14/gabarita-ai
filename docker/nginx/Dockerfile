FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY brazilian-ips.conf /etc/nginx/brazilian-ips.conf
RUN mkdir -p /var/log/nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080 8443

CMD ["nginx", "-g", "daemon off;"]

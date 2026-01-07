# Guia do Nginx - Gabarita AI

Este documento fornece informações detalhadas sobre a configuração do Nginx como API Gateway no projeto Gabarita AI.

## Visão Geral

O Nginx atua como API Gateway, fornecendo:
- **Geographic IP Restriction**: Acesso restrito apenas a IPs brasileiros
- **Rate Limiting**: Proteção contra abuso de API
- **Connection Limiting**: Prevenção de esgotamento de recursos
- **Reverse Proxy**: Roteamento para aplicação Nuxt
- **Security Headers**: Headers de segurança (CORS, CSP, etc.)
- **Logging**: Logs estruturados em JSON

## Arquitetura

```
Cliente (Brasil) → Nginx (porta 80/443) → Nuxt App (porta 3000 interna) → PostgreSQL
```

A aplicação Nuxt não é mais exposta diretamente. Todo o tráfego passa pelo Nginx.

## Restrição Geográfica (Geo-Blocking)

### Como Funciona

O Nginx está configurado para **permitir acesso apenas de IPs brasileiros**. Qualquer requisição de IPs fora do Brasil receberá um erro 403 (Forbidden).

### Ranges de IP Brasileiros

Os ranges de IP estão definidos em [`docker/nginx/brazilian-ips.conf`](file:///home/marcos/Projects/gabarita-ai/docker/nginx/brazilian-ips.conf) e incluem:
- Principais ISPs brasileiras (200.x.x.x, 201.x.x.x, 186.x.x.x, etc.)
- Redes privadas e localhost (para desenvolvimento)

### Atualizar Lista de IPs

Para adicionar ou remover ranges de IP:

1. Edite `docker/nginx/brazilian-ips.conf`:
```nginx
# Adicionar novo range
192.0.2.0/24;
```

2. Reconstrua o container:
```bash
docker compose up -d --build nginx
```

### Obter Lista Completa de IPs Brasileiros

Para uma lista mais completa e atualizada:

```bash
# Download da lista agregada do Brasil (ipdeny.com)
wget https://www.ipdeny.com/ipblocks/data/aggregated/br-aggregated.zone

# Converter para formato Nginx (adicionar ; no final de cada linha)
sed 's/$/;/' br-aggregated.zone > docker/nginx/brazilian-ips.conf

# Adicionar redes de desenvolvimento no início do arquivo
echo -e "127.0.0.0/8;\n10.0.0.0/8;\n172.16.0.0/12;\n192.168.0.0/16;" | cat - docker/nginx/brazilian-ips.conf > temp && mv temp docker/nginx/brazilian-ips.conf
```

### Logs de Bloqueio Geográfico

Acessos bloqueados são registrados em log separado:

```bash
# Ver IPs bloqueados
docker exec gabarita_nginx cat /var/log/nginx/geo-blocked.log

# Contar bloqueios por IP
docker exec gabarita_nginx cat /var/log/nginx/geo-blocked.log | grep -o '"remote_addr":"[^"]*"' | sort | uniq -c | sort -rn
```

### Erro 403 - Geo Blocked

**Resposta JSON**:
```json
{
  "error": "Access denied. This service is only available in Brazil.",
  "code": "GEO_BLOCKED",
  "message_pt": "Acesso negado. Este serviço está disponível apenas no Brasil."
}
```

### Desabilitar Geo-Blocking (Desenvolvimento)

Se precisar desabilitar temporariamente:

1. Comente o bloco de verificação em `nginx.conf`:
```nginx
# if ($allowed_country = 0) {
#     access_log /var/log/nginx/geo-blocked.log json_combined;
#     return 403;
# }
```

2. Recarregue a configuração:
```bash
docker exec gabarita_nginx nginx -s reload
```

## Configurações de Rate Limiting

### Zonas Configuradas

| Zona | Limite | Burst | Aplicação |
|------|--------|-------|-----------|
| `api_limit` | 100 req/min | 20 | Endpoints gerais da API |
| `upload_limit` | 10 req/min | 3 | Upload de PDFs |
| `auth_limit` | 20 req/min | 5 | Login/Register |
| `ws_limit` | 50 conexões | - | WebSocket |
| `conn_limit` | 20 conexões | - | Global por IP |

### Como Funciona

- **Rate**: Limite de requisições por minuto
- **Burst**: Requisições extras permitidas em rajadas curtas
- **nodelay**: Processa burst imediatamente sem delay

### Ajustando Limites

Edite `/docker/nginx/nginx.conf`:

```nginx
# Exemplo: Aumentar limite de API para 200 req/min
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/m;
```

Após alterar, reconstrua o container:
```bash
docker compose up -d --build nginx
```

## Endpoints e Rate Limits

### Autenticação (20 req/min)
- `POST /api/auth/login`
- `POST /api/auth/register`

### Uploads (10 req/min)
- `POST /api/decks`
- `POST /api/uploads`

### API Geral (100 req/min)
- Todos os outros endpoints `/api/*`

### WebSocket (50 conexões simultâneas)
- `/ws`

### Sem Rate Limit
- Assets estáticos (`.js`, `.css`, `.png`, etc.)
- `/health` (health check)

## Logs

### Localização
- **Access Logs**: `/var/log/nginx/access.log` (formato JSON)
- **Error Logs**: `/var/log/nginx/error.log`

### Visualizar Logs

```bash
# Logs em tempo real
docker compose logs -f nginx

# Logs de acesso (JSON)
docker exec gabarita_nginx cat /var/log/nginx/access.log

# Filtrar por status code
docker exec gabarita_nginx cat /var/log/nginx/access.log | grep '"status":429'

# Logs de erro
docker exec gabarita_nginx cat /var/log/nginx/error.log
```

### Formato JSON

```json
{
  "time_local": "06/Jan/2026:20:56:00 -0300",
  "remote_addr": "172.18.0.1",
  "request": "GET /api/health HTTP/1.1",
  "status": 200,
  "body_bytes_sent": 123,
  "request_time": 0.045,
  "http_referrer": "",
  "http_user_agent": "Mozilla/5.0...",
  "upstream_response_time": "0.043",
  "upstream_addr": "172.18.0.3:3000"
}
```

## Monitoramento

### Health Check

```bash
curl http://localhost/health
# Resposta: healthy
```

### Nginx Status

```bash
curl http://localhost/nginx_status
```

Retorna métricas como:
- Active connections
- Requests per second
- Reading/Writing/Waiting connections

**Nota**: Em produção, restrinja acesso a este endpoint.

## Troubleshooting

### Erro 429 - Too Many Requests

**Causa**: Rate limit excedido

**Solução**:
1. Verifique se é tráfego legítimo
2. Se necessário, aumente os limites em `nginx.conf`
3. Considere implementar autenticação para limites por usuário

### Erro 502 - Bad Gateway

**Causa**: Nginx não consegue conectar ao Nuxt

**Solução**:
```bash
# Verificar se app está rodando
docker compose ps

# Ver logs do app
docker compose logs app

# Reiniciar serviços
docker compose restart app nginx
```

### Erro 503 - Service Unavailable

**Causa**: Aplicação Nuxt está sobrecarregada ou fora do ar

**Solução**:
```bash
# Verificar recursos do container
docker stats gabarita_app

# Reiniciar aplicação
docker compose restart app
```

### Upload Falha com Timeout

**Causa**: Arquivo muito grande ou upload lento

**Solução**:
1. Verifique `client_max_body_size` em `nginx.conf` (padrão: 50M)
2. Aumente timeouts para uploads se necessário:
```nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

## Segurança

### Headers Configurados

- `X-Frame-Options: SAMEORIGIN` - Previne clickjacking
- `X-Content-Type-Options: nosniff` - Previne MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Proteção XSS
- `Referrer-Policy: strict-origin-when-cross-origin` - Controle de referrer
- `Access-Control-Allow-Origin: *` - CORS (ajustar em produção)

### Recomendações para Produção

1. **SSL/TLS**: Configure certificados HTTPS
2. **CORS**: Restrinja origins permitidos
3. **Rate Limiting por Usuário**: Implemente limites baseados em token JWT
4. **WAF**: Considere adicionar ModSecurity
5. **DDoS Protection**: Use Cloudflare ou similar

## SSL/TLS (Produção)

### Configuração Básica

```nginx
server {
    listen 443 ssl http2;
    server_name gabarita.ai;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... resto da configuração
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name gabarita.ai;
    return 301 https://$server_name$request_uri;
}
```

### Let's Encrypt

```bash
# Instalar certbot
docker exec -it gabarita_nginx sh
apk add certbot

# Obter certificado
certbot certonly --webroot -w /var/www/html -d gabarita.ai
```

## Adicionando Novos Endpoints

### Exemplo: Endpoint com Rate Limit Customizado

```nginx
# Criar nova zona
limit_req_zone $binary_remote_addr zone=custom_limit:10m rate=50r/m;

# Aplicar ao endpoint
location /api/custom {
    limit_req zone=custom_limit burst=10 nodelay;
    limit_req_status 429;
    
    proxy_pass http://nuxt_app;
    # ... headers e timeouts
}
```

## Performance

### Otimizações Implementadas

- **Gzip Compression**: Reduz tamanho de respostas
- **Keepalive**: Reutiliza conexões TCP
- **Caching**: Assets estáticos com cache de 1 ano
- **Buffering**: Desabilitado para uploads (streaming)

### Tuning

Para alto tráfego, ajuste em `nginx.conf`:

```nginx
events {
    worker_connections 2048;  # Aumentar conexões
    use epoll;
}

http {
    keepalive_timeout 30;  # Ajustar timeout
    
    upstream nuxt_app {
        server app:3000 max_fails=3 fail_timeout=30s;
        keepalive 64;  # Aumentar keepalive
    }
}
```

## Métricas e Alertas

### Métricas Importantes

1. **Taxa de 429 (Rate Limit)**: Indica se limites estão adequados
2. **Taxa de 502/503**: Indica problemas na aplicação
3. **Request Time**: Performance da aplicação
4. **Upstream Response Time**: Latência do Nuxt

### Exportar para Prometheus

Considere usar [nginx-prometheus-exporter](https://github.com/nginxinc/nginx-prometheus-exporter) para integração com Prometheus/Grafana.

## Comandos Úteis

```bash
# Iniciar serviços
docker compose up -d

# Ver logs do Nginx
docker compose logs -f nginx

# Recarregar configuração (sem downtime)
docker exec gabarita_nginx nginx -s reload

# Testar configuração
docker exec gabarita_nginx nginx -t

# Verificar versão
docker exec gabarita_nginx nginx -v

# Acessar shell do container
docker exec -it gabarita_nginx sh

# Rebuild após mudanças
docker compose up -d --build nginx
```

## Referências

- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Nginx Security Headers](https://www.nginx.com/blog/hardening-nginx-security/)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

# Landing page estática da AcadMeta servida por nginx (imagem leve Alpine).
FROM nginx:1.27-alpine

# Configuração do nginx (gzip, cache de assets, no-cache no HTML/reviews)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Arquivos do site (apenas o necessário para servir)
COPY index.html /usr/share/nginx/html/
COPY reviews.json /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets

EXPOSE 80

# Verifica se o nginx está respondendo
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

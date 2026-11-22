# Debian slim (not alpine): yfinance's wheels (pandas, curl_cffi) need glibc.
FROM node:24-slim
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv
ENV UV_CACHE_DIR=/opt/uv/cache UV_PYTHON_INSTALL_DIR=/opt/uv/python
# Real Market intraday runs scripts/read-intraday.py through uv; bake Python and its packages into the image.
RUN uv run --no-project --with yfinance==1.8.0 --with exchange-calendars python -c "import yfinance, exchange_calendars"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]

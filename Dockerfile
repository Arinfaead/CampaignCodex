FROM python:3.12-slim

WORKDIR /app
ARG VERSION=1.0.0

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY static ./static

ENV PORT=8080
ENV CAMPAIGN_CODEX_VERSION=${VERSION}
EXPOSE 8080

CMD ["python", "app/server.py"]

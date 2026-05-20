FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY static ./static

ENV PORT=8080
EXPOSE 8080

VOLUME ["/app/data"]

CMD ["python", "app/server.py"]

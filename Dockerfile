FROM node:24-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY requirements.txt ./

RUN python3 -m pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY . .

CMD ["node", "index.js"]
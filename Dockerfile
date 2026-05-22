FROM node:18
WORKDIR /app
COPY package*.json ./
# Tenta baixar de um servidor alternativo (Yarn Registry)
RUN npm config set registry https://registry.yarnpkg.com/
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
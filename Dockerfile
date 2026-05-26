# ---------------------------------------------------
# Estágio 1: Builder (Prepara as dependências)
# ---------------------------------------------------
    FROM node:18-alpine AS builder

    WORKDIR /app
    
    # Copia apenas os arquivos de dependência primeiro
    COPY package*.json ./
    
    # Instala todas as dependências (sem omitir devDependencies)
    RUN npm install
    
    # ---------------------------------------------------
    # Estágio 2: Imagem Final (Enxuta e segura)
    # ---------------------------------------------------
    FROM node:18-alpine
    
    ENV NODE_ENV=production
    
    USER node
    
    WORKDIR /app
    
    # Copia os arquivos de configuração
    COPY --chown=node:node package*.json ./
    
    # Copia os node_modules do estágio "builder"
    COPY --chown=node:node --from=builder /app/node_modules ./node_modules
    
    # Copia o restante do código da aplicação
    COPY --chown=node:node . .
    
    # Comando para iniciar a aplicação
    CMD ["npm", "start"]
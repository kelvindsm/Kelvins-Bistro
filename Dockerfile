# ---------------------------------------------------
# Estágio 1: Builder (Prepara as dependências)
# ---------------------------------------------------
    FROM node:22-alpine AS builder

    WORKDIR /app
    
    # Copia apenas os arquivos de dependência primeiro
    COPY package*.json ./
    
    # Instala todas as dependências (necessário caso precise compilar algo)
    RUN npm install
    
    # Copia o restante do código para o builder (caso precise rodar algum build/transpilação)
    COPY . .
    
    # CRUCIAL: Remove as devDependencies, deixando apenas o que é de produção
    RUN npm prune --production
    
    
    # ---------------------------------------------------
    # Estágio 2: Imagem Final (Enxuta e segura)
    # ---------------------------------------------------
    FROM node:22-alpine
    
    ENV NODE_ENV=production
    
    # Define o diretório de trabalho
    WORKDIR /app
    
    # Altera a permissão da pasta de trabalho para o usuário 'node' antes de alternar
    RUN chown node:node /app
    
    # Define o usuário seguro (não-root)
    USER node
    
    # Copia os arquivos de configuração com as permissões corretas
    COPY --chown=node:node package*.json ./
    
    # Copia os node_modules "podados" (apenas produção) do estágio builder
    COPY --chown=node:node --from=builder /app/node_modules ./node_modules
    
    # Copia o restante dos arquivos da aplicação (incluindo as pastas 'img', 'views', etc.)
    COPY --chown=node:node . .
    
    # Comando para iniciar a aplicação direto pelo Node (substitua pelo seu arquivo principal se não for index.js)
    CMD ["node", "index.js"]
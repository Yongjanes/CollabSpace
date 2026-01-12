# 1. Base image
FROM node:22

# 2. Set working directory
WORKDIR /app

# 3. Copy package files
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy source code
COPY . .

# 6. Expose port
EXPOSE 8000

# 7. Start server
CMD ["npm", "start"]

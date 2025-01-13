FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source files
COPY . .

# Expose the port the app runs on
EXPOSE 80

# Start the application
CMD ["node", "app.js"]

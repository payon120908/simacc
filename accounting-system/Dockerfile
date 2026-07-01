# Use the official lightweight Nginx image based on Alpine Linux
FROM nginx:alpine

# Copy all static web files into the default Nginx public directory
COPY . /usr/share/nginx/html

# Expose port 80 for web traffic
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]

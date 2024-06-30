#!/bin/bash

# Check if OpenAI key is provided
if [ -z "$1" ]; then
    echo "Please provide your OpenAI API key as the first argument"
    exit 1
fi

# Check if data directory is provided
if [ -z "$2" ]; then
    echo "Please provide the path to your data directory as the second argument"
    exit 1
fi

# Define a static container name
CONTAINER_NAME="langchain-chat-container"

# Build the Docker image if it doesn't exist locally
if ! docker image inspect langchain-local-chat >/dev/null 2>&1; then
    echo "Building Docker image..."
    docker build -t langchain-local-chat .
fi

# Run the Docker container
docker run -d \
    --name $CONTAINER_NAME \
    -p 4004:4004 \
    -e OPENAI_API_KEY=$1 \
    -e DATA_DIRECTORY=/data \
    -v $2:/data \
    langchain-local-chat

echo "Container started with name: $CONTAINER_NAME"
echo "You can stop it with: docker stop $CONTAINER_NAME"
echo "You can start it again with: docker start $CONTAINER_NAME"
echo "You can remove it with: docker rm $CONTAINER_NAME"

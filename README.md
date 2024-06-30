# LangChain Local Chat

This project is a simple LangChain application that allows chatting with local data using OpenAI's language models.

## Prerequisites

- Docker installed on your machine
- OpenAI API key

## Quick Start

1. Clone this repository:

   ```
   git clone https://github.com/your-username/langchain-local-chat.git
   cd langchain-local-chat
   ```

2. Build the Docker image:

   ```
   docker build -t langchain-local-chat .
   ```

3. Run the application:

   ```
   chmod +x run.sh
   ./run.sh YOUR_OPENAI_API_KEY /path/to/your/data/directory
   ```

4. Open your web browser and navigate to `http://localhost:4004` to start chatting!

## Managing the Docker Container

When you run the application, you'll see output like this:

```
Container started with name: langchain-chat-1629384756
You can stop it with: docker stop langchain-chat-1629384756
You can start it again with: docker start langchain-chat-1629384756
You can remove it with: docker rm langchain-chat-1629384756
```

Use these commands to manage your container:

- To stop the container: `docker stop langchain-chat-1629384756`
- To start a stopped container: `docker start langchain-chat-1629384756`
- To remove the container: `docker rm langchain-chat-1629384756`

Replace `langchain-chat-1629384756` with the actual name of your container.

## Configuration

The application uses the following environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key
- `DATA_DIRECTORY`: The directory containing your text files for the chat to use

These are set automatically when you use the `run.sh` script.

## Security Note

This application is a MVP and may not be suitable for production use without further security enhancements. Always review and enhance security measures before deploying in a production environment.

## License

[ISC](https://choosealicense.com/licenses/isc/)

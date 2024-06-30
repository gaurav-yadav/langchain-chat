# LangChain Local Chat

This project is a simple LangChain application that allows chatting with local data using OpenAI's language models.

## Setup

1. Clone the repository
2. Install dependencies: `yarn install`
3. Set up your environment variables in a `.env` file:
   ```
   DATA_DIRECTORY=/path/to/your/text/files
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Build the project: `yarn build`
5. Start the server: `yarn start`

## Usage

Send POST requests to `http://localhost:4004/chat` with a JSON body containing `question` and `history` fields to interact with your local data.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[ISC](https://choosealicense.com/licenses/isc/)

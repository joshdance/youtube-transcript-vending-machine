# YouTube Transcript Vending Machine

This application allows you to extract transcripts from YouTube videos using multiple provider options (Supadata, YouTube Transcript API, or Oxylabs).

## Features

- Simple interface to input YouTube video URLs
- Extract video transcripts using configurable providers
- View metadata and transcript content
- Adjustable segment granularity
- Support for multiple languages

## Getting Started

First, configure your transcript provider in `.env.local`:

### Using Supadata (Recommended)

1. Sign up for a Supadata account at [https://supadata.ai](https://supadata.ai)
2. Get your API key from the dashboard
3. Add to `.env.local`:

```
TRANSCRIPT_PROVIDER=supadata
SUPADATA_API_KEY=your_supadata_api_key_here
```

### Using YouTube Transcript API (No API key required)

```
TRANSCRIPT_PROVIDER=youtube-transcript
```

### Using Oxylabs

```
TRANSCRIPT_PROVIDER=oxylabs
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
```

Then, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use

1. Enter a YouTube URL in the input field
2. Click "Get Transcript"
3. The transcript will be displayed below the input field

## Technologies Used

- Next.js
- React
- Tailwind CSS
- Supadata API (or other configured provider)

## License

This project is open source and available under the [MIT License](LICENSE).

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supadata Documentation](https://docs.supadata.ai)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

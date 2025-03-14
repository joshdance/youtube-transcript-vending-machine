# YouTube Transcript Vending Machine

This application allows you to extract transcripts from YouTube videos using the Sieve API.

## Features

- Simple interface to input YouTube video URLs
- Extract video transcripts using Sieve API
- View metadata and transcript content

## Getting Started

First, you need to obtain a Sieve API key:

1. Sign up for a Sieve account at [https://www.sievedata.com/](https://www.sievedata.com/)
2. Generate an API key from your dashboard
3. Add your API key to the `.env.local` file:

```
SIEVE_API_KEY=your_sieve_api_key_here
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
- Sieve API

## License

This project is open source and available under the [MIT License](LICENSE).

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Sieve API Documentation](https://www.sievedata.com/dashboard/docs)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

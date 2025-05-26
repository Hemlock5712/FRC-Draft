# The Blue Alliance API Setup

## Getting Your API Key

1. Go to [The Blue Alliance Account Page](https://www.thebluealliance.com/account)
2. Sign in with your Google account
3. Navigate to the "Read API Keys" section
4. Click "Generate New Key"
5. Give your key a descriptive name (e.g., "DART Fantasy App")
6. Copy the generated API key

## Setting Up Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your TBA API key:

```
TBA_AUTH_KEY=your_actual_api_key_here
```

3. Make sure `.env.local` is in your `.gitignore` file (it should be by default)

## Using Real TBA Data

Once your API key is set up, you can:

1. Go to the Admin Panel → Matchups Admin
2. Select a year (2024 is recommended for testing)
3. Select a week (1-6 have the most events)
4. Click "📡 Fetch Real TBA Data for Week X"

The system will:
- Fetch actual FRC events for that week
- Get teams that participated in those events
- Analyze real match results
- Calculate team performance scores using our scoring system
- Store the data for use in fantasy leagues

## Available Data

- **2024**: Full season data available (Weeks 1-6 + Championships)
- **2023**: Full season data available
- **2022**: Full season data available
- **Earlier years**: Available but may have less complete data

## Rate Limits

The TBA API has rate limits, so the system:
- Processes only 5 events per request by default
- Includes delays between API calls
- Caches results to avoid duplicate requests

## Troubleshooting

If you get errors:
1. Check that your API key is correct in `.env.local`
2. Make sure you're connected to the internet
3. Try a different week if one week has issues
4. Check the console for detailed error messages

## API Documentation

For more details about The Blue Alliance API:
- [TBA API Documentation](https://www.thebluealliance.com/apidocs/v3)
- [API Endpoints](https://www.thebluealliance.com/apidocs/v3)
- [Developer Guidelines](https://www.thebluealliance.com/apidocs) 
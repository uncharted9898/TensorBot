# TensorBot v3

TensorBot v3 is a powerful Discord bot designed to monitor and display real-time revenue data from an organization's TensorDock Servers. It fetches billing, revenue, and hardware usage data, then organizes and presents this information in designated Discord channels, creating and updating messages automatically.

---

## Features

- Fetches billing summaries and revenue data from TensorDock's v1 API.
- Creates dedicated channels for each hostnode if they don't exist.
- Periodically updates channels with the latest hardware status, revenue, and VM activity.
- Cleans up old messages to keep information current.
- Runs automatically every 5 minutes using cron.

---

## Requirements

- Node.js v14 or higher
- Discord bot token with appropriate permissions
- TensorDock API credentials (`API_KEY`, `API_TOKEN`)
- Environment variables for configuration

---

## Installation

1. Clone this repository:

```bash
git clone https://github.com/uncharted9898/TensorBot.git
cd TensorBot
```

2. Install dependencies:

```bash
npm install dotenv request node-cron discord.js
```

3. Create a `.env` file in the root directory with your credentials:

```env
BOT_TOKEN=your-discord-bot-token
API_KEY=your-tensordock-api-key
API_TOKEN=your-tensordock-api-token
GUILD_ID=your-discord-guild-id
```

---

## Usage

Start the bot with:

```bash
node app.js
```

The bot will automatically log in and begin periodic updates every 5 minutes.

---

## Configuration

- Replace the environment variable values with your actual tokens and IDs.
- Ensure the bot has permissions to create channels, send messages, and delete messages within your guild.



## Notes

- The bot creates channels under a category named `TensorDock`. Make sure this category exists.

---

## Contact

Created by Uncharted@ ~2024

---


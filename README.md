# OpenDemo

OpenDemo is an agent-native tool that generates beautiful, polished product demo videos without you lifting a finger.

### What can I accomplish with OpenDemo?
* 🎬 Build high-quality product videos for YouTube
* 🎯 Make demos for finished  hackathon projects
* 🌿 Bring life to your MVP and Landing page
* ✨ Create ProductHunt launch videos

With no editing or human intervention required. It runs headless, so you can keep working while it builds your demo in the background.

### Demo
Watch OpenDemo fully execute a local login flow from a tiny JSON instruction file:
<img src="./examples/login-demo.gif" width="100%"/>


## Usage

Just ask your AI assistant to build the demo for you.

**Example:**
> "Make a demo of our new AI recipe app, ChefBot, showing the user onboarding flow. Use OpenDemo to create the video."

The AI will automatically generate the config, plan the video flow, and hand you a cinematic video .mp4


## Installation & Setup
Because OpenDemo's cinematic video rendering engine is heavily powered by a compiled React application running invisibly in the background, you **must** build the project once before the engine can function.

1. Install dependencies: `npm install`
2. Build the engine: `npm run build`

*You only need to do this once. Once built, you can run as many demos as you want!*

## How to use (For AI Agents)
If you are an AI agent attempting to create a demo video using OpenDemo, please carefully read the [AGENT_README.md](./AGENT_README.md) for instructions on how to easily structure your configuration files and generate a new demo.

## Acknowledgements
OpenDemo is built as an automated, agent-native extension of the archived OpenScreen project. A huge thank you to the original OpenScreen creator (Siddarth Vaddem) for laying the foundation of this cinematic rendering pipeline!

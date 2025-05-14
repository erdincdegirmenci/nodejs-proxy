# VeilProxy - Your Proxy. Your Rules.

VeilProxy is an Electron-based desktop application for creating HTTP and TCP proxies.

## Features

- Create HTTP and TCP proxies
- Rewrite host headers for IIS Express compatibility
- Easy-to-use interface with toggle-based controls
- Support for WebSocket connections (TCP proxy)

## Installation

### Pre-packaged App

1. Download the latest release from the releases page
2. Extract the zip file
3. Run VeilProxy.exe

### From Source

If you want to run from source:

1. Make sure you have [Node.js](https://nodejs.org/) installed
2. Clone this repository
3. Open terminal/command prompt in the project folder
4. Install dependencies:
   ```
   npm install
   ```
5. Start the application:
   ```
   npm start
   ```

## Usage

1. Select your local IP address from the dropdown
2. Set the internal port (the application you want to proxy to)
3. Set the external port (the port VeilProxy will listen on)
4. Check "Rewrite host headers" if you're using IIS Express
5. Click "Start Proxy" button

## Support

For issues or feature requests, please create an issue on GitHub.

## License

This project is licensed under the ISC License. 
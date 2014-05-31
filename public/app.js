requirejs.config({
    "baseUrl": "files",
});

// Load the main app module to start the app
requirejs(["./ui"]);

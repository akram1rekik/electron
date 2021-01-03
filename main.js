//require('electron-reload')(__dirname, {
//   electron: require('${__dirname}/../../node_modules/electron')
//})

const {app, BrowserWindow} = require('electron')
const path = require('path')

let mainWindow;

async function createWindow() {
    mainWindow = new BrowserWindow({
		width: 992, 
		height: 617,
		frame: false,
		darkTheme: true,
		backgroundColor: "#03213a",
		resizable: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true
		}
    });
    mainWindow.on("ready-to-show", async () => {
        mainWindow.show();
    });
    mainWindow.on("closed", () => (mainWindow = null));
    mainWindow.loadURL(`file://${path.join(__dirname, "./app/templates/dashboard.html")}`);
}

app.on("ready", createWindow);

app.on("activate", () => {
    if (mainWindow === null) createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
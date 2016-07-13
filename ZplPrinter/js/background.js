chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('main.html', {
        frame: 'none',
        bounds: {
            width: 535,
            height: 768
        },
        resizable: false,
    });
});

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == "install" || details.reason == "update") {
        chrome.storage.local.set({
            isOn: true,
            density: '8',
            width: '4',
            height: '6',
            unit: '1',
            host: '127.0.0.1',
            port: '9100',
            saveLabels: false,
            filetype: '1',
            path: null,
	    counter: 0
        });
    }
});
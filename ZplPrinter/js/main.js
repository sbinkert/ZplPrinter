var socketId, clientSocketInfo;
var configs = {};

$(function () {
    $(window).bind('focus blur', function () {
        $('#panel-head').toggleClass("panel-heading-blur");
    });
});

$(document).ready(function () {
    chrome.storage.local.get(null, function (items) {
        configs = items;
        initConfigs();
        initEvents();
    });

    chrome.sockets.tcp.onReceive.addListener(function (info) {
        notify('{0} bytes received from Client: <b>{1}</b> Port: <b>{2}</b>'.format(info.data.byteLength, clientSocketInfo.peerAddress, clientSocketInfo.peerPort), 'print', 'info', 1000);
        var zpl = encodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(info.data)));
        chrome.sockets.tcp.close(info.socketId);
        var factor = (configs.unit == '1') ? 1 : (configs.unit == '2') ? 2.54 : 25.4;
        var width = parseFloat(configs.width) / factor;
        var height = parseFloat(configs.height) / factor;
        var uri = 'http://api.labelary.com/v1/printers/{0}dpmm/labels/{1}x{2}/0/{3}'.format(configs.density, width, height, zpl);
        var size = getSize(width, height);
        $('#label').prepend('<div class="thumbnail" style="width: {0}px; height: {1}px"><webview src="{2}" autosize="on" /></div>'.format(size.width, size.height, uri));
        var offset = size.height + 20;
        $('#label').css({ "top": '-' + offset + 'px' });
        $('#label').animate({ "top": "0px" }, 1500);
    });
});

function getSize(width, height) {
    var defaultWidth = 386;

    var factor = width / height;
    return {
        width: defaultWidth,
        height: defaultWidth / factor
    };
}



// Display notification
// @param {String} text Notification text
// @param {Number} glyphicon Notification icon
// @param {String} type Notification type
// @param {Number} delay Notification fade out delay in ms
function notify(text, glyphicon, type, delay) {
    var log = $('<p>' + text + '</p>').text();
    if (type == 'danger')
        console.error(log);
    else {
        console.info(log);
    }

    $('.bottom-left').notify({
        message: { html: text },
        glyphicon: glyphicon,
        type: type,
        fadeOut: {
            delay: delay == undefined ? 2000 : delay
        }
    }).show();
}

// Start tcp server and listen on configuret host/port
function startTcpServer() {
    if (socketId != undefined) return;
    chrome.sockets.tcpServer.create({}, function (info) {
        socketId = info.socketId;
        chrome.sockets.tcpServer.listen(socketId, configs.host, parseInt(configs.port), 20, function (result) {
            if (result == 0) {
                notify('Printer started on Host: <b>{0}</b> Port: <b>{1}</b>'.format(configs.host, configs.port));
                chrome.sockets.tcpServer.onAccept.addListener(function (clientInfo) {
                    chrome.sockets.tcp.getInfo(clientInfo.clientSocketId, function (socketInfo) {
                        clientSocketInfo = socketInfo;
                        chrome.sockets.tcp.setPaused(clientInfo.clientSocketId, false);
                    });
                });
            } else {
                socketId = undefined;
                toggleSwitch('.btn-toggle');
                notify('Error occurs while creating Printer on Host: <b>{0}</b> Port: <b>{1}</b>'.format(configs.host, configs.port), 'exclamation-sign', 'danger', 4000);
            }
        });
    });
}

// Stop tcp server
function stopTcpServer() {
    if (socketId == undefined) return;
    chrome.sockets.tcpServer.close(socketId, function() {
        notify('Printer stopped on <b>{0}</b> Port: <b>{1}</b>'.format(configs.host, configs.port));
        socketId = undefined;
    });
}

// Init ui events
function initEvents() {
    $('.btn-toggle').click(function () {
        toggleSwitch(this);

        if ($('#btn-on').hasClass('active')) {
            startTcpServer();
        } else {
            stopTcpServer();
        }
    });

    $('#btn-remove').click(function() {
        var size = $('.thumbnail').size();

        if (size > 0) {
            var label = size == 1 ? 'label' : 'labels';
            bootbox.confirm('Are you sure to remove {0} {1}?'.format(size, label), function (result) {
                if (result) {
                    $('.thumbnail').remove();
                    notify('{0} {1} successfully removed.'.format(size, label), 'trash', 'info');
                }
            });
        }
    });

    $('#btn-close').click(function() {
        chrome.storage.local.set({ isOn: $('#btn-on').hasClass('active') }, function() {
            window.close();
            stopTcpServer();
        });
    });

    $('#density li > a').click(function () {
        var btn = $('#btn-density');
        btn.attr('aria-valuenow', $(this).parent().attr('aria-valuenow'));
        btn.html($(this).text() + ' <span class="caret"></span>');
    });

    $('#unit li > a').click(function () {
        var btn = $('#btn-unit');
        btn.attr('aria-valuenow', $(this).parent().attr('aria-valuenow'));
        btn.html($(this).text() + ' <span class="caret"></span>');
    });

    $("#configsForm").submit(function (e) {
        e.preventDefault();
        saveConfigs();

    });

    $('#settings-window').on('shown.bs.modal', function() {
        if ($('#btn-on').hasClass('active')) {
            toggleSwitch('.btn-toggle');
            stopTcpServer();
        }
    });
}

// Toggle on/off switch
// @param {Dom Object} btn Button group to toggle
function toggleSwitch(btn) {
    $(btn).find('.btn').toggleClass('active');

    if ($(btn).find('.btn-primary').size() > 0) {
        $(btn).find('.btn').toggleClass('btn-primary');
    }

    $(btn).find('.btn').toggleClass('btn-default');
}

// Svae configs in local storage
function saveConfigs() {
    for (var key in configs) {
        if (key == 'density') {
            configs[key] = $('#btn-density').attr('aria-valuenow');
        } else if (key == 'unit') {
            configs[key] = $('#btn-unit').attr('aria-valuenow');
        } else {
            configs[key] = $('#' + key).val();
        }
    }

    chrome.storage.local.set(configs, function () {
        $('#settings-window').modal('hide');
        notify('Printer settings changes successfully saved', 'cog', 'info');
    });


}

// Init/load configs from local storage
function initConfigs() {
    for (var key in configs) {
        if (key == 'density') {
            initDropDown('density', configs[key]);
        }else if (key == 'unit') {
            initDropDown('unit', configs[key]);
        } else if (key == 'isOn' && configs[key]) {
            toggleSwitch('.btn-toggle');
            startTcpServer();
        }
        else {
            $('#' + key).val(configs[key]);
        }
    }
}

function initDropDown(btnId, value) {
    var btn = $('#btn-' + btnId);
    var text = $('#' + btnId).find('li[aria-valuenow=' + value + '] > a').html();
    btn.attr('aria-valuenow', value);
    btn.html(text + ' <span class="caret"></span>');
}

// Prototype for string.format method
String.prototype.format = function () {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};
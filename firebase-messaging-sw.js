console.log(`[Service Worker]`);

// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAEIb8uxnRZy_c-d_cNJJiAkTs3IRe9djI",
    authDomain: "pwanotification-f35a1.firebaseapp.com",
    projectId: "pwanotification-f35a1",
    storageBucket: "pwanotification-f35a1.appspot.com",
    messagingSenderId: "38995625859",
    appId: "1:38995625859:web:1c088823e2e5b4d84498b6",
    measurementId: "G-0GJXPT4G8B"
};

class CustomPushEvent extends Event {
    constructor(data) {
        super('push');

        Object.assign(this, data);
        this.custom = true;
    }
}

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/*
 * Overrides push notification data, to avoid having 'notification' key and firebase blocking
 * the message handler from being called
 */
self.addEventListener('push', async (e) => {

    e.preventDefault(); // 阻止預設的推播通知顯示

    // Stop event propagation
    e.stopImmediatePropagation();

    // Skip if event is our own custom event
    if (e.custom) return;

    // Kep old event data to override
    const oldData = e.data;
    console.log('[firebase-messaging-sw.js] Received push background message ', oldData.json());

    // Create a new event to dispatch, pull values from notification key and put it in data key,
    // and then remove notification key
    const data = {
        ehheh: oldData.json(),
        json() {
            const newData = oldData.json();

            newData.data = {
                ...newData.data,
                ...newData.notification,
            };

            delete newData.notification;
            return newData;
        },
    }

    // console.log('[firebase-messaging-sw.js] 新的', newEvent.data.json());

    // // foreground handling: eventually passed to onMessage hook
    // const clientList = await getClientList();
    // if (hasVisibleClients(clientList)) {
    //     return sendMessagePayloadInternalToWindows(clientList, newEvent);
    // }

    const customPushEvent = new Event("customPushEvent");
    customPushEvent.data = data; // 傳遞當前事件的資料到新事件

    // Dispatch the new wrapped event
    dispatchEvent(customPushEvent);
});

const notification_click_handler = async function (event) {

    // Prevent other listeners from receiving the event
    event.stopImmediatePropagation();
    event.notification.close();
    console.log("[Service Worker] data:", event.notification.data);

    const payload = event.notification?.data;
    console.log("[Service Worker] payload:", payload);

    if (!payload) {
        return;
    } else if (event.action) {
        // User clicked on an action button. This will allow developers to act on action button clicks
        // by using a custom onNotificationClick listener that they define.
        return;
    }

    const link = payload.click_action || payload.url || "/pwa";

    // // FM should only open/focus links from app's origin.
    // const url = new URL(link, self.location.href);
    // const originUrl = new URL(self.location.origin);

    // // if (url.host !== originUrl.host) {
    // //     return;
    // // }

    console.log('goto:' + link);

    event.waitUntil(
        new Promise(async (resolve) => {
            let client = await getWindowClient(link);

            if (!client) {
                client = await clients.openWindow(link);

                // Wait three seconds for the client to initialize and set up the message handler so that it
                // can receive the message.
                await sleep(3000);
            } else {
                client = await client.focus();
            }

            if (!client) {
                // Window Client will not be returned if it's for a third party origin.
                return;
            }

            payload.messageType = 'notification_clicked';
            payload.isFirebaseMessaging = true;
            client.postMessage(payload);
            resolve();
        })
    );
};

// CustomPushEvent 事件處理器
self.addEventListener('customPushEvent', async function (event) {
    event.preventDefault(); // 阻止預設的推播通知顯示

    console.log('[firebase-messaging-sw.js] CustomPushEvent message ', event.data.json());
    const payload = event.data.json();

    // Customize notification here
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon || '/logo.png',
        badge: payload.data.badge || '/logo.png',
        data: payload.data
    };

    // Check if there's an image, then add it to the notification options
    if (payload.data.image) {
        notificationOptions.image = payload.data.image;
    }

    // Optionally, handle the notification click event to open a URL
    self.addEventListener('notificationclick', notification_click_handler);

    // Show the notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 停止 Firebase 自動顯示推播通知
messaging.onBackgroundMessage(function (payload) {

    // 在此處理消息，不顯示預設的通知
    console.log('[firebase-messaging-sw.js] Background message received: ', payload);

    // 如果不需要顯示通知，可以選擇在此處不做任何處理，或手動自定義顯示邏輯
});


// messaging.onBackgroundMessage(async function (payload) {
//     console.log('[firebase-messaging-sw.js] Received background message ', payload);

//     // Customize notification here
//     const notificationTitle = payload.data.title + "[background]";
//     const notificationOptions = {
//         body: payload.data.body,
//         icon: payload.data.icon || '/favicon.png',
//         badge: payload.data.badge || '/badge.png',
//         data: payload.data
//     };

//     if (!!payload.data.image) {
//         notificationOptions.image = payload.data.image;
//     }

//     self.registration.showNotification(notificationTitle, notificationOptions);
// });

const CACHE_NAME = 'cwwl-cache-v1';
const urlsToCache = [
    '/',
    '/manifest.json',
    '/css/w3.css',
    '/css/w3-theme-black.css',
    '/css/font-awesome.min.css',
    '/js/exceljs.min.js',
    '/js/jspdf.umd.min.js',
    '/js/source-han-sans-normal.js',
    '/screenshot.png',
    '/favicon.png'
];

self.addEventListener('notificationclick', notification_click_handler);

/** Returns a promise that resolves after given time passes. */
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

/**
 * @param url The URL to look for when focusing a client.
 * @return Returns an existing window client or a newly opened WindowClient.
 */
async function getWindowClient(url) {
    const clientList = await getClientList();

    for (const client of clientList) {
        const clientUrl = new URL(client.url, self.location.href);

        if (url.href === clientUrl.href) {
            return client;
        }
    }

    return null;
}

function getClientList() {
    return self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    });
}

/**
 * @returns If there is currently a visible WindowClient, this method will resolve to true,
 * otherwise false.
 */
function hasVisibleClients(clientList) {
    return clientList.some(
        client =>
            client.visibilityState === 'visible' &&
            // Ignore chrome-extension clients as that matches the background pages of extensions, which
            // are always considered visible for some reason.
            !client.url.startsWith('chrome-extension://')
    );
}

function sendMessagePayloadInternalToWindows(clientList, internalPayload) {
    internalPayload.isFirebaseMessaging = true;
    internalPayload.messageType = 'push_received';

    for (const client of clientList) {
        client.postMessage(internalPayload);
    }
}

self.addEventListener("install", event => {
    console.log("[Service Worker] Install");

    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            console.log("[Service Worker] Caching all: app shell and content");
            await cache.addAll(urlsToCache);
        })(),
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        (async () => {
            const r = await caches.match(event.request);
            console.log(`[Service Worker] Fetching resource: ${event.request.url}`);
            if (r) {
                console.log(`[Service Worker] Read Cache: ${event.request.url}`);
                return r;
            }
            const response = await fetch(event.request);
            const cache = await caches.open(CACHE_NAME);
            // console.log(`[Service Worker] Caching new resource: ${event.request.url}`);
            // cache.put(event.request, response.clone());
            return response;
        })(),
    );
});

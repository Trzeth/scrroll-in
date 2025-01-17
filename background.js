import { executeSaveScroll, executeGetScroll } from './contentScripts';

function getUrlWithoutHash(url) {
  return url.split('?')[0].split('#')[0].split('?')[0];
}

const setActiveIcon = () => {
  chrome.action.setIcon({
    path: {
      16: '../images/icon-16.png',
      32: '../images/icon-32.png',
      48: '../images/icon-48.png',
      128: '../images/icon-128.png',
      256: '../images/icon-256.png',
    },
  });
};

const setInactiveIcon = () => {
  chrome.action.setIcon({
    path: {
      16: '../images/icon-16-inactive.png',
      32: '../images/icon-32-inactive.png',
      48: '../images/icon-48-inactive.png',
      128: '../images/icon-128-inactive.png',
      256: '../images/icon-256-inactive.png',
    },
  });
};

chrome.runtime.setUninstallURL('https://prateeksurana3255.typeform.com/to/VMfEV6');

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ 'scroll-mark': {} });
  }
});

// const updateIcon = () => {
//   chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//     const url = getUrlWithoutHash(tabs[0].url);

//     chrome.storage.local.get('scroll-mark', data => {
//       const scrollMarkData = data['scroll-mark'];
//       if (!scrollMarkData.hasOwnProperty(url)) {
//         setInactiveIcon();
//       } else {
//         setActiveIcon();
//       }
//     });
//   });
// };

// This updates the popup icon based on whether
// the tab has a saved scroll or not when the user
// is switching between tabs
chrome.tabs.onActivated.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = getUrlWithoutHash(tabs[0].url);

    chrome.storage.local.get('scroll-mark', data => {
      const scrollMarkData = data['scroll-mark'];
      if (scrollMarkData && scrollMarkData[url] !== undefined) {
        setActiveIcon();
      } else {
        setInactiveIcon();
      }
    });
  });
});

// This runs when a page on a tab is loaded and
// if it has a saved scroll then fetch the latest
// scroll
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  chrome.tabs.get(tabId, tab => {
    const url = getUrlWithoutHash(tab.url);

    if (url && changeInfo.status === 'complete') {
      new Promise((resolve, reject) => {
        chrome.storage.session.get(tabId.toString(), function (r) {
          if (r[tabId] == url) {
            reject();
          } else {
            resolve();
          }
        });
      }).then(
        () => chrome.storage.local.get('scroll-mark', data => {
          const scrollMarkData = data['scroll-mark'];

          chrome.scripting.insertCSS({
            target: { tabId },
            files: ['contentScripts/index.css'],
          });

          if (scrollMarkData && scrollMarkData[url] !== undefined) {
            executeGetScroll(tabId, null, true);
            setActiveIcon();

            var tabIdToUrl = {};
            tabIdToUrl[tabId.toString()] = url;
            chrome.storage.session.set(tabIdToUrl);
          } else {
            setInactiveIcon();
          }
        })
      ).catch(() => { });
    }
  });
});

// This listens for messages from content scripts
// and updates popup icon accordingly
chrome.runtime.onMessage.addListener(request => {
  if (request === 'setActive') {
    setActiveIcon();
  } else {
    setInactiveIcon();
  }
});

// This listends for keyboard shortcuts and
// performs actions accordingly
chrome.commands.onCommand.addListener(command => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const currentTabId = tabs[0].id;
    if (command === 'save-scroll') {
      executeSaveScroll(currentTabId);
    } else if (command === 'fetch-scroll') {
      chrome.tabs.get(currentTabId, tab => {
        const url = getUrlWithoutHash(tab.url);
        chrome.storage.local.get('scroll-mark', data => {
          const scrollMarkData = data['scroll-mark'];
          if (scrollMarkData && scrollMarkData[url] !== undefined) {
            executeGetScroll(currentTabId, null, true);
          }
        });
      });
    }
  });
});

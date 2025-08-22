// 툴바의 확장 프로그램 아이콘을 클릭했을 때 실행됩니다.
chrome.action.onClicked.addListener((tab) => {
  // sidebar.html 파일을 새로운 탭으로 엽니다.
  chrome.tabs.create({
    url: chrome.runtime.getURL("sidebar.html")
  });
});
function initializeLocalStorage() {
  if(localStorage["activation"] == null){
    localStorage["blacklist"]               = "(stackoverflow.com|github.com|code.google.com)";
    localStorage["activation"]              = "true";
    localStorage["showOrigin"]              = "false";
    localStorage["savedPatterns"]           = JSON.stringify([[["en","English"],["it","Italian"],"15",true], [["en","English"],["la","Latin"],"15",false]]);
    localStorage["sourceLanguage"]          = "en";
    localStorage["targetLanguage"]          = "it";
    localStorage["translatedWordStyle"]     = "color: #fe642e;\nfont-style: normal;";
    localStorage["userBlacklistedWords"]    = "(this|that)";
    localStorage["translationProbability"]  = 15;
    localStorage["minimumSourceWordLength"] = 3;
    localStorage["userDefinedTranslations"] = '{"the":"the", "a":"a"}';
  }
}
initializeLocalStorage();

function S(key) { return localStorage[key]; } 


function googleTranslateURL() {
    var url = 'http://translate.google.com/translate_a/t?client=f&otf=1&pc=0&hl=en';
    var sL = S("sourceLanguage");
    if(sL != 'auto') {
      url += '&sl=' + sL;
    }
    url += '&tl=' + S("targetLanguage");
    url += '&text=';
    return url;
}	


function translateOneRequestPerFewWords(words, callback) {
  console.debug("words: " + JSON.stringify(words));
  var concatWords = "";
  var length = 0
  var maxLength = 800;
  var concatWordsArray = {};
  var cWALength = 1;

  for (word in words) {
    console.debug("word: " + word);
    concatWords += word + ". "  ;
    console.debug("concatWords: " + concatWords);
    concatWordsArray[cWALength] = concatWords;
    length += encodeURIComponent(word + ". ").length;

    if (length > maxLength) {
      cWALength++;
      concatWords = "";
      length = 0;
    }
  }
  var tMap = {};
  translateORPFWRec(concatWordsArray,1,cWALength,tMap,callback);
}

function translateORPFWRec(concatWordsArray, index, length, tMap,callback) {
  console.log("translateORPFWRec");
  console.debug("concatWordsArray: " + JSON.stringify(concatWordsArray));
  console.debug("index: " + index +  "; length: " + length);
  if (index > length) callback(tMap)
  else { 
    var url = googleTranslateURL() + concatWordsArray[index];
    var xhr = new XMLHttpRequest(); xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        //alert(xhr.responseText);
        var r = JSON.parse(xhr.responseText);
        for (i in r.sentences) {
          var orig = r.sentences[i].orig;
          var origT = orig.substring(0,orig.length - 1);
	  var trans = r.sentences[i].trans;
          var transT = trans.replace(/[.\u3002]/,""); // removes punctuation
          tMap[origT] = transT;
        }
        translateORPFWRec(concatWordsArray, index + 1, length, tMap, callback);
      }
    }
    xhr.send();
  }
}  	

function length(associativeArray) {
  var l = 0;
  for (e in associativeArray) { l++; }
  return l;       
}
function onRequest(request, sender, sendResponse) {
  if (request.wordsToBeTranslated) {
    console.log("words to be translated:", request.wordsToBeTranslated);
    translateOneRequestPerFewWords(request.wordsToBeTranslated, function(tMap) {
      console.log("translations:", tMap);
      sendResponse({translationMap : tMap});
    });
    console.log(length(request.wordsToBeTranslated));
  } else if (request.getOptions) {
    sendResponse({minimumSourceWordLength   : S("minimumSourceWordLength"),
                  userDefinedTranslations   : S("userDefinedTranslations"),
                  translationProbability    : S("translationProbability"),
                  userBlacklistedWords      : S("userBlacklistedWords"),
                  translatedWordStyle       : S("translatedWordStyle"),
                  sourceLanguage            : S("sourceLanguage"),
                  targetLanguage            : S("targetLanguage"),
                  activation                : S("activation"),
                  showOrigin                : S("showOrigin"),
                  blacklist                 : S("blacklist"),
                  MindTheInjection          : [
                                                chrome.extension.getURL("/assets/js/mtw.js"), 
                                                chrome.extension.getURL("/assets/css/mtw.css"),
                                                chrome.extension.getURL("/assets/css/fontello.css"), 
                                                chrome.extension.getURL("/assets/css/animation.css")
                                              ]
                })
  } else if (request.runMindTheWord) {
    chrome.tabs.onUpdated.addListener(function(tabId, info){ //Wait until page has finished loading
      if(info.status == "complete"){
        console.log(info.status);
        sendResponse(true);
      }
    })
  }
};

chrome.extension.onRequest.addListener(onRequest);

function browserActionClicked() {
  chrome.tabs.create({url:chrome.extension.getURL("options.html")});
}

chrome.browserAction.onClicked.addListener(browserActionClicked);

google_analytics('UA-1471148-13');
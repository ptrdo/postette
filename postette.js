;
(function (root, factory) {

  /**
   * POSTETTE
   * A gadget for communicating remarkable events to a person interacting with a web client.
   *
   * @license MIT
   * @requires "HTML5", "ECMA-262 Edition 5.1"
   * @requires IE 10+, Edge 14+, FF 52+, Chrome 49+, Safari 10+
   *
   * ES6-COMPLIANT IMPLEMENTATION:
   *
   *   import Postette from "path/to/postette.js";
   *
   *   function start () {
   *     Postette.init({ SomeConfigParameter: "SomeConfigSetting" });
   *   };
   *
   *
   * AMD IMPLEMENTATION (RequireJS):
   *
   *   require.config({
   *     paths: { postette: "/path/to/postette"},
   *     shim: { postette: { exports: "postette" }}
   *   });
   *
   *   define(["postette"], function(Postette) {
   *     Postette.init({ SomeConfigParamter: "SomeConfigSetting" });
   *   });
   *
   *
   * ECMA262-COMPLIANT IMPLEMENTATION:
   *
   *   <script type="text/javascript" src="./path/to/postette.js"></script>
   *
   *   window.addEventListener("DOMContentLoaded", function(event) {
   *     window.postette.init({ SomeConfigParamter: "SomeConfigSetting" });
   *   }, true);
   *
   */

  var namespace = "postette";
  typeof exports === "object" && typeof module !== "undefined"
      ? module.exports = factory()
      : typeof define === "function" && "amd" in define
      ? define([], factory)
      : ((root||window)[namespace] = factory());

}(this, (function () {
      "use strict";

      /**
       * Postette is singleton class for management and execution of notifications to the person interacting with a web client application.
       * Notifications are queued, so every one will show subsequent to any previous one(s) that may be in process.
       *
       * Note: No dependencies here since user may need to be notified of application failures.
       */

      /* PRIVATE MEMBERS */

      /**
       * @private
       * @property {String} version // the semantic versioning of this code.
       * @property {String} identity // the namespace prefixed to unique properties and attributes.
       * @property {String} markupId // the element ID of the HTML to be injected.
       * @property {Array} queue // a collection of the messages in queue for toast.
       * @property {Object} currentNotification // properties of current message in process of notification.
       * @property {Object} previousNotification // properties of most recent message in process of notification.
       * @property {Element} styles // the node appended into the document <head>.
       * @property {Element} element // the node appended into the parentElement.
       * @property {Element} logContainer // the currently renedered ASIDE (for log).
       * @property {Element} messageContainer // the currently rendered INS (the animating container).
       * @property {Element} messageElement // the currently rendered SPAN (for text).
       * @property {Element} clickerElement // the currently rendered BUTTON (to dismiss).
       */

      var version = "0.1.0",
          identity = "postette",
          markupId = identity + Date.now(),
          queue = [],
          currentNotification = {},
          previousNotification = {},
          styles,
          element,
          logContainer,
          messageContainer,
          messageElement,
          clickerElement;

      /**
       * CONFIG (with DEFAULTS)
       *
       * @public via init(settings);
       * @property {Boolean} echo // when true, also send message to browser console.log/warn/error.
       * @property {Boolean} trace // when true, sends computed toast properties to console.log().
       * @property {Boolean} reiterate // when true, will queue messages even if duplicate(s) exist in view or queue.
       * @property {Boolean} prefix // when true, renders error|warning|success state preceding message (e.g. "Error! 404 not found.").
       * @property {Boolean|null} integration // when true, integrate always, never integrate when false, and automatic when null (default).
       * @property {Integer} tldr // too-long-didnt-read is the minimum length for defaulting to integrate:true (when integration is auto).
       * @property {Array} modalSelector // collection of querySelector-compliant string(s) for determining if a modal exists (sets integrate to false).
       * @property {Integer} zIndex // relative display layer as defined by CSS z-index property (default is 100 less than DOM maximum).
       * @property {Integer} zIndexLog // relative display layer as defined by CSS z-index property (default is 300 less than DOM maximum).
       * @property {String} top // value attributable to CSS top (in sanctioned units, e/g "px", "rem", "%"). Integers will be set as "px".
       * @property {Boolean} downwards // when true, notifications animate downwards into view, elsewise upwards. @todo
       * @property {Element} parentElement // node to which element is appended (if null, then document.body will bet set).
       * @property {Element} clickAway // enables this.globalClickHandler to quit message/log upon click that bubbles to document.body.
       */
      var ZMAX = 2147483647; /* CSS: Maximum value for z-index property of absolute-positioned DOM element. */
      var CONFIG = {
        echo: false,
        trace: false,
        reiterate: false,
        prefix: true,
        integration: null,
        tldr: 72,
        modalSelector: ["[id^=modal].active"],
        zIndex: ZMAX-100,
        zIndexLog: ZMAX-500,
        top: "50px",
        downwards: true,
        parentElement: null,
        clickAway: true
      };

      /**
       * STATE are the CSS classNames that determine notification display.
       *
       * @public via Postette.getStates();
       * @property active // when message is visible (or becoming visible).
       * @property persist // when messaging an ongoing process (e.g. "spinner").
       * @property update // when canceling a "persist" state.
       * @property updated // when a "persist" state is superceded.
       * @property detached // when messaging is not integrated (e.g. "pill").
       * @property log when // log is visible (or becoming visible).
       */
      var STATE = {
        active: "active",
        persist: "persist",
        update: "update",
        updated: "updated",
        detached: "detached",
        log: "log"
      };

      /**
       * LEVEL are the CSS classNames that determine notification intent.
       *
       * @public via Postette.getLevels();
       * @property error (red) messaging a failure.
       * @property warning (yellow) messaging something ominous.
       * @property alert (blue) messaging something significant.
       * @property success (green) messaging a success.
       */
      var LEVEL = {
        error: "error",
        warning: "warning",
        alert: "alert",
        success: "success"
      };

      /**
       * TIME are the milliseconds configured for expanses of time.
       *
       * @public via Postette.getTimes();
       * @property immediate // time required to accommodate DOM manipulation.
       * @property minimal // time required to accommodate reveal animation.
       * @property brief // time required for a person to acknowledge a message.
       * @property moderate // time required for a person to absorb a (shortish) message.
       * @property ample // time required for a person to be impeded by a message.
       * @property persisting // time given to a "persist" message (seemingly fixed, a spinner).
       * @property perCharacterFactor // computes sufficient duration to read an indeterminate message.
       * @property transition // time configured for CSS transition-duration.
       */
      var TIME = {
        immediate: 300,
        minimal: 400,
        brief: 2000,
        moderate: 3000,
        ample: 8000,
        persisting: 1000 * 60 * 60,
        perCharacterFactor: 100,
        transition: 300
      };

      /**
       * SPAN are @public API abstract references to TIME.
       * @example Postette.toast("Hello World!", { level:"warning", pause:Postette.getSpans().ample });
       *
       * @public via Postette.getSpans();
       * @method getValue accepts string/number and message, returns corresponding milliseconds (positive integer).
       */
      var SPAN = {
        immediate: -1,
        brief: "brief",
        moderate: "moderate",
        ample: "ample",
        persist: Infinity,
        compute: "compute",
        getValue: function (term, msg) {
          if (/^\d+$/.test(term)) {
            return Math.max(TIME.immediate, Math.abs(parseInt(term)));
          } else if (/$infini|$spin/i.test(term)) {
            return TIME.persisting;
          } else if (/$update|$stop/i.test(term)) {
            return TIME.immediate;
          } else {
            switch (term) {
              case this.brief:
                return TIME.brief;
              case this.moderate:
                return TIME.moderate;
              case this.ample:
                return TIME.ample;
              default:
                return msg !== undefined && msg.length > 0
                    ? Math.max(TIME.brief, Math.ceil(msg.length * TIME.perCharacterFactor))
                    : TIME.moderate;
            }
          }
        }
      };


      /* UTILITIES */

      var findPropertyValue = function (obj, key, memo) {
        /* stackoverflow.com/questions/15642494/find-property-by-name-in-a-deep-object */
        var prop, proto = Object.prototype, ts = proto.toString;
        ("[object Array]" !== ts.call(memo)) && (memo = []);
        for (prop in obj) {
          if (proto.hasOwnProperty.call(obj, prop)) {
            if (prop === key) {
              memo.push(obj[prop]);
            } else if ("[object Array]" === ts.call(obj[prop]) || "[object Object]" === ts.call(obj[prop])) {
              this.findPropertyValue(obj[prop], key, memo);
            }
          }
        }
        return memo;
      };

      /**
       * isUnique assists in the prevention of reiterated messages within the queue.
       * @param {Model} instance
       * @returns {boolean} true when model instance is unique among queue.
       */
      var isUnique = function (instance) {
        var profile = instance.level + instance.message;
        var current = "level" in currentNotification ? currentNotification : queue.length > 0 ? queue[queue.length-1] : {};
        var unique = profile !== (current.level + current.message);
        if (unique) {
          queue.forEach(function (item) {
            if (profile === (item.level + item.message)) {
              unique = false;
            }
          });
        }
        return unique;
      };

      /**
       * queryUser will attempt to discern a unique identifier.
       *
       * @private
       * @return {Whatever} The identifier.
       */
      var queryUser = function () {
        var result = "unknown-user";
        try {
          /* When authentication routines are present, here would be where they are called. */
          result = markupId;
        } catch (err) {
          console.warn(identity, "queryUser:", "A user was expected but not found.", err);
        }
        return result;
      };

      /**
       * inferIntegration deduces if message should/not be integrated.
       * NOTE: Integration is the desired appearance for error messages and longish messages. 
       * NOTE: When Config.integration is not set, this routine determines the automatic appearance.
       * 
       * @private
       * @param {Object} model (required) is an instance of Model(); All properties are assumed.
       * @return {Boolean} true when integration should be forced. 
       */
      var inferIntegration = function (model) {
        var obstructionFree = true;
        if (!!model && "message" in model && model.message.length > 0) {
          if (model.integrate !== null) {
            // an instance setting trumps all
            return model.integrate;
          } else if (CONFIG.integration !== null) {
            // then an initialization setting acts as default
            return CONFIG.integration;
          } else {
            // deferring to automatic...
            CONFIG.modalSelector.forEach(function (selector) {
              if (!!document.querySelector(selector)) {
                obstructionFree = false;
              }
            });
            if (model.level === LEVEL.error || model.message.length > CONFIG.tldr) {
              // when message is an error or longish, integrate when possible
              return obstructionFree;
            } else {
              // otherwise, default to not
              return false;
            }
          }
        } else {
          return false;
        }
      };

      /* POLYFILL for Object.assign(); */
      /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign */

      if (typeof Object.assign != "function") {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, "assign", {
          value: function assign(target, varArgs) { // .length of function is 2
            if (target == null) { // TypeError if undefined or null
              throw new TypeError("Cannot convert undefined or null to object");
            }

            var to = Object(target);

            for (var index = 1; index < arguments.length; index++) {
              var nextSource = arguments[index];

              if (nextSource != null) { // Skip over if undefined or null
                for (var nextKey in nextSource) {
                  // Avoid bugs when hasOwnProperty is shadowed
                  if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                    to[nextKey] = nextSource[nextKey];
                  }
                }
              }
            }
            return to;
          },
          writable: true,
          configurable: true
        });
      }

      /* MODEL & COLLECTION */

      var collection = [];
      var Model = function (customizations) {
        /**
         * Customizable Characteristics
         * @property {String} message is the text to message in a notification.
         * @property {Boolean} integrate determines whether or not message appears integral to layout.
         * @property {Boolean} once determines if message should be shown only once or subsequently.
         * @property {String} level determines the styled appearance of the notification.
         * @property {Number} pause stipulates amount of time for notification to be in view.
         * @property {Number} delay stipulates amount of time before display of notification.
         * @callback {Function} executes after the notification has been rebuffed or displayed.
         */
        var defaults = {
          id: collection.length,
          user: "",
          message: "",
          created: Date.now(),
          integrate: null,
          once: false,
          href: "",
          level: LEVEL.alert,
          pause: TIME.moderate,
          delay: TIME.minimal,
          callback: function () {}
        };

        defaults.href = window.location.hash || window.location.pathname + window.location.search;
        defaults.user = queryUser();
        return Object.assign(defaults, customizations);
      };

      var setCurrentToast = function (instance) {
        previousNotification = Object.assign({}, currentNotification);
        currentNotification = Object.assign({}, instance);
      };

      /* PRIVATE HANDLERS */

      var clickHandler = function (event) {

        if (!!event) { event.stopPropagation(); }

        clearTimeout(timerStart);
        clearTimeout(timerShow);
        clearTimeout(timerDone);
        clearClassList(element, STATE.active);

        timerDone = setTimeout(function () {
          try {
            if (queue.length > 0) {
              execute(queue.pop());
            } else {
              setCurrentToast({});
              dismissUI();
            }
          } catch (err) {
             console.warn(identity, "clickHandler", err);
          }
        }, TIME.transition);
      };

      var transitionCompleteHandler = function (event) {

      };

      var transitionUpdateHandler = function (event) {
        var ele = event.target;
        element.classList.add(currentNotification.level);
        element.classList.add(STATE.updated);
        element.classList.remove(STATE.persist);
        ele.removeEventListener("transitionend", transitionUpdateHandler);
      };

      /* USER INTERFACE CONSTRUCTION */

      /**
       * appendStyles parses JSON-formatted styles into CSS.
       * @todo support media queries, import
       *
       * @private
       * @param {JSON} jsonStyles is objectified CSS rules.
       * @return {Element} the style element as appended to DOM
       */
      var appendStyles = function (jsonStyles) {
        var parseStyles = function (json) {
          var parseRules = function (rules) {
            var css = [];
            for (var rule in rules) {
              if (rules.hasOwnProperty(rule)) {
                if (/\/CONFIG\./.test(rules[rule])) {
                  rules[rule] = CONFIG[rules[rule].toString().replace(/\/CONFIG\.(.+)\//, "$1")];
                }
                if (/^(to|from|\d+%)$/.test(rule)) {
                  css.push("\t" + rule + " { " + rules[rule] + " }");
                } else {
                  css.push("\t" + rule + ": " + rules[rule] + ";");
                }
              }
            }
            return css.join("\n");
          };
          var css = [], scope = "div#" + markupId;
          for (var selector in json) {
            if (/^@.*keyframes/.test(selector)) {
              css.push(selector + "\n{\n" + parseRules(json[selector]) + "\n}\n");
            } else if (/div#/.test(selector)) {
              css.push(selector.replace(/div#/g, scope) + "\n{\n" + parseRules(json[selector]) + "\n}\n");
            } else {
              css.push(selector.replace(/(^|,)\s*(\b)/g, "$1"+scope+" $2") + "\n{\n" + parseRules(json[selector]) + "\n}\n");
            }
          }
          return css.join("\n");
        };

        var styleElement = document.createElement("style");
        styleElement.setAttribute("type", "text/css");
        styleElement.appendChild(document.createTextNode(""));
        styleElement.appendChild(document.createTextNode(parseStyles(jsonStyles)));

        document.head.appendChild(styleElement);
        return styleElement;
      };

      /**
       * appendMarkup parses JSON-formatted markup into HTML
       *
       * @private
       * @param {JSON} jsonMarkup
       * @return {Element} root of the UI element as appended to DOM.
       */
      var appendMarkup = function (jsonMarkup) {
        var parseMarkup = function (root, parent) {
          if ("element" in root) {
            var ele = document.createElement(root.element);
            if ("content" in root) {
              ele.appendChild(document.createTextNode(root.content));
            }
            if ("attributes" in root) {
              for (var attribute in root.attributes) {
                if (root.attributes.hasOwnProperty(attribute)) {
                  ele.setAttribute(attribute, root.attributes[attribute]);
                }
              }
            }
            if ("childNodes" in root) {
              for (var i = 0; i < root.childNodes.length; i++) {
                parseMarkup(root.childNodes[i], ele);
              }
            }
            parent.appendChild(ele);
          }
        };

        var container = document.getElementById(markupId);
        if (!!container) {
          parseMarkup(jsonMarkup, container);
        } else {
          if (!CONFIG.parentElement) {
            CONFIG.parentElement = document.querySelector("body");
          }
          container = document.createElement("DIV");
          container.setAttribute("id", markupId);
          CONFIG.parentElement.appendChild(container);
          parseMarkup(jsonMarkup, container);
        }

        return container;
      };

      /**
       * removeMarkup safely removes markup.
       *
       * @private
       * @param {DOMElement} ele is the target element.
       */
      var removeMarkup = function (ele) {
        if (ele !== undefined && "parentNode" in ele) {
          ele.parentNode.removeChild(ele);
        }
      };

      /**
       * clearClassList removes all|select class attribute value(s)
       *
       * @private
       * @param {DOMElement} ele is the target element.
       * @param {String|Array|Object} target is one className or list or Object.keys to remove.
       * @param {String} exempt is a className to preserve.
       */
      var clearClassList = function (ele, target, exempt) {
        if (!!ele && "classList" in ele) {
          if (!!target) {
            if (target === Object(target)) {
              try {
                Object.keys(target).forEach(function(key) {
                  if (target[key] !== exempt) {
                    ele.classList.remove(target[key]);
                  }
                });
              } catch(err) {
                console.warn(identity, "clearClassList() could not find classNames to remove!", err);
              }
            } else {
              ele.classList.remove(target);
            }
          } else {
            /* remove all */
            var hadExempt = ele.classList.contains(exempt);
            var classList = ele.classList;
            while (classList.length > 0) {
              classList.remove(classList.item(0));
            }
            if (hadExempt) {
              ele.classList.add(exempt);
            }
          }
        }
      };

      /**
       * dispatchUI injects CSS+HTML and attaches listeners.
       *
       * @private
       * @callback {Function} executes when/if markup does not exist.
       * @param {Any} info (optional) to pass to callback.
       * @return {null}
       */
      var dispatchUI = function (callback, payload) {
        if (!styles) {
          // once appended, styles will persist
          styles = appendStyles(UI.CSS);
        }
        if (messageContainer === undefined) {
          element = appendMarkup(UI.HTML);
          setTimeout(function () {
            messageContainer = element.querySelector("INS");
            messageElement = element.querySelector("SPAN");
            clickerElement = element.querySelector("BUTTON");
            clickerElement.addEventListener("click", clickHandler, false);
            if (callback !== undefined && callback instanceof Function) {
              callback(payload);
            }
          }, 0);
        } else if (callback !== undefined && callback instanceof Function) {
          callback(payload);
        }
      };

      /**
       * dismissUI removes HTML content and listeners and unsets styles.
       * NOTE: element (container) and CSS <style> node will persist.
       *
       * @private
       * @return {null}
       */
      var dismissUI = function () {
        if (messageContainer !== undefined) {
          try {
            clickerElement.removeEventListener("click", clickHandler);
            messageContainer.removeEventListener("transitionend", transitionUpdateHandler);
            removeMarkup(messageContainer);
            clearClassList(element, null, STATE.log);
            messageContainer = undefined;
            messageElement = undefined;
            clickerElement = undefined;
          } catch (err) {
            console.warn(identity, "dismissUI", err);
          }
        }
      };

      var UI = {
        HTML: {
          "element": "ins",
          "childNodes": [
            {
              "element": "p",
              "childNodes": [
                {
                  "element": "em"
                }, {
                  "element": "span"
                }, {
                  "element": "button",
                  "content": "×"
                }
              ]
            }
          ]
        },
        CSS: {
          "ins": {
            "position": "fixed",
            "z-index": /CONFIG.zIndex/,
            "top": /CONFIG.top/,
            "left": 0,
            "right": 0,
            "margin": "unset",
            "padding": "unset",
            "width": "auto",
            "text-align": "center",
            "opacity": 1,
            "-webkit-transform": "none",
            "-moz-transform": "none",
            "-ms-transform": "none",
            "transform": "none",
            "transition": "all 400ms ease",
            "clip-path": "inset(0px 0px 0px 0px)"
          },
          "ins p": {
            "position": "relative",
            "display": "inline-block",
            "top": "-100px",
            "width": "100%",
            "height": "100%",
            "min-width": "200px",
            "margin": "0 auto",
            "padding": "0.5em 0.5em 0.5em 2em",
            "box-sizing": "border-box",
            "box-shadow": "none",
            "border": "none",
            "border-radius": 0,
            "border-bottom": "1px solid black",
            "text-align": "center",
            "font-size": "1.1em",
            "line-height": 1.6,
            "color": "white",
            "-webkit-background-clip": "padding-box",
            "-moz-background-clip": "padding",
            "background-clip": "padding-box",
            "transition": "all 400ms ease"
          },
          "ins p span": {
            "display": "inline-block",
            "max-width": "50em"
          },
          "div#.error p": {
            "background-color": "red",
            "color": "white"
          },
          "div#.alert p": {
            "background-color": "#0094d1",
            "color": "white"
          },
          "div#.warning p": {
            "background-color": "#fcd209",
            "color": "black"
          },
          "div#.success p": {
            "background-color": "#00bb55",
            "color": "white"
          },
          "button": {
            "float": "right",
            "margin": 0,
            "padding": "0 8px 0 16px",
            "font-size": "1.5em",
            "font-weight": "bold",
            "line-height": 1,
            "background": "none",
            "border": "none",
            "color": "rgba(0, 0, 0, 0.5)",
            "-webkit-box-sizing": "content-box",
            "-moz-box-sizing": "content-box",
            "box-sizing": "content-box",
            "outline": "none"
          },
          "button:hover": {
            "color": "white"
          },
          "button:active": {
            "color": "black"
          },
          "div#.persist button": {
            "visibility": "hidden"
          },
          "@-webkit-keyframes progress": {
            "to": "background-position: 40px 0;"
          },
          "@-moz-keyframes progress": {
            "to": "background-position: 40px 0;"
          },
          "@keyframes progress": {
            "to": "background-position: 40px 0;"
          },
          "div#.persist:not(.update) p": {
            "-webkit-animation": "progress 1s linear infinite !important",
            "-moz-animation": "progress 1s linear infinite !important",
            "animation": "progress 1s linear infinite !important",
            "background-repeat": "repeat !important",
            "background-size": "40px 40px !important",
            "background-image": "linear-gradient(-45deg, rgba(255, 255, 255, 0.2) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.2) 75%, transparent 75%, transparent) !important"
          },
          "em": {
            "font-style": "normal",
            "font-weight": "bold",
            "text-transform": "capitalize"
          },
          "em:not(:empty)::after": {
            "content": "'!'",
            "padding-right": "1em"
          },
          "div#.detached ins": {
            "top": "-100px",
            "left": "50%",
            "right": "unset",
            "width": "unset",
            "opacity": 0,
            "-webkit-transform": "none",
            "-moz-transform": "none",
            "-ms-transform": "none",
            "transform": "none",
            "clip-path": "unset"
          },
          "div#.detached ins > p": {
            "position": "unset",
            "border": "3px solid white",
            "box-shadow": "0px 2px 12px rgba(0, 0, 0, 0.5)",
            "-webkit-border-radius": "2em",
            "-moz-border-radius": "2em",
            "border-radius": "2em",
            "-webkit-box-sizing": "content-box",
            "-moz-box-sizing": "content-box",
            "box-sizing": "content-box"
          },
          "div#.active ins": {
            "-webkit-transform": "rotateX(0deg)",
            "-moz-transform": "rotateX(0deg)",
            "-ms-transform": "rotateX(0deg)",
            "transform": "rotateX(0deg)",
            "-webkit-transition": "all 300ms ease",
            "-moz-transition": "all 300ms ease",
            "-ms-transition": "all 300ms ease",
            "transition": "all 300ms ease"
          },
          "div#.detached.active ins": {
            "top": "30px",
            "opacity": 1
          },
          "div#.active ins > p": {
            "top": 0
          },
          "div#.detached.update ins": {
            "-webkit-transform": "rotateX(360deg)",
            "-moz-transform": "rotateX(360deg)",
            "-ms-transform": "rotateX(360deg)",
            "transform": "rotateX(360deg)"
          },
          "div#.updated ins": {
            "-webkit-transform": "rotateX(0deg)",
            "-moz-transform": "rotateX(0deg)",
            "-ms-transform": "rotateX(0deg)",
            "transform": "rotateX(0deg)"
          },
          "div#.detached ins:not([style*=width])": {
            "-webkit-transition": "none",
            "-moz-transition": "none",
            "-ms-transition": "none",
            "transition": "none"
          },
          "aside": {
            "position": "fixed",
            "z-index": /CONFIG.zIndexLog/,
            "top": /CONFIG.top/,
            "left": 0,
            "right": 0,
            "margin": "unset",
            "padding": "unset",
            "width": "auto",
            "text-align": "center",
            "clip-path": "inset(0px 0px 0px 0px)",
            "max-height": "50%",
            "overflow-y": "auto"
          },
          "aside:hover": {
            "border-bottom": "1px solid black"
          },
          "aside > div": {
            "position": "relative",
            "top": "-100px",
            "width": "100%",
            "background": "whitesmoke",
            "border-bottom": "1px solid black",
            "opacity": 0,
            "transition": "all 200ms ease-in"
          },
          "div#.log aside > div": {
            "top": 0,
            "opacity": 1,
            "transition": "all 200ms ease-out"
          },
          "aside table": {
            "width": "inherit",
            "border-collapse": "separate",
            "border-spacing": "2px"
          },
          "aside table tr:nth-child(odd)": {
            "background-color": "rgba(120, 110, 100, 0.1)"
          },
          "aside table tr:hover": {
            "background": "#fefe88"
          },
          "aside table tr td": {
            "width": "5%",
            "margin": "unset",
            "padding": "0.3em 1em",
            "text-align": "center",
            "white-space": "nowrap",
            "border": "none",
            "border-radius": "unset"
          },
          "aside table tr td.message": {
            "width": "80%",
            "padding-right": "1em",
            "white-space": "normal",
            "text-align": "left"
          },
          "aside table tr td.href": {
            "max-width": "16em",
            "padding-right": "1em",
            "white-space": "nowrap",
            "overflow": "hidden",
            "text-align": "left",
            "text-overflow": "ellipsis"
          },
          "aside table tr td.error": {
            "background-color": "red",
            "color": "black",
            "font-variant": "small-caps"
          },
          "aside table tr td.alert": {
            "background-color": "#0094d1",
            "color": "white",
            "font-variant": "small-caps"
          },
          "aside table tr td.warning": {
            "background-color": "#fcd209",
            "color": "black",
            "font-variant": "small-caps"
          },
          "aside table tr td.success": {
            "background-color": "#00bb55",
            "color": "white",
            "font-variant": "small-caps"
          }
        }
      };

      /* USER INTERFACE IMPLEMENTATION */

      var timerStart = 0,
          timerShow = 0,
          timerDone = 0;

      /**
       * execute renders a new message notification, triggering CSS transitions.
       * NOTE: DOM elements are assumed to exist, e.g. dispatchUI(execute);
       * NOTE: When delay is TIME.immediate, any pre-existing message is usurped.
       *
       * @private
       * @param {Object} model (required) is an instance of Model(); All properties are assumed.
       */
      var execute = function (model) {

        var delay, elapsed, levelEle, textEle, width, offset;
        
        setCurrentToast(model);
        clearTimeout(timerStart);
        clearTimeout(timerShow);
        clearTimeout(timerDone);

        // MESSAGE
        messageElement.innerHTML = "";
        if (CONFIG.prefix && /warning|error|success/.test(model.level)) {
          levelEle = document.createTextNode(model.level);
          messageContainer.querySelector("EM").innerHTML = "";
          messageContainer.querySelector("EM").appendChild(levelEle);
        }
        model.message.split("\n").forEach(function (line, linebreak) {
          textEle = document.createTextNode(line);
          if (!!linebreak) {
            messageElement.appendChild(document.createElement("BR"));
          }
          messageElement.appendChild(textEle);
        });

        // DELAY
        delay = model.delay;
        if (model.delay === TIME.immediate && element.classList.contains(STATE.active)) {
          /* an update is going directly to a pre-existing toast (usually a "spinner") */
          messageContainer.addEventListener("transitionend", transitionUpdateHandler, true);
          model.integrate = !element.classList.contains(STATE.detached);
          clearClassList(element, LEVEL);
          element.classList.add(model.level);
          element.classList.add(STATE.update);
        } else {
          clearClassList(element, LEVEL);
          element.classList.add(model.level);
          if (model.delay > TIME.minimal) {
            /* prescribed delay may already be eclipsed by a wait in queue */
            elapsed = Date.now()-model.created;
            delay = elapsed < delay ? delay-elapsed : TIME.minimal;
          }
        }

        // INTEGRATION
        if (inferIntegration(model)) {
          element.classList.remove(STATE.detached);
          messageContainer.setAttribute("style", "");
        } else {
          element.classList.add(STATE.detached);
          width = messageContainer.offsetWidth;
          offset = -Math.floor(width / 2) - 25;
          messageContainer.setAttribute("style", "width:" + width + "px;margin-left:" + offset + "px;z-index:" + ZMAX);
        }

        // PAUSE
        if (model.pause === TIME.persisting) {
          element.classList.add(STATE.persist);
        }

        // NOTIFICATION
        timerStart = setTimeout(function () {
          element.classList.add(STATE.active);
          timerShow = setTimeout(function () {
            element.classList.remove(STATE.active);
            timerDone = setTimeout(function () {
              model.callback(true);
              if (queue.length > 0) {
                execute(queue.pop());
              } else {
                setCurrentToast({});
                dismissUI();
              }
            }, TIME.transition);
          }, model.pause);
        }, delay);

        // ECHO
        if (CONFIG.echo) {
          switch (model.level) {
            case LEVEL.error:
              console.error(identity, model.message);
              break;
            case LEVEL.warning:
              console.warn(identity, model.message);
              break;
            default:
              console.log(identity, model.message);
          }
        }
      };

      /**
       * toast is the primary API for generating a notification instance queued for display.
       * @example Postette.toast("Hello World!", { level:"warning", pause:"moderate", delay:0, integrate: false });
       *
       * @public by proxy
       * @param {String} message (required) the text to message in a notification. A newline character "\n" may be embedded to impose line-break(s).
       * @param {String|Object} options (optional) can be level as String ("error", "warning", "alert", "success", "custom") or an Object of settings.
       * @param {Function} callback (optional) code to execute when message has transpired. Passes a true if messaged, or false if not (e/g a duplicate was in queue).
       * @returns {Boolean} true when a message is successfully queued for display, false when not (e.g. message is a reiteration).
       */
      var toast = function (message, options, callback) {

        var instance, config = {};

        if (message === undefined || !(/string/i.test(typeof message))) {
          console.error(identity, "An input could not be processed!", message);
          return false;
        } else {
          config.message = message;
        }

        /* callback could be the last of any number of arguments */
        if (arguments[arguments.length - 1] instanceof Function) {
          config.callback = arguments[arguments.length - 1];
          arguments[arguments.length - 1] = null;
        }

        if (options !== undefined && /string/i.test(typeof options) && options in STATE) {

          /* allow the options argument to also be the level (a more convient method profile). */
          config.level = LEVEL[options];

        } else if (options !== undefined && options === Object(options)) {
          for (var setting in options) {
            if (options.hasOwnProperty(setting)) {
              switch (setting.toLowerCase()) {
                case "level":
                  if (options[setting] in LEVEL) {
                    config.level = LEVEL[options[setting]];
                  }
                  break;
                case "pause":
                  if (/[1-9]\d*/.test(options[setting])) {
                    config.pause = Math.max(TIME.minimal, parseInt(options[setting]));
                  } else if (/infini/i.test(options[setting])) {
                    config.pause = TIME.persisting;
                  } else if (/string/i.test(typeof options[setting]) && options[setting] in SPAN) {
                    config.pause = SPAN.getValue(options[setting], message);
                  }
                  break;
                case "delay":
                  if (/-?\d*/.test(options[setting])) {
                    config.delay = parseInt(options[setting]) < 0 ? TIME.immediate : Math.max(TIME.minimal, parseInt(options[setting]));
                  } else if (/string/i.test(typeof options[setting]) && options[setting] in SPAN) {
                    config.delay = SPAN.getValue(options[setting], message);
                  }
                  break;
                case "callback":
                  if (options[setting] instanceof Function) {
                    config.callback = options[setting];
                  }
                  break;
                case "integrate":
                  config.integrate = /null|auto/i.test(options[setting]) ? null : /1|true/i.test(options[setting])
                  break;
                case "once":
                  config.once = !!options[setting];
                  break;
                default:
                  console.error(identity, "A setting could not be implemented:", setting, options[setting]);
              }
            }
          }
        }

        instance = new Model(config);
        if (CONFIG.reiterate || isUnique(instance)) {
          collection.push(instance);
          if (messageContainer !== undefined) {
            if (instance.delay === TIME.immediate) {
              execute(instance);
            } else {
              queue.unshift(instance);
            }
          } else {
            if (element === undefined || element.hasChildNodes() === false) {
              dispatchUI(execute,instance);
            } else {
              queue.unshift(instance);
            }
          }

          if (CONFIG.trace) {
            console.log(identity, "new item:", instance);
          }
          if (!!element && element.classList.contains(STATE.log)) {
            doLog(instance);
            if (messageContainer === undefined) {
              /* a visible log can short-circuit execute(); */
              dispatchUI(execute, queue.pop());
            }
          }

        } else {
          instance.callback(false);
          return false;
        }
        return true;

      };

      /**
       * toaster implements the convenience API methods, alert(), warning(), error(), persist(), update(), et al.
       * defaults will be applied for all customizable options. No callback allowed.
       *
       * @public
       * @param {Object|String} msg (required) is an XHR Response Object or a message String.
       * @param {String|Undefined} alt (optional) the message if a ResponseMessage is not found within Response Object.
       * @param {String} level (required) the class of notification to message (NOTE: can also be a STATE, e.g. "update").
       * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
       */
      var toaster = function (msg, alt, level) {
        var message = alt;
        var pause = TIME.moderate;
        var delay = TIME.minimal;
        if (msg === Object(msg)) {
          message = findPropertyValue(msg, "ResponseMessage")[0];
        } else if (/string/i.test(typeof msg)) {
          message = msg;
        }
        if (level !== undefined && level in STATE) {
          if (/update|stop/i.test(level)) {
            delay = SPAN.immediate;
          } else if (/persist|spin/i.test(level)) {
            pause = SPAN.persist;
          }
        }
        if (message === undefined) {
          return false;
        } else {
          pause = Math.max(SPAN.getValue(SPAN.compute, message), pause);
          return toast(message, { level: level, pause: pause, delay: delay });
        }
      };

      /* LOGGING */

      /**
       * undoLog removes a list of the collection from view.
       * @private
       */
      var undoLog = function() {
        clearClassList(element, STATE.log);
        setTimeout(function(){
          removeMarkup(logContainer);
          logContainer = undefined;
        },400);
      };

      /**
       * doLog toggles a list of the collection into view.
       *
       * @public by proxy.
       * @param {Object} addendum is a Model instance to prepend to a list in view.
       */
      var doLog = function(addendum) {
        var log, wrap, table, row;
        var buildRow = function(item) {
          var columns = ["id","user","created","level","message", "href"];
          var d = new Date(item.created);
          var tr = document.createElement("TR");
          columns.forEach(function(column) {
            var td = document.createElement("TD");
            switch (column) {
              case "created":
                td.appendChild(document.createTextNode(d.toLocaleTimeString()));
                break;
              case "level":
                td.appendChild(document.createTextNode(item[column]));
                td.classList.add(item[column]);
                break;
              case "href":
              case "message":
                td.appendChild(document.createTextNode(item[column]));
                td.classList.add(column);
                break;
              default:
                td.appendChild(document.createTextNode(item[column]));
            }
            tr.appendChild(td);
          });
          return tr;
        };
        if (element === undefined) {
          dispatchUI(dismissUI);
        }
        if (logContainer === undefined) {
          wrap = document.createElement("DIV");
          table = document.createElement("TABLE");
          logContainer = document.createElement("ASIDE");
          if (collection.length > 0) {
            for (var i = collection.length - 1; i > -1; i--) {
              var item = collection[i];
              row = buildRow(item);
              table.appendChild(row);
            }
            table.querySelector("TD").innerHTML = "Latest";
          } else {
            row = buildRow(new Model({ message:"There have been no notifications yet!" }));
            table.appendChild(row);
          }
          wrap.appendChild(table);
          logContainer.appendChild(wrap);
          if (messageContainer === undefined) {
            element.appendChild(logContainer);
          } else {
            element.insertBefore(logContainer, messageContainer);
          }
          setTimeout(function(){
            element.classList.add(STATE.log);
          },0);
        } else if (!!addendum) {
          if (logContainer !== undefined) {
            log = logContainer.querySelector("TABLE");
            row = buildRow(addendum);
            log.insertBefore(row, log.querySelector("TR"));
          }
        } else {
          undoLog();
        }
      };

      return {

        /* PUBLIC API */

        /**
         * init is called ONCE to instantiate this library (or again to reconfigure).
         *
         * @public
         * @param {Object} settings are any name:value pairs to override defaults here.
         * @example { top:"0px" } initializes to display messages at top of page.
         */
        init: function(settings) {
          if (!!settings && settings === Object(settings)) {
            for (var rule in settings) {
              if (settings.hasOwnProperty(rule)) {
                switch (rule.toLowerCase()) {
                  case "echo":
                  case "trace":
                  case "prefix":
                  case "reiterate":
                  case "clickaway":
                    for (var prop in CONFIG) {
                      if (CONFIG.hasOwnProperty(prop)) {
                        if (prop.toLowerCase()===rule.toLowerCase()) {
                          CONFIG[prop] = !!settings[rule];
                        }
                      }
                    }
                    break;
                  case "integration":
                    CONFIG.integration = /null/i.test(settings[rule]) ? null : !!settings[rule];
                    break;
                  case "tldr":
                    if (/^[1-9]\d*$/.test(settings[rule])) {
                      CONFIG.tldr = parseInt(settings[rule]);
                    } else {
                      console.warn(identity, "init:", "The tldr setting must be an Integer.");
                    }
                    break;
                  case "modalselector":
                    if (Array.isArray(settings[rule])) {
                      CONFIG.modalSelector = settings[rule];
                    } else if (Object.prototype.toString.call(settings[rule]) === "[object String]") {
                      CONFIG.modalSelector = [settings[rule]];
                    } else {
                      console.warn(identity, "init:", "The modalSelector setting must be a String or Array.");
                    }
                    break;
                  case "top":
                    if (/^[1-9]\d*$/.test(settings[rule])) {
                      CONFIG.top = settings[rule] + "px";
                    } else if (/.+(mm|cm|in|pt|pc|em|ex|ch|rem|vw|vh|%)$/.test(settings[rule])) {
                      CONFIG.top = settings[rule];
                    } else {
                      console.warn(identity, "init:", "The top setting must be in CSS-compliant units.");
                    }
                    break;
                  case "zindex":
                    if (/^[1-9]\d*$/.test(settings[rule])) {
                      CONFIG.zIndex = Math.min(ZMAX, parseInt(settings[rule]));
                    } else {
                      console.warn(identity, "init:", "The zIndex setting must be an Integer.");
                    }
                    break;
                  case "zindexlog":
                    if (/^[1-9]\d*$/.test(settings[rule])) {
                      CONFIG.zIndexLog = Math.min(ZMAX, parseInt(settings[rule]));
                    } else {
                      console.warn(identity, "init:", "The zIndexLog setting must be an Integer.");
                    }
                    break;
                  case "parentelement":
                    if ("appendChild" in settings[rule]) {
                      CONFIG.parentElement = settings[rule];
                    } else {
                      CONFIG.parentElement = document.querySelector("body");
                      console.warn(identity, "init:", "The parentElement must be a valid DOM element.");
                    }
                    break;
                  default:
                    console.warn(identity, "init:", "An initialization setting was not recognized:", rule);
                }
              }
            }
          }
        },

        /**
         * close will dismiss and destroy UI of message notification and log list.
         */
        close: function() {
          clickHandler();
          undoLog();
        },

        /**
         * notify is the primary API for generating a notification to the person interacting with the interface.
         * @example Postette.toast("Hello World!", { level:"warning", pause:"moderate", delay:0, integrate: false });
         *
         * @public by proxy
         * @param {String} message (required) the text to message in a notification. A newline character "\n" may be embedded to impose line-break(s).
         * @param {String|Object} options (optional) can be the message level ("error", "warning", "alert", "success", "custom") or an object of settings.
         * @param {Function} callback (optional) code to execute when message has transpired. Passes a true if messaged, or false if not (e/g a duplicate was in queue).
         */
        notify: function(message, options, callback) {
          toast(message, options, callback);
        },

        /**
         * alert is a convenience method to create a toast of level:alert.
         * defaults will be applied for all customizable options. No callback allowed.
         *
         * @public
         * @param {Object|String} response (required) is an XHR Response Object or a message String.
         * @param {String} alternative (optional) the message if a ResponseMessage is not found within the Response Object.
         * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
         */
        alert: function(response, alternative) {
          toaster(response, alternative, LEVEL.alert);
        },

        /**
         * error is a convenience method to create a toast of level:error.
         * defaults will be applied for all customizable options. No callback allowed.
         *
         * @public
         * @param {Object|String} response (required) is an XHR Response Object or a message String.
         * @param {String} alternative (optional) the message if a ResponseMessage is not found within the Response Object.
         * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
         */
        error: function(response, alternative) {
          toaster(response, alternative, LEVEL.error);
        },

        /**
         * warning is a convenience method to create a toast of level:warning.
         * defaults will be applied for all customizable options. No callback allowed.
         *
         * @public
         * @param {Object|String} response (required) is an XHR Response Object or a message String.
         * @param {String} alternative (optional) the message if a ResponseMessage is not found within the Response Object.
         * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
         */
        warning: function(response, alternative) {
          toaster(response, alternative, LEVEL.warning);
        },

        /**
         * success is a convenience method to create a toast of level:success.
         * defaults will be applied for all customizable options. No callback allowed.
         *
         * @public
         * @param {Object|String} response (required) is an XHR Response Object or a message String.
         * @param {String} alternative (optional) the message if a ResponseMessage is not found within the Response Object.
         * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
         */
        success: function(response, alternative) {
          toaster(response, alternative, LEVEL.success);
        },

        /**
         * persist (or spinner) is a convenience method to create a toast of state:persist.
         * defaults will be applied for all customizable options. No callback allowed.
         *
         * @public
         * @param {Object|String} response (required) is an XHR Response Object or a message String.
         * @param {String} alternative (optional) the message if a ResponseMessage is not found within the Response Object.
         * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
         */
        persist: function(response, alternative) {
          toaster(response, alternative, STATE.persist);
        },
        spinner: function(response, alternative) {
          toaster(response, alternative, STATE.persist);
        },

        /**
         * update (or done) is a convenience method to create a toast of state:update.
         * defaults will be applied for all customizable options. No callback allowed.
         *
         * @public
         * @param {Object|String} response (required) is an XHR Response Object or a message String.
         * @param {String} alternative (optional) the message if a ResponseMessage is not found within the Response Object.
         * @returns {Boolean} true if messaged or queued, false if duplicate or failure.
         */
        update: function(response, alternative) {
          toaster(response, alternative, STATE.update);
        },
        done: function(response, alternative) {
          toaster(response, alternative, STATE.update);
        },

        /**
         * globalClickHandler is a means to listen to a document event to quit messages/log.
         *
         * @public
         * @param event
         * @returns {Boolean} true when relevant.
         */
        globalClickHandler: function(event) {
          if (CONFIG.clickAway) {
            var target = event && "target" in event ? event.target : document.body;
            while (!!target.parentNode && !/^body$/i.test(target.nodeName) && target.id !== markupId) {
              target = target.parentNode;
            }
            if (target === document.body) {
              setTimeout(function() {
                if (!!element) {
                  if (element.classList.contains("log")) {
                    undoLog();
                  } else if (element.classList.contains("active")) {
                    clickHandler();
                  }
                }
              },1);
            }
          }
        },

        /* GETTERS AND SETTERS */

        clearHistory: function() {
          collection = [];
          undoLog();
        },

        getHistory: function() {
          return collection;
        },

        toggleReiterate: function() {
          CONFIG.reiterate = !CONFIG.reiterate;
          return CONFIG.reiterate;
        },

        toggleEcho: function () {
          CONFIG.echo = !CONFIG.echo;
          return CONFIG.echo;
        },

        toggleTrace: function () {
          CONFIG.trace = !CONFIG.trace;
          return CONFIG.trace;
        },

        /**
         * setCustomLevel provides a means to apply an arbitrary CSS className to the notification message.
         *
         * @public
         * @param {String} name (required) a unique word for classification (no whitespace is allowed).
         * @returns {Object|null} the newly prescribed LEVEL names (or null when fail).
         */
        setCustomLevel: function (name) {
          if (name !== undefined && /string/i.test(typeof name) && !(name in LEVEL)) {
            var className = name.replace(/\s/g,"");
            LEVEL[className] = className;
          } else {
            console.warn(identity, "setCustomLevel:", "A custom level name must be unique.");
            return null;
          }
          return LEVEL;
        },

        setClickAway: function (boo) {
           CONFIG.clickAway = !!boo;
           return CONFIG.clickAway;
        },

        getLevels: function () {
          return LEVEL;
        },

        getStates: function () {
          return STATE;
        },

        getTimes: function () {
          return TIME;
        },

        getSpans: function () {
          return SPAN;
        },

        /**
         * addModalSelector pushes a new querySelector-compliant string to CONFIG.modalSelector.
         * NOTE: The visibility of found DOM element(s) asserts incompatibility with integrated appearance. 
         * WARNING: Selector strings are only validated by naked call of document.querySelector(selector);
         * 
         * @public
         * @param {String} selector (required) is the querySelector-compliant string. 
         */
        addModalSelector: function (selector) {
          if (Object.prototype.toString.call(selector) === "[object String]") {
            if (CONFIG.modalSelector.indexOf(selector) < 0) {
              CONFIG.modalSelector.push(selector);
            }
          }
          return CONFIG.modalSelector;
        },

        /**
         * setComputeFactor sets a per-character multiplier for computing pause enough for a message to be read.
         *
         * @public
         * @param {Number} val (required) is the number of milliseconds to allow per character.
         * @returns {Number} the computed or most allowable value.
         */
        setComputeFactor: function (val) {
          if (/^\d+$/.test(val)) {
            TIME.perCharacterFactor = Math.max(10, Math.abs(parseInt(val)));
            return TIME.perCharacterFactor;
          } else {
            console.error(identity, "setComputeFactor(int); Integer required!");
          }
        },

        getPrevious: function() {
          return previousNotification;
        },

        getCurrent: function() {
          return currentNotification;
        },

        getQueue: function () {
          return queue;
        },

        clearQueue: function () {
          clearTimeout(timerStart);
          clearTimeout(timerShow);
          clearTimeout(timerDone);
          clearClassList(element, STATE.active);
          previousNotification = {};
          currentNotification = {};
          queue = [];
        },

        /*
         * instance.log() prints the message collection to the browser's console.
         */
        log: function() {
          if (collection.length > 0) {
            console.log(identity, collection.length, "notification(s) logged:");
            collection.forEach(function(item) {
              var d = new Date(item.created);
              switch (item.level) {
                case LEVEL.error:
                  console.error(item.id, item.user, d.toLocaleTimeString(), item.message, item.href);
                  break;
                case LEVEL.warning:
                  console.warn(item.id, item.user, d.toLocaleTimeString(), item.message, item.href);
                  break;
                default:
                  console.log(item.id, item.user, d.toLocaleTimeString(), item.message, item.href);
              }
            });
          } else {
            console.log(identity, "No notifications currently logged.");
          }
        },

        print: function(quit) {
          if (quit === true) {
            undoLog();
          } else {
            doLog();
          }
        },

        getMarkupId: function () {
          return markupId;
        },

        getVersion: function () {
          return version;
        },

        getAPI: function() {
          return this;
        },

        getConfig: function() {
          /* configurable options */
          return CONFIG;
        }
      };
    }
)));
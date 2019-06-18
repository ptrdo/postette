###### This is pre-release software, but please **[log issues](https://github.com/ptrdo/postette/issues)** found.
# Postette `v0.3.0`
A zero-dependency gadget for the management and execution of notifications to a person interacting with a web client application.
### The Gist
This JavaScript module, [postette.js](postette.js), should allow a web client to communicate important information to a person interacting with it, including alerts, warnings, and errors. Communicating important events to the person interacting with a web client is friendly and conducive to better usability. 

Included within this zero-dependency code is the required user interface (HTML) and styles (CSS) which are unobtrusively appended to any HTML document. A simple example is provided (see [the examples](/tree/master/postette/example)).

***
![A Postette message.](example/postette.png)
***
### Simple Usage
**1:** In an HTML document, simply attach the module and instantiate when the document is ready:
```html
<script src="relative/path/to/postette.js"></script>
<script>
    document.addEventListener("DOMContentLoaded", function(event) {
        window.postette.init({
            echo: true,
            prefix: false
        });
    });
</script>
```
**2:** Run the HTML document in a web browser. A web server (or localhost) is recommended for complete functionality.

**3:** When attached as in this simple usage example, the module will be addressable in the global namespace as **`window.postette`**  by default (see [Advanced Usage](#advanced-usage) for other options). An example of JavaScript calling a few public API methods:
```javascript
window.postette.alert("Hello World"); // displays a low-level "alert" with default settings.
window.postette.notify("Please Wait!", { pause:Infinity, integrate:false }); // displays a persisting message.
window.postette.notify("Done!", { level:"success", delay:-1 }); // cancels a persisting message.
```
**4:** Requests to a REST service produce results that will be interesting to the person interacting with a web client. This notification system provides a simple means to pass the Request's Response Object, parsing any message provided by the service, but then communicating a backup message when nothing is found.
```javascript
var request = new XMLHttpRequest();
request.open("GET", "https:/some.domain.org/api/users?format=json", true);
request.onreadystatechange = function() {
    if (request.readyState === 4) {
        if (request.status === 200) {
            window.postette.success(JSON.parse(request.responseText), "Success!");
        } else {
            window.postette.error(request.statusText, "Oops! Something went wrong!");
        }
    }
};
request.send();
```

***
### Installation
While it is possible to simply clone or download this repository and drag the code into a project, it is recommended to use a package manager to maintain version control and facilitate keeping dependent projects current with the latest changes.

[Yarn](https://yarnpkg.com/) is an excellent choice for managing packages for web clients and can be [installed a variety of ways](https://yarnpkg.com/en/docs/install). One important advantage of Yarn over similar tools like Node Package Manager ([NPM](https://www.npmjs.com/get-npm)) is that private repositories (like this one) can be installed without requiring a public registry. 

**1:** From a command prompt, navigate to the project path where this module should be installed.
```sh
> cd C:\path\to\myProject
```

**2:** It this is a new project, initialize it with a configuration. Note: Returning through a question will apply the default.
```sh
> yarn init
> question name (myProject): your-project-name
> question version (1.0.0):
> question description: Practicing the Postette.
> question entry point (index.js):
> question git repository: https://github.com/my-account/my-project-name
> question author: My Name Here
> question license (MIT):
> question private:
success Saved package.json
```

**3:** The result of `yarn init` is a `package.json` file (per the example above):
```javascript
{
  "name": "my-project-name",
  "version": "1.0.0",
  "description": "Practicing the Postette.",
  "main": "index.js",
  "repository": {
    "url": "https://github.com/my-account/my-project-name",
    "type": "git"
  },
  "author": "My Name Here",
  "license": "MIT"
}
```

**4:** Now, add the latest Postette release to the project.
```sh
> yarn add postette
```

**5:** The result should be a new folder at the root of the project named "**node_modules**" and populated with a folder named "**postette**" containing the contents of the latest release.

**6:** As there are new releases, update the project to the latest version. Note: the `upgrade` can also be made globally to all packages in the project by not specifying a package.
```sh
> yarn upgrade postette --latest
```
**NOTE:** If problems are encountered with the `add` and `upgrade` procedures detailed above, please be certain to update all associated softwares, including `yarn`, `npm`, and `git` (especially [Git for Windows](https://git-scm.com/download/win)), before investigating other remedies.

***
### Configuration Options
When instantiating this code, a configuration object is passed to the initializing method:
```javascript
import Postette from "path/to/postette.js";

function start() {
    Postette.init({
        echo: true,
        prefix: false
    });
};

start();
````
This supplies the code with any customizing parameters necessary for the particular implementation. It is not necessary to provide properties which are expected to assume the default. At runtime, these values can be gotten by the web client via the [public API method](#public-methods-api), getConfig();

| Property | Data Type | Default | Options |
|----------|-----------|---------|---------|
| `echo` | *Boolean* | `false` | When true, also sends all messages to browser console.log/warn/error |
| `trace` | *Boolean* | `false` | When true, prints all computed properties to console.log() as new messages are queued. |
| `reiterate` | *Boolean* | `false` | When true, will queue messages even if duplicate(s) exist in view or queue. |
| `prefix` | *Boolean* | `true` | When true, renders the level preceding message (e.g. "404 Not found." becomes "Error! 404 Not found."). |
| `integration` | *Boolean or null* | `null` | Always integrate when true, never when false, or automatic when null. A boolean value overrides [Notify Option](#notify-options) |
| `tldr` | *Integer* | `72` | Too Long, Didn't Read is the minimum message length for defaulting to `integrate:true` (when integration is automatic). |
| `modalSelector` | *Array* | `["[id^=modal].active"]` | Array of querySelector-compliant string(s) of DOM element(s) which would be incompatible with an integrated message. |
| `zIndex` | *Integer* | `2147483647-100` | Prescribes relative layering of the messaging element via CSS z-index. Default is `100` less than the maximum possible value. |
| `zIndexLog` | *Integer* | `2147483647-500` | Prescribes relative layering of the log (print) element via CSS z-index. Default is `500` less than the maximum possible value. |
| `top` | *String* | `"50px"` | Value attributable to CSS top (in sanctioned units, e/g "px", "rem", "%"). Integer-only value will be set as "px". |
| `downwards` | *Boolean* | `true` | When true, notifications animate downwards into view, elsewise upwards (todo). |
| `parentElement` | *DOMElement* | `null` | Where to append the messaging markup. This must be an appendable element. Otherwise (or by default), `document.body` will be used. |
| `clickAway` | *Boolean* | `true` | Will quit messages and close log upon call of `Postette.globalClickHandler(event);` |

***
### Public Methods (API)

Once instantiated in the web client code (see [Simple Usage](#simple-usage) or [Advanced Usage](#advanced-usage)), the local logic can be addressed via a variety of public methods, getters, and setters. When loaded simply, the code will be an addressable object in the window namespace: **window.postette**. Advanced usage could scope an instance name to whatever is convenient for that code.

```javascript

Postette.notify("An Immediate Warning!", { level:"warning", delay: -1, pause: "ample" });

````

See the [Notify Options](#notify-options) or the [code documentation](postette.js) for more explanation and additional public methods.

| Method Name | Argument(s) | Description |
|-------------|-------------|-------------|
| `notify` | message, options, callback | The primary, general purpose method for generating a notification. See the full complement of [Notify Options](#notify-options). |
| `alert` | response, alternative | Convenience method for "alert" level notification. The first argument can be an XHR Response Object or a message String. The second argument is an alternative if a ResponseMessage is not found within the Response Object argument.  |
| `warning` | response, alternative | Convenience method for "warning" level notification. |
| `error` | response, alternative | Convenience method for "error" level notification. |
| `success` | response, alternative | Convenience method for "success" level notification. |
| `spinner` | response, alternative | Convenience method for "persist" level notification (indefinite). |
| `done` | response, alternative | Convenience method for "update" level notification (stops spinner with message). |
| `dismiss` | none | Remotely ends a current notification without message (same result as click-to-close or click-away). |
| `setCustomLevel` | name | Adds a level of notification message ([CSS overrides](#advanced-usage) will be required for styling). |
| `setComputeFactor` | value | Sets a per-character multiplier for computing pause-enough for a message to be read. The default is `100` (milliseconds). |
| `setClickAway` | boolean | When true, `globalClickHandler();` will quit messages and close the log upon firing. |
| `addModalSelector` | string | Runtime addition to querySelector elements incompatible with integrated appearance. |
| `print` | quit | Renders collection of messages (since session start) to a dropdown list in the interface. Successive calls will toggle the list, or passing `true` will remove it for certain. |
| `log` |  | Prints collection of messages (since session start) to the browser's console. |
| `clearQueue` |  | Clears the queue of impending messages (history is unaffected). |
| `clearHistory` |  | Clears the history of previous messages (queue is unaffected). |

***
### Notify Options

When employing the primary, general-purpose method, `notify(message, options, callback)`, an options object can be passed along with the message to configure the characteristics of the ensuing notification. These are the possible customization parameters. Note that if the **default** is desired, it is not required to supply that parameter. If all defaults are sufficient, an options object is not required (e.g. `notify("This is a default alert")` is totally fine).

| Parameter Name | Possible Value | Description |
|----------------|----------------|-------------|
|   |   |   |
| **`integrate`** |   | *Designates how/where notification displays, either as an extension of the layout, or as detached element floating above the layout. An explicit `true` or `false` here overrides the [Configuration Option](#configuration-options).* |
|   | *vacant* | When not supplied here (per individual message instance), this behavior defers to the [Configuration Option](#configuration-options) for `integration`. By default, `integration:null` is the **Auto** behavior described as follows: |
|   | `true` | Notification renders across the full width of the parentElement. When **Auto**, this is the behavior IF no modal is evident AND message is an `error` AND/OR longish (multi-line). This is exceptional behavior. |
|   | `false` | Notification renders as a *pill* unmoored from parentElement. When **Auto**, this is the behavior IF a modal is evident, but also whenever message is not an `error` AND shortish (single-line). This is the usual behavior. |
|   |   |   |
| **`once`** |   | *Designates a notification to be delivered only once (per session). This is useful when providing information about how an application works, after which the person should then be aware.* |
|   | `true` | Notification will be compared with all previous messages and discarded if found. |
|   | `false` | **Default.** Notification will be queued and displayed as usual. |
|   |   |   |
| **`level`** |   | *Designates the appearance of the notification. This styling provides a consistency which will be relied-upon by the person interacting with the application. Importance should not be abused.* |
|   | `"alert"` | **Default.** An informative communication (white text in a blue field). |
|   | `"warning"` | A communication to address a concern (black text in a yellow field). |
|   | `"error"` | A communication to express a failure (white text in a red field). |
|   | `"success"` | A communication to validate an expected result (white text in a green field). |
|   | `"whatever"` | A custom level can be added via [public API method](#public-methods-api), `setCustomLevel(name)`. |
|   |   |   |
| **`pause`** |   | *The period of time which will elapse while the message is fixed in display. It is recommended to allow plenty of time for a message to be acknowledged, read, and absorbed (though it is important to not be obnoxious).* |
|   | `"compute"` | **Default.** The product of message length and `perCharacterFactor` (adjustable via API). |
|   | *Integer* | Some number of milliseconds (e.g. `1000` is 1 second). |
|   | `Infinity` | The message will display indefinitely (AKA *"spinner"*). `Infinity` is a JavaScript term. |
|   | `"brief"` | A standardized time required for a person to acknowledge a message (2 seconds). |
|   | `"moderate"` | A standardized time required for a person to absorb a simple message (3 seconds). |
|   | `"ample"` | A standardized time required for a person to be obnoxiously impeded by a message (8 seconds). This is useful for exceptionally long messages (as a shorter ceiling than computed value), but also whenever the message is of utmost importance (and should be acknowledged or dismissed). |
|   |   |   |
| **`delay`** |   | *The period of time which will elapse before the message is put into display. Use this value to suspend a message to some time in the future or to put it into immediate consideration.*|
|   | `0` | **Default.** The message will be displayed immediately or queued behind any others. |
|   | `-1` | The message will be displayed immediately, ahead of queue, and/or will cancel any persisting message (*"spinner"*). |
|   | *Integer* | Some number of milliseconds (e.g. `1000` is 1 second). |
|   | *String* | The same standardized time values available for `pause` are allowed here. |
|   |   |   |
| **`callback`** | *Function* | **Optional.** *Some routine to execute after the message has been rebuffed or displayed. This can also be the last argument to the `notify` method, even instead of an options object if all defaults are implied.* |


***
### Advanced Usage

This module is organized to be implemented as a simple external script (see [Simple Usage](#simple-usage)), but also in a project governed by [Asynchronous Module Definition](https://en.wikipedia.org/wiki/Asynchronous_module_definition) (AMD) with a library such as [RequireJS](https://github.com/requirejs/requirejs), or an [ES6-compliant](http://es6-features.org/) project bundled by a library such as [Webpack](https://webpack.js.org/). The expectations are the same, but the syntax used to load, instantiate, and then address the module may be slightly different depending on circumstance.

**Old-fashioned AMD (RequireJS) Implementation:**
```javascript
require.config({
    paths: { notifier: "./path/to/postette"},
    shim: { notifier: { exports: "notifier" }}
});

define(["notifier"], function(Postette) {
    Postette.init({
       echo: true,
       prefix: false
    });
});
```

**New-fangled ES6 Module Implementation:**
```javascript
import Postette from "./path/to/postette.js";

function start() {
    Postette.init({
       echo: true,
       prefix: false
    });
};

start();
```

**CSS Style Overrides**
The Postette element is appended to the DOM and given a unique ID prefixed with `postette`. Rules can then be created with a corresponding wildcard selector. Since the CSS inherent in this code is stipulated rather precisely to avoid influencing styles within the hosting page, the `!important` clause may be necessary to enforce a style customization.
```css
 div[id^=postette] * {
   font-family: "Roboto", "Calibri", sans-serif !important;
 }

 div[id^=postette].custom p {
    /* a custom level notification */
   background-color: pink;
   color: black !important;
 }

 div[id^=postette] aside table tr td.custom {
  /* a custom level notification (log) */
   background-color: pink;
   color: black;
   font-variant: small-caps;
 }
```

**Application Integration**
Components created for a web client may only have implied coordination. This means that sometimes they must be configured to cooperate because they aren't preconfigured that way. For instance, if the Postette log should not persist between sessions, this can be accomplished by clearing the Postette log via a listener assigned to another component's event.
```javascript
MyAuthLib.addEventListener("signout", "myApplication", function() {
  Postette.clearHistory();
});
```

**Page Integration**
Components created for a web client only have implied coordination with document interaction. This means that sometimes they must be configured to cooperate because they aren't preconfigured that way. For instance, if the Postette log should be closed upon a click-away, then the document is responsible for this behavior.
```javascript
document.body.addEventListener("click", function(event) {
// assuming Postette.getConfig().clickAway === true;
   Postette.globalClickHandler(event);
});
```
###### This is released software. Please **[log issues](https://github.com/ptrdo/postette/issues)** found.
# Example of idmorg-notifier.js
Sample Implementation Demonstrating Notifications to the Person Interacting with a Web Client.

Run this HTML document, [notifier.html](notifier.html), in a web browser. A web server (or localhost) is required for demonstrating complete functionality. This demonstration assumes the `idmorg-auth.js` library within an adjacent `node_modules` path, so it is recommended to follow the instructions below.

***
### Installation
While it is possible to simply clone or download this repository and drag the code into a project, it is recommended to use a package manager to maintain version control and facilitate keeping dependent projects current with the latest changes. This is critical software that should be expected to change, and the most-current version is the only version to guarantee access into the COMPS system.

[Yarn](https://yarnpkg.com/) is an excellent choice for managing packages for web clients and can be [installed a variety of ways](https://yarnpkg.com/en/docs/install). One important advantage of Yarn over similar tools like Node Package Manager ([NPM](https://www.npmjs.com/get-npm)) is that private repositories (like this one) can be installed without requiring a public registry. Note that access to IDM's GitHub private repository is required.

**1:** From a command prompt, navigate to the path where this example directory has been installed.
```sh
> cd C:\path\to\example
```

**2:** The `package.json` at contains the necessary parameters for what is required, so simply run Yarn (entry of credentials may be required):
```sh
> yarn
```

**3:** There should now be a `node_modules` directory within the example directory. The example file, `notifier.html`, has been pre-configured to load the necessary resources from there, so simply run the file via a web server for demonstration. (HINT: An IDE such as [Eclipse](http://www.eclipse.org/downloads/eclipse-packages/), or [Jet Brain's IDEA or WebStorm](https://www.jetbrains.com/idea/) would be a fine choice).
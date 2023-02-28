const JSDOMEnvironment = require('jest-environment-jsdom');

class CustomizedJSDomEnvironment extends JSDOMEnvironment {
  constructor(config) {
    super(config);
    this.global.jsdom = this.dom;
  }

  teardown() {
    this.global.jsdom = null;
    return super.teardown();
  }
};

module.exports = CustomizedJSDomEnvironment;
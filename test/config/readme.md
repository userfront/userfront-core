### Mocking private (or unexported) functions

[Using Rewire](https://github.com/speedskater/babel-plugin-rewire#example-2), we can get an unexported function from our Userfront module:

```js
const signonWithSso = Userfront.__get__("signonWithSso");
```

We can also set a function like so:

```js
const mockFn = jest.fn();
Userfront.__set__("verifyToken", mockFn);
```

### Mocking ES6 classes and imports

[Jest - The 4 ways to create an ES6 class mock](https://jestjs.io/docs/es6-class-mocks#the-4-ways-to-create-an-es6-class-mock)

# Node.js event handling Study

## Concept

### The overview of the eventloop

```txt
   ┌───────────────────────────┐
┌─>│           timers          │    (this phase executes callbacks scheduled by setTimeout() and setInterval())
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │    (executes I/O callbacks deferred to the next loop iteration.)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │    (only used internally)
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │ (retrieve new I/O events; execute I/O related callbacks)
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │    (setImmediate() callbacks are invoked here)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │    (some close callbacks, e.g. socket.on('close', ...))
   └───────────────────────────┘
```

*for more information, please refer to <https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/>*

### Macrotask and Microtask

Refer to <https://stackoverflow.com/questions/25915634/difference-between-microtask-and-macrotask-within-an-event-loop-context>:

> One go-around of the event loop will have exactly one task being processed from th **macrotask queue** (this queue is simply called the task queue in the [WHATWG specification](https://html.spec.whatwg.org/multipage/webappapis.html#task-queue)). After this marcotask has finished, all available **microtasks** will be processed, namely within the same go-around cycle. While these microtasks are processed, they can queue even more microtasks, which will all be run one by one, until the microtask queue is exhausted.

*As noted above, if one microtask creates a new microtask constantly, which will be pushed into the tail of the microtask queue, it can starve the other marcotask because the microtask queue will never be cleared.*

Examples:
**macrotasks**: setTimeout, setInterval, setImmediate, requestAnimationFrame, I/O, UI rendering
**microtasks**: process.nextTick, Promises, Object.observe, MutationObserver

## Example

JS code

```js
console.log('main thread start ...');
setTimeout(() => console.log('Timeout1'), 0);   // Macro task queue
let promiseF = () => new Promise(resolve => setTimeout(() => resolve('Timeout3'), 0));
let asyncF = async () => console.log(await promiseF());
asyncF();   // For async will wrap the result with promise, "console.log(await promiseF())"" enters Micro task

let p1 = Promise.resolve('p1');
let p2 = Promise.resolve('p2');

p1.then(r => {
    console.log(r); // p1
    setTimeout(() => console.log('Timeout2'), 0);   // Macro task queue
    const p3 = Promise.resolve('p3');
    p3.then(console.log);   // p3
}); // Micro task queue

p2.then(console.log);   // p2
setTimeout(() => console.log('Timeout4'), 0); // Macro task
console.log('main thread end.');
```

The result of above code

```txt
main thread start ...
main thread end.
p1
p2
p3
Timeout1
Timeout4
Timeout2
Timeout3
```

The order of execution

- Synchronous code
  1. Executing the ```console.log('main thread start ...');```, then printing the log ```main thread start ...```.
  2. Pushing the ```() => console.log('Timeout1')``` setTimeout callback task into the **macrotask queue**, then go on.
  3. Calling the ```asyncF()``` function, Because this function is async function, it will wrap the ```console.log(await promiseF())```, it can be regarede as ```promise.then(...)```, so the ```console.log(await promiseF())``` will be pushed into the **microtask queue**, go on.
  4. ```p1.then(...)``` and ```p2.then(...)``` will also be pushed into the **microtask queue**.
  5. Pushing the ```() => console.log('Timeout4')``` setTimeout callback task into the **macrotask queue**.
  6. Executing the ```console.log('main thread end.');```, then printing the log ```main thread end.```.

  After the above actions, the **Macrotask queue** and **Microtask queue** will like this:

  ```txt

        Macrotask queue                           Microtask queue

  ┌─────────────────────────┐           ┌───────────────────────────────────┐
  | console.log('Timeout1') |           |   console.log(await promiseF())   |
  └─────────────────────────┘           └───────────────────────────────────┘
  | console.log('Timeout4') |           |           p1.then(...)            |
  └─────────────────────────┘           └───────────────────────────────────┘
                                        |           p2.then(...)            |
                                        └───────────────────────────────────┘

  ```

- Handling the microtask queue
  1. According to the "First in First out" principle, Firstly handling ```console.log(await promiseF())```, we can regard the ```await``` as microtask, so the microtask queue will look like this:

    ```txt

                    Microtask queue

    ┌────────────────────────────────────────────┐
    |                  p1.then(...)              |
    └────────────────────────────────────────────┘
    |                  p2.then(...)              |
    └────────────────────────────────────────────┘
    |  setTimeout(() => resolve('Timeout3'), 0)  |
    └────────────────────────────────────────────┘
    ```

  2. Handling ```p1.then(...)```, printing "p1", pushing ```console.log('Timeout2')``` into **macrotask queue**, and pushing ```p3.then(...)``` into **microtask queue**.

    ```txt

            Macrotask queue                                 Microtask queue

    ┌─────────────────────────┐           ┌────────────────────────────────────────────┐
    | console.log('Timeout1') |           |                  p2.then(...)              |
    └─────────────────────────┘           └────────────────────────────────────────────┘
    | console.log('Timeout4') |           |  setTimeout(() => resolve('Timeout3'), 0)  |
    └─────────────────────────┘           └────────────────────────────────────────────┘
    | console.log('Timeout2') |           |                  p3.then(...)              |
    └─────────────────────────┘           └────────────────────────────────────────────┘
    ```

  3. Handling ```p2.then(...) ```, printing ```p2```, then executing ```setTimeout(() => resolve('Timeout3'), 0)```, pushing the ```resolve('Timeout3')``` into **macrotask queue**, and printing ```p3```.

    ```txt

         Macrotask queue

    ┌─────────────────────────┐
    | console.log('Timeout1') |
    └─────────────────────────┘
    | console.log('Timeout4') |
    └─────────────────────────┘
    | console.log('Timeout2') |
    └─────────────────────────┘
    |   resolve('Timeout3')   |
    └─────────────────────────┘
    ```

  4. Finally clearing the macrotask queue.

So, the result will be as shown above.

中文版请访问[这儿](https://www.jianshu.com/p/44813e5de7aa)

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
setTimeout(() => console.log('Timeout4'), 0); // Macro task queue
console.log('main thread end.');
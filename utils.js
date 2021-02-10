const utils = {
    // Generate a random hex color
    randomColor: () => `#${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}`,
    // Generate a random integer in given range
    randomInteger: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    // Get a random item from an array
    randomItem: (arr) => arr[(Math.random() * arr.length) | 0],
    /*
    Run promises (an array of `Promise`) in sequence
    run(promises).then((results) => {
        // results is an array of promise results in the same order
    });
    */
    seralizePromises: (promises) => promises.reduce((p, c) => p.then(rp => c.then(rc => [...rp, rc])), Promise.resolve([])),
    // Generate a random UUID
    uuid: (a) => a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid),

    // Wait for an amount of time
    wait: async (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
}

module.exports = utils;

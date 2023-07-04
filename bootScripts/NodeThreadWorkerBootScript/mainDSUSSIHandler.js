const handle = (seed, res) => {
    res.statusCode = 200;
    res.end(seed);
};

module.exports = {
    handle,
};

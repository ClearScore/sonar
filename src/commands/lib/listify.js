function listify(array, { type = 'conjunction', style = 'long', stringify = (item) => item.toString() } = {}) {
    const stringified = array.map((item) => stringify(item));
    const formatter = new Intl.ListFormat('en', { style, type });
    return formatter.format(stringified);
}

module.exports = listify;

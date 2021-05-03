const date = new Date()
process.env.VUE_APP_BUILD_DATE = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`

module.exports = {
    publicPath: process.env.NODE_ENV === 'production' ? '/l4d2/admin' : '/'
}
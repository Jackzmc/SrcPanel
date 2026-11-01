
import mysql2 from 'mysql2/promise'
if(!process.env.TEST_DB_URI) {
    throw new Error("Missing env TEST_DB_URL")
}
const pool = mysql2.createPool({
    uri: process.env.TEST_DB_URI
})

export default pool
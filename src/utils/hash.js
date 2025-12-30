import bcrypt from 'bcrypt';

const hashPassword = async (password) => {
    return bcrypt.hash(password, 12)
}

const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword)
}

export { hashPassword, comparePassword }